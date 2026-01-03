from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional

# 這一行就是 Uvicorn 在找的 "app"
app = FastAPI()

# 設定 CORS (讓前端可以連線)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# 假資料庫
fake_db = []

class Transaction(BaseModel):
    title: str
    amount: int
    category: str
    type: str = "expense"

@app.get("/")
def read_root():
    return {"message": "PyMoney 後端運作中！"}

@app.get("/api/transactions")
def get_transactions():
    return fake_db

@app.post("/api/transactions")
def create_transaction(tx: Transaction):
    fake_db.append(tx.dict())
    return {"message": "新增成功", "data": tx}