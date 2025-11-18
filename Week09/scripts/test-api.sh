#!/bin/bash

# 設定 API 基礎網址
BASE_URL="http://localhost:3001"

echo "========================================"
echo "開始測試 API: $BASE_URL"
echo "========================================"

# 1. 測試 Health Check
echo -e "\n[1] 測試伺服器健康狀態 (GET /health)..."
curl -s -X GET "$BASE_URL/health"
echo "" # 換行

# 2. 測試成功註冊
echo -e "\n[2] 測試成功註冊 (POST /api/signup)..."
curl -s -X POST "$BASE_URL/api/signup" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "腳本測試員",
    "email": "script@test.com",
    "phone": "0911222333",
    "password": "password123",
    "interests": ["Shell Script", "Testing"],
    "terms": true
  }'
echo ""

# 3. 測試失敗註冊 (故意錯誤的手機號碼)
echo -e "\n[3] 測試失敗註冊-格式錯誤 (POST /api/signup)..."
curl -s -X POST "$BASE_URL/api/signup" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "錯誤測試",
    "email": "error@test.com",
    "phone": "123",
    "password": "pwd",
    "interests": []
  }'
echo ""

# 4. 獲取所有名單
echo -e "\n[4] 獲取目前報名清單 (GET /api/signup)..."
curl -s -X GET "$BASE_URL/api/signup"
echo ""

echo -e "\n========================================"
echo "測試結束"
echo "========================================"