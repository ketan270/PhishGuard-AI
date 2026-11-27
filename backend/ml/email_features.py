"""
Email NLP feature extraction (Synopsis Module 4).

`normalize_email_text` is applied identically at training and inference time.
`linguistic_indicators` provides the rule-based, human-readable signals used
by the explainability layer (urgency, credential requests, ...).
"""
from __future__ import annotations

import re

URL_PATTERN = re.compile(
    r"(https?://[^\s<>\"')\]]+|www\.[^\s<>\"')\]]+|"
    r"\b[a-z0-9-]+(?:\.[a-z0-9-]+)*\.(?:com|net|org|info|xyz|top|ru|in|co|io|tk|ml|ga|cf|gq|ly|me|biz|online|site|live|club)(?:/[^\s<>\"')\]]*)?)",
    re.IGNORECASE,
)
ENRON_URL = re.compile(r"https?\s*:\s*/\s*/\s*\S+(?:\s*\.\s*\S+)*", re.IGNORECASE)
EMAIL_ADDR = re.compile(r"\b[\w.+-]+@[\w-]+\.[\w.-]+\b")
NUMBER = re.compile(r"\b\d+(?:[.,]\d+)*\b")
MONEY = re.compile(r"[$€£₹]\s?\d|\d\s?(usd|inr|rs\.?|dollars|euros)\b", re.IGNORECASE)

URGENCY_TERMS = [
    "urgent", "immediately", "act now", "right away", "as soon as possible",
    "within 24 hours", "within 48 hours", "expire", "expires", "expiring",
    "expired", "final notice", "last warning", "suspended", "suspension",
    "deactivated", "terminated", "locked", "limited time", "asap",
    "action required", "respond now", "failure to", "will be closed",
    "unusual activity", "unauthorized", "deadline",
]
CREDENTIAL_TERMS = [
    "password", "passcode", "username", "login", "log in", "sign in",
    "credentials", "verify your", "confirm your", "validate your",
    "update your", "security question", "pin", "otp", "one-time password",
    "social security", "ssn", "account details", "re-enter", "reactivate",
    "authenticate",
]
FINANCIAL_TERMS = [
    "bank", "credit card", "debit card", "card number", "cvv", "wire transfer",
    "payment", "invoice", "refund", "transaction", "billing", "paypal",
    "bitcoin", "crypto", "wallet", "gift card", "tax", "irs", "lottery",
    "prize", "winner", "inheritance", "beneficiary", "million", "cash",
    "reward", "claim", "compensation", "loan",
]
THREAT_TERMS = [
    "legal action", "penalty", "arrest", "lawsuit", "fine", "police",
    "permanently", "lose access", "blocked",
]
GENERIC_GREETINGS = [
    "dear customer", "dear user", "dear client", "dear member",
    "dear account holder", "dear sir/madam", "dear valued", "hello user",
    "dear beneficiary", "dear friend",
]
ATTACHMENT_TERMS = [".exe", ".scr", ".zip", ".rar", ".js", ".vbs", ".html attachment", "enable macros", "enable content"]


def extract_urls(text: str) -> list[str]:
    urls = []
    for m in URL_PATTERN.findall(text or ""):
        u = m.rstrip(".,;:!?")
        if u and u not in urls:
            urls.append(u)
    return urls[:15]


def normalize_email_text(text: str) -> str:
    t = (text or "").lower()
    t = ENRON_URL.sub(" urltoken ", t)
    t = URL_PATTERN.sub(" urltoken ", t)
    t = EMAIL_ADDR.sub(" emailtoken ", t)
    t = MONEY.sub(" moneytoken ", t)
    t = NUMBER.sub(" numtoken ", t)
    t = re.sub(r"[^a-z\s]", " ", t)
    t = re.sub(r"\s+", " ", t).strip()
    return t


def _hits(lower: str, terms: list[str]) -> list[str]:
    found = []
    for term in terms:
        if re.search(r"(?<![a-z])" + re.escape(term) + r"(?![a-z])", lower):
            found.append(term)
    return found


def linguistic_indicators(text: str) -> dict:
    lower = (text or "").lower()
    words = re.findall(r"[A-Za-z]+", text or "")
    caps_words = [w for w in words if len(w) > 2 and w.isupper()]
    return {
        "urgency": _hits(lower, URGENCY_TERMS),
        "credential": _hits(lower, CREDENTIAL_TERMS),
        "financial": _hits(lower, FINANCIAL_TERMS),
        "threat": _hits(lower, THREAT_TERMS),
        "generic_greeting": _hits(lower, GENERIC_GREETINGS),
        "attachment": [t for t in ATTACHMENT_TERMS if t in lower],
        "exclamations": (text or "").count("!"),
        "caps_ratio": (len(caps_words) / len(words)) if words else 0.0,
        "word_count": len(words),
        "urls": extract_urls(text or ""),
    }


def is_valid_email_text(text: str) -> tuple[bool, str]:
    if not text or not text.strip():
        return False, "Email content cannot be empty."
    if len(re.findall(r"[A-Za-z]+", text)) < 5:
        return False, "Please paste more of the email (at least 5 words) for a reliable analysis."
    if len(text) > 50000:
        return False, "Email content is too long (max 50,000 characters)."
    return True, ""
