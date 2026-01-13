"""
Auth Router - Authentication related endpoints
Extracted from main.py for modular architecture
"""
import re
from datetime import datetime, timedelta
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

# Import shared utilities when integrating with main.py
# from ..database import users_collection
# from ..utils import hash_password, create_access_token

# --- Models ---
class LoginRequest(BaseModel):
    username: str
    password: str

class RegisterRequest(BaseModel):
    username: str
    password: str
    display_name: str
    email: str = ""
    role: str = "user"

class ForgotPasswordRequest(BaseModel):
    email: str

class ResetWithTokenRequest(BaseModel):
    token: str
    new_password: str

class ChangePasswordRequest(BaseModel):
    old_password: str
    new_password: str

# --- Password Validation Helper ---
def validate_password_strength(password: str) -> tuple[bool, str]:
    """
    Validate password strength.
    Returns (is_valid, error_message)
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

# Note: Below endpoints are templates - actual implementation requires
# database and utility imports. See main.py for current implementation.

# @router.post("/login")
# def login(request: LoginRequest):
#     """User login endpoint"""
#     pass

# @router.post("/register")
# def register(request: RegisterRequest):
#     """User self-registration endpoint"""
#     pass

# @router.post("/forgot-password")
# def forgot_password(request: ForgotPasswordRequest):
#     """Send password reset email"""
#     pass

# @router.post("/reset-password")
# def reset_password(request: ResetWithTokenRequest):
#     """Reset password using token"""
#     pass
