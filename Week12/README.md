# Week 12 Authentication Project

## 必做任務清單
- [x] 建立至少兩種帳號（一般學員、管理員）。
- [x] `/auth/signup`、`/auth/login` 可用，且登入成功回傳 Token。
- [x] `/api/signup` 全數受保護：
    - GET：登入後才能查，學生只能查自己的資料，admin 可看全部。
    - POST：登入者才能新增，ownerId 需紀錄建立者。
    - DELETE：只有資料擁有者或 admin 能刪。
- [x] 前端頁面需能登入、顯示目前使用者、送出表單、刪除資料、登出。
- [x] README / 課堂筆記需寫清楚啟動方式、測試方式、帳號列表。

## 加分選項 (已實作)
- [x] **Refresh Token / Session Store**: 登入回傳 Refresh Token，並提供 `/auth/refresh` 換發新 Token。
- [x] **忘記密碼 / 重設密碼流程**: 提供 `/auth/forgot-password` (模擬發信) 與 `/auth/reset-password` 修改密碼。
![alt text](image-3.png)
- [x] **操作日誌**: 記錄哪個使用者在什麼時間做了什麼事 (存於 `logs` collection)。
![alt text](image-4.png)

## 繳交前檢查
- [x] `npm test` 通過 (Vitest + Supertest + Mongo Memory Server)。
![alt text](image-2.png)
- [x] `tests/api.http` 測試通過 (未登入拒絕 -> 登入成功 -> 權限測試)。
- [x] 資料庫無明碼密碼 (使用 bcrypt)。
![alt text](image-1.png)
- [x] `.env` 未被 commit。 ( .gitignore我寫在根目錄！)
- [x] Admin 可看見全部資料。
![alt text](image.png)

## 啟動方式

1. 安裝套件：
   ```bash
   npm install
   ```
2. 設定環境變數：
   複製 `.env.example` 到 `.env` (如果尚未建立)。
3. docker-compose.yml：
   ```bash
   version: '3.9'
   services:
   mongodb:
      image: mongo:7
      container_name: week12-mongo
      restart: unless-stopped
      ports:
         - "27017:27017"
      environment:
         MONGO_INITDB_ROOT_USERNAME: root
         MONGO_INITDB_ROOT_PASSWORD: password123
         MONGO_INITDB_DATABASE: week12
      volumes:
         - ./mongo-data:/data/db          # 保留資料
         - ./mongo-init.js:/docker-entrypoint-initdb.d/init.js:ro
   ```
4. 啟動伺服器：
   ```bash
   npm run dev
   ```
4. 訪問網頁：
   打開瀏覽器前往 `http://localhost:5500`

## 測試方式

### 自動化測試
執行以下指令進行單元與整合測試：
```bash
npm test
```
這會使用 Vitest + Supertest + MongoMemoryServer 驗證：
- 註冊/登入流程
- JWT 驗證
- 權限控管 (Admin vs Student)

### 手動測試 (VS Code REST Client)
使用 `tests/api.http` 檔案：
1. 送出 **Signup Admin** 請求。
2. 送出 **Login Admin** 取得 Token。
3. 送出 **Signup Student**。
4. 送出 **Login Student**。
5. 測試 **Create Data** (不同身份)。
6. 測試 **Get Data** (觀察回傳資料差異)。

## 帳號列表 (預設/測試用)

此系統允許註冊時指定 Role (為了作業方便)。

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@test.com | 123 |
| Student | student@test.com | 123 |

## 架構說明

- **Backend**: Express.js + MongoDB Native Driver
- **Frontend**: Vanilla JS + CSS
- **Auth**: JWT (JSON Web Token)
- **Security**: bcrypt hash passwords, HTTP-only practices ready
