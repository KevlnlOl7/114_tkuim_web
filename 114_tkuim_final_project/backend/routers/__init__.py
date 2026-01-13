"""
PyMoney Backend Routers Package

This package contains modular API routers extracted from main.py
for better code organization and maintainability.

Routers:
- auth: Authentication (login, register, password reset)
- transactions: Transaction CRUD operations
- family: Family management (members, invites)

Usage in main.py:
    from routers.auth import router as auth_router
    app.include_router(auth_router)
"""

# When ready to migrate, uncomment the following:
# from .auth import router as auth_router
# from .transactions import router as transactions_router
# from .family import router as family_router
