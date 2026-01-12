# backend/main.py
import os
import pandas as pd
import io
import hashlib
from datetime import datetime, timedelta
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, UploadFile, File, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pymongo import MongoClient
from pydantic import BaseModel
from typing import Optional, List
from bson import ObjectId
import urllib.request
import json
import re
import time
import jwt
import secrets
from fastapi import Header

from pathlib import Path

# 載入 .env 檔案 (使用明確路徑)
env_path = Path(__file__).parent / '.env'
load_dotenv(env_path)

app = FastAPI()

@app.on_event("startup")
def init_db():
    start_time = time.time()
    # Check specifically for DEFAULT categories
    if categories_collection.count_documents({"is_default": True}) == 0:
        defaults = [
            {"name": "Food", "icon": "🍔", "type": "expense", "color": "#E74C3C", "is_default": True},
            {"name": "Transport", "icon": "🚌", "type": "expense", "color": "#3498DB", "is_default": True},
            {"name": "Entertainment", "icon": "🎮", "type": "expense", "color": "#9B59B6", "is_default": True},
            {"name": "Rent", "icon": "🏠", "type": "expense", "color": "#F1C40F", "is_default": True},
            {"name": "Salary", "icon": "💰", "type": "income", "color": "#2ECC71", "is_default": True},
            {"name": "Other", "icon": "✨", "type": "expense", "color": "#95A5A6", "is_default": True},
        ]
        categories_collection.insert_many(defaults)
        print(f"✅ Inserted {len(defaults)} default categories")
    
    # Initialize default payment methods
    if payment_methods_collection.count_documents({"is_default": True}) == 0:
        default_methods = [
            {"name": "Cash", "icon": "💵", "is_default": True},
            {"name": "Credit Card", "icon": "💳", "is_default": True},
            {"name": "Bank", "icon": "🏦", "is_default": True},
            {"name": "LinePay", "icon": "📱", "is_default": True},
        ]
        payment_methods_collection.insert_many(default_methods)
        print(f"✅ Inserted {len(default_methods)} default payment methods")
    
    init_default_admin()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

mongo_url = os.getenv("MONGODB_URL", "mongodb://localhost:27017/")
client = MongoClient(mongo_url)
db = client["PyMoney"]
collection = db["transactions"]
settings_collection = db["settings"]
categories_collection = db["categories"]
users_collection = db["users"]
families_collection = db["families"]
templates_collection = db["templates"]
recurring_collection = db["recurring"]
category_budgets_collection = db["category_budgets"]
payment_methods_collection = db["payment_methods"]

# --- 密碼加密 ---
# --- 密碼加密 (Salted SHA256) ---
_env_secret = os.getenv("SECRET_KEY")
if not _env_secret:
    print("⚠️  WARNING: SECRET_KEY not set in .env, using random key (tokens will invalidate on restart)")
    SECRET_KEY = secrets.token_hex(32)
else:
    SECRET_KEY = _env_secret
ALGORITHM = "HS256"

def hash_password(password: str) -> str:
    salt = secrets.token_hex(8) # 16 chars
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
    expire = datetime.utcnow() + timedelta(days=7) # 7天過期
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

async def get_current_user(authorization: Optional[str] = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="未登入或 Token 無效")
    
    token = authorization.split(" ")[1]
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username = payload.get("sub")
        if username is None:
            raise HTTPException(status_code=401, detail="Token 無效")
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token 已過期，請重新登入")
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Token 無效")
        
    user = users_collection.find_one({"username": username})
    if not user:
        raise HTTPException(status_code=401, detail="使用者不存在")
    
    return fix_id(user)

# --- 邀請碼生成 ---
import random
import string

def generate_invite_code(length: int = 6) -> str:
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=length))

# --- Models ---
class Transaction(BaseModel):
    title: str
    amount: int
    category: str
    date: str
    type: str = "expense" 
    payment_method: str = "Cash"
    note: Optional[str] = None
    target_account: Optional[str] = None # 轉入帳戶
    currency: str = "TWD"
    foreign_amount: Optional[float] = None
    exchange_rate: Optional[float] = None

class Category(BaseModel):
    name: str
    icon: str
    type: str  # 'expense' or 'income'
    color: str
    is_default: bool = False
    user_id: Optional[str] = None

class BudgetSetting(BaseModel):
    limit: int

class LoginRequest(BaseModel):
    username: str
    password: str

class RegisterRequest(BaseModel):
    username: str
    password: str
    display_name: str
    email: str = ""
    role: str = "user"

class UserCreate(BaseModel):
    username: str
    password: str
    display_name: str
    email: str = ""
    role: str = "user"

class InviteCodeRequest(BaseModel):
    code: str

class ResetPasswordRequest(BaseModel):
    new_password: str

class ForgotPasswordRequest(BaseModel):
    email: str

class ResetWithTokenRequest(BaseModel):
    token: str
    new_password: str

# Email 發送功能
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

def send_reset_email(to_email: str, reset_token: str):
    smtp_email = os.getenv("SMTP_EMAIL")
    smtp_password = os.getenv("SMTP_PASSWORD")
    smtp_server = os.getenv("SMTP_SERVER", "smtp.gmail.com")
    smtp_port = int(os.getenv("SMTP_PORT", "587"))
    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
    
    reset_link = f"{frontend_url}?reset_token={reset_token}"
    
    msg = MIMEMultipart()
    msg['From'] = smtp_email
    msg['To'] = to_email
    msg['Subject'] = "🔐 PyMoney 密碼重設"
    
    body = f"""
    <html>
    <body style="font-family: Arial, sans-serif; padding: 20px;">
        <h2>🔐 密碼重設請求</h2>
        <p>您好，我們收到了您的密碼重設請求。</p>
        <p>請點擊下方按鈕重設您的密碼：</p>
        <a href="{reset_link}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; margin: 20px 0;">重設密碼</a>
        <p>或複製以下連結到瀏覽器：</p>
        <p style="color: #666;">{reset_link}</p>
        <p style="color: #999; font-size: 12px;">此連結將在 30 分鐘後失效。如果您沒有請求重設密碼，請忽略此郵件。</p>
    </body>
    </html>
    """
    
    msg.attach(MIMEText(body, 'html'))
    
    try:
        server = smtplib.SMTP(smtp_server, smtp_port)
        server.starttls()
        server.login(smtp_email, smtp_password)
        server.send_message(msg)
        server.quit()
        return True
    except Exception as e:
        print(f"Email 發送失敗: {e}")
        return False


