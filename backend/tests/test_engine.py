"""Unit tests for feature extraction and the prediction engine."""
import pytest

from ml import engine
from ml.email_features import is_valid_email_text, normalize_email_text
from ml.url_features import FEATURE_NAMES, extract_url_features, is_valid_url, parse_url


def test_feature_vector_length():
    assert len(extract_url_features("https://example.com/a?b=c")) == len(FEATURE_NAMES)


def test_parse_url_components():
    p = parse_url("http://login.secure.paypal.com.evil.co.uk/path?x=1")
    assert p.registered_domain == "evil.co.uk"
    assert p.subdomain == "login.secure.paypal.com"
    assert p.tld == "co.uk"


def test_ip_detection():
    f = dict(zip(FEATURE_NAMES, extract_url_features("http://192.168.1.10/login")))
    assert f["has_ip_address"] == 1


@pytest.mark.parametrize("url,ok", [
    ("https://google.com", True), ("google.com/search", True), ("", False),
    ("javascript:alert(1)", False), ("http://localhost", False), ("https://exa mple.com", False),
])
def test_url_validation(url, ok):
    assert is_valid_url(url)[0] is ok


def test_email_validation():
    assert not is_valid_email_text("hi")[0]
    assert is_valid_email_text("Hello team, the meeting is moved to Friday afternoon.")[0]


def test_normalize_email_masks_urls():
    assert "urltoken" in normalize_email_text("click http://x.com/login now")


@pytest.mark.parametrize("url", [
    "http://paypa1-secure-login.verify-account.tk/webscr?cmd=_login",
    "http://192.168.4.21/hdfc/netbanking/login.php",
    "https://www.icloud.com.verify-apple-id.info/signin",
])
def test_phishing_urls_flagged(url):
    r = engine.analyze_url(url)
    assert r["prediction"] == "Phishing" and r["risk_level"] == "High"
    assert r["feature_contributions"], "explanation should not be empty"


@pytest.mark.parametrize("url", ["https://www.google.com", "https://en.wikipedia.org/wiki/Phishing", "https://github.com"])
def test_legit_urls_low_risk(url):
    assert engine.analyze_url(url)["risk_level"] == "Low"


def test_phishing_email():
    r = engine.analyze_email("Dear Customer, your account is suspended. Verify your password immediately at http://secure-verify.tk/login")
    assert r["risk_level"] == "High"
    assert any(i["category"] == "urgency" for i in r["indicators"])


def test_legit_email():
    r = engine.analyze_email("Hi Priya, thanks for the notes from today's meeting. Let's finalise the report on Friday. Regards, Aman")
    assert r["risk_level"] == "Low"
