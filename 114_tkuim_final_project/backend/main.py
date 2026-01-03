# backend/main.py
import os
import pandas as pd
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pymongo import MongoClient
from pydantic import BaseModel
from typing import Optional, List, Dict
from bson import ObjectId
from datetime import datetime

load_dotenv()

app = FastAPI()

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
settings_collection = db["settings"] # 新增：用來存設定 (如預算)

class Transaction(BaseModel):
    title: str
    amount: int
    category: str
    date: str
    type: str = "expense" 
    payment_method: str = "Cash"
    note: Optional[str] = None

class BudgetSetting(BaseModel):
    limit: int

def fix_id(doc):
    doc["id"] = str(doc.pop("_id"))
    return doc

# --- API ---

# [既有 API] 交易相關
@app.get("/api/transactions")
def get_transactions(
    keyword: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None
):
    query = {}
    if keyword:
        query["title"] = {"$regex": keyword, "$options": "i"}
    if start_date and end_date:
        query["date"] = {"$gte": start_date, "$lte": end_date}
    elif start_date:
        query["date"] = {"$gte": start_date}
    elif end_date:
        query["date"] = {"$lte": end_date}

    data = collection.find(query).sort("date", -1)
    return [fix_id(doc) for doc in data]

@app.post("/api/transactions")
def create_transaction(tx: Transaction):
    result = collection.insert_one(tx.dict())
    return {"message": "新增成功", "id": str(result.inserted_id)}

@app.put("/api/transactions/{id}")
def update_transaction(id: str, tx: Transaction):
    collection.update_one({"_id": ObjectId(id)}, {"$set": tx.dict()})
    return {"message": "更新成功"}

@app.delete("/api/transactions/{id}")
def delete_transaction(id: str):
    collection.delete_one({"_id": ObjectId(id)})
    return {"message": "刪除成功"}

# [既有 API] Dashboard
@app.get("/api/dashboard/stats")
def get_category_stats():
    pipeline = [
        {"$match": {"type": "expense"}},
        {"$group": {"_id": "$category", "total": {"$sum": "$amount"}}}
    ]
    result = list(collection.aggregate(pipeline))
    return {item["_id"]: item["total"] for item in result}

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

# [新增 API] 預算設定 Budget
@app.get("/api/budget")
def get_budget():
    # 嘗試抓取設定，沒有就回傳預設值 0
    setting = settings_collection.find_one({"_id": "monthly_budget"})
    if setting:
        return {"limit": setting["limit"]}
    return {"limit": 0}

@app.post("/api/budget")
def set_budget(budget: BudgetSetting):
    # 使用 upsert=True (有就更新，沒有就新增)
    settings_collection.update_one(
        {"_id": "monthly_budget"},
        {"$set": {"limit": budget.limit}},
        upsert=True
    )
    return {"message": "預算設定成功"}

# [既有 API] 匯出
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