def fix_id(doc):
    doc["id"] = str(doc.pop("_id"))
    return doc

# --- 初始化預設管理員 ---
def init_default_admin():
    existing_admin = users_collection.find_one({"username": "admin"})
    if not existing_admin:
        # Create admin user first
        admin_result = users_collection.insert_one({
            "username": "admin",
            "password": hash_password("admin"),
            "display_name": "管理員",
            "role": "admin",
            "family_id": None,  # Will be updated after family creation
            "created_at": datetime.now().isoformat()
        })
        admin_id = str(admin_result.inserted_id)
        
        # Create default family for admin
        family_result = families_collection.insert_one({
            "name": "管理員 的家庭",
            "admin_id": admin_id,
            "members": [admin_id],
            "created_at": datetime.now().isoformat()
        })
        family_id = str(family_result.inserted_id)
        
        # Update admin with family_id
        users_collection.update_one(
            {"_id": admin_result.inserted_id},
            {"$set": {"family_id": family_id}}
        )
        
        print("✅ 已建立預設管理員帳號: admin / admin (含預設家庭)")

# 啟動時執行
@app.on_event("startup")
def startup_event():
    init_default_admin()
    
    # Migration: Ensure all admins have a family
    # Note: Match admins where family_id is null OR doesn't exist
    for admin in users_collection.find({
        "role": "admin",
        "$or": [{"family_id": None}, {"family_id": {"$exists": False}}]
    }):
        admin_id = str(admin["_id"])
        family_result = families_collection.insert_one({
            "name": f"{admin['display_name']} 的家庭",
            "admin_id": admin_id,
            "members": [admin_id],
            "created_at": datetime.now().isoformat()
        })
        family_id = str(family_result.inserted_id)
        users_collection.update_one(
            {"_id": admin["_id"]},
            {"$set": {"family_id": family_id}}
        )
        print(f"🔧 已為現有管理員 {admin['display_name']} 建立家庭")

# --- Helper for Family Access ---
def is_family_member(user_a: str, user_b: str) -> bool:
    # user_a is usually from current_user['username']
    u1 = users_collection.find_one({"username": user_a})
    # user_b might be username or ObjectId
    u2 = users_collection.find_one({"username": user_b})
    if not u2:
        try:
            u2 = users_collection.find_one({"_id": ObjectId(user_b)})
        except:
            pass
            
    if u1 and u2 and u1.get("family_id") and u1["family_id"] == u2.get("family_id"):
        return True
    return False

# --- API 區域 ---
# [Auth] 使用者登入 API
@app.post("/api/auth/login")
def login(request: LoginRequest):
    # Security: Sanitize input to prevent NoSQL Injection
    sanitized_username = str(request.username)
    if any(c in sanitized_username for c in ["$", "{", "}", ":"]):
        raise HTTPException(status_code=400, detail="無效的使用者名稱格式")

    user = users_collection.find_one({"username": sanitized_username})
    
    if not user:
        raise HTTPException(status_code=401, detail="使用者不存在")
    
    if not verify_password(request.password, user["password"]):
        raise HTTPException(status_code=401, detail="密碼錯誤")
    
    # 產生 JWT Token
    access_token = create_access_token(data={"sub": user["username"], "role": user["role"]})
    
    return {
        "success": True,
        "user": {
            "id": str(user["_id"]),
            "username": user["username"],
            "display_name": user["display_name"],
            "role": user["role"],
            "family_id": user.get("family_id"),
            "token": access_token
        }
    }

# [Auth] 自助註冊 API
@app.post("/api/auth/register")
def self_register(request: RegisterRequest):
    # Backend Validation
    if len(request.username) < 3:
        raise HTTPException(status_code=400, detail="帳號長度需至少 3 個字元")
    
    if len(request.password) < 4:
        raise HTTPException(status_code=400, detail="密碼太短")
        
    email_regex = r'^[^\s@]+@[^\s@]+\.[^\s@]+$'
    if not re.match(email_regex, request.email):
        raise HTTPException(status_code=400, detail="Email 格式不正確")

    if users_collection.find_one({"username": request.username}):
        raise HTTPException(status_code=400, detail="使用者名稱已存在")
    
    new_user = {
        "username": request.username,
        "password": hash_password(request.password),
        "display_name": request.display_name,
        "email": request.email,
        "role": "user",  # Always user for self-registration (security fix)
        "family_id": None,
        "invite_code": None,
        "invite_expires": None,
        "reset_token": None,
        "reset_expires": None,
        "created_at": datetime.now().isoformat()
    }
    result = users_collection.insert_one(new_user)
    return {"message": "註冊成功", "id": str(result.inserted_id)}

# [Auth] 忘記密碼 - 發送重設郵件
@app.post("/api/auth/forgot-password")
def forgot_password(request: ForgotPasswordRequest):
    user = users_collection.find_one({"email": request.email})
    if not user:
        # 為了安全，即使找不到也回傳成功
        return {"message": "如果此 Email 已註冊，您將收到重設郵件"}
    
    # 產生重設 token
    reset_token = secrets.token_urlsafe(32)
    expires = datetime.now() + timedelta(minutes=30)
    
    users_collection.update_one(
        {"_id": user["_id"]},
        {"$set": {"reset_token": reset_token, "reset_expires": expires.isoformat()}}
    )
    
    # 發送郵件
    if send_reset_email(request.email, reset_token):
        return {"message": "重設郵件已發送，請檢查您的信箱"}
    else:
        raise HTTPException(status_code=500, detail="郵件發送失敗，請稍後再試")

