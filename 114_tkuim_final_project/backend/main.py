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
import time

from pathlib import Path

# 載入 .env 檔案 (使用明確路徑)
env_path = Path(__file__).parent / '.env'
load_dotenv(env_path)

app = FastAPI()

@app.on_event("startup")
def init_db():
    if categories_collection.count_documents({}) == 0:
        defaults = [
            {"name": "Food", "icon": "🍔", "type": "expense", "color": "#E74C3C", "is_default": True},
            {"name": "Transport", "icon": "🚌", "type": "expense", "color": "#3498DB", "is_default": True},
            {"name": "Entertainment", "icon": "🎮", "type": "expense", "color": "#9B59B6", "is_default": True},
            {"name": "Rent", "icon": "🏠", "type": "expense", "color": "#F1C40F", "is_default": True},
            {"name": "Salary", "icon": "💰", "type": "income", "color": "#2ECC71", "is_default": True},
            {"name": "Other", "icon": "✨", "type": "expense", "color": "#95A5A6", "is_default": True},
        ]
        categories_collection.insert_many(defaults)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
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

# --- 密碼加密 ---
def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

def verify_password(plain: str, hashed: str) -> bool:
    return hash_password(plain) == hashed

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
import secrets

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

class Category(BaseModel):
    name: str
    icon: str = "🏷️"

def fix_id(doc):
    doc["id"] = str(doc.pop("_id"))
    return doc

# --- 初始化預設管理員 ---
def init_default_admin():
    if not users_collection.find_one({"username": "admin"}):
        users_collection.insert_one({
            "username": "admin",
            "password": hash_password("admin"),
            "display_name": "管理員",
            "role": "admin",
            "created_at": datetime.now().isoformat()
        })
        print("✅ 已建立預設管理員帳號: admin / admin")

# 啟動時執行
@app.on_event("startup")
def startup_event():
    init_default_admin()

# --- API 區域 ---
# [Auth] 使用者登入 API
@app.post("/api/auth/login")
def login(request: LoginRequest):
    user = users_collection.find_one({"username": request.username})
    
    if not user:
        raise HTTPException(status_code=401, detail="使用者不存在")
    
    if not verify_password(request.password, user["password"]):
        raise HTTPException(status_code=401, detail="密碼錯誤")
    
    return {
        "success": True,
        "message": "登入成功",
        "user": {
            "id": str(user["_id"]),
            "username": user["username"],
            "display_name": user["display_name"],
            "role": user["role"],
            "family_id": user.get("family_id")
        }
    }

