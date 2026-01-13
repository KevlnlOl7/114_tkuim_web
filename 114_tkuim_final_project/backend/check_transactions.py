from database import transactions_collection
from datetime import datetime

recent = list(transactions_collection.find().sort('_id', -1).limit(10))

print("=" * 60)
print(f"Total transactions in DB: {transactions_collection.count_documents({})}")
print("=" * 60)
print("\nRecent 10 transactions:")
print("-" * 60)

for i, t in enumerate(recent, 1):
    print(f"{i}. Title: {t.get('title', 'N/A')}")
    print(f"   Amount: ${t.get('amount', 0)}")
    print(f"   Date: {t.get('date', 'N/A')}")
    print(f"   Type: {t.get('type', 'N/A')}")
    print(f"   User ID: {t.get('user_id', 'N/A')}")
    print(f"   Ledger ID: {t.get('ledger_id', 'None')}")
    print("-" * 60)