# [Auth] 使用 token 重設密碼
@app.post("/api/auth/reset-password")
def reset_password_with_token(request: ResetWithTokenRequest):
    user = users_collection.find_one({"reset_token": request.token})
    if not user:
        raise HTTPException(status_code=400, detail="無效的重設連結")
    
    # 檢查是否過期
    if user.get("reset_expires"):
        expires = datetime.fromisoformat(user["reset_expires"])
        if datetime.now() > expires:
            raise HTTPException(status_code=400, detail="重設連結已過期，請重新申請")
    
    # 更新密碼並清除 token
    users_collection.update_one(
        {"_id": user["_id"]},
        {"$set": {
            "password": hash_password(request.new_password),
            "reset_token": None,
            "reset_expires": None
        }}
    )
    
    return {"message": "密碼已重設成功，請使用新密碼登入"}

# [Invite] 產生邀請碼
@app.post("/api/invite/generate")
def create_invite_code(user_id: str):
    user = users_collection.find_one({"_id": ObjectId(user_id)})
    if not user:
        raise HTTPException(status_code=404, detail="使用者不存在")
    
    code = generate_invite_code()
    expires = datetime.now() + timedelta(minutes=10)
    
    users_collection.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {"invite_code": code, "invite_expires": expires.isoformat()}}
    )
    
    return {"code": code, "expires_at": expires.isoformat()}

# [Invite] 管理員接受邀請碼
@app.post("/api/invite/accept")
def accept_invite(admin_id: str, request: InviteCodeRequest):
    # 找到有這個邀請碼的使用者
    user = users_collection.find_one({"invite_code": request.code})
    if not user:
        raise HTTPException(status_code=404, detail="邀請碼無效")
    
    # 檢查是否過期
    if user.get("invite_expires"):
        expires = datetime.fromisoformat(user["invite_expires"])
        if datetime.now() > expires:
            raise HTTPException(status_code=400, detail="邀請碼已過期")
    
    # 取得管理員的家庭 (如果沒有就建立)
    admin = users_collection.find_one({"_id": ObjectId(admin_id)})
    if not admin:
        raise HTTPException(status_code=404, detail="管理員不存在")
    
    family_id = admin.get("family_id")
    if not family_id:
        # 建立新家庭
        family = {
            "name": f"{admin['display_name']} 的家庭",
            "admin_id": admin_id,
            "members": [admin_id],
            "created_at": datetime.now().isoformat()
        }
        result = families_collection.insert_one(family)
        family_id = str(result.inserted_id)
        users_collection.update_one(
            {"_id": ObjectId(admin_id)},
            {"$set": {"family_id": family_id}}
        )
    
    # 將使用者加入家庭
    user_id = str(user["_id"])
    families_collection.update_one(
        {"_id": ObjectId(family_id)},
        {"$addToSet": {"members": user_id}}
    )
    users_collection.update_one(
        {"_id": user["_id"]},
        {"$set": {"family_id": family_id, "invite_code": None, "invite_expires": None}}
    )
    
    return {"message": f"已將 {user['display_name']} 加入家庭", "user_id": user_id}

# [Family] 取得家庭成員
@app.get("/api/family/members/{family_id}")
def get_family_members(family_id: str):
    family = families_collection.find_one({"_id": ObjectId(family_id)})
    if not family:
        raise HTTPException(status_code=404, detail="家庭不存在")
    
    members = []
    for member_id in family.get("members", []):
        user = users_collection.find_one({"_id": ObjectId(member_id)})
        if user:
            members.append({
                "id": str(user["_id"]),
                "username": user["username"],
                "display_name": user["display_name"],
                "role": user["role"]
            })
    
    admin_name = ""
    admin_id = family.get("admin_id")
    if admin_id:
        admin_user = users_collection.find_one({"_id": ObjectId(admin_id)})
        if admin_user:
            admin_name = admin_user.get("display_name", "")

    return {"family_name": family["name"], "members": members, "admin_name": admin_name}

# [Family] 使用者離開家庭
@app.post("/api/family/leave")
def leave_family(user_id: str):
    user = users_collection.find_one({"_id": ObjectId(user_id)})
    if not user:
        raise HTTPException(status_code=404, detail="使用者不存在")
    
    family_id = user.get("family_id")
    if not family_id:
        raise HTTPException(status_code=400, detail="你尚未加入任何家庭")
    
    # 從家庭成員列表移除
    families_collection.update_one(
        {"_id": ObjectId(family_id)},
        {"$pull": {"members": user_id}}
    )
    
    # 清除使用者的 family_id
    users_collection.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {"family_id": None}}
    )
    
    return {"message": "已離開家庭"}

# [Family] 管理員直接新增成員
@app.post("/api/family/add-member")
def direct_add_member(admin_id: str, member_id: str):
    admin = users_collection.find_one({"_id": ObjectId(admin_id)})
    if not admin or admin.get("role") != "admin":
        raise HTTPException(status_code=403, detail="權限不足")
    
    user = users_collection.find_one({"_id": ObjectId(member_id)})
    if not user:
        raise HTTPException(status_code=404, detail="使用者不存在")
    if user.get("family_id"):
        raise HTTPException(status_code=400, detail="該使用者已在其他家庭中")

    family_id = admin.get("family_id")
    if not family_id:
        # Create new family if admin doesn't have one
        family = {
            "name": f"{admin['display_name']} 的家庭",
            "admin_id": admin_id,
            "members": [admin_id],
            "created_at": datetime.now().isoformat()
        }
        result = families_collection.insert_one(family)
        family_id = str(result.inserted_id)
        users_collection.update_one({"_id": ObjectId(admin_id)}, {"$set": {"family_id": family_id}})
    
    # Add to family
    families_collection.update_one(
        {"_id": ObjectId(family_id)},
        {"$addToSet": {"members": member_id}}
    )
    users_collection.update_one(
        {"_id": ObjectId(member_id)},
        {"$set": {"family_id": family_id}}
    )
    
    return {"message": f"已將 {user['display_name']} 加入家庭"}


