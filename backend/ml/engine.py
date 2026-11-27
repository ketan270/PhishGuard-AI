"""
Prediction engine (Synopsis Modules 5-7 & 9).

Loads the trained artefacts once and exposes:
    analyze_url(url)          -> prediction, confidence, risk, indicators, explanation, recommendations
    analyze_email(text)       -> same structure for email content
Explainability is model-based (feature/term occlusion against the trained
model) and complemented by human-readable rule indicators.
"""
from __future__ import annotations

import json
import logging
import os
import subprocess
import sys
import threading
import time
from functools import lru_cache
from pathlib import Path

import joblib
import numpy as np
import requests

from .email_features import is_valid_email_text, linguistic_indicators, normalize_email_text
from .url_features import (FEATURE_LABELS, FEATURE_NAMES, SUSPICIOUS_KEYWORDS, detect_brand_signals,
                           extract_url_features, is_valid_url, parse_url)

log = logging.getLogger("phishguard.engine")
BASE = Path(__file__).resolve().parent
ART = BASE / "artifacts"
TOP_DOMAINS_FILE = BASE.parent / "data" / "top-domains.txt"

# Popular platforms that host user-generated content: being popular does not
# make an arbitrary page on them trustworthy.
USER_CONTENT_HOSTS = {
    "blogspot.com", "github.io", "amazonaws.com", "wix.com", "weebly.com", "000webhost.com",
    "000webhostapp.com", "firebaseapp.com", "web.app", "herokuapp.com", "netlify.app", "vercel.app",
    "workers.dev", "pages.dev", "glitch.me", "repl.co", "sharepoint.com", "godaddysites.com",
    "wordpress.com", "tumblr.com", "sites.google.com", "googleusercontent.com", "azurewebsites.net",
    "cloudfront.net", "appspot.com", "ngrok.io", "ngrok-free.app", "duckdns.org", "no-ip.com",
    "bit.ly", "tinyurl.com", "t.co", "goo.gl", "forms.gle", "jimdo.com", "webflow.io", "square.site",
    "ipfs.io", "dweb.link", "r2.dev", "onrender.com", "fly.dev", "surge.sh", "translate.goog",
    "blogger.com", "medium.com", "notion.site", "carrd.co", "mailchimpsites.com", "typeform.com",
    "zohosites.com", "strikingly.com", "yolasite.com", "sitey.me",
}

RISK_THRESHOLDS = {"High": 0.70, "Medium": 0.40}

# Registries that only accept verified institutions (education / government / military).
RESTRICTED_SUFFIXES = {
    "edu", "gov", "mil", "int", "gov.in", "nic.in", "ac.in", "edu.in", "res.in", "ernet.in", "mil.in",
    "ac.uk", "gov.uk", "nhs.uk", "edu.au", "gov.au", "edu.cn", "gov.cn", "ac.jp", "go.jp", "edu.sg",
    "gov.sg", "edu.pk", "gov.pk", "ac.nz", "govt.nz", "gc.ca", "edu.br", "gov.br",
}


class ModelsNotTrained(RuntimeError):
    pass


