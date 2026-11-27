"""
PhishGuard AI - model training & evaluation pipeline.

Usage (from the backend/ folder):
    python -m ml.train            # download data (if needed), train, evaluate, save
    python -m ml.train --quick    # smaller sample, for a fast smoke test

What it does (Synopsis Modules 2-4 / Stages 3-5):
  1. Downloads public, labelled datasets (see DATASETS below).
  2. Cleans, de-duplicates and balances them.
  3. URL: extracts 34 hand-crafted lexical/structural features and compares six
     algorithms (Logistic Regression, Decision Tree, Random Forest, SVM,
     Naive Bayes, Gradient Boosting) on a held-out 20 % test split. A
     character n-gram model is trained as a second "view" and soft-voted with
     the best feature model.
  4. Email: TF-IDF (uni+bi-grams) text features, same six algorithm families.
  5. Saves the deployed models with joblib and writes every metric, confusion
     matrix, ROC curve and feature importance to artifacts/metrics.json, which
     the web app's "Model Insights" page renders.
"""
from __future__ import annotations

import argparse
import io
import json
import random
import time
import zipfile
from datetime import datetime, timezone
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
import requests
from sklearn.calibration import CalibratedClassifierCV
from sklearn.ensemble import HistGradientBoostingClassifier, RandomForestClassifier, GradientBoostingClassifier
from sklearn.feature_extraction.text import HashingVectorizer, TfidfTransformer, TfidfVectorizer
from sklearn.feature_selection import SelectKBest, chi2
from sklearn.inspection import permutation_importance
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (accuracy_score, confusion_matrix, f1_score, precision_score,
                             recall_score, roc_auc_score, roc_curve)
from sklearn.model_selection import train_test_split
from sklearn.naive_bayes import GaussianNB, MultinomialNB
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.svm import LinearSVC
from sklearn.tree import DecisionTreeClassifier

from . import email_augment
from .email_features import normalize_email_text
from .url_features import FEATURE_LABELS, FEATURE_NAMES, extract_url_features, parse_url

BASE = Path(__file__).resolve().parent
RAW = BASE.parent / "data" / "raw"
ART = BASE / "artifacts"
SEED = 42

DATASETS = {
    "malicious_urls": {
        "url": "https://raw.githubusercontent.com/faizann24/Using-machine-learning-to-detect-malicious-URLs/master/data/data.csv",
        "file": "malicious_urls.csv",
        "desc": "Labelled good/bad URL corpus (~420k URLs) - faizann24/Using-machine-learning-to-detect-malicious-URLs",
    },
    "phishing_database": {
        "url": "https://raw.githubusercontent.com/mitchellkrogza/Phishing.Database/master/phishing-links-ACTIVE.txt",
        "file": "phishing_links_active.txt",
        "desc": "Active phishing links feed - mitchellkrogza/Phishing.Database",
    },
    "top_domains": {
        "url": "https://raw.githubusercontent.com/zer0h/top-1000000-domains/master/top-10000-domains",
        "file": "top_domains.txt",
        "desc": "Top-10k most popular domains - zer0h/top-1000000-domains",
    },
    "enron_spam": {
        "url": "https://raw.githubusercontent.com/MWiechmann/enron_spam_data/master/enron_spam_data.zip",
        "file": "enron_spam_data.csv",
        "desc": "Enron-Spam corpus (Metsis et al., 2006), ~33.7k ham/spam emails - MWiechmann/enron_spam_data",
    },
}


def log(msg: str) -> None:
    print(f"[{datetime.now():%H:%M:%S}] {msg}", flush=True)


def download_all() -> None:
    RAW.mkdir(parents=True, exist_ok=True)
    for key, d in DATASETS.items():
        target = RAW / d["file"]
        if target.exists() and target.stat().st_size > 0:
            continue
        log(f"Downloading {key} ...")
        r = requests.get(d["url"], timeout=300)
        r.raise_for_status()
        if d["url"].endswith(".zip"):
            with zipfile.ZipFile(io.BytesIO(r.content)) as z:
                name = [n for n in z.namelist() if n.endswith(".csv")][0]
                target.write_bytes(z.read(name))
        else:
            target.write_bytes(r.content)


