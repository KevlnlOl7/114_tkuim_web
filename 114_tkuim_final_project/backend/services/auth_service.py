"""
Auth Service - Authentication and User Management Business Logic

This module contains authentication-related business logic extracted from main.py.
"""
import re
import hashlib
import secrets
from datetime import datetime, timedelta
from typing import Optional, Tuple
import jwt

from database import users_collection, families_collection

# Password hashing
def hash_password(password: str) -> str:
    """Hash a password using SHA-256"""
    return hashlib.sha256(password.encode()).hexdigest()

def verify_password(plain: str, hashed: str) -> bool:
    """Verify a password against its hash"""
    return hash_password(plain) == hashed


# Password validation
def validate_password_strength(password: str) -> Tuple[bool, str]:
    """
    Validate password strength.
    Returns (is_valid, error_message)
    
    Requirements:
    - At least 8 characters
    - Contains uppercase letter
    - Contains lowercase letter
    - Contains number
    """
    if len(password) < 8:
        return False, "密碼長度至少需要 8 個字元"
    if not re.search(r'[A-Z]', password):
        return False, "密碼必須包含大寫字母"
    if not re.search(r'[a-z]', password):
        return False, "密碼必須包含小寫字母"
    if not re.search(r'[0-9]', password):
        return False, "密碼必須包含數字"
    return True, ""


# User lookup
def get_user_by_username(username: str) -> Optional[dict]:
    """Find user by username"""
    return users_collection.find_one({"username": username})

def get_user_by_id(user_id: str) -> Optional[dict]:
    """Find user by ID"""
    from bson import ObjectId
    try:
        return users_collection.find_one({"_id": ObjectId(user_id)})
    except:
        return None

def get_user_by_invite_code(code: str) -> Optional[dict]:
    """Find user by invite code"""
    return users_collection.find_one({"invite_code": code})


# Invite code generation
def generate_invite_code(length: int = 6) -> str:
    """Generate a random invite code"""
    import string
    import random
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=length))


# Family membership checks
def is_family_member(user_a_id: str, user_b_id: str) -> bool:
    """Check if two users are in the same family"""
    user_a = get_user_by_id(user_a_id)
    user_b = get_user_by_id(user_b_id)
    
    if not user_a or not user_b:
        return False
    
    family_a = user_a.get("family_id")
    family_b = user_b.get("family_id")
    
    if family_a and family_b and family_a == family_b:
        return True
    return False


def get_family_member_ids(user_id: str) -> list:
    """Get all user IDs in the same family as the given user"""
    user = get_user_by_id(user_id)
    if not user or not user.get("family_id"):
        return [user_id]
    
    family_members = users_collection.find({"family_id": user["family_id"]})
    return [str(m["_id"]) for m in family_members]
