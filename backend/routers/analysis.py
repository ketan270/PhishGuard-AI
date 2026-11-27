import re
import time
from collections import defaultdict, deque
from datetime import datetime, timedelta, timezone
from typing import Optional

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel, Field

from database import analysis_collection
from deps import get_current_user_id
from ml import engine

router = APIRouter(prefix="/api/analysis", tags=["analysis"])


class URLRequest(BaseModel):
    url: str = Field(max_length=2048)


class EmailRequest(BaseModel):
    email_text: str = Field(max_length=50000)


class QuickRequest(BaseModel):
    input: str = Field(max_length=5000)
    type: str = "auto"  # "url" | "email" | "auto"


def _run(fn, value):
    try:
        return fn(value)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except engine.ModelsNotTrained as e:
        raise HTTPException(status_code=503, detail=str(e))


def _serialize(doc: dict) -> dict:
    doc = dict(doc)
    doc["_id"] = str(doc["_id"])
    ts = doc.get("timestamp")
    if isinstance(ts, datetime):
        if ts.tzinfo is None:
            ts = ts.replace(tzinfo=timezone.utc)
        doc["timestamp"] = ts.isoformat()
    return doc


def _store(user_id: str, result: dict, stored_input: str) -> dict:
    doc = {**result, "input": stored_input, "user_id": user_id, "timestamp": datetime.now(timezone.utc)}
    res = analysis_collection.insert_one(doc)
    doc["_id"] = res.inserted_id
    return _serialize(doc)


@router.post("/url")
def analyze_url(req: URLRequest, user_id: str = Depends(get_current_user_id)):
    t0 = time.perf_counter()
    result = _run(engine.analyze_url, req.url)
    result["processing_ms"] = round((time.perf_counter() - t0) * 1000, 1)
    return _store(user_id, result, result["input"])


@router.post("/email")
def analyze_email(req: EmailRequest, user_id: str = Depends(get_current_user_id)):
    t0 = time.perf_counter()
    result = _run(engine.analyze_email, req.email_text)
    result["processing_ms"] = round((time.perf_counter() - t0) * 1000, 1)
    return _store(user_id, result, req.email_text[:8000])


# Very small in-memory rate limiter for the public demo endpoint
_hits: dict[str, deque] = defaultdict(deque)


def _rate_limit(request: Request, limit: int = 30, window: int = 60):
    ip = request.client.host if request.client else "anon"
    q = _hits[ip]
    now = time.time()
    while q and now - q[0] > window:
        q.popleft()
    if len(q) >= limit:
        raise HTTPException(status_code=429, detail="Too many requests - please wait a minute.")
    q.append(now)


@router.post("/quick")
def quick_scan(req: QuickRequest, request: Request):
    """Public, non-persisted scan used by the landing-page live demo."""
    _rate_limit(request)
    kind = req.type
    text = req.input.strip()
    if kind == "auto":
        kind = "url" if (" " not in text and "\n" not in text and "." in text) else "email"
    t0 = time.perf_counter()
    result = _run(engine.analyze_url if kind == "url" else engine.analyze_email, text)
    result["processing_ms"] = round((time.perf_counter() - t0) * 1000, 1)
    return result


@router.get("/history")
def get_history(
    user_id: str = Depends(get_current_user_id),
    type: Optional[str] = Query(None, pattern="^(URL|Email)$"),
    risk: Optional[str] = Query(None, pattern="^(Low|Medium|High)$"),
    q: Optional[str] = Query(None, max_length=200),
    limit: int = Query(50, ge=1, le=200),
    skip: int = Query(0, ge=0),
):
    flt: dict = {"user_id": user_id}
    if type:
        flt["analysis_type"] = type
    if risk:
        flt["risk_level"] = risk
    if q:
        flt["input"] = {"$regex": re.escape(q), "$options": "i"}
    total = analysis_collection.count_documents(flt)
    projection = {"feature_contributions": 0, "features": 0, "term_contributions": 0}
    cur = analysis_collection.find(flt, projection).sort("timestamp", -1).skip(skip).limit(limit)
    items = []
    for d in cur:
        d = _serialize(d)
        if d.get("analysis_type") == "Email" and len(d.get("input", "")) > 160:
            d["input"] = d["input"][:160] + "…"
        items.append(d)
    return {"total": total, "history": items}


def _oid(analysis_id: str) -> ObjectId:
    try:
        return ObjectId(analysis_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Analysis not found")


@router.get("/history/{analysis_id}")
def get_analysis(analysis_id: str, user_id: str = Depends(get_current_user_id)):
    doc = analysis_collection.find_one({"_id": _oid(analysis_id), "user_id": user_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Analysis not found")
    return _serialize(doc)


@router.delete("/history/{analysis_id}")
def delete_analysis(analysis_id: str, user_id: str = Depends(get_current_user_id)):
    res = analysis_collection.delete_one({"_id": _oid(analysis_id), "user_id": user_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Analysis not found")
    return {"deleted": True}


@router.delete("/history")
def clear_history(user_id: str = Depends(get_current_user_id)):
    res = analysis_collection.delete_many({"user_id": user_id})
    return {"deleted": res.deleted_count}


@router.get("/stats")
def stats(user_id: str = Depends(get_current_user_id)):
    docs = list(analysis_collection.find(
        {"user_id": user_id},
        {"risk_level": 1, "analysis_type": 1, "prediction": 1, "risk_score": 1, "timestamp": 1, "input": 1, "indicators": 1},
    ).sort("timestamp", -1))
    by_risk = {"Low": 0, "Medium": 0, "High": 0}
    by_type = {"URL": 0, "Email": 0}
    phishing = 0
    indicator_counts: dict[str, int] = defaultdict(int)
    today = datetime.now(timezone.utc).date()
    days = {(today - timedelta(days=i)).isoformat(): {"date": (today - timedelta(days=i)).isoformat(),
                                                      "safe": 0, "suspicious": 0, "phishing": 0}
            for i in range(13, -1, -1)}
    for d in docs:
        by_risk[d.get("risk_level", "Low")] = by_risk.get(d.get("risk_level", "Low"), 0) + 1
        by_type[d.get("analysis_type", "URL")] = by_type.get(d.get("analysis_type", "URL"), 0) + 1
        if d.get("prediction") == "Phishing":
            phishing += 1
        for ind in d.get("indicators", []):
            if ind.get("severity") in ("high", "medium"):
                indicator_counts[ind["title"]] += 1
        ts = d.get("timestamp")
        if isinstance(ts, datetime):
            key = ts.date().isoformat()
            if key in days:
                bucket = {"Low": "safe", "Medium": "suspicious", "High": "phishing"}[d.get("risk_level", "Low")]
                days[key][bucket] += 1
    recent = []
    for d in docs[:5]:
        d = _serialize(d)
        d.pop("indicators", None)
        if len(d.get("input", "")) > 90:
            d["input"] = d["input"][:90] + "…"
        recent.append(d)
    total = len(docs)
    return {
        "total": total,
        "phishing": phishing,
        "safe": total - phishing,
        "by_risk": by_risk,
        "by_type": by_type,
        "avg_risk_score": round(sum(d.get("risk_score", 0) for d in docs) / total, 1) if total else 0,
        "timeline": list(days.values()),
        "top_indicators": sorted(({"title": k, "count": v} for k, v in indicator_counts.items()),
                                 key=lambda x: -x["count"])[:6],
        "recent": recent,
    }
