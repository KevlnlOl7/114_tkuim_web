"""
Rate Limiting Middleware for PyMoney API

This module provides rate limiting to protect against:
- Brute force password attacks
- DDoS attacks
- API abuse

Usage in main.py:
    from middleware.rate_limit import limiter, RateLimitMiddleware
    app.state.limiter = limiter
    app.add_middleware(RateLimitMiddleware)
    
    @app.get("/api/endpoint")
    @limiter.limit("10/minute")
    def endpoint():
        pass
"""
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

# Create limiter with IP-based rate limiting
limiter = Limiter(key_func=get_remote_address)

# Pre-configured rate limit decorators
def rate_limit_auth(limit: str = "5/minute"):
    """Rate limit for authentication endpoints (login, register)"""
    return limiter.limit(limit)

def rate_limit_api(limit: str = "60/minute"):
    """Rate limit for general API endpoints"""
    return limiter.limit(limit)

def rate_limit_strict(limit: str = "3/minute"):
    """Strict rate limit for sensitive operations (password reset)"""
    return limiter.limit(limit)

def setup_rate_limiting(app):
    """
    Setup rate limiting for a FastAPI app
    
    Usage:
        from middleware.rate_limit import setup_rate_limiting
        setup_rate_limiting(app)
    """
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
    app.add_middleware(SlowAPIMiddleware)
    print("✅ Rate limiting middleware enabled")
