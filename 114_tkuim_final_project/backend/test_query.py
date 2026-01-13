from database import transactions_collection, users_collection, ledgers_collection
from bson import ObjectId

# Find admin user
admin = users_collection.find_one({"username": "admin"})
if not admin:
    print("Admin user not found!")
    exit()

admin_id = str(admin["_id"])
print(f"Admin ID: {admin_id}")
print(f"Admin username: {admin['username']}")
print()

# Get admin's ledgers
user_ledgers = list(ledgers_collection.find({
    "$or": [
        {"owner_id": admin_id},
        {"members": admin_id}
    ]
}))
user_ledger_ids = [str(l["_id"]) for l in user_ledgers]
print(f"Admin's ledger IDs: {user_ledger_ids}")
print()

# Test query 1: All ledgers view (what the code should do)
if user_ledger_ids:
    query = {
        "$or": [
            {"user_id": admin_id},
            {"ledger_id": {"$in": user_ledger_ids}}
        ]
    }
else:
    query = {"user_id": admin_id}

print(f"Query: {query}")
print()

# Execute query
results = list(transactions_collection.find(query).sort("date", -1).limit(10))
print(f"Found {len(results)} transactions")
print()

# Show first 3
for i, t in enumerate(results[:3], 1):
    print(f"{i}. {t.get('title', 'N/A')} - ${t.get('amount', 0)} - {t.get('date', 'N/A')}")
    print(f"   user_id: {t.get('user_id', 'N/A')}, ledger_id: {t.get('ledger_id', 'None')}")

# Total count
total = transactions_collection.count_documents(query)
print(f"\nTotal matching transactions: {total}")
