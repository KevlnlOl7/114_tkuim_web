# utils.py - Shared utilities for backend
import secrets
import hashlib
import os
import jwt
from datetime import datetime, timedelta
from functools import lru_cache
from bson import ObjectId

# --- Secret Key ---
_env_secret = os.getenv("SECRET_KEY")
if not _env_secret:
    print("⚠️  WARNING: SECRET_KEY not set in .env, using random key (tokens will invalidate on restart)")
    SECRET_KEY = secrets.token_hex(32)
else:
    SECRET_KEY = _env_secret
ALGORITHM = "HS256"

# --- Password Hashing (Salted SHA256) ---
def hash_password(password: str) -> str:
    salt = secrets.token_hex(8)  # 16 chars
    hashed = hashlib.sha256((salt + password).encode()).hexdigest()
    return f"{salt}${hashed}"

def verify_password(plain: str, hashed: str) -> bool:
    try:
        salt, hash_val = hashed.split('$')
        verify_hash = hashlib.sha256((salt + plain).encode()).hexdigest()
        return verify_hash == hash_val
    except ValueError:
        return False

# --- JWT Token ---
def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(days=7)  # 7 days expiry
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

# --- MongoDB Helper ---
def fix_id(doc):
    """Convert MongoDB _id to string id"""
    doc["id"] = str(doc.pop("_id"))
    return doc

# --- Invite Code Generator ---
import random
import string

def generate_invite_code(length: int = 6) -> str:
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=length))
