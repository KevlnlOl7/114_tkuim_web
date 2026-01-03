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

class Transaction(BaseModel):
    title: str
    amount: int
    category: str
    date: str
    type: str = "expense" 
    payment_method: str = "Cash"
    note: Optional[str] = None

def fix_id(doc):
    doc["id"] = str(doc.pop("_id"))
    return doc

# --- API ---

# 1. [Read] 支援搜尋 + 日期範圍篩選
@app.get("/api/transactions")
def get_transactions(
    keyword: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None
):
    query = {}
    
    # 關鍵字搜尋
    if keyword:
        query["title"] = {"$regex": keyword, "$options": "i"}
    
    # 日期範圍篩選 (字串比較在 ISO 格式下是有效的)
    if start_date and end_date:
        query["date"] = {"$gte": start_date, "$lte": end_date}
    elif start_date:
        query["date"] = {"$gte": start_date}
    elif end_date:
        query["date"] = {"$lte": end_date}

    # 排序：日期新的在前面
    data = collection.find(query).sort("date", -1)
    return [fix_id(doc) for doc in data]

# 2. [Create]
@app.post("/api/transactions")
def create_transaction(tx: Transaction):
    result = collection.insert_one(tx.dict())
    return {"message": "新增成功", "id": str(result.inserted_id)}

# 3. [Update]
@app.put("/api/transactions/{id}")
def update_transaction(id: str, tx: Transaction):
    collection.update_one({"_id": ObjectId(id)}, {"$set": tx.dict()})
    return {"message": "更新成功"}

# 4. [Delete]
@app.delete("/api/transactions/{id}")
def delete_transaction(id: str):
    collection.delete_one({"_id": ObjectId(id)})
    return {"message": "刪除成功"}

# 5. [Dashboard - Pie] 圓餅圖 (分類統計)
@app.get("/api/dashboard/stats")
def get_category_stats():
    pipeline = [
        {"$match": {"type": "expense"}}, # 只看支出
        {"$group": {"_id": "$category", "total": {"$sum": "$amount"}}}
    ]
    result = list(collection.aggregate(pipeline))
    return {item["_id"]: item["total"] for item in result}

# 6. [Dashboard - Bar] 長條圖 (每日趨勢) - 新功能！
@app.get("/api/dashboard/trend")
def get_trend_stats():
    pipeline = [
        # 只抓最近 30 天的資料 (也可以不做限制抓全部)
        {"$sort": {"date": 1}}, 
        {"$group": {"_id": "$date", "income": {
            "$sum": {"$cond": [{"$eq": ["$type", "income"]}, "$amount", 0]}
        }, "expense": {
            "$sum": {"$cond": [{"$eq": ["$type", "expense"]}, "$amount", 0]}
        }}},
        {"$sort": {"_id": 1}} # 日期從舊到新
    ]
    result = list(collection.aggregate(pipeline))
    
    # 整理格式
    dates = [item["_id"] for item in result]
    incomes = [item["income"] for item in result]
    expenses = [item["expense"] for item in result]
    
    return {"dates": dates, "incomes": incomes, "expenses": expenses}

# 7. [Export]
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