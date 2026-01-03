# backend/main.py
import os
import pandas as pd
import io
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pymongo import MongoClient
from pydantic import BaseModel
from typing import Optional, List
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
settings_collection = db["settings"]

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

# --- API 區域 ---

# [交易] 讀取
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

# [交易] 新增
@app.post("/api/transactions")
def create_transaction(tx: Transaction):
    result = collection.insert_one(tx.dict())
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
def get_category_stats():
    pipeline = [
        {"$match": {"type": "expense"}},
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

@app.get("/api/dashboard/accounts")
def get_account_stats():
    pipeline = [
        {"$group": {
            "_id": "$payment_method",
            "balance": {
                "$sum": {
                    "$switch": {
                        "branches": [
                            # 如果是收入，金額為正
                            {"case": {"$eq": ["$type", "income"]}, "then": "$amount"},
                            # 如果是支出，金額變負
                            {"case": {"$eq": ["$type", "expense"]}, "then": {"$multiply": ["$amount", -1]}},
                            # 轉帳暫時不影響單一帳戶餘額 (因為我們沒做 轉出/轉入 欄位)
                            {"case": {"$eq": ["$type", "transfer"]}, "then": 0} 
                        ],
                        "default": 0
                    }
                }
            }
        }},
        {"$sort": {"_id": 1}} # 依照名稱排序
    ]
    
    result = list(collection.aggregate(pipeline))
    # 整理成前端好讀的格式: [{"account": "Cash", "balance": 500}, ...]
    return [{"account": item["_id"], "balance": item["balance"]} for item in result]