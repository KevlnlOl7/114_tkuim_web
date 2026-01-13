import requests
import json

# Get token first
login_resp = requests.post("http://localhost:8000/api/login", json={
    "username": "admin",
    "password": "admin"
})

if login_resp.status_code != 200:
    print(f"Login failed: {login_resp.text}")
    exit()

token = login_resp.json()["token"]
user_id = login_resp.json()["id"]
print(f"Logged in as admin, ID: {user_id}")
print(f"Token: {token[:20]}...")
print()

# Test 1: Get transactions with NO parameters (should work)
print("=" * 60)
print("Test 1: GET /api/transactions (no params)")
print("=" * 60)
resp1 = requests.get(
    "http://localhost:8000/api/transactions",
    headers={"Authorization": f"Bearer {token}"}
)
print(f"Status: {resp1.status_code}")
if resp1.status_code == 200:
    data = resp1.json()
    print(f"Transactions count: {len(data)}")
    if data:
        print(f"First transaction: {data[0].get('title', 'N/A')}")
else:
    print(f"Error: {resp1.text}")
print()

# Test 2: GET transactions with keyword="" (frontend behavior)
print("=" * 60)
print("Test 2: GET /api/transactions?keyword=")
print("=" * 60)
resp2 = requests.get(
    "http://localhost:8000/api/transactions?keyword=",
    headers={"Authorization": f"Bearer {token}"}
)
print(f"Status: {resp2.status_code}")
if resp2.status_code == 200:
    data = resp2.json()
    print(f"Transactions count: {len(data)}")
else:
    print(f"Error: {resp2.text}")
print()

# Test 3: GET with keyword and user_id (full frontend simulation)
print("=" * 60)
print(f"Test 3: GET /api/transactions?keyword=&user_id={user_id}")
print("=" * 60)
resp3 = requests.get(
    f"http://localhost:8000/api/transactions?keyword=&user_id={user_id}",
    headers={"Authorization": f"Bearer {token}"}
)
print(f"Status: {resp3.status_code}")
if resp3.status_code == 200:
    data = resp3.json()
    print(f"Transactions count: {len(data)}")
else:
    print(f"Error: {resp3.text}")
