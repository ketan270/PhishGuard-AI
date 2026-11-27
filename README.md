# PhishGuard AI: AI-Powered Phishing Detection & URL Risk Analysis

Exploratory Project · B.E. Computer Science & Engineering · Chitkara University
**Team:** Mahika Behal · Ketan Sharma · Ghanshyam Agrawal · Aviral Kaushik · **Supervisor:** Lalit Sharma

PhishGuard AI classifies suspicious **URLs** and **emails** with trained machine-learning models and explains every
verdict: prediction, confidence, 0-100 risk score, Low / Medium / High risk level, the indicators found, the
features/words that drove the model, and recommended actions. Every analysis is stored for history, dashboards and
PDF reports.

---

## Quick start

Requirements: **Python 3.11+** (recommended; the bundled models were trained with scikit-learn 1.9) and **Node.js 18+**.
On an older Python/scikit-learn the backend detects that the bundled models can't be loaded and **re-trains them automatically
in the background** on first start (about 3 minutes, needs internet to download the datasets). Set `AUTO_TRAIN=0` to disable this.

```bash
# 1. Backend
cd backend
python -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

```bash
# 2. Frontend (second terminal)
cd frontend
npm install
npm run dev                        # http://localhost:5173  (proxies /api to :8000)
```

The trained models are already included in `backend/ml/artifacts/`, so **no training is needed to run the app**.
API docs: http://localhost:8000/api/docs

### Single-server mode (for demos)

```bash
cd frontend && npm run build && cd ../backend && uvicorn main:app --port 8000
```

FastAPI then serves the built React app as well, so the whole system runs on http://localhost:8000.

### Database

* Set `MONGO_URI` (local MongoDB or MongoDB Atlas) to use real MongoDB:
  `MONGO_URI="mongodb://localhost:27017" uvicorn main:app`
* Without it, the app uses an embedded Mongo-compatible store persisted to `backend/data/local_db.json`, so it works out of the box.

### Optional configuration (environment variables)

| Variable | Purpose |
|---|---|
| `MONGO_URI`, `MONGO_DB` | MongoDB connection (default: embedded store, db `phishguard`) |
| `SECRET_KEY` | JWT signing key. **Set this in any real deployment.** |
| `GOOGLE_SAFE_BROWSING_KEY` | Enables the optional Google Safe Browsing threat-intel lookup |
| `CORS_ORIGINS` | Comma-separated allowed origins (default `*`) |
| `VITE_API_URL` | Frontend: API base URL when the frontend is hosted separately (e.g. Vercel) |

---

## Features (mapped to the synopsis modules)

| Module | Implementation |
|---|---|
| 1. Registration & Login | bcrypt-hashed passwords, password rules, JWT tokens, protected routes, logout |
| 2. URL Analysis Interface | URL input, validation (structure, protocol, hostname), error handling |
| 3. URL Feature Extraction | **34 features**: lengths, dots, subdomains, hyphens, digits, special chars, `@`, IP host, `//` redirect, query params, suspicious keywords, brand impersonation, typosquatting (edit distance + homoglyphs), risky TLD, entropy, punycode, shorteners, scripts, ports… (`backend/ml/url_features.py`) |
| 4. Email Analysis Engine | Text normalisation, TF-IDF uni+bi-grams, urgency / credential / financial / threat / greeting cues, embedded-link scanning (`backend/ml/email_features.py`) |
| 5. ML Prediction Engine | 6 algorithms compared per task; URL = Gradient Boosting + char n-gram ensemble, Email = Linear SVM (calibrated) |
| 6. Risk Scoring | Probability → 0-100 score, Low (<40) / Medium (40-69) / High (≥70), confidence |
| 7. Explainability | Occlusion-based local explanations (log-odds contribution of each feature / term) + rule indicators |
| 8. Analysis History | Search, filter by type/risk, delete, clear, CSV export |
| 9. Recommendations | Tailored to input type × risk level |
| 10. Report Generation | Formatted PDF report per analysis |
| External intelligence | Top-10k domain reputation, restricted registries (.edu/.gov/.ac.in…), optional Google Safe Browsing |
| Admin / monitoring | **Model Insights** page: metrics, ROC curves, confusion matrix, feature importance, dataset info |

---

## Machine-learning pipeline

Re-train everything (downloads the public datasets automatically, about 3 minutes on a laptop):

```bash
cd backend && python -m ml.train            # or: --quick, --only url, --only email
```

### Datasets

