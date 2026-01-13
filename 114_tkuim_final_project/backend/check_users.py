from database import transactions_collection, users_collection
from bson import ObjectId

# Get all users
users = list(users_collection.find({}, {"_id": 1, "username": 1, "display_name": 1}))
print("=" * 60)
print("Users in database:")
for u in users:
    print(f"  ID: {u['_id']}, Username: {u.get('username', 'N/A')}, Display: {u.get('display_name', 'N/A')}")
print()

# Get sample transactions and their user_ids
transactions = list(transactions_collection.find({}, {"title": 1, "user_id": 1, "date": 1}).sort("_id", -1).limit(10))
print("Recent 10 transactions:")
print("-" * 60)
for i, t in enumerate(transactions, 1):
    user_id = t.get("user_id", "N/A")
    # Find user
    user = users_collection.find_one({"_id": ObjectId(user_id)}) if user_id != "N/A" else None
    user_name = user.get("display_name", "Unknown") if user else "Unknown"
    print(f"{i}. {t.get('title', 'N/A')[:30]:30} | User ID: {user_id} | Name: {user_name}")
print("=" * 60)

# Count by user_id
print("\nTransaction count by user:")
pipeline = [
    {"$group": {"_id": "$user_id", "count": {"$sum": 1}}}
]
counts = list(transactions_collection.aggregate(pipeline))
for c in counts:
    user_id = c["_id"]
    user = users_collection.find_one({"_id": ObjectId(user_id)}) if user_id else None
    user_name = user.get("display_name", "Unknown") if user else "No User ID"
    print(f"  {user_name}: {c['count']} transactions")
