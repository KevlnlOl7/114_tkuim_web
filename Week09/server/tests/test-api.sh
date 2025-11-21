# Week09 報名系統 API 測試腳本
# 使用方式：bash scripts/test-api.sh

# ==========================================
# 設定顏色
# ==========================================
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# ==========================================
# 設定變數
# ==========================================
BASE_URL="http://localhost:3001"
PARTICIPANT_ID=""

# ==========================================
# 顯示標題
# ==========================================
echo -e "${BLUE}================================${NC}"
echo -e "${BLUE}  Week09 報名系統 API 測試${NC}"
echo -e "${BLUE}================================${NC}"
echo ""

# ==========================================
# 測試 1: 健康檢查
# ==========================================
echo -e "${YELLOW}[測試 1/10] 健康檢查 GET /health${NC}"
curl -s "${BASE_URL}/health" | jq '.'
echo ""
echo "---"
echo ""

# ==========================================
# 測試 2: 查看初始清單（應該是空的）
# ==========================================
echo -e "${YELLOW}[測試 2/10] 查看初始清單 GET /api/signup${NC}"
curl -s "${BASE_URL}/api/signup" | jq '.'
echo ""
echo "---"
echo ""

# ==========================================
# 測試 3: 新增報名（成功案例）
# ==========================================
echo -e "${YELLOW}[測試 3/10] 新增報名（成功） POST /api/signup${NC}"
RESPONSE=$(curl -s -X POST "${BASE_URL}/api/signup" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "王小明",
    "email": "ming'$(date +%s)'@example.com",
    "phone": "0912345678",
    "password": "Test1234",
    "confirmPassword": "Test1234",
    "interests": ["frontend", "backend"],
    "terms": true
  }')

echo "$RESPONSE" | jq '.'

# 提取 ID 供後續測試使用
PARTICIPANT_ID=$(echo "$RESPONSE" | jq -r '.participant.id')
echo -e "${GREEN}✓ 已儲存 ID: $PARTICIPANT_ID${NC}"
echo ""
echo "---"
echo ""

# ==========================================
# 測試 4: 查詢單一參與者
# ==========================================
echo -e "${YELLOW}[測試 4/10] 查詢單一參與者 GET /api/signup/$PARTICIPANT_ID${NC}"
curl -s "${BASE_URL}/api/signup/${PARTICIPANT_ID}" | jq '.'
echo ""
echo "---"
echo ""

# ==========================================
# 測試 5: Email 格式錯誤
# ==========================================
echo -e "${YELLOW}[測試 5/10] Email 格式錯誤（應回傳 400）${NC}"
curl -s -X POST "${BASE_URL}/api/signup" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "測試",
    "email": "invalid-email",
    "phone": "0912345678",
    "password": "Test1234",
    "confirmPassword": "Test1234",
    "interests": ["frontend"],
    "terms": true
  }' | jq '.'
echo ""
echo "---"
echo ""

# ==========================================
# 測試 6: 手機格式錯誤
# ==========================================
echo -e "${YELLOW}[測試 6/10] 手機格式錯誤（應回傳 400）${NC}"
curl -s -X POST "${BASE_URL}/api/signup" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "測試",
    "email": "test@example.com",
    "phone": "1234567890",
    "password": "Test1234",
    "confirmPassword": "Test1234",
    "interests": ["frontend"],
    "terms": true
  }' | jq '.'
echo ""
echo "---"
echo ""

# ==========================================
# 測試 7: 密碼不一致
# ==========================================
echo -e "${YELLOW}[測試 7/10] 密碼不一致（應回傳 400）${NC}"
curl -s -X POST "${BASE_URL}/api/signup" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "測試",
    "email": "test@example.com",
    "phone": "0912345678",
    "password": "Test1234",
    "confirmPassword": "Different123",
    "interests": ["frontend"],
    "terms": true
  }' | jq '.'
echo ""
echo "---"
echo ""

# ==========================================
# 測試 8: 未同意條款
# ==========================================
echo -e "${YELLOW}[測試 8/10] 未同意條款（應回傳 400）${NC}"
curl -s -X POST "${BASE_URL}/api/signup" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "測試",
    "email": "test@example.com",
    "phone": "0912345678",
    "password": "Test1234",
    "confirmPassword": "Test1234",
    "interests": ["frontend"],
    "terms": false
  }' | jq '.'
echo ""
echo "---"
echo ""

# ==========================================
# 測試 9: 查看所有報名（應該有資料）
# ==========================================
echo -e "${YELLOW}[測試 9/10] 查看所有報名 GET /api/signup${NC}"
curl -s "${BASE_URL}/api/signup" | jq '.'
echo ""
echo "---"
echo ""

# ==========================================
# 測試 10: 刪除報名
# ==========================================
echo -e "${YELLOW}[測試 10/10] 刪除報名 DELETE /api/signup/$PARTICIPANT_ID${NC}"
curl -s -X DELETE "${BASE_URL}/api/signup/${PARTICIPANT_ID}" | jq '.'
echo ""
echo "---"
echo ""

# ==========================================
# 完成
# ==========================================
echo -e "${GREEN}================================${NC}"
echo -e "${GREEN}  測試完成！${NC}"
echo -e "${GREEN}================================${NC}"
echo ""
echo -e "測試項目："
echo -e "  ${GREEN}✓${NC} 健康檢查"
echo -e "  ${GREEN}✓${NC} 查看初始清單"
echo -e "  ${GREEN}✓${NC} 新增報名（成功）"
echo -e "  ${GREEN}✓${NC} 查詢單一參與者"
echo -e "  ${GREEN}✓${NC} Email 格式驗證"
echo -e "  ${GREEN}✓${NC} 手機格式驗證"
echo -e "  ${GREEN}✓${NC} 密碼一致性驗證"
echo -e "  ${GREEN}✓${NC} 條款同意驗證"
echo -e "  ${GREEN}✓${NC} 查看所有報名"
echo -e "  ${GREEN}✓${NC} 刪除報名"
