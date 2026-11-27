"""
URL feature extraction engine (Synopsis Module 3).

Converts a raw URL into a fixed-length vector of lexical / structural
cybersecurity features. The same function is used at training time and at
inference time so the model always sees identical feature definitions.

Note on HTTPS: the public training corpora store many legitimate URLs without
a scheme, so the protocol is *not* given to the ML model (it would learn a
dataset artefact). HTTPS usage is instead reported by the rule-based
explainability layer.
"""
from __future__ import annotations

import ipaddress
import math
import re
from collections import Counter
from dataclasses import dataclass
from urllib.parse import urlsplit

# --------------------------------------------------------------------------- #
# Static knowledge used by the feature extractor
# --------------------------------------------------------------------------- #
SUSPICIOUS_KEYWORDS = [
    "login", "log-in", "signin", "sign-in", "verify", "verification", "update",
    "secure", "security", "account", "banking", "confirm", "password", "passwd",
    "webscr", "cmd=", "ebayisapi", "wallet", "billing", "invoice", "unlock",
    "suspend", "suspended", "restore", "recover", "authenticate", "auth",
    "validate", "support", "service", "alert", "limited", "free", "bonus",
    "gift", "prize", "winner", "claim", "reward", "credential", "ssn", "otp",
    "kyc", "refund", "payment", "pay", "access", "session", "token", "admin",
    "office365", "outlook", "onedrive", "docusign", "dropbox", "wp-admin",
    "wp-includes", "wp-content",
]

BRANDS = [
    "paypal", "google", "microsoft", "apple", "amazon", "netflix", "facebook",
    "instagram", "whatsapp", "linkedin", "twitter", "outlook", "office",
    "icloud", "yahoo", "dropbox", "adobe", "docusign", "chase", "wellsfargo",
    "bankofamerica", "citibank", "hsbc", "barclays", "sbi", "hdfc", "icici",
    "axisbank", "paytm", "phonepe", "flipkart", "ebay", "dhl", "fedex", "ups",
    "usps", "steam", "binance", "coinbase", "metamask", "blockchain", "spotify",
    "walmart", "americanexpress", "amex", "mastercard", "visa", "irs", "gov",
]

SUSPICIOUS_TLDS = {
    "tk", "ml", "ga", "cf", "gq", "xyz", "top", "club", "online", "site",
    "live", "work", "buzz", "rest", "fit", "icu", "cyou", "monster", "shop",
    "click", "link", "info", "win", "bid", "loan", "date", "racing", "review",
    "stream", "download", "party", "science", "country", "kim", "men", "zip",
    "mov", "cam", "su", "ru", "cn", "pw", "cc", "ws", "vip", "today", "support",
}

SHORTENERS = {
    "bit.ly", "goo.gl", "tinyurl.com", "t.co", "ow.ly", "is.gd", "buff.ly",
    "adf.ly", "bit.do", "cutt.ly", "shorturl.at", "rebrand.ly", "tiny.cc",
    "rb.gy", "t.ly", "s.id", "v.gd", "qr.co", "lnkd.in", "shorte.st",
}

# Two-level public suffixes that commonly appear (lightweight PSL substitute).
MULTI_PART_SUFFIXES = {
    "co.uk", "org.uk", "ac.uk", "gov.uk", "co.in", "net.in", "org.in", "ac.in",
    "gov.in", "edu.in", "res.in", "com.au", "net.au", "org.au", "edu.au",
    "co.jp", "ne.jp", "or.jp", "com.br", "net.br", "org.br", "com.cn",
    "net.cn", "org.cn", "com.mx", "com.ar", "com.tr", "com.sg", "com.my",
    "co.za", "co.nz", "co.kr", "com.tw", "com.hk", "com.pk", "com.ng",
    "com.eg", "com.co", "com.pe", "com.ve", "com.ua", "com.pl", "com.vn",
    "co.id", "or.id", "co.il", "com.sa", "com.ph", "blogspot.com",
}

SPECIAL_CHARS = set("@?=&%~+!*$#;,")

# Ordered list of feature names (must match `extract_url_features`).
FEATURE_NAMES = [
    "url_length", "hostname_length", "path_length", "query_length",
    "num_dots_host", "num_subdomains", "num_hyphens", "num_hyphens_host",
    "num_underscores", "num_slashes", "num_digits", "digit_ratio",
    "num_special_chars", "has_at_symbol", "has_ip_address",
    "has_double_slash_redirect", "num_query_params", "suspicious_keyword_count",
    "brand_impersonation", "typosquatting", "suspicious_tld", "host_entropy",
    "url_entropy", "has_punycode", "longest_token_length", "is_shortener",
    "has_php_or_exec", "num_percent_encoded", "tld_length", "path_depth",
    "has_port", "digits_in_host", "vowel_ratio_host", "consecutive_char_repeat",
]