class _Models:
    _lock = threading.Lock()
    _loaded = False
    _training = None  # background re-training process (auto-recovery)

    def _load_artifacts(self):
        needed = ["url_feature_model.joblib", "url_lexical_model.joblib", "email_model.joblib"]
        missing = [f for f in needed if not (ART / f).exists()]
        if missing:
            raise FileNotFoundError(f"missing model artefacts {missing}")
        t0 = time.time()
        fm = joblib.load(ART / "url_feature_model.joblib")
        self.url_feature_model = fm["model"]
        self.url_feature_name = fm["name"]
        self.legit_baseline = np.array(fm["legit_baseline"], dtype=np.float32)
        self.url_lexical_model = joblib.load(ART / "url_lexical_model.joblib")
        em = joblib.load(ART / "email_model.joblib")
        self.email_model = em["model"]
        self.email_model_name = em["name"]
        # smoke-test the pipelines (catches scikit-learn version incompatibilities early)
        self.url_feature_model.predict_proba(np.zeros((1, len(FEATURE_NAMES)), dtype=np.float32))
        self.url_lexical_model.predict_proba(["example.com"])
        self.email_model.predict_proba(["hello team"])
        self.metrics = json.loads((ART / "metrics.json").read_text()) if (ART / "metrics.json").exists() else {}
        self.top_domains = set()
        if TOP_DOMAINS_FILE.exists():
            self.top_domains = {l.strip().lower() for l in TOP_DOMAINS_FILE.read_text().splitlines() if l.strip()}
        log.info("Models loaded in %.2fs", time.time() - t0)

    def _start_training(self):
        if os.getenv("AUTO_TRAIN", "1") == "0":
            return False
        if self._training is not None and self._training.poll() is None:
            return True
        log.warning("Starting background model training (python -m ml.train). This takes a few minutes.")
        self._training = subprocess.Popen([sys.executable, "-m", "ml.train"], cwd=str(BASE.parent))
        return True

    def load(self):
        with self._lock:
            if self._loaded:
                return
            try:
                self._load_artifacts()
                self._loaded = True
            except Exception as e:  # missing or incompatible artefacts
                log.error("Could not load ML models: %s", e)
                if self._start_training():
                    raise ModelsNotTrained("The ML models are being trained on this machine (first run or "
                                           "incompatible scikit-learn version). Please retry in a few minutes.")
                raise ModelsNotTrained(f"ML models unavailable ({e}). Run `python -m ml.train` inside backend/.")


M = _Models()


def models():
    M.load()
    return M


def risk_level(p: float) -> str:
    if p >= RISK_THRESHOLDS["High"]:
        return "High"
    if p >= RISK_THRESHOLDS["Medium"]:
        return "Medium"
    return "Low"


def _logit(p):
    p = np.clip(np.asarray(p, dtype=np.float64), 1e-6, 1 - 1e-6)
    return np.log(p / (1 - p))


def _indicator(title: str, detail: str, severity: str, category: str) -> dict:
    return {"title": title, "detail": detail, "severity": severity, "category": category}


# --------------------------------------------------------------------------- #
# External intelligence (optional) - Google Safe Browsing v4
# --------------------------------------------------------------------------- #
@lru_cache(maxsize=512)
def safe_browsing_lookup(url: str) -> dict | None:
    key = os.getenv("GOOGLE_SAFE_BROWSING_KEY")
    if not key:
        return None
    body = {
        "client": {"clientId": "phishguard-ai", "clientVersion": "2.0"},
        "threatInfo": {
            "threatTypes": ["MALWARE", "SOCIAL_ENGINEERING", "UNWANTED_SOFTWARE", "POTENTIALLY_HARMFUL_APPLICATION"],
            "platformTypes": ["ANY_PLATFORM"],
            "threatEntryTypes": ["URL"],
            "threatEntries": [{"url": url}],
        },
    }
    try:
        r = requests.post(f"https://safebrowsing.googleapis.com/v4/threatMatches:find?key={key}", json=body, timeout=4)
        r.raise_for_status()
        matches = r.json().get("matches", [])
        return {"checked": True, "listed": bool(matches), "threats": sorted({m["threatType"] for m in matches})}
    except Exception as e:  # network errors must never break the analysis
        log.warning("Safe Browsing lookup failed: %s", e)
        return {"checked": False, "listed": False, "error": "unavailable"}


