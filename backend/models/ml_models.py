import re
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.naive_bayes import MultinomialNB
import nltk
from nltk.corpus import stopwords
import string

# Download required NLTK data during initialization if not present
try:
    nltk.data.find('tokenizers/punkt_tab')
except LookupError:
    nltk.download('punkt_tab')
    
try:
    nltk.data.find('corpora/stopwords')
except LookupError:
    nltk.download('stopwords')

# --- URL Model Setup ---
# Features: [url_length, num_dots, num_special_chars, has_ip, is_https, has_suspicious_keywords]
url_clf = RandomForestClassifier(n_estimators=50, random_state=42)

# Generate dummy training data to initialize model
X_url_train = np.array([
    [25, 2, 0, 0, 1, 0], # google.com
    [150, 4, 3, 0, 0, 1], # spammy url
    [45, 2, 1, 0, 1, 0], # github.com
    [35, 3, 0, 1, 0, 1], # ip address url
    [100, 5, 5, 0, 1, 1], # phishing url
    [30, 1, 0, 0, 1, 0], # legitimate
])
y_url_train = np.array([0, 1, 0, 1, 1, 0]) # 0 = Legitimate, 1 = Phishing
url_clf.fit(X_url_train, y_url_train)

suspicious_url_keywords = ['login', 'verify', 'update', 'secure', 'account', 'banking', 'free', 'bonus']

def extract_url_features(url: str):
    url_length = len(url)
    num_dots = url.count('.')
    num_special = sum(1 for c in url if c in ['-', '_', '@', '?', '=', '&'])
    has_ip = 1 if re.search(r'\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b', url) else 0
    is_https = 1 if url.startswith('https') else 0
    
    has_suspicious = 0
    lower_url = url.lower()
    for kw in suspicious_url_keywords:
        if kw in lower_url:
            has_suspicious = 1
            break
            
    return np.array([[url_length, num_dots, num_special, has_ip, is_https, has_suspicious]])

def get_url_indicators(url: str):
    indicators = []
    features = extract_url_features(url)[0]
    if features[0] > 75: indicators.append("Unusually long URL")
    if features[1] > 3: indicators.append("Multiple subdomains detected")
    if features[2] > 2: indicators.append("Many special characters")
    if features[3] == 1: indicators.append("IP address used instead of domain name")
    if features[4] == 0: indicators.append("Not using HTTPS (Insecure)")
    if features[5] == 1: indicators.append("Contains suspicious keywords (e.g., login, verify, secure)")
    return indicators

def analyze_url_logic(url: str):
    features = extract_url_features(url)
    prob = url_clf.predict_proba(features)[0]
    
    confidence = prob[1] * 100 if prob[1] > prob[0] else prob[0] * 100
    is_phishing = bool(prob[1] > 0.5)
    
    risk_level = "Low"
    if is_phishing:
        if confidence > 80: risk_level = "High"
        else: risk_level = "Medium"
    else:
        if confidence < 70: risk_level = "Medium"
        
    indicators = get_url_indicators(url)
    if not is_phishing and not indicators:
        indicators.append("No major suspicious indicators detected")
        
    return {
        "prediction": "Phishing" if is_phishing else "Legitimate",
        "confidence": round(confidence, 1),
        "risk_level": risk_level,
        "indicators": indicators
    }

# --- Email Model Setup ---
email_clf = MultinomialNB()
tfidf = TfidfVectorizer(stop_words='english', max_features=1000)

# Dummy training data
email_corpus = [
    "Dear user, your account has been compromised. Please login to verify your identity immediately.",
    "Hey team, don't forget about the meeting tomorrow at 10 AM.",
    "URGENT: Claim your free $1000 gift card now! Click the link below.",
    "The attached invoice is ready for your review.",
    "Your banking credentials need to be updated. Please provide your password.",
    "Can we catch up later today to discuss the project?"
]
y_email_train = np.array([1, 0, 1, 0, 1, 0])
X_email_train = tfidf.fit_transform(email_corpus)
email_clf.fit(X_email_train, y_email_train)

def get_email_indicators(text: str):
    indicators = []
    lower_text = text.lower()
    if any(word in lower_text for word in ['urgent', 'immediately', 'act now']):
        indicators.append("Creates a false sense of urgency")
    if any(word in lower_text for word in ['password', 'credentials', 'social security', 'credit card']):
        indicators.append("Requests sensitive personal or financial information")
    if any(word in lower_text for word in ['free', 'winner', 'gift card', 'bonus']):
        indicators.append("Contains suspicious offers or financial rewards")
    if 'http' in lower_text:
        indicators.append("Contains embedded links (Verify before clicking)")
    return indicators

def analyze_email_logic(text: str):
    vec = tfidf.transform([text])
    prob = email_clf.predict_proba(vec)[0]
    
    confidence = prob[1] * 100 if prob[1] > prob[0] else prob[0] * 100
    is_phishing = bool(prob[1] > 0.5)
    
    risk_level = "Low"
    if is_phishing:
        if confidence > 80: risk_level = "High"
        else: risk_level = "Medium"
    else:
        if confidence < 70: risk_level = "Medium"
        
    indicators = get_email_indicators(text)
    if not is_phishing and not indicators:
        indicators.append("Language appears normal with no strong phishing indicators")
        
    return {
        "prediction": "Phishing" if is_phishing else "Legitimate",
        "confidence": round(confidence, 1),
        "risk_level": risk_level,
        "indicators": indicators
    }
