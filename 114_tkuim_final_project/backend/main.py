import os
import pandas as pd
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pymongo import MongoClient
from pydantic import BaseModel
from typing import Optional, List
from bson import ObjectId
from datetime import datetime

load_dotenv()

app = FastAPI()

# 設定 CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# 資料庫連線
mongo_url = os.getenv("MONGODB_URL", "mongodb://localhost:27017/")
client = MongoClient(mongo_url)
db = client["PyMoney"]
collection = db["transactions"]

# 資料模型
class Transaction(BaseModel):
    title: str
    amount: int
    category: str
    date: str
    type: str = "expense"
    payment_method: str = "Cash" # 新增：付款方式 (現金/卡片)
    note: Optional[str] = None

def fix_id(doc):
    doc["id"] = str(doc.pop("_id"))
    return doc

# --- API 區域 ---

# 1. [Read] 支援搜尋與篩選
@app.get("/api/transactions")
def get_transactions(
    keyword: Optional[str] = None, 
    category: Optional[str] = None
):
    query = {}
    # 如果有傳關鍵字，就用 Regex 做模糊搜尋 (類似 SQL 的 LIKE)
    if keyword:
        query["title"] = {"$regex": keyword, "$options": "i"} # i = 忽略大小寫
    # 如果有傳類別
    if category and category != "All":
        query["category"] = category

    data = collection.find(query)
    return [fix_id(doc) for doc in data]

# 2. [Create] 新增
@app.post("/api/transactions")
def create_transaction(tx: Transaction):
    result = collection.insert_one(tx.dict())
    return {"message": "新增成功", "id": str(result.inserted_id)}

# 3. [Update] 編輯/更新功能 (新增的功能！)
@app.put("/api/transactions/{id}")
def update_transaction(id: str, tx: Transaction):
    try:
        # $set 代表只更新指定的欄位
        result = collection.update_one(
            {"_id": ObjectId(id)}, 
            {"$set": tx.dict()}
        )
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="找不到該筆資料")
        return {"message": "更新成功"}
    except Exception:
        raise HTTPException(status_code=400, detail="更新失敗")

# 4. [Delete] 刪除
@app.delete("/api/transactions/{id}")
def delete_transaction(id: str):
    collection.delete_one({"_id": ObjectId(id)})
    return {"message": "刪除成功"}

# 5. [Dashboard] 圖表統計
@app.get("/api/dashboard/stats")
def get_dashboard_stats():
    pipeline = [
        {"$match": {"type": "expense"}},
        {"$group": {"_id": "$category", "total": {"$sum": "$amount"}}}
    ]
    result = list(collection.aggregate(pipeline))
    return {item["_id"]: item["total"] for item in result}

# 6. [Export] 匯出 Excel (新增的功能！)
@app.get("/api/export")
def export_excel():
    # 撈出所有資料
    data = list(collection.find())
    if not data:
        raise HTTPException(status_code=404, detail="沒有資料可匯出")
    
    # 轉成 DataFrame
    for doc in data:
        doc["_id"] = str(doc["_id"]) # 把 ID 轉字串
    
    df = pd.DataFrame(data)
    
    # 調整欄位順序美觀一點
    cols = ["date", "title", "amount", "type", "category", "payment_method"]
    # 確保欄位存在才選取
    df = df[[c for c in cols if c in df.columns]]
    
    # 存成檔案
    filename = "transactions_export.xlsx"
    df.to_excel(filename, index=False)
    
    # 回傳檔案給瀏覽器下載
    return FileResponse(filename, filename=filename, media_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')