# --------------------------------------------------------------------------- #
# URL analysis
# --------------------------------------------------------------------------- #
def _url_rule_indicators(url: str, feats: list[float]) -> list[dict]:
    f = dict(zip(FEATURE_NAMES, feats))
    p = parse_url(url)
    out = []
    impersonated, typo = detect_brand_signals(p)
    if f["has_ip_address"]:
        out.append(_indicator("IP address used instead of a domain",
                              f"The link points directly to {p.host}. Legitimate services almost always use a named domain.",
                              "high", "structure"))
    if typo:
        out.append(_indicator("Look-alike domain (typosquatting)",
                              f"'{p.registered_domain}' closely resembles the brand '{typo}' but is not its official domain.",
                              "high", "brand"))
    if impersonated:
        out.append(_indicator("Brand name used outside its official domain",
                              f"'{impersonated}' appears in the URL, but the actual registered domain is '{p.registered_domain}'.",
                              "high", "brand"))
    if f["has_at_symbol"]:
        out.append(_indicator("'@' symbol in URL",
                              "Browsers ignore everything before '@', a classic trick to disguise the real destination.",
                              "high", "structure"))
    if f["has_punycode"]:
        out.append(_indicator("Punycode / homograph domain",
                              "The domain uses internationalised characters (xn--) that can imitate familiar letters.",
                              "high", "brand"))
    kws = [k for k in SUSPICIOUS_KEYWORDS if k in p.normalized.lower()]
    if kws:
        out.append(_indicator("Suspicious keywords",
                              "Contains words commonly used in phishing lures: " + ", ".join(kws[:6]) + ".",
                              "medium" if len(kws) < 3 else "high", "content"))
    if f["suspicious_tld"]:
        out.append(_indicator("High-risk top-level domain",
                              f"'.{p.tld}' is frequently abused because it is cheap or free to register.",
                              "medium", "domain"))
    if f["num_subdomains"] >= 3:
        out.append(_indicator("Multiple subdomains",
                              f"{int(f['num_subdomains'])} subdomain levels ('{p.subdomain}') can push the real domain out of view.",
                              "medium", "structure"))
    if f["url_length"] > 75:
        out.append(_indicator("Unusually long URL",
                              f"{int(f['url_length'])} characters long. Long URLs are often used to hide the real destination.",
                              "medium" if f["url_length"] < 150 else "high", "structure"))
    if f["is_shortener"]:
        out.append(_indicator("URL shortener",
                              "The real destination is hidden behind a shortening service.", "medium", "structure"))
    if f["has_double_slash_redirect"]:
        out.append(_indicator("Embedded redirect ('//') in path",
                              "A second '//' inside the path can redirect the visitor to another site.", "medium", "structure"))
    if f["num_special_chars"] >= 6:
        out.append(_indicator("Excessive special characters",
                              f"{int(f['num_special_chars'])} special characters such as = & % ~ were found.", "low", "structure"))
    if f["host_entropy"] > 3.9 or f["digits_in_host"] >= 5:
        out.append(_indicator("Random-looking hostname",
                              "The hostname looks machine-generated, typical of throw-away phishing domains.", "medium", "domain"))
    if f["has_port"]:
        out.append(_indicator("Non-standard port", f"Uses port {p.port} instead of standard web ports.", "medium", "structure"))
    if f["has_php_or_exec"]:
        out.append(_indicator("Script or executable in path",
                              "Path points to a server-side script or downloadable file (e.g. .php, .exe, .zip).",
                              "low", "content"))
    if f["num_hyphens_host"] >= 2:
        out.append(_indicator("Hyphenated domain",
                              f"{int(f['num_hyphens_host'])} hyphens in the hostname (e.g. secure-login-bank.com) is a common phishing pattern.",
                              "low", "domain"))
    if p.scheme == "http":
        out.append(_indicator("No HTTPS encryption",
                              "The link uses plain HTTP, so anything typed on the page can be intercepted.", "medium", "security"))
    elif p.scheme == "https":
        out.append(_indicator("Uses HTTPS", "Encrypted connection. Note: phishing sites can use HTTPS too.", "safe", "security"))
    return out


def _feature_contributions(feat_vec: np.ndarray, base_p: float) -> list[dict]:
    """Occlusion-based local explanation: replace each feature with the median value
    of legitimate URLs and measure how much the phishing probability changes."""
    mm = models()
    n = len(FEATURE_NAMES)
    batch = np.repeat(feat_vec.reshape(1, -1), n, axis=0)
    for i in range(n):
        batch[i, i] = mm.legit_baseline[i]
    probs = mm.url_feature_model.predict_proba(batch)[:, 1]
    deltas = _logit(base_p) - _logit(probs)  # log-odds: stays informative when p saturates near 0/1
    contribs = []
    for i, name in enumerate(FEATURE_NAMES):
        delta = float(deltas[i])
        if abs(delta) < 0.05:
            continue
        v = float(feat_vec[i])
        contribs.append({
            "feature": name, "label": FEATURE_LABELS[name],
            "value": round(v, 3) if not v.is_integer() else int(v),
            "typical_legit": round(float(mm.legit_baseline[i]), 2),
            "contribution": round(delta, 4),
        })
    contribs.sort(key=lambda c: -abs(c["contribution"]))
    return contribs[:10]