# [Family] 管理員移除成員
@app.post("/api/family/remove-member")
def remove_member(admin_id: str, member_id: str):
    admin = users_collection.find_one({"_id": ObjectId(admin_id)})
    if not admin or admin.get("role") != "admin":
        raise HTTPException(status_code=403, detail="權限不足")
    
    family_id = admin.get("family_id")
    if not family_id:
        raise HTTPException(status_code=400, detail="尚未建立家庭")
    
    # 不能移除自己
    if admin_id == member_id:
        raise HTTPException(status_code=400, detail="無法移除自己")
    
    # 從家庭成員列表移除 (同時支援路徑中是字串或 ID 的情況)
    families_collection.update_one(
        {"_id": ObjectId(family_id)},
        {"$pull": {"members": member_id}}
    )
    
    # 清除成員的 family_id
    users_collection.update_one(
        {"_id": ObjectId(member_id)},
        {"$set": {"family_id": None}}
    )
    
    # 額外安全性檢查：如果 member_id 是字串但資料庫存的是 ObjectId (或反之)
    # 此處邏輯通常會成功，因為我們在 /api/family/members 回傳的是字串，
    # 而資料庫中 members 陣列儲存的也是字串 (根據先前的檢查)。
    
    return {"message": "已將成員移出家庭"}

# [Users] 取得所有使用者 (管理員限定)
@app.get("/api/users")
def get_users(current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="權限不足")
    users = list(users_collection.find())
    return [{
        "id": str(u["_id"]),
        "username": u["username"],
        "display_name": u["display_name"],
        "role": u["role"],
        "family_id": u.get("family_id"),
        "created_at": u.get("created_at", "")
    } for u in users]

# [Users] 取得單一使用者資訊 (用於同步狀態)
@app.get("/api/users/{id}")
def get_user(id: str, current_user: dict = Depends(get_current_user)):
    # Security: Only allow fetching own info or admin can fetch anyone
    if current_user["id"] != id and current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="無權查看此使用者資訊")
    user = users_collection.find_one({"_id": ObjectId(id)})
    if not user:
        raise HTTPException(status_code=404, detail="使用者不存在")
    return {
        "id": str(user["_id"]),
        "username": user["username"],
        "display_name": user["display_name"],
        "role": user["role"],
        "family_id": user.get("family_id")
    }

# [Users] 註冊新使用者 (管理員限定)
@app.post("/api/users/register")
def register_user(user: UserCreate, current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="權限不足")
    if users_collection.find_one({"username": user.username}):
        raise HTTPException(status_code=400, detail="使用者名稱已存在")
    
    new_user = {
        "username": user.username,
        "password": hash_password(user.password),
        "display_name": user.display_name,
        "role": user.role,
        "family_id": None,
        "created_at": datetime.now().isoformat()
    }
    result = users_collection.insert_one(new_user)
    return {"message": "註冊成功", "id": str(result.inserted_id)}

# [Users] 修改個人密碼 (需驗證原密碼)
class ChangePasswordRequest(BaseModel):
    old_password: str
    new_password: str

@app.post("/api/users/change-password")
def change_password(request: ChangePasswordRequest, current_user: dict = Depends(get_current_user)):
    user = users_collection.find_one({"_id": ObjectId(current_user["id"])})
    if not user:
        raise HTTPException(status_code=404, detail="使用者不存在")
    
    # 驗證原密碼
    if not verify_password(request.old_password, user["password"]):
        raise HTTPException(status_code=400, detail="原密碼錯誤")
    
    # 更新新密碼
    users_collection.update_one(
        {"_id": ObjectId(current_user["id"])},
        {"$set": {"password": hash_password(request.new_password)}}
    )
    return {"message": "密碼修改成功"}

# [Users] 刪除個人帳號 (僅限本人)
@app.delete("/api/users/me")
def delete_me(current_user: dict = Depends(get_current_user)):
    user_id = current_user["id"]
    user = users_collection.find_one({"_id": ObjectId(user_id)})
    if user and user.get("username") == "admin":
        raise HTTPException(status_code=400, detail="無法刪除預設管理員帳號")
    
    # 如果使用者在家庭中，先將其移出
    family_id = user.get("family_id")
    if family_id:
        families_collection.update_one(
            {"_id": ObjectId(family_id)},
            {"$pull": {"members": user_id}}
        )

    users_collection.delete_one({"_id": ObjectId(user_id)})
    return {"message": "帳號已成功刪除"}