FEATURE_LABELS = {
    "url_length": "URL length",
    "hostname_length": "Hostname length",
    "path_length": "Path length",
    "query_length": "Query-string length",
    "num_dots_host": "Dots in hostname",
    "num_subdomains": "Number of subdomains",
    "num_hyphens": "Hyphens in URL",
    "num_hyphens_host": "Hyphens in hostname",
    "num_underscores": "Underscores",
    "num_slashes": "Slashes (path segments)",
    "num_digits": "Digits in URL",
    "digit_ratio": "Digit ratio",
    "num_special_chars": "Special characters",
    "has_at_symbol": "'@' symbol present",
    "has_ip_address": "IP address instead of domain",
    "has_double_slash_redirect": "'//' redirect inside path",
    "num_query_params": "Query parameters",
    "suspicious_keyword_count": "Suspicious keywords",
    "brand_impersonation": "Brand name outside its real domain",
    "typosquatting": "Look-alike (typosquatted) domain",
    "suspicious_tld": "High-risk top-level domain",
    "host_entropy": "Hostname randomness (entropy)",
    "url_entropy": "URL randomness (entropy)",
    "has_punycode": "Punycode / IDN homograph",
    "longest_token_length": "Longest token length",
    "is_shortener": "URL shortener",
    "has_php_or_exec": "Script / executable in path",
    "num_percent_encoded": "Percent-encoded characters",
    "tld_length": "TLD length",
    "path_depth": "Path depth",
    "has_port": "Explicit port number",
    "digits_in_host": "Digits in hostname",
    "vowel_ratio_host": "Vowel ratio in hostname",
    "consecutive_char_repeat": "Repeated characters",
}


@dataclass
class ParsedURL:
    raw: str
    normalized: str          # without scheme and leading www.
    scheme: str
    host: str
    port: int | None
    path: str
    query: str
    registered_domain: str   # e.g. paypal.com
    subdomain: str           # e.g. secure.login
    tld: str
    is_ip: bool


URL_RE = re.compile(r"^[a-zA-Z][a-zA-Z0-9+.-]*://")


def parse_url(url: str) -> ParsedURL:
    raw = (url or "").strip()
    to_parse = raw if URL_RE.match(raw) else "http://" + raw
    try:
        parts = urlsplit(to_parse)
        host = (parts.hostname or "").lower().strip(".")
        port = parts.port
    except ValueError:
        parts = urlsplit("http://invalid")
        host, port = "", None
    scheme = parts.scheme.lower() if URL_RE.match(raw) else ""

    is_ip = False
    try:
        ipaddress.ip_address(host)
        is_ip = True
    except ValueError:
        # hex / decimal encoded IPs, e.g. 0x7f000001 or 3232235777
        if re.fullmatch(r"(0x[0-9a-f]+|\d{8,10})", host):
            is_ip = True

    host_nw = host[4:] if host.startswith("www.") else host
    labels = [l for l in host_nw.split(".") if l]
    if is_ip or len(labels) < 2:
        registered, sub, tld = host_nw, "", (labels[-1] if labels else "")
    else:
        last2 = ".".join(labels[-2:])
        if last2 in MULTI_PART_SUFFIXES and len(labels) >= 3:
            registered = ".".join(labels[-3:])
            sub = ".".join(labels[:-3])
            tld = last2
        else:
            registered = last2
            sub = ".".join(labels[:-2])
            tld = labels[-1]

    normalized = URL_RE.sub("", raw)
    if normalized.lower().startswith("www."):
        normalized = normalized[4:]

    return ParsedURL(
        raw=raw, normalized=normalized, scheme=scheme, host=host_nw, port=port,
        path=parts.path or "", query=parts.query or "",
        registered_domain=registered, subdomain=sub, tld=tld, is_ip=is_ip,
    )


def shannon_entropy(s: str) -> float:
    if not s:
        return 0.0
    counts = Counter(s)
    n = len(s)
    return -sum((c / n) * math.log2(c / n) for c in counts.values())


def _levenshtein(a: str, b: str, max_d: int = 3) -> int:
    if abs(len(a) - len(b)) > max_d:
        return max_d + 1
    prev = list(range(len(b) + 1))
    for i, ca in enumerate(a, 1):
        cur = [i]
        for j, cb in enumerate(b, 1):
            cur.append(min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (ca != cb)))
        prev = cur
    return prev[-1]


HOMOGLYPHS = str.maketrans({"0": "o", "1": "l", "3": "e", "4": "a", "5": "s", "7": "t", "8": "b", "@": "a"})