def url_probability(url: str) -> tuple[float, float, float, np.ndarray]:
    mm = models()
    feats = np.array(extract_url_features(url), dtype=np.float32)
    p_feat = float(mm.url_feature_model.predict_proba(feats.reshape(1, -1))[0, 1])
    norm = parse_url(url).normalized.lower().rstrip("/")
    p_lex = float(mm.url_lexical_model.predict_proba([norm])[0, 1])
    return 0.5 * p_feat + 0.5 * p_lex, p_feat, p_lex, feats


def reputation(url: str) -> dict:
    mm = models()
    p = parse_url(url)
    host = p.host
    reg = p.registered_domain
    shared = reg in USER_CONTENT_HOSTS or host in USER_CONTENT_HOSTS
    rank_hit = (reg in mm.top_domains or host in mm.top_domains) and not p.is_ip
    restricted = (p.tld in RESTRICTED_SUFFIXES) and not p.is_ip and not shared
    return {"registered_domain": reg, "popular_domain": bool(rank_hit and not shared), "user_content_platform": shared,
            "restricted_registry": restricted, "suffix": p.tld}


def analyze_url(url: str, explain: bool = True) -> dict:
    ok, err = is_valid_url(url)
    if not ok:
        raise ValueError(err)
    url = url.strip()
    p_model, p_feat, p_lex, feats = url_probability(url)
    p = p_model
    rep = reputation(url)
    parsed = parse_url(url)
    _, typo = detect_brand_signals(parsed)
    indicators = _url_rule_indicators(url, feats.tolist())

    adjustments = []
    if rep["popular_domain"] and not typo:
        p = p * 0.25
        adjustments.append("Reputation layer: domain is in the global top-10k list, risk reduced.")
        indicators.insert(0, _indicator("Established, highly-visited domain",
                                        f"'{rep['registered_domain']}' is among the 10,000 most visited domains worldwide.",
                                        "safe", "reputation"))
    elif rep["restricted_registry"] and not typo:
        p = p * 0.35
        adjustments.append(f"Reputation layer: '.{rep['suffix']}' is a restricted registry, risk reduced.")
        indicators.insert(0, _indicator("Restricted institutional domain",
                                        f"'.{rep['suffix']}' domains can only be registered by verified educational or government bodies.",
                                        "safe", "reputation"))
    if rep["user_content_platform"]:
        p = max(p, min(1.0, p + 0.1))
        indicators.append(_indicator("Hosted on a shared / free hosting platform",
                                     f"Anyone can publish pages on '{rep['registered_domain']}', so the domain itself proves nothing.",
                                     "medium", "reputation"))
    sb = safe_browsing_lookup(url) if explain else None
    if sb and sb.get("listed"):
        p = max(p, 0.98)
        indicators.insert(0, _indicator("Listed by Google Safe Browsing",
                                        "Flagged as: " + ", ".join(sb.get("threats", [])), "high", "threat-intel"))
        adjustments.append("External intelligence: URL is on the Google Safe Browsing blocklist.")

    p = float(min(max(p, 0.0), 1.0))
    result = _package(p, indicators, "URL")
    result.update({
        "input": url,
        "analysis_type": "URL",
        "model_scores": {"feature_model": round(p_feat, 4), "lexical_model": round(p_lex, 4),
                         "ensemble": round(p_model, 4), "final": round(p, 4)},
        "models_used": [models().url_feature_name, "Char n-gram TF-IDF + Logistic Regression"],
        "adjustments": adjustments,
        "external_intel": sb,
        "url_parts": {"scheme": parsed.scheme or "(none)", "host": parsed.host, "registered_domain": parsed.registered_domain,
                      "subdomain": parsed.subdomain, "tld": parsed.tld, "path": parsed.path, "query": parsed.query},
    })
    if explain:
        result["feature_contributions"] = _feature_contributions(feats, p_feat)
        result["features"] = {n: (int(v) if float(v).is_integer() else round(float(v), 3))
                              for n, v in zip(FEATURE_NAMES, feats.tolist())}
    return result