# [Auth] 自助註冊 API
@app.post("/api/auth/register")
def self_register(request: RegisterRequest):
    if users_collection.find_one({"username": request.username}):
        raise HTTPException(status_code=400, detail="使用者名稱已存在")
    
    new_user = {
        "username": request.username,
        "password": hash_password(request.password),
        "display_name": request.display_name,
        "email": request.email,
        "role": request.role if request.role in ["user", "admin"] else "user",
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
    
    return {"family_name": family["name"], "members": members}

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
    
    # 從家庭成員列表移除
    families_collection.update_one(
        {"_id": ObjectId(family_id)},
        {"$pull": {"members": member_id}}
    )
    
    # 清除成員的 family_id
    users_collection.update_one(
        {"_id": ObjectId(member_id)},
        {"$set": {"family_id": None}}
    )
    
    return {"message": "已將成員移出家庭"}

# [Users] 取得所有使用者 (管理員限定)
@app.get("/api/users")
def get_users():
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
def get_user(id: str):
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
def register_user(user: UserCreate):
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

# [Users] 重設密碼 (管理員限定)
@app.post("/api/users/{id}/reset-password")
def reset_password(id: str, request: ResetPasswordRequest):
    user = users_collection.find_one({"_id": ObjectId(id)})
    if not user:
        raise HTTPException(status_code=404, detail="使用者不存在")
    
    users_collection.update_one(
        {"_id": ObjectId(id)},
        {"$set": {"password": hash_password(request.new_password)}}
    )
    return {"message": "密碼重設成功"}

# [Users] 刪除使用者 (管理員限定)
@app.delete("/api/users/{id}")
def delete_user(id: str):
    user = users_collection.find_one({"_id": ObjectId(id)})
    if user and user.get("username") == "admin":
        raise HTTPException(status_code=400, detail="無法刪除預設管理員帳號")
    
    users_collection.delete_one({"_id": ObjectId(id)})
    return {"message": "刪除成功"}

# [交易] 讀取
@app.get("/api/transactions")
def get_transactions(
    keyword: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    user_id: Optional[str] = None  # 新增：可依使用者過濾
):
    query = {}
    if user_id:
        query["user_id"] = user_id
    if keyword:
        query["$or"] = [
            {"title": {"$regex": keyword, "$options": "i"}},
            {"note": {"$regex": keyword, "$options": "i"}}
        ]
    if start_date and end_date:
        query["date"] = {"$gte": start_date, "$lte": end_date}
    elif start_date:
        query["date"] = {"$gte": start_date}
    elif end_date:
        query["date"] = {"$lte": end_date}

    data = collection.find(query).sort("date", -1)
    return [fix_id(doc) for doc in data]

# [交易] 新增
@app.post("/api/transactions")
def create_transaction(tx: Transaction, user_id: Optional[str] = None):
    data = tx.dict()
    if user_id:
        data["user_id"] = user_id
    result = collection.insert_one(data)
    return {"message": "新增成功", "id": str(result.inserted_id)}

# [交易] 更新
@app.put("/api/transactions/{id}")
def update_transaction(id: str, tx: Transaction):
    collection.update_one({"_id": ObjectId(id)}, {"$set": tx.dict()})
    return {"message": "更新成功"}

# [交易] 刪除
@app.delete("/api/transactions/{id}")
def delete_transaction(id: str):
    collection.delete_one({"_id": ObjectId(id)})
    return {"message": "刪除成功"}

# [Dashboard] 圓餅圖
@app.get("/api/dashboard/stats")
def get_category_stats(start_date: Optional[str] = None, end_date: Optional[str] = None):
    match_stage = {"type": "expense"}
    if start_date and end_date:
        match_stage["date"] = {"$gte": start_date, "$lte": end_date}
    elif start_date:
        match_stage["date"] = {"$gte": start_date}
    elif end_date:
        match_stage["date"] = {"$lte": end_date}

    pipeline = [
        {"$match": match_stage},
        {"$group": {"_id": "$category", "total": {"$sum": "$amount"}}}
    ]
    result = list(collection.aggregate(pipeline))
    return {item["_id"]: item["total"] for item in result}

# [Dashboard] 長條圖
@app.get("/api/dashboard/trend")
def get_trend_stats():
    pipeline = [
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
    settings_collection.update_one(
        {"_id": "monthly_budget"},
        {"$set": {"limit": budget.limit}},
        upsert=True
    )
    return {"message": "預算設定成功"}

# [分類] 取得
@app.get("/api/categories")
def get_categories(user_id: Optional[str] = None):
    query = {"is_default": True}
    if user_id:
        query = {"$or": [{"is_default": True}, {"user_id": user_id}]}
    
    cats = categories_collection.find(query)
    return [fix_id(c) for c in cats]

# [分類] 新增
@app.post("/api/categories")
def create_category(cat: Category):
    # Ensure is_default is False for user created
    cat.is_default = False
    new_cat = cat.dict()
    res = categories_collection.insert_one(new_cat)
    return {"id": str(res.inserted_id), "message": "分類新增成功"}

# [分類] 刪除
@app.delete("/api/categories/{id}")
def delete_category(id: str):
    cat = categories_collection.find_one({"_id": ObjectId(id)})
    if not cat:
        raise HTTPException(status_code=404, detail="找不到分類")
    
    item = categories_collection.find_one({"_id": ObjectId(id)})
    if not item:
        raise HTTPException(status_code=404, detail="找不到分類")
    
    # 允許刪除預設分類 (User request)
    # if item.get("is_default"):
    #    raise HTTPException(status_code=400, detail="無法刪除預設分類")
    
    categories_collection.delete_one({"_id": ObjectId(id)})
    return {"message": "分類已刪除"}

# [匯出] Excel
@app.get("/api/export")
def export_excel():
    data = list(collection.find().sort("date", -1))
    if not data:
        raise HTTPException(status_code=404, detail="無資料")
    for doc in data: doc["_id"] = str(doc["_id"])
    df = pd.DataFrame(data)
    cols = ["date", "type", "category", "title", "amount", "payment_method"]
    df = df[[c for c in cols if c in df.columns]]
    filename = "PyMoney_Export.xlsx"
    df.to_excel(filename, index=False)
    return FileResponse(filename, filename=filename)

# [匯入] Excel/CSV (新功能!)
@app.post("/api/import")
async def import_file(file: UploadFile = File(...)):
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
        
        # 寫入資料庫
        if records:
            collection.insert_many(records)
            
        return {"message": f"成功匯入 {len(records)} 筆資料"}
        
    except Exception as e:
        print(e)
        raise HTTPException(status_code=500, detail=f"匯入失敗: {str(e)}")

# [Dashboard] 帳戶餘額統計 (新功能!)
@app.get("/api/dashboard/accounts")
def get_account_stats():
    # 1. 計算 Source (付款/轉出) 造成的餘額變動
    pipeline_source = [
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

    # [Categories] 取得分類列表 (如果空的，自動初始化)
@app.get("/api/categories")
def get_categories():
    cats = list(categories_collection.find())
    
    # 如果資料庫完全沒分類，幫使用者初始化預設值
    if not cats:
        defaults = [
            {"name": "Food", "icon": "🍔"},
            {"name": "Transport", "icon": "🚌"},
            {"name": "Entertainment", "icon": "🎬"},
            {"name": "Rent", "icon": "🏠"},
            {"name": "Salary", "icon": "💼"},
            {"name": "Other", "icon": "✨"},
        ]
        categories_collection.insert_many(defaults)
        cats = list(categories_collection.find())
    
    # 回傳整理過的格式
    return [{"id": str(c["_id"]), "name": c["name"], "icon": c.get("icon", "🏷️")} for c in cats]

# 新增分類
@app.post("/api/categories")
def add_category(cat: Category):
    # 檢查是否重複
    if categories_collection.find_one({"name": cat.name}):
        raise HTTPException(status_code=400, detail="分類名稱已存在")
    
    result = categories_collection.insert_one(cat.dict())
    return {"message": "新增成功", "id": str(result.inserted_id)}

# 刪除分類
@app.delete("/api/categories/{id}")
def delete_category(id: str):
    categories_collection.delete_one({"_id": ObjectId(id)})
    return {"message": "刪除成功"}

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