def detect_brand_signals(p: ParsedURL) -> tuple[str | None, str | None]:
    """Return (impersonated_brand, typosquatted_brand)."""
    domain_label = p.registered_domain.split(".")[0] if p.registered_domain else ""
    impersonated = None
    typo = None
    lower_all = (p.subdomain + "/" + p.path + "?" + p.query).lower()
    lower_all = lower_all + " " + lower_all.translate(HOMOGLYPHS)
    for brand in BRANDS:
        if len(brand) < 4:
            continue
        if domain_label == brand:
            continue
        # brand appears in subdomain/path, or embedded in the registered label
        if brand in lower_all or (brand in domain_label and domain_label != brand):
            impersonated = brand
            break
    if domain_label and not p.is_ip:
        normalized_label = domain_label.translate(HOMOGLYPHS).replace("-", "")
        for brand in BRANDS:
            if len(brand) < 5 or domain_label == brand:
                continue
            if normalized_label == brand or (
                abs(len(normalized_label) - len(brand)) <= 2
                and 0 < _levenshtein(normalized_label, brand, 2) <= (1 if len(brand) < 7 else 2)
            ):
                typo = brand
                break
    return impersonated, typo


def extract_url_features(url: str) -> list[float]:
    p = parse_url(url)
    n = p.normalized
    lower = n.lower()
    host = p.host
    url_len = len(n)

    digits = sum(ch.isdigit() for ch in n)
    tokens = [t for t in re.split(r"[/\.\?=&\-_:@]", n) if t]
    labels = [l for l in host.split(".") if l]
    num_sub = 0 if p.is_ip else (len([l for l in p.subdomain.split(".") if l]))
    kw_count = sum(1 for kw in SUSPICIOUS_KEYWORDS if kw in lower)
    impersonated, typo = detect_brand_signals(p)
    letters_host = [c for c in host if c.isalpha()]
    vowels = sum(c in "aeiou" for c in letters_host)
    max_repeat = max((len(m.group(0)) for m in re.finditer(r"(.)\1*", n)), default=0)
    path_after_scheme = n.split("/", 1)[1] if "/" in n else ""

    feats = [
        url_len,
        len(host),
        len(p.path),
        len(p.query),
        host.count("."),
        num_sub,
        n.count("-"),
        host.count("-"),
        n.count("_"),
        n.count("/"),
        digits,
        digits / url_len if url_len else 0.0,
        sum(ch in SPECIAL_CHARS for ch in n),
        1 if "@" in n else 0,
        1 if p.is_ip else 0,
        1 if "//" in path_after_scheme else 0,
        len([q for q in p.query.split("&") if q]) if p.query else 0,
        kw_count,
        1 if impersonated else 0,
        1 if typo else 0,
        1 if p.tld in SUSPICIOUS_TLDS else 0,
        shannon_entropy(host),
        shannon_entropy(lower),
        1 if "xn--" in host else 0,
        max((len(t) for t in tokens), default=0),
        1 if host in SHORTENERS or p.registered_domain in SHORTENERS else 0,
        1 if re.search(r"\.(php|asp|aspx|jsp|cgi|exe|scr|zip|apk|js)\b", p.path.lower()) else 0,
        len(re.findall(r"%[0-9a-fA-F]{2}", n)),
        len(p.tld),
        len([s for s in p.path.split("/") if s]),
        1 if p.port and p.port not in (80, 443) else 0,
        sum(ch.isdigit() for ch in host),
        vowels / len(letters_host) if letters_host else 0.0,
        max_repeat,
    ]
    return [float(x) for x in feats]


def is_valid_url(url: str) -> tuple[bool, str]:
    """Input validation (Synopsis Stage 2)."""
    if not url or not url.strip():
        return False, "URL cannot be empty."
    url = url.strip()
    if len(url) > 2048:
        return False, "URL is too long (max 2048 characters)."
    if re.search(r"\s", url):
        return False, "URL must not contain whitespace."
    if URL_RE.match(url):
        scheme = url.split("://", 1)[0].lower()
        if scheme not in ("http", "https", "ftp"):
            return False, f"Unsupported protocol '{scheme}'. Use http or https."
    p = parse_url(url)
    if not p.host:
        return False, "Could not find a hostname in this URL."
    if not p.is_ip and "." not in p.host:
        return False, "Hostname must contain a domain and a TLD (e.g. example.com)."
    if not re.fullmatch(r"[a-z0-9.\-_]+", p.host):
        # punycode is fine, raw unicode hosts are converted by the browser
        try:
            p.host.encode("idna")
        except UnicodeError:
            return False, "Hostname contains invalid characters."
    return True, ""