| Task | Source | Size used |
|---|---|---|
| URL | [faizann24 malicious-URL corpus](https://github.com/faizann24/Using-machine-learning-to-detect-malicious-URLs) (good/bad) + [Phishing.Database](https://github.com/mitchellkrogza/Phishing.Database) active phishing links + [top-10k domains](https://github.com/zer0h/top-1000000-domains) | 118,142 URLs (59,973 legit / 58,169 phishing), de-duplicated |
| Email | [Enron-Spam](https://github.com/MWiechmann/enron_spam_data) (Metsis et al., 2006) + template-generated modern phishing/legit emails (`ml/email_augment.py`) | 38,811 emails (19,471 / 19,340), 9,987 of them template-generated |

Stratified 80/20 train/test split, random seed 42. All numbers below are on the **held-out test set**.

### URL results (test n = 23,629)

| Model | Accuracy | Precision | Recall | F1 | ROC-AUC |
|---|---|---|---|---|---|
| Logistic Regression | 83.55% | 87.61% | 77.56% | 82.28% | 0.9113 |
| Decision Tree | 89.29% | 91.25% | 86.56% | 88.84% | 0.9337 |
| Random Forest | 92.22% | 93.34% | 90.67% | 91.98% | 0.9758 |
| Support Vector Machine | 83.26% | 87.37% | 77.15% | 81.94% | 0.9082 |
| Naive Bayes | 71.05% | 93.93% | 44.05% | 59.98% | 0.8417 |
| Gradient Boosting | 92.71% | 93.63% | 91.41% | 92.51% | 0.9782 |
| Char n-gram (TF-IDF + LR) | 95.84% | 96.84% | 94.65% | 95.73% | 0.9917 |
| **Ensemble (GB + Char n-gram)** | **96.49%** | **97.83%** | **94.98%** | **96.38%** | **0.9935** |

Most important features (permutation importance): path length, suspicious keywords, URL entropy, hostname length,
hyphens, longest token, TLD length, high-risk TLD.

### Email results (test n = 7,763)

| Model | Accuracy | Precision | Recall | F1 | ROC-AUC |
|---|---|---|---|---|---|
| Logistic Regression | 99.30% | 99.02% | 99.59% | 99.30% | 0.9996 |
| Decision Tree | 95.74% | 93.98% | 97.70% | 95.80% | 0.9651 |
| Random Forest | 98.60% | 98.43% | 98.76% | 98.59% | 0.9988 |
| **Support Vector Machine** | **99.42%** | **99.33%** | **99.51%** | **99.42%** | **0.9997** |
| Naive Bayes | 99.28% | 99.30% | 99.25% | 99.28% | 0.9996 |
| Gradient Boosting | 97.46% | 95.90% | 99.15% | 97.50% | 0.9975 |

Full metrics, confusion matrices, ROC points and per-class feature means are in
`backend/ml/artifacts/metrics.json` and on the **Model Insights** page.

### Honest limitations (useful for the paper's discussion section)

* **Dataset age / bias.** Many "legitimate" URLs in the public corpus are from ~2007-2010. To limit false positives on
  modern sites, a reputation layer down-weights the score for top-10k domains and restricted registries; it is shown to
  the user as an explicit adjustment.
* **Email metrics are optimistic.** About a quarter of the email corpus is template-generated, and templated text is easier
  to classify than real mail. Enron spam is general spam rather than pure phishing. Evaluating on a dedicated real phishing
  corpus (e.g. Nazario) is recommended future work.
* **Learned biases are visible.** In Enron, legitimate IT emails often mention "password", so the text model treats
  that word as slightly *legitimate*. The rule layer still flags credential requests, and the explanation exposes the
  bias instead of hiding it.
* URL-only analysis never visits the page (safe, but blind to page content), so a compromised legitimate domain can look safe.
* Predictions are advisory. A low score is not a guarantee of safety.

---

## Project structure

```
backend/
  main.py                 FastAPI app (+ serves frontend/dist if built)
  database.py             MongoDB / embedded store
  deps.py                 JWT helpers
  routers/                auth, analysis (url/email/quick/history/stats), models (metrics/health)
  ml/
    url_features.py       34-feature URL extractor + validation
    email_features.py     NLP normalisation + linguistic indicators
    email_augment.py      modern phishing/legit email templates
    train.py              data download, 6-model comparison, ensemble, metrics.json
    engine.py             inference, reputation layer, explanations, recommendations
    artifacts/            trained models (joblib) + metrics.json
  data/top-domains.txt    reputation list used at runtime
  tests/                  pytest suite (python -m pytest)
frontend/
  src/pages/              Home, Login, Register, Dashboard, Results, History, Insights, About, 404
  src/components/         LiveScanner, RiskGauge, ScanOverlay, CyberBackground, Navbar, ...
  src/lib/                api client, GSAP setup, PDF report, hooks
```

## Tests

```bash
cd backend && pip install -r requirements-dev.txt && python -m pytest -q
```

## Tech stack

Python, FastAPI, scikit-learn, Pandas, NumPy, Joblib, PyMongo, bcrypt, PyJWT · React 19, Vite, GSAP + ScrollTrigger,
Lenis, Recharts, jsPDF, lucide-react.