# --------------------------------------------------------------------------- #
# Dataset construction
# --------------------------------------------------------------------------- #
def build_url_dataset(n_per_class: int) -> tuple[pd.DataFrame, dict]:
    rnd = random.Random(SEED)
    df = pd.read_csv(RAW / DATASETS["malicious_urls"]["file"])
    df = df.dropna()
    good = df[df.label == "good"].url.astype(str).tolist()
    bad = df[df.label == "bad"].url.astype(str).tolist()

    with open(RAW / DATASETS["phishing_database"]["file"], encoding="utf-8", errors="ignore") as f:
        phish = [l.strip() for l in f if l.strip() and not l.startswith("#")]
    top = [l.strip() for l in open(RAW / DATASETS["top_domains"]["file"]) if l.strip()]

    # Legitimate: popular domains (bare + with realistic paths borrowed from the good corpus)
    good_paths = [u.split("/", 1)[1] for u in rnd.sample(good, 20000) if "/" in u and len(u.split("/", 1)[1]) > 1]
    top_urls = []
    for d in top:
        top_urls.append(rnd.choice(["", "www.", "https://", "https://www."]) + d + rnd.choice(["", "/"]))
        top_urls.append(rnd.choice(["https://", "https://www.", ""]) + d + "/" + rnd.choice(good_paths))

    n_good_corpus = n_per_class - len(top_urls) if n_per_class > len(top_urls) else n_per_class // 2
    legit = rnd.sample(good, min(len(good), n_good_corpus)) + top_urls[: n_per_class - n_good_corpus]
    n_phish_db = min(len(phish), int(n_per_class * 0.6))
    malicious = rnd.sample(phish, n_phish_db) + rnd.sample(bad, min(len(bad), n_per_class - n_phish_db))

    data = pd.DataFrame({"url": legit + malicious, "label": [0] * len(legit) + [1] * len(malicious)})
    data["norm"] = data.url.map(lambda u: parse_url(u).normalized.lower().rstrip("/"))
    before = len(data)
    data = data.drop_duplicates("norm").drop_duplicates("url")
    data = data[data.norm.str.len() > 3].sample(frac=1, random_state=SEED).reset_index(drop=True)
    info = {
        "total": int(len(data)),
        "legitimate": int((data.label == 0).sum()),
        "phishing": int((data.label == 1).sum()),
        "duplicates_removed": int(before - len(data)),
        "sources": [DATASETS[k]["desc"] for k in ("malicious_urls", "phishing_database", "top_domains")],
    }
    return data, info


def build_email_dataset(max_rows: int | None, n_aug: int) -> tuple[pd.DataFrame, dict]:
    df = pd.read_csv(RAW / DATASETS["enron_spam"]["file"])
    df["text"] = ("Subject: " + df["Subject"].fillna("") + "\n" + df["Message"].fillna("")).str.slice(0, 6000)
    df["label"] = (df["Spam/Ham"].str.lower() == "spam").astype(int)
    df = df[df.text.str.len() > 30][["text", "label"]]
    if max_rows and len(df) > max_rows:
        df = df.sample(max_rows, random_state=SEED)
    aug_texts, aug_labels = email_augment.generate(n_aug, SEED)
    aug = pd.DataFrame({"text": aug_texts, "label": aug_labels})
    df["source"] = "enron"
    aug["source"] = "augmented"
    data = pd.concat([df, aug], ignore_index=True)
    data["norm"] = data.text.map(normalize_email_text)
    before = len(data)
    data = data.drop_duplicates("norm")
    data = data[data.norm.str.split().str.len() >= 3].sample(frac=1, random_state=SEED).reset_index(drop=True)
    info = {
        "total": int(len(data)),
        "legitimate": int((data.label == 0).sum()),
        "phishing": int((data.label == 1).sum()),
        "augmented_samples": int((data.source == "augmented").sum()),
        "duplicates_removed": int(before - len(data)),
        "sources": [DATASETS["enron_spam"]["desc"],
                    "Template-based modern phishing / legitimate emails (ml/email_augment.py)"],
    }
    return data, info


