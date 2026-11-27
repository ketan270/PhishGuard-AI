from fastapi import APIRouter, HTTPException

from database import DB_BACKEND
from ml import engine

router = APIRouter(prefix="/api", tags=["models"])


@router.get("/models/metrics")
def model_metrics():
    try:
        return engine.get_metrics()
    except engine.ModelsNotTrained as e:
        raise HTTPException(status_code=503, detail=str(e))


@router.get("/health")
def health():
    try:
        m = engine.models()
        return {"status": "ok", "database": DB_BACKEND, "url_model": m.url_feature_name,
                "email_model": m.email_model_name, "models_trained_at": m.metrics.get("generated_at")}
    except engine.ModelsNotTrained as e:
        return {"status": "degraded", "database": DB_BACKEND, "detail": str(e)}
