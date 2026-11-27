import re
from datetime import datetime, timezone

import bcrypt
from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr, Field

from database import analysis_collection, users_collection
from deps import create_access_token, get_current_user_id

router = APIRouter(prefix="/api/auth", tags=["auth"])


class UserRegister(BaseModel):
    name: str = Field(min_length=2, max_length=60)
    email: EmailStr
    password: str = Field(max_length=128)


class UserLogin(BaseModel):
    email: EmailStr
    password: str


def validate_password(pw: str) -> None:
    problems = []
    if len(pw) < 8:
        problems.append("at least 8 characters")
    if not re.search(r"[A-Za-z]", pw):
        problems.append("a letter")
    if not re.search(r"\d", pw):
        problems.append("a number")
    if problems:
        raise HTTPException(status_code=400, detail="Password must contain " + ", ".join(problems) + ".")


def hash_password(pw: str) -> str:
    return bcrypt.hashpw(pw.encode(), bcrypt.gensalt()).decode()


def verify_password(pw: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(pw.encode(), hashed.encode())
    except ValueError:
        return False


def public_user(doc) -> dict:
    return {"id": str(doc["_id"]), "name": doc["name"], "email": doc["email"],
            "created_at": doc.get("created_at").isoformat() if doc.get("created_at") else None}


def _token_response(doc) -> dict:
    token = create_access_token({"sub": doc["email"], "user_id": str(doc["_id"])})
    return {"access_token": token, "token_type": "bearer", "user": public_user(doc)}


@router.post("/register")
def register(user: UserRegister):
    email = user.email.lower()
    if users_collection.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="An account with this email already exists.")
    validate_password(user.password)
    doc = {"name": user.name.strip(), "email": email, "password_hash": hash_password(user.password),
           "created_at": datetime.now(timezone.utc)}
    res = users_collection.insert_one(doc)
    doc["_id"] = res.inserted_id
    return {"message": "Account created successfully", **_token_response(doc)}


@router.post("/login")
def login(user: UserLogin):
    doc = users_collection.find_one({"email": user.email.lower()})
    if not doc or not verify_password(user.password, doc["password_hash"]):
        raise HTTPException(status_code=400, detail="Incorrect email or password.")
    return _token_response(doc)


@router.get("/me")
def me(user_id: str = Depends(get_current_user_id)):
    try:
        doc = users_collection.find_one({"_id": ObjectId(user_id)})
    except Exception:
        doc = None
    if not doc:
        raise HTTPException(status_code=401, detail="User no longer exists")
    out = public_user(doc)
    out["total_scans"] = analysis_collection.count_documents({"user_id": user_id})
    return out