# --------------------------------------------------------------------------- #
# Evaluation helpers
# --------------------------------------------------------------------------- #
def evaluate(name: str, y_true, proba, train_time: float) -> dict:
    pred = (proba >= 0.5).astype(int)
    fpr, tpr, _ = roc_curve(y_true, proba)
    idx = np.linspace(0, len(fpr) - 1, min(60, len(fpr))).astype(int)
    cm = confusion_matrix(y_true, pred).tolist()
    return {
        "name": name,
        "accuracy": round(float(accuracy_score(y_true, pred)), 4),
        "precision": round(float(precision_score(y_true, pred, zero_division=0)), 4),
        "recall": round(float(recall_score(y_true, pred, zero_division=0)), 4),
        "f1": round(float(f1_score(y_true, pred, zero_division=0)), 4),
        "roc_auc": round(float(roc_auc_score(y_true, proba)), 4),
        "train_time_s": round(train_time, 2),
        "confusion_matrix": cm,  # [[TN, FP], [FN, TP]]
        "roc": {"fpr": [round(float(x), 4) for x in fpr[idx]], "tpr": [round(float(x), 4) for x in tpr[idx]]},
    }


def fit_eval(name, model, Xtr, ytr, Xte, yte):
    t0 = time.time()
    model.fit(Xtr, ytr)
    dt = time.time() - t0
    proba = model.predict_proba(Xte)[:, 1]
    res = evaluate(name, yte, proba, dt)
    log(f"  {name:<22} acc={res['accuracy']:.4f} f1={res['f1']:.4f} auc={res['roc_auc']:.4f} ({dt:.1f}s)")
    return model, res, proba


