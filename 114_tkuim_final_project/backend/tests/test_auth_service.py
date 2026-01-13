"""
Unit Tests for Auth Service

Run with: pytest tests/test_auth_service.py -v
"""
import pytest
import sys
import os

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.auth_service import (
    hash_password,
    verify_password,
    validate_password_strength,
    generate_invite_code
)


class TestPasswordHashing:
    """Tests for password hashing functions"""
    
    def test_hash_password_returns_string(self):
        """Hash should return a string"""
        result = hash_password("test123")
        assert isinstance(result, str)
    
    def test_hash_password_consistent(self):
        """Same password should produce same hash"""
        hash1 = hash_password("mypassword")
        hash2 = hash_password("mypassword")
        assert hash1 == hash2
    
    def test_hash_password_different_for_different_inputs(self):
        """Different passwords should produce different hashes"""
        hash1 = hash_password("password1")
        hash2 = hash_password("password2")
        assert hash1 != hash2
    
    def test_verify_password_correct(self):
        """Correct password should verify"""
        hashed = hash_password("correct_password")
        assert verify_password("correct_password", hashed) == True
    
    def test_verify_password_incorrect(self):
        """Incorrect password should not verify"""
        hashed = hash_password("correct_password")
        assert verify_password("wrong_password", hashed) == False


class TestPasswordValidation:
    """Tests for password strength validation"""
    
    def test_password_too_short(self):
        """Password less than 8 chars should fail"""
        is_valid, msg = validate_password_strength("Abc123")
        assert is_valid == False
        assert "8" in msg
    
    def test_password_no_uppercase(self):
        """Password without uppercase should fail"""
        is_valid, msg = validate_password_strength("abcdefg123")
        assert is_valid == False
        assert "大寫" in msg
    
    def test_password_no_lowercase(self):
        """Password without lowercase should fail"""
        is_valid, msg = validate_password_strength("ABCDEFG123")
        assert is_valid == False
        assert "小寫" in msg
    
    def test_password_no_number(self):
        """Password without number should fail"""
        is_valid, msg = validate_password_strength("Abcdefghij")
        assert is_valid == False
        assert "數字" in msg
    
    def test_password_valid(self):
        """Valid password should pass"""
        is_valid, msg = validate_password_strength("Abcdefg1")
        assert is_valid == True
        assert msg == ""
    
    def test_password_complex_valid(self):
        """Complex password should pass"""
        is_valid, msg = validate_password_strength("MyP@ssw0rd123!")
        assert is_valid == True


class TestInviteCode:
    """Tests for invite code generation"""
    
    def test_invite_code_length(self):
        """Code should have correct length"""
        code = generate_invite_code(6)
        assert len(code) == 6
    
    def test_invite_code_custom_length(self):
        """Code should respect custom length"""
        code = generate_invite_code(10)
        assert len(code) == 10
    
    def test_invite_code_alphanumeric(self):
        """Code should be alphanumeric uppercase"""
        code = generate_invite_code(100)  # Generate long code for better sample
        assert code.isalnum()
        assert code.isupper()
    
    def test_invite_code_unique(self):
        """Generated codes should be unique"""
        codes = [generate_invite_code() for _ in range(100)]
        unique_codes = set(codes)
        # Most should be unique (statistically)
        assert len(unique_codes) > 90


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
