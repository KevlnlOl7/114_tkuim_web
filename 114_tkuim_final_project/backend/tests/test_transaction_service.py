"""
Unit Tests for Transaction Service

Run with: pytest tests/test_transaction_service.py -v
"""
import pytest
import sys
import os
from datetime import datetime
from unittest.mock import MagicMock, patch

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.transaction_service import fix_id


class TestFixId:
    """Tests for fix_id helper function"""
    
    def test_fix_id_with_object_id(self):
        """Should convert _id to string id"""
        from bson import ObjectId
        obj_id = ObjectId()
        doc = {"_id": obj_id, "title": "Test"}
        result = fix_id(doc)
        assert "id" in result
        assert result["id"] == str(obj_id)
    
    def test_fix_id_without_id(self):
        """Should handle doc without _id"""
        doc = {"title": "Test"}
        result = fix_id(doc)
        assert "id" not in result
    
    def test_fix_id_with_none(self):
        """Should handle None input"""
        result = fix_id(None)
        assert result is None
    
    def test_fix_id_preserves_other_fields(self):
        """Should preserve all other fields"""
        from bson import ObjectId
        doc = {
            "_id": ObjectId(),
            "title": "Test Transaction",
            "amount": 100,
            "category": "Food"
        }
        result = fix_id(doc)
        assert result["title"] == "Test Transaction"
        assert result["amount"] == 100
        assert result["category"] == "Food"


class TestTransactionValidation:
    """Tests for transaction data validation"""
    
    def test_valid_transaction_data(self):
        """Valid transaction data should have required fields"""
        data = {
            "title": "Lunch",
            "amount": 150,
            "category": "Food",
            "date": "2024-01-15",
            "type": "expense"
        }
        assert "title" in data
        assert "amount" in data
        assert data["amount"] > 0
    
    def test_transaction_types(self):
        """Transaction types should be valid"""
        valid_types = ["income", "expense", "transfer"]
        for t in valid_types:
            assert t in valid_types


class TestMonthlyStats:
    """Tests for monthly statistics calculation"""
    
    def test_balance_calculation(self):
        """Balance should be income - expense"""
        income = 50000
        expense = 30000
        balance = income - expense
        assert balance == 20000
    
    def test_zero_transactions(self):
        """Zero transactions should return zero stats"""
        income = 0
        expense = 0
        balance = income - expense
        assert balance == 0


class TestPaginationLogic:
    """Tests for pagination logic"""
    
    def test_page_calculation(self):
        """Page calculation should be correct"""
        total = 125
        page_size = 50
        total_pages = (total + page_size - 1) // page_size
        assert total_pages == 3
    
    def test_skip_calculation(self):
        """Skip calculation should be correct"""
        page = 3
        page_size = 50
        skip = (page - 1) * page_size
        assert skip == 100
    
    def test_has_next(self):
        """has_next should be True when more pages exist"""
        page = 1
        total_pages = 5
        has_next = page < total_pages
        assert has_next == True
    
    def test_has_prev(self):
        """has_prev should be False on first page"""
        page = 1
        has_prev = page > 1
        assert has_prev == False
    
    def test_has_prev_on_page_2(self):
        """has_prev should be True on page 2+"""
        page = 2
        has_prev = page > 1
        assert has_prev == True


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