# --------------------------------------------------------------------------- #
# URL models
# --------------------------------------------------------------------------- #
def train_url(n_per_class: int) -> dict:
    log("Building URL dataset ...")
    data, info = build_url_dataset(n_per_class)
    log(f"  {info['total']} URLs ({info['legitimate']} legitimate / {info['phishing']} phishing)")

    log("Extracting 34 URL features ...")
    t0 = time.time()
    X = np.array([extract_url_features(u) for u in data.url], dtype=np.float32)
    y = data.label.values
    log(f"  feature extraction took {time.time() - t0:.1f}s")

    idx_tr, idx_te = train_test_split(np.arange(len(y)), test_size=0.2, stratify=y, random_state=SEED)
    Xtr, Xte, ytr, yte = X[idx_tr], X[idx_te], y[idx_tr], y[idx_te]

    candidates = {
        "Logistic Regression": Pipeline([("scale", StandardScaler()), ("clf", LogisticRegression(max_iter=2000, C=1.0))]),
        "Decision Tree": DecisionTreeClassifier(max_depth=18, min_samples_leaf=3, random_state=SEED),
        "Random Forest": RandomForestClassifier(n_estimators=120, max_depth=24, min_samples_leaf=2,
                                                n_jobs=-1, random_state=SEED),
        "Support Vector Machine": Pipeline([("scale", StandardScaler()),
                                            ("clf", CalibratedClassifierCV(LinearSVC(C=0.5, dual=False), cv=3))]),
        "Naive Bayes": Pipeline([("scale", StandardScaler()), ("clf", GaussianNB())]),
        "Gradient Boosting": HistGradientBoostingClassifier(max_iter=400, learning_rate=0.08, max_leaf_nodes=63,
                                                            l2_regularization=1.0, random_state=SEED),
    }
    log("Training & comparing URL feature models ...")
    results, fitted, probas = [], {}, {}
    for name, model in candidates.items():
        m, res, proba = fit_eval(name, model, Xtr, ytr, Xte, yte)
        results.append(res)
        fitted[name] = m
        probas[name] = proba

    best = max(results, key=lambda r: (r["f1"], r["roc_auc"]))
    best_name = best["name"]
    log(f"  best feature model: {best_name}")

    log("Training character n-gram lexical model ...")
    lexical = Pipeline([
        ("hash", HashingVectorizer(analyzer="char", ngram_range=(3, 5), n_features=2 ** 19,
                                   alternate_sign=False, norm=None, lowercase=True)),
        ("tfidf", TfidfTransformer(sublinear_tf=True)),
        ("clf", LogisticRegression(max_iter=3000, C=8.0, solver="liblinear")),
    ])
    norm = data.norm.values
    _, lex_res, lex_proba = fit_eval("Char n-gram (TF-IDF + LR)", lexical, norm[idx_tr], ytr, norm[idx_te], yte)

    ens_proba = 0.5 * probas[best_name] + 0.5 * lex_proba
    ens_res = evaluate(f"Ensemble ({best_name} + Char n-gram)", yte, ens_proba, best["train_time_s"] + lex_res["train_time_s"])
    log(f"  ENSEMBLE acc={ens_res['accuracy']:.4f} f1={ens_res['f1']:.4f} auc={ens_res['roc_auc']:.4f}")

    log("Computing permutation feature importance ...")
    sub = np.random.RandomState(SEED).choice(len(yte), size=min(6000, len(yte)), replace=False)
    pi = permutation_importance(fitted[best_name], Xte[sub], yte[sub], scoring="f1", n_repeats=4,
                                random_state=SEED, n_jobs=-1)
    importances = sorted(
        [{"feature": f, "label": FEATURE_LABELS[f], "importance": round(float(v), 5)}
         for f, v in zip(FEATURE_NAMES, pi.importances_mean)],
        key=lambda d: -d["importance"],
    )

    baseline = np.median(Xtr[ytr == 0], axis=0).tolist()
    ART.mkdir(parents=True, exist_ok=True)
    joblib.dump({"model": fitted[best_name], "name": best_name, "feature_names": FEATURE_NAMES,
                 "legit_baseline": baseline}, ART / "url_feature_model.joblib", compress=3)
    joblib.dump(lexical, ART / "url_lexical_model.joblib", compress=3)

    # Feature statistics per class (for the research paper)
    stats = []
    for i, f in enumerate(FEATURE_NAMES):
        stats.append({"feature": f, "label": FEATURE_LABELS[f],
                      "legit_mean": round(float(X[y == 0, i].mean()), 3),
                      "phish_mean": round(float(X[y == 1, i].mean()), 3)})

    return {
        "dataset": {**info, "train_size": int(len(idx_tr)), "test_size": int(len(idx_te)),
                    "num_features": len(FEATURE_NAMES)},
        "models": results,
        "lexical_model": lex_res,
        "ensemble": ens_res,
        "deployed": {"feature_model": best_name, "lexical_model": "Char n-gram (TF-IDF + LR)",
                     "strategy": "Soft-voting average of feature model and char n-gram model"},
        "feature_importance": importances,
        "feature_stats": stats,
    }


