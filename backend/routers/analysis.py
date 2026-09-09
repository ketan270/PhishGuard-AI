from fastapi import APIRouter, HTTPException, Depends, Header
from pydantic import BaseModel
from database import analysis_collection
from models.ml_models import analyze_url_logic, analyze_email_logic
from datetime import datetime
import jwt
import os

router = APIRouter(prefix="/api/analysis", tags=["analysis"])
SECRET_KEY = os.getenv("SECRET_KEY", "super-secret-key-for-phishguard-ai")
ALGORITHM = "HS256"

class URLRequest(BaseModel):
    url: str

class EmailRequest(BaseModel):
    email_text: str

def get_current_user_id(authorization: str = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid token")
    token = authorization.split(" ")[1]
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload.get("user_id")
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

@router.post("/url")
def analyze_url(req: URLRequest, user_id: str = Depends(get_current_user_id)):
    if not req.url:
        raise HTTPException(status_code=400, detail="URL cannot be empty")
        
    result = analyze_url_logic(req.url)
    
    doc = {
        "user_id": user_id,
        "input": req.url,
        "analysis_type": "URL",
        "prediction": result["prediction"],
        "confidence": result["confidence"],
        "risk_level": result["risk_level"],
        "indicators": result["indicators"],
        "timestamp": datetime.utcnow()
    }
    
    analysis_collection.insert_one(doc)
    doc["_id"] = str(doc["_id"]) # stringify for json response
    
    return doc

@router.post("/email")
def analyze_email(req: EmailRequest, user_id: str = Depends(get_current_user_id)):
    if not req.email_text:
        raise HTTPException(status_code=400, detail="Email text cannot be empty")
        
    result = analyze_email_logic(req.email_text)
    
    doc = {
        "user_id": user_id,
        "input": req.email_text[:100] + "..." if len(req.email_text) > 100 else req.email_text, # truncate for history
        "analysis_type": "Email",
        "prediction": result["prediction"],
        "confidence": result["confidence"],
        "risk_level": result["risk_level"],
        "indicators": result["indicators"],
        "timestamp": datetime.utcnow()
    }
    
    analysis_collection.insert_one(doc)
    doc["_id"] = str(doc["_id"])
    
    return doc

@router.get("/history")
def get_history(user_id: str = Depends(get_current_user_id)):
    history = list(analysis_collection.find({"user_id": user_id}).sort("timestamp", -1).limit(50))
    for h in history:
        h["_id"] = str(h["_id"])
    return {"history": history}
