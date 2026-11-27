"""End-to-end API tests using FastAPI's TestClient (uses the local embedded DB)."""
import uuid

from fastapi.testclient import TestClient

from main import app

client = TestClient(app)


def _auth():
    email = f"test-{uuid.uuid4().hex[:8]}@example.com"
    r = client.post("/api/auth/register", json={"name": "Test User", "email": email, "password": "Secure123"})
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['access_token']}"}, email


def test_health():
    assert client.get("/api/health").json()["status"] == "ok"


def test_register_rejects_weak_password():
    r = client.post("/api/auth/register", json={"name": "A B", "email": "weak@example.com", "password": "short"})
    assert r.status_code == 400


def test_login_flow():
    _, email = _auth()
    assert client.post("/api/auth/login", json={"email": email, "password": "wrong-pass1"}).status_code == 400
    r = client.post("/api/auth/login", json={"email": email, "password": "Secure123"})
    assert r.status_code == 200 and "access_token" in r.json()


def test_protected_routes_require_token():
    assert client.post("/api/analysis/url", json={"url": "https://google.com"}).status_code == 401
    assert client.get("/api/analysis/history").status_code == 401


def test_analysis_history_and_stats():
    h, _ = _auth()
    r = client.post("/api/analysis/url", json={"url": "http://192.168.4.21/bank/login.php"}, headers=h)
    assert r.status_code == 200 and r.json()["risk_level"] == "High"
    aid = r.json()["_id"]
    r = client.post("/api/analysis/email", json={"email_text": "Hi team, the standup is moved to 10:30 tomorrow. Thanks!"}, headers=h)
    assert r.status_code == 200 and r.json()["risk_level"] == "Low"

    hist = client.get("/api/analysis/history", headers=h).json()
    assert hist["total"] == 2
    assert client.get("/api/analysis/history", params={"risk": "High"}, headers=h).json()["total"] == 1
    assert client.get(f"/api/analysis/history/{aid}", headers=h).json()["_id"] == aid

    stats = client.get("/api/analysis/stats", headers=h).json()
    assert stats["total"] == 2 and stats["by_risk"]["High"] == 1

    assert client.delete(f"/api/analysis/history/{aid}", headers=h).status_code == 200
    assert client.get(f"/api/analysis/history/{aid}", headers=h).status_code == 404


def test_invalid_url_returns_422():
    h, _ = _auth()
    assert client.post("/api/analysis/url", json={"url": "not a url"}, headers=h).status_code == 422


def test_quick_scan_public():
    r = client.post("/api/analysis/quick", json={"input": "https://www.google.com", "type": "url"})
    assert r.status_code == 200 and r.json()["risk_level"] == "Low"


def test_metrics_endpoint():
    m = client.get("/api/models/metrics").json()
    assert len(m["url"]["models"]) == 6 and len(m["email"]["models"]) == 6