# --------------------------------------------------------------------------- #
# Email models
# --------------------------------------------------------------------------- #
def train_email(max_rows: int | None, n_aug: int) -> dict:
    log("Building email dataset ...")
    data, info = build_email_dataset(max_rows, n_aug)
    log(f"  {info['total']} emails ({info['legitimate']} legitimate / {info['phishing']} phishing)")
    Xtr_t, Xte_t, ytr, yte = train_test_split(data.norm.values, data.label.values, test_size=0.2,
                                              stratify=data.label.values, random_state=SEED)

    def tfidf():
        return TfidfVectorizer(ngram_range=(1, 2), max_features=60000, min_df=2, max_df=0.9,
                               sublinear_tf=True, stop_words="english")

    candidates = {
        "Logistic Regression": Pipeline([("tfidf", tfidf()), ("clf", LogisticRegression(max_iter=3000, C=10))]),
        "Decision Tree": Pipeline([("tfidf", tfidf()), ("kbest", SelectKBest(chi2, k=3000)),
                                   ("clf", DecisionTreeClassifier(max_depth=40, min_samples_leaf=2, random_state=SEED))]),
        "Random Forest": Pipeline([("tfidf", tfidf()), ("kbest", SelectKBest(chi2, k=3000)),
                                   ("clf", RandomForestClassifier(n_estimators=150, n_jobs=-1, random_state=SEED))]),
        "Support Vector Machine": Pipeline([("tfidf", tfidf()),
                                            ("clf", CalibratedClassifierCV(LinearSVC(C=1.0), cv=3))]),
        "Naive Bayes": Pipeline([("tfidf", tfidf()), ("clf", MultinomialNB(alpha=0.05))]),
        "Gradient Boosting": Pipeline([("tfidf", tfidf()), ("kbest", SelectKBest(chi2, k=1500)),
                                       ("clf", GradientBoostingClassifier(n_estimators=150, max_depth=4,
                                                                          learning_rate=0.2, random_state=SEED))]),
    }
    log("Training & comparing email models ...")
    results, fitted = [], {}
    for name, model in candidates.items():
        m, res, _ = fit_eval(name, model, Xtr_t, ytr, Xte_t, yte)
        results.append(res)
        fitted[name] = m

    best = max(results, key=lambda r: (r["f1"], r["roc_auc"]))
    log(f"  best email model: {best['name']}")

    # Top indicative terms from the (always-trained) logistic regression for the insights page
    lr = fitted["Logistic Regression"]
    vocab = np.array(lr.named_steps["tfidf"].get_feature_names_out())
    coef = lr.named_steps["clf"].coef_[0]
    order = np.argsort(coef)
    top_phish = [{"term": vocab[i], "weight": round(float(coef[i]), 3)} for i in order[::-1][:25]]
    top_legit = [{"term": vocab[i], "weight": round(float(coef[i]), 3)} for i in order[:25]]

    joblib.dump({"model": fitted[best["name"]], "name": best["name"]}, ART / "email_model.joblib", compress=3)
    return {
        "dataset": {**info, "train_size": int(len(ytr)), "test_size": int(len(yte)),
                    "vectorizer": "TF-IDF, unigrams + bigrams, 60k vocabulary, English stop-words removed"},
        "models": results,
        "deployed": {"model": best["name"]},
        "top_phishing_terms": top_phish,
        "top_legitimate_terms": top_legit,
    }


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--quick", action="store_true", help="small sample for a fast smoke test")
    ap.add_argument("--only", choices=["url", "email"], help="retrain a single model family")
    args = ap.parse_args()
    t0 = time.time()
    download_all()
    old = json.loads((ART / "metrics.json").read_text()) if (ART / "metrics.json").exists() else {}
    url_metrics, email_metrics = old.get("url"), old.get("email")
    if args.only != "email":
        url_metrics = train_url(8000 if args.quick else 60000)
    if args.only != "url":
        email_metrics = train_email(6000, 600) if args.quick else train_email(None, 5000)
    metrics = {
        "generated_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "test_split": 0.2,
        "random_seed": SEED,
        "sklearn_version": __import__("sklearn").__version__,
        "url": url_metrics,
        "email": email_metrics,
    }
    (ART / "metrics.json").write_text(json.dumps(metrics, indent=2))
    log(f"Done in {time.time() - t0:.0f}s. Artifacts written to {ART}")


if __name__ == "__main__":
    main()
