"""
遷移腳本：為沒有 ledger_id 的舊交易設置 ledger_id

使用方法：
1. 先在系統中找到或創建一個帳本
2. 複製該帳本的 ID
3. 執行此腳本： python migrate_transactions.py <ledger_id>

例如: python migrate_transactions.py 69665d2df67da8b075d2343e
"""

import sys
from pymongo import MongoClient
from bson import ObjectId
import os
from dotenv import load_dotenv

load_dotenv()

def migrate_transactions(ledger_id):
    # 連接資料庫
    mongo_url = os.getenv("MONGODB_URL", "mongodb://localhost:27017/")
    client = MongoClient(mongo_url)
    db = client["PyMoney"]
    transactions = db["transactions"]
    ledgers = db["ledgers"]
    
    # 驗證帳本存在
    ledger = ledgers.find_one({"_id": ObjectId(ledger_id)})
    if not ledger:
        print(f"❌ 錯誤：找不到 ID 為 {ledger_id} 的帳本")
        return
    
    print(f"✅ 找到帳本：{ledger.get('name', '未命名')}")
    
    # 找出所有沒有 ledger_id 的交易
    orphan_transactions = list(transactions.find({
        "$or": [
            {"ledger_id": {"$exists": False}},
            {"ledger_id": None}
        ]
    }))
    
    if not orphan_transactions:
        print("✅ 沒有需要遷移的交易（所有交易都已有 ledger_id）")
        return
    
    print(f"\n找到 {len(orphan_transactions)} 筆沒有 ledger_id 的交易")
    print("\n前5筆交易：")
    for tx in orphan_transactions[:5]:
        print(f"  - {tx.get('date')} | {tx.get('title')} | ${tx.get('amount')}")
    
    # 詢問確認
    confirm = input(f"\n是否將這些交易遷移到帳本「{ledger.get('name')}」？ (y/n): ")
    
    if confirm.lower() != 'y':
        print("❌ 取消遷移")
        return
    
    # 執行遷移
    result = transactions.update_many(
        {
            "$or": [
                {"ledger_id": {"$exists": False}},
                {"ledger_id": None}
            ]
        },
        {
            "$set": {"ledger_id": ledger_id}
        }
    )
    
    print(f"\n✅ 成功！已將 {result.modified_count} 筆交易遷移到帳本「{ledger.get('name')}」")
    print("\n提示：重新整理瀏覽器頁面即可看到這些交易出現在該帳本中")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("❌ 使用方法： python migrate_transactions.py <ledger_id>")
        print("\n如何取得 ledger_id：")
        print("1. 在瀏覽器中打開 http://localhost:8000/api/ledgers")
        print("2. 找到你想遷移到的帳本")
        print("3. 複製該帳本的 'id' 欄位值")
        sys.exit(1)
    
    ledger_id = sys.argv[1]
    migrate_transactions(ledger_id)
