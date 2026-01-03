import os  # 新增
from dotenv import load_dotenv  # 新增
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pymongo import MongoClient
from pydantic import BaseModel
from typing import Optional, List
from bson import ObjectId

# 1. 載入 .env 檔案內容
load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# 2. 從環境變數讀取設定 (如果讀不到，後面的是預設值)
mongo_url = os.getenv("MONGODB_URL", "mongodb://localhost:27017/")
db_name = os.getenv("DB_NAME", "PyMoney")

# 3. 使用讀取到的變數連線
client = MongoClient(mongo_url)
db = client[db_name]
collection = db["transactions"]

# 1. 設定 CORS (讓前端可以連線)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# 2. 【關鍵修改】連接真正的 MongoDB 資料庫
# 請確保你的 MongoDB 軟體已經打開 (預設 port 27017)
client = MongoClient("mongodb://localhost:27017/")
db = client["PyMoney"]          # 資料庫名稱
collection = db["transactions"] # 資料表名稱

# Pydantic 模型
class Transaction(BaseModel):
    title: str
    amount: int
    category: str
    date: str
    type: str = "expense"
    note: Optional[str] = None

# 輔助函式：把 MongoDB 的 _id (ObjectId) 轉成字串
def fix_id(doc):
    doc["id"] = str(doc.pop("_id"))
    return doc

@app.get("/")
def read_root():
    return {"message": "PyMoney 後端連線成功！"}

# [READ] 取得所有記帳紀錄
@app.get("/api/transactions")
def get_transactions():
    data = collection.find()
    return [fix_id(doc) for doc in data]

# [CREATE] 新增一筆紀錄
@app.post("/api/transactions")
def create_transaction(tx: Transaction):
    tx_data = tx.dict()
    result = collection.insert_one(tx_data)
    return {"message": "新增成功", "id": str(result.inserted_id)}

# [DELETE] 刪除一筆紀錄
@app.delete("/api/transactions/{id}")
def delete_transaction(id: str):
    try:
        result = collection.delete_one({"_id": ObjectId(id)})
        if result.deleted_count == 1:
            return {"message": "刪除成功"}
        else:
            raise HTTPException(status_code=404, detail="找不到該筆資料")
    except Exception:
         raise HTTPException(status_code=400, detail="ID 格式錯誤")