# --------------------------------------------------------------------------- #
# Email analysis
# --------------------------------------------------------------------------- #
def _term_contributions(norm: str, base_p: float) -> list[dict]:
    mm = models()
    model = mm.email_model
    vec_step = model.steps[0][1]
    rest = model[1:]
    X = vec_step.transform([norm])
    cols = X.indices
    if len(cols) == 0:
        return []
    order = cols[np.argsort(-X.data)][:60]
    rows = []
    import scipy.sparse as sp
    base = X.tocsr()
    mats = []
    for c in order:
        m = base.copy().tolil()
        m[0, c] = 0
        mats.append(m.tocsr())
    batch = sp.vstack(mats)
    probs = rest.predict_proba(batch)[:, 1]
    deltas = _logit(base_p) - _logit(probs)
    vocab = vec_step.get_feature_names_out()
    for c, delta in zip(order, deltas):
        delta = float(delta)
        if abs(delta) < 0.02:
            continue
        rows.append({"term": str(vocab[c]), "contribution": round(delta, 4)})
    rows.sort(key=lambda r: -abs(r["contribution"]))
    return rows[:12]


def analyze_email(text: str, explain: bool = True) -> dict:
    ok, err = is_valid_email_text(text)
    if not ok:
        raise ValueError(err)
    mm = models()
    norm = normalize_email_text(text)
    p_text = float(mm.email_model.predict_proba([norm])[0, 1])
    li = linguistic_indicators(text)

    url_results = []
    for u in li["urls"][:8]:
        try:
            r = analyze_url(u, explain=False)
            url_results.append({"url": u, "risk_score": r["risk_score"], "risk_level": r["risk_level"],
                                "prediction": r["prediction"]})
        except ValueError:
            continue
    max_url_p = max((r["risk_score"] / 100 for r in url_results), default=0.0)
    p = p_text
    if url_results:
        p = max(p_text, 0.6 * p_text + 0.4 * max_url_p)

    indicators = []
    if li["urgency"]:
        indicators.append(_indicator("Creates a false sense of urgency",
                                     "Pressure phrases: " + ", ".join(f"“{t}”" for t in li["urgency"][:5]), "high", "urgency"))
    if li["credential"]:
        indicators.append(_indicator("Requests credentials or personal data",
                                     "Mentions: " + ", ".join(f"“{t}”" for t in li["credential"][:5]),
                                     "high" if len(li["credential"]) > 2 else "medium" if len(li["credential"]) == 2 else "low", "credential"))
    if li["financial"]:
        indicators.append(_indicator("Financial request or reward bait",
                                     "Mentions: " + ", ".join(f"“{t}”" for t in li["financial"][:5]), "medium", "financial"))
    if li["threat"]:
        indicators.append(_indicator("Threatening consequences",
                                     "Mentions: " + ", ".join(f"“{t}”" for t in li["threat"][:4]), "medium", "urgency"))
    if li["generic_greeting"]:
        indicators.append(_indicator("Generic greeting",
                                     f"Uses “{li['generic_greeting'][0]}” instead of your name, typical of mass phishing.",
                                     "low", "language"))
    if li["attachment"]:
        indicators.append(_indicator("Risky attachment or macro request",
                                     "References: " + ", ".join(li["attachment"]), "high", "attachment"))
    if li["exclamations"] >= 3:
        indicators.append(_indicator("Excessive exclamation marks", f"{li['exclamations']} exclamation marks.", "low", "language"))
    if li["caps_ratio"] > 0.15:
        indicators.append(_indicator("Shouting (ALL CAPS)", f"{li['caps_ratio']*100:.0f}% of words are in capitals.", "low", "language"))
    risky_links = [r for r in url_results if r["risk_level"] != "Low"]
    if risky_links:
        indicators.append(_indicator(f"{len(risky_links)} suspicious embedded link(s)",
                                     "e.g. " + risky_links[0]["url"][:80], "high", "links"))
    elif url_results:
        indicators.append(_indicator(f"{len(url_results)} embedded link(s)",
                                     "Links look low-risk, but always verify before clicking.", "low", "links"))

    result = _package(p, indicators, "Email")
    result.update({
        "input": text,
        "analysis_type": "Email",
        "model_scores": {"text_model": round(p_text, 4), "max_link_risk": round(max_url_p, 4), "final": round(p, 4)},
        "models_used": [f"{mm.email_model_name} (TF-IDF)", "URL ensemble for embedded links"],
        "embedded_urls": url_results,
        "stats": {"word_count": li["word_count"], "links": len(li["urls"]), "exclamations": li["exclamations"],
                  "caps_ratio": round(li["caps_ratio"], 3)},
        "highlight_terms": sorted(set(li["urgency"] + li["credential"] + li["financial"] + li["threat"]
                                      + li["generic_greeting"])),
    })
    if explain:
        result["term_contributions"] = _term_contributions(norm, p_text)
    return result


