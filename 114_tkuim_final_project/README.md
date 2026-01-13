# 💰 PyMoney - 智能家庭記帳系統

<div align="center">

![Vue.js](https://img.shields.io/badge/Vue.js-3.x-4FC08D?style=for-the-badge&logo=vue.js)
![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-009688?style=for-the-badge&logo=fastapi)
![MongoDB](https://img.shields.io/badge/MongoDB-47A248?style=for-the-badge&logo=mongodb&logoColor=white)
![Python](https://img.shields.io/badge/Python-3.10+-3776AB?style=for-the-badge&logo=python&logoColor=white)

**一款支援多幣別、家庭共享、智能分析的全功能記帳 Web 應用程式**

[功能特色](#-功能特色) • [快速開始](#-快速開始) • [技術架構](#-技術架構) • [API 文件](#-api-文件)

</div>

---

## ✨ 功能特色

### 💳 核心記帳
- **CRUD 完整** - 新增、編輯、刪除交易記錄
- **分類管理** - 自訂收支分類與圖示
- **多種支付方式** - 現金、信用卡、銀行、LinePay
- **備註功能** - 為每筆交易添加詳細備註

### 🌍 多幣別支援
- **16 種貨幣** - TWD, USD, JPY, EUR, CNY 等
- **即時匯率** - 自動換算外幣金額
- **原幣記錄** - 保留原始外幣金額

### 👨‍👩‍👧‍👦 家庭共享
- **邀請碼機制** - 安全邀請家人加入
- **成員管理** - 管理員可移除成員
- **共享帳本** - 查看全家庭交易記錄

### 📊 智能分析
- **圓餅圖** - 支出分類佔比視覺化
- **趨勢圖** - 月度收支趨勢分析
- **預算追蹤** - 總預算與分類預算監控

### ⚡ 進階功能
- **快速記帳** - 模板化常用交易
- **重複交易** - 日/週/月/年自動記帳
- **匯入匯出** - CSV 匯入、Excel 匯出
- **7 國語言** - 繁中/英/日/韓/越/印尼/菲律賓

---

## 🚀 快速開始

### 環境需求
- Python 3.10+
- Node.js 18+
- MongoDB 6.0+

### 安裝步驟

```bash
# 1. 複製專案
git clone https://github.com/KevlnlOl7/114_tkuim_web.git
cd 114_tkuim_web/114_tkuim_final_project

# 2. 後端設定
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1  # Windows
pip install -r ../requirements.txt

# 3. 環境變數 (複製並編輯 .env)
cp .env.example .env
# 編輯 .env 設定 MONGODB_URL 和 SECRET_KEY

# 4. 啟動後端
uvicorn main:app --reload

# 5. 前端設定 (開新終端)
cd frontend
npm install
npm run dev
```

### 預設帳號
| 角色 | 帳號 | 密碼 |
|------|------|------|
| 管理員 | `admin` | `Admin123` |

---

## 🏗 技術架構

```
PyMoney/
├── backend/
│   ├── main.py              # FastAPI 應用程式入口
│   ├── database.py          # MongoDB 連線與索引
│   ├── routers/             # API 路由模組
│   │   ├── auth.py          # 認證相關
│   │   ├── transactions.py  # 交易管理
│   │   └── family.py        # 家庭功能
│   ├── services/            # 業務邏輯層
│   │   ├── auth_service.py
│   │   └── transaction_service.py
│   ├── middleware/          # 中間件
│   │   └── rate_limit.py    # API 速率限制
│   └── tests/               # 單元測試
│       ├── test_auth_service.py
│       └── test_transaction_service.py
│
└── frontend/
    ├── src/
    │   ├── App.vue          # 主應用程式
    │   ├── api.js           # API 集中管理
    │   ├── i18n.js          # 國際化設定
    │   ├── components/      # Vue 元件
    │   │   ├── LoginPage.vue
    │   │   ├── TransactionForm.vue
    │   │   ├── TrendChart.vue
    │   │   └── ...
    │   └── composables/     # 組合式 API
    │       ├── useAuth.js
    │       ├── useToast.js
    │       └── useLoading.js
    └── index.html
```

### 設計模式應用

| 模式 | 應用場景 | 實現方式 |
|------|----------|----------|
| **Repository Pattern** | 資料存取抽象 | `database.py` 集中管理所有 MongoDB 操作 |
| **Service Pattern** | 業務邏輯封裝 | `services/` 目錄下的服務模組 |
| **Composable Pattern** | 前端狀態複用 | `composables/` 目錄下的組合式函數 |
| **Factory Pattern** | 元件動態生成 | `LanguageSelector` 支援多種變體 |

---

## 📚 API 文件

啟動後端後，可透過以下網址查看完整 API 文件：

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

### 主要 API 端點

| 方法 | 端點 | 說明 |
|------|------|------|
| POST | `/api/auth/login` | 使用者登入 |
| POST | `/api/auth/register` | 使用者註冊 |
| GET | `/api/transactions` | 取得交易列表 |
| POST | `/api/transactions` | 新增交易 |
| PUT | `/api/transactions/{id}` | 更新交易 |
| DELETE | `/api/transactions/{id}` | 刪除交易 |
| GET | `/api/categories` | 取得分類列表 |
| GET | `/api/family/members` | 取得家庭成員 |

---

## 🧪 測試

```bash
# 執行後端單元測試
cd backend
pytest tests/ -v

# 測試覆蓋報告
pytest tests/ --cov=services --cov-report=html
```

---

## 📝 授權

本專案為 **淡江大學 114 學年度資訊管理系 Web 應用程式開發課程** 期末專題。

---

<div align="center">

**Made with ❤️ by Kevin**

</div>