# [交易] 讀取
@app.get("/api/transactions")
def get_transactions(
    keyword: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    user_id: Optional[str] = None,
    user_ids: Optional[str] = None,
    current_user: dict = Depends(get_current_user) # IDOR Protection
):
    query = {}
    
    # IDOR 防護：只能查詢自己或家庭成員
    # 若是 Admin 且 query 帶有 user_id，則允許 (假設 Admin 可看所有人)
    # 若是 User，強制鎖定範圍
    
    requesting_uid = user_id or current_user['username'] # 這裡簡化，假設 user_id 傳的是 username (前端傳 activeUser.username)
    # 注意：這裡邏輯比較複雜，因為前端可能傳 username 也可能傳 user_id (ObjectId string)
    # 我們假設 user_id 參數傳的是 username 用於過濾
    
    # IDOR 防護：一般使用者只能查自己或家屬
    if current_user['role'] != 'admin':
        # 如果有指定查詢對象
        target_uid = user_id or (user_ids.split(',')[0] if user_ids else None)
        if target_uid:
            # 檢查 target_uid 是否為本人 (可能是 ID 也可能是 username)
            is_self = (target_uid == current_user['id'] or target_uid == current_user['username'])
            if not is_self:
                # 檢查是否為家屬
                if not is_family_member(current_user['username'], target_uid):
                    raise HTTPException(status_code=403, detail="您無權查看此人資料")

    # 如果沒傳 user_id，預設查自己 (修正原本 "防資料外洩" 的邏輯)
    if not user_id and not user_ids:
        user_id = current_user['username']

    # --- 使用新的 Filter 邏輯 ---
    member_ids = get_user_ids_to_filter(user_id=user_id, user_ids=user_ids)
    if member_ids:
        query["user_id"] = {"$in": member_ids}
    elif not current_user.get("role") == "admin":
        # 如果不是 admin 且沒過濾，預設看自己
        query["user_id"] = current_user["id"]
    
    if keyword:
        # 使用 re.escape 防止 Regex Injection
        safe_keyword = re.escape(keyword)
        query["$or"] = [
            {"title": {"$regex": safe_keyword, "$options": "i"}},
            {"note": {"$regex": safe_keyword, "$options": "i"}}
        ]
    if start_date and end_date:
        query["date"] = {"$gte": start_date, "$lte": end_date}
    elif start_date:
        query["date"] = {"$gte": start_date}
    elif end_date:
        query["date"] = {"$lte": end_date}

    data = collection.find(query).sort("date", -1)
    
    # 為管理員視角加入使用者名稱
    results = []
    for doc in data:
        item = fix_id(doc)
        # 若有 user_id，查詢使用者名稱
        if doc.get("user_id"):
            user = users_collection.find_one({"_id": ObjectId(doc["user_id"])})
            if user:
                item["user_display_name"] = user.get("display_name", "Unknown")
        results.append(item)
    
    return results

# [交易] 新增
@app.post("/api/transactions")
def create_transaction(tx: Transaction, current_user: dict = Depends(get_current_user)):
    data = tx.dict()
    data["user_id"] = current_user["id"]  # Always set from token for security
    result = collection.insert_one(data)
    return {"message": "新增成功", "id": str(result.inserted_id)}

# [交易] 更新
@app.put("/api/transactions/{id}")
def update_transaction(id: str, tx: Transaction, current_user: dict = Depends(get_current_user)):
    existing = collection.find_one({"_id": ObjectId(id)})
    if not existing:
        raise HTTPException(status_code=404, detail="交易不存在")
    # IDOR Protection: verify ownership or admin
    if existing.get("user_id") != current_user["id"] and current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="無權修改此交易")
    collection.update_one({"_id": ObjectId(id)}, {"$set": tx.dict()})
    return {"message": "更新成功"}

# [交易] 刪除
@app.delete("/api/transactions/{id}")
def delete_transaction(id: str, current_user: dict = Depends(get_current_user)):
    existing = collection.find_one({"_id": ObjectId(id)})
    if not existing:
        raise HTTPException(status_code=404, detail="交易不存在")
    # IDOR Protection: verify ownership or admin
    if existing.get("user_id") != current_user["id"] and current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="無權刪除此交易")
    collection.delete_one({"_id": ObjectId(id)})
    return {"message": "刪除成功"}