# --------------------------------------------------------------------------- #
# Risk packaging & recommendations (Stage 6-8)
# --------------------------------------------------------------------------- #
RECOMMENDATIONS = {
    ("URL", "High"): [
        "Do not open this URL or click the link.",
        "Never enter passwords, OTPs or card details on this site.",
        "Do not download any files from it.",
        "If you received it in a message, verify the sender through an independent channel.",
        "Report it to your IT/security team or to reportphishing@apwg.org.",
    ],
    ("URL", "Medium"): [
        "Verify the website independently before continuing - type the official address yourself.",
        "Check the domain name carefully for misspellings.",
        "Avoid logging in or making payments through this link.",
        "Use a second opinion such as your browser's safe-browsing warning.",
    ],
    ("URL", "Low"): [
        "No significant phishing indicators were detected.",
        "Follow normal precautions: check the padlock and the exact domain before logging in.",
        "Enable two-factor authentication on your important accounts.",
    ],
    ("Email", "High"): [
        "Do not click any links or open attachments in this email.",
        "Do not reply or share credentials, OTPs or financial details.",
        "Contact the organisation using an official phone number or website you already know.",
        "Report the email as phishing and delete it.",
    ],
    ("Email", "Medium"): [
        "Treat this email with caution - verify the sender's address carefully.",
        "Hover over links to check where they really lead before clicking.",
        "Confirm any request for money or data through a separate, trusted channel.",
    ],
    ("Email", "Low"): [
        "The language appears normal with no strong phishing indicators.",
        "Still verify unexpected attachments or payment requests.",
        "Keep your email client and antivirus up to date.",
    ],
}


def _package(p: float, indicators: list[dict], kind: str) -> dict:
    level = risk_level(p)
    is_phish = p >= 0.5
    sev_rank = {"high": 0, "medium": 1, "low": 2, "safe": 3}
    indicators.sort(key=lambda i: sev_rank.get(i["severity"], 9))
    risky = [i for i in indicators if i["severity"] in ("high", "medium")]
    noun = "URL" if kind == "URL" else "email"
    summary = {"High": f"High-risk {noun}", "Medium": f"Suspicious {noun}", "Low": f"Low-risk {noun}"}[level]
    if risky:
        def lc(t):  # lower-case first letter unless it is an acronym (e.g. "IP", "URL")
            return t if len(t) > 1 and t[1].isupper() else t[:1].lower() + t[1:]
        reasons = ", ".join(lc(i["title"]) for i in risky[:3])
        summary += f" - flagged for: {reasons}."
    else:
        summary += " - no major phishing indicators were detected."
    if not indicators:
        indicators.append(_indicator("No major suspicious indicators", "Nothing unusual was detected in the structure or content.",
                                     "safe", "general"))
    return {
        "prediction": "Phishing" if is_phish else "Legitimate",
        "phishing_probability": round(p, 4),
        "confidence": min(99.9, round(max(p, 1 - p) * 100, 1)),  # never claim absolute certainty
        "risk_score": int(round(p * 100)),
        "risk_level": level,
        "summary": summary,
        "indicators": indicators,
        "recommendations": RECOMMENDATIONS[(kind, level)],
    }


def get_metrics() -> dict:
    return models().metrics
