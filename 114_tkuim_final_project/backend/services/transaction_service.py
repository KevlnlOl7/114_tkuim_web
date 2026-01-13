"""
Transaction Service - Transaction Management Business Logic

This module contains transaction-related business logic extracted from main.py.
"""
from datetime import datetime
from typing import Optional, List, Dict, Any
from bson import ObjectId

from database import transactions_collection, paginate_query, DESCENDING


def fix_id(doc: dict) -> dict:
    """Convert MongoDB ObjectId to string ID"""
    if doc and "_id" in doc:
        doc["id"] = str(doc["_id"])
    return doc


def get_user_transactions(user_id: str, page: int = 1, page_size: int = 50) -> Dict[str, Any]:
    """
    Get paginated transactions for a user.
    
    Args:
        user_id: User ID
        page: Page number (1-indexed)
        page_size: Items per page
    
    Returns:
        Paginated result with items, total, pages info
    """
    query = {"user_id": user_id}
    result = paginate_query(
        transactions_collection, 
        query, 
        page=page, 
        page_size=page_size,
        sort_field="date",
        sort_order=DESCENDING
    )
    
    # Fix IDs for all items
    result["items"] = [fix_id(item) for item in result["items"]]
    return result


def get_family_transactions(user_ids: List[str], page: int = 1, page_size: int = 50) -> Dict[str, Any]:
    """
    Get paginated transactions for multiple family members.
    
    Args:
        user_ids: List of user IDs in family
        page: Page number (1-indexed)
        page_size: Items per page
    
    Returns:
        Paginated result with items, total, pages info
    """
    query = {"user_id": {"$in": user_ids}}
    result = paginate_query(
        transactions_collection, 
        query, 
        page=page, 
        page_size=page_size,
        sort_field="date",
        sort_order=DESCENDING
    )
    
    result["items"] = [fix_id(item) for item in result["items"]]
    return result


def create_transaction(data: dict, user_id: str) -> dict:
    """
    Create a new transaction.
    
    Args:
        data: Transaction data
        user_id: User ID
    
    Returns:
        Created transaction with ID
    """
    transaction = {
        **data,
        "user_id": user_id,
        "created_at": datetime.now().isoformat()
    }
    result = transactions_collection.insert_one(transaction)
    transaction["id"] = str(result.inserted_id)
    return transaction


def update_transaction(tx_id: str, data: dict, user_id: str) -> Optional[dict]:
    """
    Update an existing transaction.
    
    Args:
        tx_id: Transaction ID
        data: Updated data
        user_id: User ID (for ownership check)
    
    Returns:
        Updated transaction or None if not found/not authorized
    """
    try:
        existing = transactions_collection.find_one({"_id": ObjectId(tx_id)})
        if not existing:
            return None
        if existing.get("user_id") != user_id:
            return None
        
        update_data = {
            **data,
            "updated_at": datetime.now().isoformat()
        }
        transactions_collection.update_one(
            {"_id": ObjectId(tx_id)},
            {"$set": update_data}
        )
        
        updated = transactions_collection.find_one({"_id": ObjectId(tx_id)})
        return fix_id(updated)
    except:
        return None


def delete_transaction(tx_id: str, user_id: str) -> bool:
    """
    Delete a transaction.
    
    Args:
        tx_id: Transaction ID
        user_id: User ID (for ownership check)
    
    Returns:
        True if deleted, False otherwise
    """
    try:
        existing = transactions_collection.find_one({"_id": ObjectId(tx_id)})
        if not existing:
            return False
        if existing.get("user_id") != user_id:
            return False
        
        transactions_collection.delete_one({"_id": ObjectId(tx_id)})
        return True
    except:
        return False


def get_monthly_stats(user_id: str, year: int, month: int) -> Dict[str, float]:
    """
    Calculate monthly statistics for a user.
    
    Args:
        user_id: User ID
        year: Year
        month: Month
    
    Returns:
        Dict with income, expense, balance
    """
    month_str = f"{year}-{month:02d}"
    
    pipeline = [
        {"$match": {
            "user_id": user_id,
            "date": {"$regex": f"^{month_str}"}
        }},
        {"$group": {
            "_id": "$type",
            "total": {"$sum": "$amount"}
        }}
    ]
    
    result = list(transactions_collection.aggregate(pipeline))
    
    income = 0
    expense = 0
    for item in result:
        if item["_id"] == "income":
            income = item["total"]
        elif item["_id"] == "expense":
            expense = item["total"]
    
    return {
        "income": income,
        "expense": expense,
        "balance": income - expense
    }
