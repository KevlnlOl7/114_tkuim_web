# database.py - MongoDB connection, collections, and indexes
import os
from dotenv import load_dotenv
from pymongo import MongoClient, ASCENDING, DESCENDING
from pathlib import Path

# Load .env from current directory
env_path = Path(__file__).parent / '.env'
load_dotenv(env_path)

# MongoDB Connection
mongo_url = os.getenv("MONGODB_URL", "mongodb://localhost:27017/")
client = MongoClient(mongo_url)
db = client["PyMoney"]

# Collections
transactions_collection = db["transactions"]
settings_collection = db["settings"]
categories_collection = db["categories"]
users_collection = db["users"]
families_collection = db["families"]
templates_collection = db["templates"]
recurring_collection = db["recurring"]
category_budgets_collection = db["category_budgets"]
payment_methods_collection = db["payment_methods"]
ledgers_collection = db["ledgers"]

# Alias for backward compatibility
collection = transactions_collection


def create_indexes():
    """
    Create MongoDB indexes for query optimization.
    Call this during app startup.
    """
    # Transactions: frequently queried by user_id, date, and type
    transactions_collection.create_index([("user_id", ASCENDING)])
    transactions_collection.create_index([("date", DESCENDING)])
    transactions_collection.create_index([("user_id", ASCENDING), ("date", DESCENDING)])
    transactions_collection.create_index([("type", ASCENDING)])
    
    # Users: login queries
    users_collection.create_index([("username", ASCENDING)], unique=True)
    users_collection.create_index([("email", ASCENDING)])
    users_collection.create_index([("family_id", ASCENDING)])
    users_collection.create_index([("invite_code", ASCENDING)])
    
    # Categories: lookup by user and type
    categories_collection.create_index([("user_id", ASCENDING)])
    categories_collection.create_index([("type", ASCENDING)])
    categories_collection.create_index([("is_default", ASCENDING)])
    
    # Templates: quick entry lookup
    templates_collection.create_index([("user_id", ASCENDING)])
    
    # Recurring transactions
    recurring_collection.create_index([("user_id", ASCENDING)])
    recurring_collection.create_index([("next_date", ASCENDING)])
    
    # Category budgets
    category_budgets_collection.create_index([("user_id", ASCENDING)])
    category_budgets_collection.create_index([("user_id", ASCENDING), ("category", ASCENDING)])
    
    print("✅ MongoDB indexes created successfully")


# Pagination helper
def paginate_query(collection_obj, query: dict, page: int = 1, page_size: int = 50, 
                   sort_field: str = "_id", sort_order: int = DESCENDING):
    """
    Helper function for paginated queries.
    
    Args:
        collection_obj: MongoDB collection
        query: Query filter dict
        page: Page number (1-indexed)
        page_size: Items per page
        sort_field: Field to sort by
        sort_order: ASCENDING (1) or DESCENDING (-1)
    
    Returns:
        dict with items, total, page, page_size, total_pages
    """
    skip = (page - 1) * page_size
    total = collection_obj.count_documents(query)
    total_pages = (total + page_size - 1) // page_size  # Ceiling division
    
    cursor = collection_obj.find(query).sort(sort_field, sort_order).skip(skip).limit(page_size)
    items = list(cursor)
    
    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages,
        "has_next": page < total_pages,
        "has_prev": page > 1
    }