# [Dashboard] 圓餅圖
@app.get("/api/dashboard/stats")
def get_category_stats(
    start_date: Optional[str] = None, 
    end_date: Optional[str] = None, 
    user_id: Optional[str] = None,
    user_ids: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    match_stage = {"type": "expense"}
    if start_date and end_date:
        match_stage["date"] = {"$gte": start_date, "$lte": end_date}
    elif start_date:
        match_stage["date"] = {"$gte": start_date}
    elif end_date:
        match_stage["date"] = {"$lte": end_date}

    # Filter by users
    member_ids = get_user_ids_to_filter(user_id, user_ids)
    if member_ids:
        match_stage["user_id"] = {"$in": member_ids}

    pipeline = [
        {"$match": match_stage},
        {"$group": {"_id": "$category", "total": {"$sum": "$amount"}}}
    ]
    result = list(collection.aggregate(pipeline))
    return {item["_id"]: item["total"] for item in result}

# [Dashboard] 長條圖
@app.get("/api/dashboard/trend")
def get_trend_stats(user_id: Optional[str] = None, user_ids: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    match_stage = {}
    member_ids = get_user_ids_to_filter(user_id, user_ids)
    if member_ids:
        match_stage["user_id"] = {"$in": member_ids}

    pipeline = [
        {"$match": match_stage}, 
        {"$sort": {"date": 1}},  
        {"$group": {"_id": "$date", "income": {
            "$sum": {"$cond": [{"$eq": ["$type", "income"]}, "$amount", 0]}
        }, "expense": {
            "$sum": {"$cond": [{"$eq": ["$type", "expense"]}, "$amount", 0]}
        }}},
        {"$sort": {"_id": 1}}
    ]
    result = list(collection.aggregate(pipeline))
    return {
        "dates": [item["_id"] for item in result],
        "incomes": [item["income"] for item in result],
        "expenses": [item["expense"] for item in result]
    }

# [預算] 讀取
@app.get("/api/budget")
def get_budget():
    setting = settings_collection.find_one({"_id": "monthly_budget"})
    if setting:
        return {"limit": setting["limit"]}
    return {"limit": 0}

# [預算] 設定
@app.post("/api/budget")
def set_budget(budget: BudgetSetting):
    if budget.limit < 0:
        raise HTTPException(status_code=400, detail="預算不能為負數")
    settings_collection.update_one(
        {"_id": "monthly_budget"},
        {"$set": {"limit": budget.limit}},
        upsert=True
    )
    return {"message": "預算設定成功"}


# [匯出] Excel
@app.get("/api/export")
def export_excel(current_user: dict = Depends(get_current_user)):
    # Export only the current user's transactions (or all for admin)
    query = {} if current_user.get("role") == "admin" else {"user_id": current_user["id"]}
    data = list(collection.find(query).sort("date", -1))
    if not data:
        raise HTTPException(status_code=404, detail="無資料")
    for doc in data: doc["_id"] = str(doc["_id"])
    df = pd.DataFrame(data)
    cols = ["date", "type", "category", "title", "amount", "payment_method"]
    df = df[[c for c in cols if c in df.columns]]
    filename = "PyMoney_Export.xlsx"
    df.to_excel(filename, index=False)
    return FileResponse(
        filename, 
        filename=filename, 
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    )

@app.get("/api/import/sample")
def get_import_sample(format: str = "csv"):
    """提供匯入範例檔案下載，預設 CSV"""
    data = [
        {
            "date": "2024-01-01",
            "type": "expense",
            "category": "Food",
            "title": "Lunch",
            "amount": 100,
            "payment_method": "Cash",
            "note": "Example transaction"
        },
        {
            "date": "2024-01-02",
            "type": "income",
            "category": "Salary",
            "title": "Part-time",
            "amount": 5000,
            "payment_method": "Bank",
            "note": "Monthly income"
        }
    ]
    df = pd.DataFrame(data)
    
    if format == "csv":
        filename = "PyMoney_Import_Sample.csv"
        df.to_csv(filename, index=False, encoding="utf-8-sig")
        return FileResponse(
            filename, 
            filename=filename,
            media_type="text/csv"
        )
    else:
        filename = "PyMoney_Import_Sample.xlsx"
        df.to_excel(filename, index=False)
        return FileResponse(
            filename, 
            filename=filename,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        )

# [匯入] Excel/CSV (新功能!)
@app.post("/api/import")
async def import_file(file: UploadFile = File(...), current_user: dict = Depends(get_current_user)):
    try:
        contents = await file.read()
        
        # 判斷副檔名
        if file.filename.endswith('.csv'):
            df = pd.read_csv(io.BytesIO(contents))
        elif file.filename.endswith(('.xls', '.xlsx')):
            df = pd.read_excel(io.BytesIO(contents))
        else:
            raise HTTPException(status_code=400, detail="不支援的檔案格式，請上傳 CSV 或 Excel")

        # 資料處理與檢查
        required_cols = ["date", "title", "amount", "category"]
        for col in required_cols:
            if col not in df.columns:
                 raise HTTPException(status_code=400, detail=f"檔案缺少欄位: {col}")

        # 填補缺失值 (預設值)
        if "type" not in df.columns: df["type"] = "expense"
        if "payment_method" not in df.columns: df["payment_method"] = "Cash"
        
        # 轉成字典列表
        records = df.to_dict(orient="records")
        
        # 補上 user_id 並處理日期
        final_records = []
        for r in records:
            # 確保有 user_id
            r["user_id"] = current_user["id"]
            
            # 處理日期 (確保是 datetime 物件，方便 MongoDB 查詢與排序)
            try:
                if isinstance(r["date"], str):
                    r["date"] = datetime.strptime(r["date"], "%Y-%m-%d")
                elif isinstance(r["date"], pd.Timestamp):
                    r["date"] = r["date"].to_pydatetime()
            except:
                # 若日期格式錯誤，嘗試自動解析或設為今天
                r["date"] = datetime.now()
            
            final_records.append(r)
        
        # 寫入資料庫
        if final_records:
            collection.insert_many(final_records)
            
        return {"message": f"成功匯入 {len(final_records)} 筆資料"}
        
    except Exception as e:
        print(f"Import error: {e}")
        raise HTTPException(status_code=500, detail=f"匯入失敗: {str(e)}")

# --- Helper: 取得有效成員 ID 列表 (對應各 API) ---
def get_user_ids_to_filter(user_id: Optional[str] = None, user_ids: Optional[str] = None) -> List[str]:
    if user_ids:
        return [uid.strip() for uid in user_ids.split(',') if uid.strip()]
    if not user_id:
        return []
        
    # 嘗試先用 username 找，若找不到再當作 ObjectId 找
    user = users_collection.find_one({"username": user_id})
    if not user:
        try:
            user = users_collection.find_one({"_id": ObjectId(user_id)})
        except:
            pass
    
    if user:
        uid = str(user["_id"])
        family_id = user.get("family_id")
        if family_id:
            family = families_collection.find_one({"_id": ObjectId(family_id)})
            if family:
                return family.get("members", [])
        return [uid]
        
    return [user_id]

# [Dashboard] 帳戶餘額統計 (新功能!)
@app.get("/api/dashboard/accounts")
def get_account_stats(user_id: Optional[str] = None, user_ids: Optional[str] = None):
    # 取得有效成員列表
    member_ids = get_user_ids_to_filter(user_id, user_ids)
    
    # 建構過濾條件
    match_stage = {}
    if member_ids:
        match_stage["user_id"] = {"$in": member_ids}
    
    # 1. 計算 Source (付款/轉出) 造成的餘額變動
    pipeline_source = [
        {"$match": match_stage},
        {"$group": {
            "_id": "$payment_method",
            "balance": {
                "$sum": {
                    "$switch": {
                        "branches": [
                            {"case": {"$eq": ["$type", "income"]}, "then": "$amount"},
                            {"case": {"$eq": ["$type", "expense"]}, "then": {"$multiply": ["$amount", -1]}},
                            {"case": {"$eq": ["$type", "transfer"]}, "then": {"$multiply": ["$amount", -1]}} # 轉出扣款
                        ],
                        "default": 0
                    }
                }
            }
        }}
    ]
    source_res = list(collection.aggregate(pipeline_source))
    
    # 2. 計算 Target (轉入) 造成的餘額增加
    pipeline_target = [
        {"$match": {"type": "transfer", "target_account": {"$exists": True, "$ne": None}}},
        {"$match": match_stage},  # Add filtering here too
        {"$group": {
            "_id": "$target_account", 
            "balance": {"$sum": "$amount"} # 轉入增加
        }}
    ]
    target_res = list(collection.aggregate(pipeline_target))
    
    # 3. 合併結果
    balances = {}
    for item in source_res:
        if item["_id"]:
            balances[item["_id"]] = balances.get(item["_id"], 0) + item["balance"]
        
    for item in target_res:
        if item["_id"]:
            balances[item["_id"]] = balances.get(item["_id"], 0) + item["balance"]
        
    # 轉回 List + 排序
    result = [{"account": k, "balance": v} for k, v in balances.items()]
    return sorted(result, key=lambda x: x["account"])



# --- 匯率 API ---
_rates_cache = {"timestamp": 0, "data": {}}

@app.get("/api/rates/{target}")
def get_rate(target: str):
    global _rates_cache
    target = target.upper()
    now = time.time()
    
    # 簡單快取 (1小時)
    if now - _rates_cache["timestamp"] > 3600 or "USDTWD" not in _rates_cache["data"]:
        try:
            with urllib.request.urlopen("https://tw.rter.info/capi.php") as url:
                _rates_cache["data"] = json.loads(url.read().decode())
                _rates_cache["timestamp"] = now
        except Exception as e:
            # print(f"Rate fetch failed: {e}")
            pass
            
    data = _rates_cache["data"]
    
    # Default fallback if empty
    if "USDTWD" not in data:
         return {"rate": 1.0}
         
    usd_twd = data["USDTWD"]["Exrate"]
    utc_str = data["USDTWD"].get("UTC", "")
    
    if target == "TWD":
        return {"rate": 1.0}

    if target == "USD":
        return {"rate": usd_twd, "updated_at": utc_str}
    
    key = f"USD{target}"
    if key not in data:
        return {"rate": 1.0, "updated_at": utc_str}
        
    usd_target = data[key]["Exrate"]
    
    # 1 Target = (USDTWD / USDTarget) TWD
    rate = usd_twd / usd_target
    return {"rate": rate, "updated_at": utc_str}

# ============================================================
# Phase 2: 快速記帳模板 (Templates)
# ============================================================

class Template(BaseModel):
    name: str
    title: str
    amount: int
    category: str
    type: str = "expense"
    payment_method: str = "Cash"
    note: Optional[str] = None
    user_id: Optional[str] = None

@app.get("/api/templates")
def get_templates(user_id: Optional[str] = None):
    query = {}
    if user_id:
        query["user_id"] = user_id
    templates = templates_collection.find(query)
    return [fix_id(t) for t in templates]

@app.post("/api/templates")
def create_template(template: Template):
    data = template.dict()
    result = templates_collection.insert_one(data)
    return {"message": "模板建立成功", "id": str(result.inserted_id)}

@app.delete("/api/templates/{id}")
def delete_template(id: str):
    templates_collection.delete_one({"_id": ObjectId(id)})
    return {"message": "模板已刪除"}

# ============================================================
# Phase 3: 重複交易 (Recurring Transactions)
# ============================================================

class RecurringTransaction(BaseModel):
    title: str
    amount: int
    category: str
    type: str = "expense"
    payment_method: str = "Cash"
    note: Optional[str] = None
    frequency: str  # "daily", "weekly", "monthly", "yearly"
    next_date: str
    is_active: bool = True
    user_id: Optional[str] = None

@app.get("/api/recurring")
def get_recurring(user_id: Optional[str] = None):
    query = {}
    if user_id:
        query["user_id"] = user_id
    items = recurring_collection.find(query).sort("next_date", 1)
    return [fix_id(r) for r in items]

@app.post("/api/recurring")
def create_recurring(recurring: RecurringTransaction):
    data = recurring.dict()
    result = recurring_collection.insert_one(data)
    return {"message": "重複交易建立成功", "id": str(result.inserted_id)}

@app.put("/api/recurring/{id}")
def update_recurring(id: str, recurring: RecurringTransaction):
    recurring_collection.update_one({"_id": ObjectId(id)}, {"$set": recurring.dict()})
    return {"message": "更新成功"}

@app.delete("/api/recurring/{id}")
def delete_recurring(id: str):
    recurring_collection.delete_one({"_id": ObjectId(id)})
    return {"message": "重複交易已刪除"}

@app.post("/api/recurring/{id}/execute")
def execute_recurring(id: str):
    """執行重複交易：產生一筆實際交易並更新下次日期"""
    recurring = recurring_collection.find_one({"_id": ObjectId(id)})
    if not recurring:
        raise HTTPException(status_code=404, detail="找不到重複交易")
    
    # 建立實際交易
    tx_data = {
        "title": recurring["title"],
        "amount": recurring["amount"],
        "category": recurring["category"],
        "type": recurring["type"],
        "payment_method": recurring["payment_method"],
        "note": recurring.get("note", ""),
        "date": recurring["next_date"],
        "currency": "TWD",
        "user_id": recurring.get("user_id")
    }
    collection.insert_one(tx_data)
    
    # 計算下次日期
    current = datetime.strptime(recurring["next_date"], "%Y-%m-%d")
    freq = recurring["frequency"]
    if freq == "daily":
        next_dt = current + timedelta(days=1)
    elif freq == "weekly":
        next_dt = current + timedelta(weeks=1)
    elif freq == "monthly":
        # 加一個月
        month = current.month + 1
        year = current.year
        if month > 12:
            month = 1
            year += 1
        day = min(current.day, 28)  # 避免月底問題
        next_dt = current.replace(year=year, month=month, day=day)
    elif freq == "yearly":
        next_dt = current.replace(year=current.year + 1)
    else:
        next_dt = current + timedelta(days=30)
    
    # 更新下次日期
    recurring_collection.update_one(
        {"_id": ObjectId(id)},
        {"$set": {"next_date": next_dt.strftime("%Y-%m-%d")}}
    )
    
    return {"message": "交易已執行", "next_date": next_dt.strftime("%Y-%m-%d")}

# ============================================================
# Phase 4: 分類預算 (Category Budgets)
# ============================================================

class CategoryBudget(BaseModel):
    category: str
    limit: int
    month: str  # "2026-01"
    user_id: Optional[str] = None

@app.get("/api/category-budgets")
def get_category_budgets(month: Optional[str] = None, user_id: Optional[str] = None):
    query = {}
    if month:
        query["month"] = month
    if user_id:
        query["user_id"] = user_id
    budgets = category_budgets_collection.find(query)
    return [fix_id(b) for b in budgets]

@app.post("/api/category-budgets")
def set_category_budget(budget: CategoryBudget):
    # Upsert: 更新或新增
    category_budgets_collection.update_one(
        {"category": budget.category, "month": budget.month, "user_id": budget.user_id},
        {"$set": budget.dict()},
        upsert=True
    )
    return {"message": "分類預算設定成功"}

@app.delete("/api/category-budgets/{id}")
def delete_category_budget(id: str):
    category_budgets_collection.delete_one({"_id": ObjectId(id)})
    return {"message": "分類預算已刪除"}

@app.get("/api/dashboard/category-budget-status")
def get_category_budget_status(month: Optional[str] = None, user_id: Optional[str] = None):
    """取得各分類的預算使用狀況"""
    if not month:
        month = datetime.now().strftime("%Y-%m")
    
    # 取得分類預算
    budget_query = {"month": month}
    if user_id:
        budget_query["user_id"] = user_id
    budgets = {b["category"]: b["limit"] for b in category_budgets_collection.find(budget_query)}
    
    # 計算各分類支出
    start_date = f"{month}-01"
    end_date = f"{month}-31"
    
    expense_query = {"type": "expense", "date": {"$gte": start_date, "$lte": end_date}}
    if user_id:
        expense_query["user_id"] = user_id
    
    pipeline = [
        {"$match": expense_query},
        {"$group": {"_id": "$category", "total": {"$sum": "$amount"}}}
    ]
    expenses = {item["_id"]: item["total"] for item in collection.aggregate(pipeline)}
    
    # 組合結果
    result = []
    all_categories = set(budgets.keys()) | set(expenses.keys())
    for cat in all_categories:
        limit = budgets.get(cat, 0)
        spent = expenses.get(cat, 0)
        result.append({
            "category": cat,
            "limit": limit,
            "spent": spent,
            "remaining": limit - spent if limit > 0 else None,
            "percent": round((spent / limit) * 100, 1) if limit > 0 else None
        })
    
    return sorted(result, key=lambda x: x["category"])


# ======== Payment Methods API ========
class PaymentMethodCreate(BaseModel):
    name: str
    icon: str = "💳"
    user_id: Optional[str] = None

@app.get("/api/payment-methods")
def get_payment_methods(user_id: Optional[str] = None):
    if user_id:
        # Check if user has personal methods
        if payment_methods_collection.count_documents({"user_id": user_id}) == 0:
            # Seed defaults
            defaults = list(payment_methods_collection.find({"is_default": True}))
            if defaults:
                new_items = []
                for d in defaults:
                    new_item = d.copy()
                    new_item.pop("_id")
                    new_item["user_id"] = user_id
                    new_item["is_default"] = False # Make it user-owned
                    new_items.append(new_item)
                if new_items:
                    payment_methods_collection.insert_many(new_items)
        
        # Return only user's methods
        methods = list(payment_methods_collection.find({"user_id": user_id}))
        return [fix_id(m) for m in methods]
        
    return []

@app.post("/api/payment-methods")
def create_payment_method(method: PaymentMethodCreate):
    data = method.dict()
    result = payment_methods_collection.insert_one(data)
    return {"id": str(result.inserted_id), **data}

@app.delete("/api/payment-methods/{method_id}")
def delete_payment_method(method_id: str):
    method = payment_methods_collection.find_one({"_id": ObjectId(method_id)})
    if not method:
        raise HTTPException(status_code=404, detail="支付方式不存在")
        
    # Allow deletion if it's NOT a system global default (is_default=True AND user_id=None)
    # Our seeded items have is_default=False, so they are deletable.
    if method.get("is_default") and not method.get("user_id"):
        raise HTTPException(status_code=400, detail="無法刪除系統預設值")
        
    payment_methods_collection.delete_one({"_id": ObjectId(method_id)})
    return {"success": True}

# ============================================================
# [Categories] 分類管理 API (補回 & 改良)
# ============================================================
@app.get("/api/categories")
def get_categories(user_id: Optional[str] = None):
    if user_id:
        # Check if user has personal categories
        if categories_collection.count_documents({"user_id": user_id}) == 0:
            # Seed defaults
            defaults = list(categories_collection.find({"is_default": True}))
            if defaults:
                new_items = []
                for d in defaults:
                    new_item = d.copy()
                    new_item.pop("_id")
                    new_item["user_id"] = user_id
                    new_item["is_default"] = False # Make it user-owned
                    new_items.append(new_item)
                if new_items:
                    categories_collection.insert_many(new_items)
        
        # Return only user's categories
        categories = list(categories_collection.find({"user_id": user_id}))
        return [fix_id(c) for c in categories]
        
    return []

@app.post("/api/categories")
def create_category(category: Category):
    data = category.dict()
    result = categories_collection.insert_one(data)
    return {"message": "分類建立成功", "id": str(result.inserted_id), **data}

@app.delete("/api/categories/{id}")
def delete_category(id: str):
    cat = categories_collection.find_one({"_id": ObjectId(id)})
    if not cat:
        raise HTTPException(status_code=404, detail="分類不存在")
    
    # Allow deletion if user-owned
    if cat.get("is_default") and not cat.get("user_id"):
        raise HTTPException(status_code=400, detail="無法刪除系統預設分類")
        
    categories_collection.delete_one({"_id": ObjectId(id)})
    return {"message": "分類已刪除"}