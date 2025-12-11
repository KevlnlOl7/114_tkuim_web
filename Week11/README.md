# Week 11 - Express API with MongoDB

## 如何打開服務

### 前置作業

1. 在 VS Code 的 Extensions 安裝 REST Client

2. 安裝 Docker Desktop 以及 MongoDB Compass

3. 在Week11/server 建立 .env 並貼上：

```text
PORT=3001
MONGODB_URI=mongodb://week11-user:week11-pass@localhost:27017/week11?authSource=week11
ALLOWED_ORIGIN = http://localhost:5173
```
#### 參數說明
- PORT: 後端伺服器運行的 Port 號（預設 3001）。

- MONGODB_URI: MongoDB 連線字串。
  格式：mongodb://帳號:密碼@主機:Port/資料庫名稱?authSource=認證資料庫

- ALLOWED_ORIGIN: 允許跨網域請求（CORS）的前端網址（例如 http://localhost:5173 或 http://127.0.0.1:5500）。

### 進入正題

步驟一：啟動資料庫 (MongoDB)

確保 Docker Desktop 已開啟

在終端機執行 ( 要注意位置是在114_tkuim_web\week11\docker )：

```docker-compose up -d```


步驟二：啟動後端

開啟終端機 ( 要注意位置是在114_tkuim_web\week11\server )

npm install          # 安裝依賴套件
npm run dev          # 啟動伺服器（port 3001）
看到

```text
[DB] Connected to MongoDB
[DB] Indexes ensured
Server running on http://localhost:3001
```
代表連線成功

### 測試的方法 ( 請確保 server 成功啟動，且資料庫連線正常 )

---
測試順序：

- 執行 1. 建立報名：此步驟會自動將回傳的 id 存入變數，方便後續使用。

- 執行 2. 測試重複報名：手動執行兩次，第二次應失敗。

- 執行 3 ~ 4：查看清單與分頁。

- 執行 5. 更新資料：會自動更新第 1 步驟建立的那筆資料。

- 執行 6. 刪除資料：會自動刪除第 1 步驟建立的那筆資料。

#### 方法 1：VS Code REST Client

進入Week11/tests 開啟 api.http

點擊每個 ### 上方的「Send Request」

查看右側視窗的回應

測試情境：

建立報名 (POST)：應回傳 201 Created 與 id。

重複報名 (POST)：使用相同 Email 再次送出，應回傳 409 Conflict (測試唯一索引)。

分頁查詢 (GET)：GET ...?page=1&limit=2，應回傳分頁資訊 meta。

更新與刪除 (PATCH/DELETE)：使用 POST 回傳的 ID 進行操作。

#### 方法 2：Postman (匯入腳本)

1. 匯入 Collection：
   - 開啟 Postman
   - 進入Workspaces
   - 左上角 Workspaces 旁有 import
   - Import → `tests\Week11_API.postman_collection.json`

2. 批次執行所有測試：
   - 右鍵點擊 Collection → Run
   - 點擊「Run Week11 Signup」
   - 執行結果![alt text](image.png)

---

#### Mongo Shell 指令

開啟終端機 ( 要注意位置是在114_tkuim_web\week11\docker )

```docker exec -it week11-mongo mongosh -u week11-user -p week11-pass --authenticationDatabase week11```

會跳出這樣的視窗
```text
Connecting to:          mongodb://<credentials>@127.0.0.1:27017/?directConnection=true&serverSelectionTimeoutMS=2000&authSource=week11&appName=mongosh+2.5.9
Using MongoDB:          7.0.26
Using Mongosh:          2.5.9

For mongosh info see: https://www.mongodb.com/docs/mongodb-shell/

test>
```

1. 切換到 week11 資料庫
```use week11```

2. 查看所有報名資料 (依時間倒序)
```db.participants.find().sort({ createdAt: -1 })```
```text
範例輸出：
test> use week11
switched to db week11
week11> db.participants.find().sort({ createdAt: -1 })
[
  {
    _id: ObjectId('692afccaa45e3541759dc29d'),
    name: '示範學員',
    email: 'demo@example.com',
    phone: '0912345678',
    createdAt: ISODate('2025-11-29T14:01:46.789Z')
  }
]
```

3. 測試分頁 (跳過前 2 筆，取 2 筆)
db.participants.find().skip(2).limit(2)

```text
範例輸出
week11> db.participants.find().skip(2).limit(2)
[
  {
    _id: ObjectId('6931d7ecea65458c18923bdb'),
    name: 'Postman 自動測試',
    email: 'postman_auto@o365.tku.edu.tw',
    phone: '0912345678',
    status: 'pending',
    createdAt: ISODate('2025-12-04T18:50:20.569Z'),
    updatedAt: ISODate('2025-12-04T18:50:20.569Z')
  }
]
week11>
```



### 必做項目

後端 API 實作：

POST /api/signup：建立報名，並防止 Email 重複 (回傳 409)。 位於：server/routes/signup.js

GET /api/signup：實作分頁 (skip/limit) 與回傳總數。 位於：server/repositories/participants.js

PATCH /api/signup/:id：更新電話或狀態。

DELETE /api/signup/:id：刪除資料。

#### 資料庫設計：

使用 MongoDB 儲存資料。 位於：server/db.js

實作 Repository Pattern 將資料庫邏輯分離。 位於：server/repositories/participants.js

替 email 欄位建立唯一索引 (Unique Index)。

#### 環境設定：

使用 .env 管理 MONGODB_URI 與 PORT。

提供 docker-compose.yml 快速建置環境。

### 老師要求的截圖
1. docker ps
   ![alt text](image-2.png)
2. mongosh
  ![alt text](image-3.png)
3. API 測試成功畫面
   1. api.http
   ![alt text](image-1.png)
   2. postman
   ![alt text](image.png)
4. MongoDB Compass 的資料結構 participants
   ![alt text](image-4.png)

### 專案結構
```text
Week11/
  ├─ docker/                                # 資料庫相關
  │  ├─ docker-compose.yml                  # Docker 啟動設定檔
  │  ├─ mongo-init.js                       # 初始化腳本
  │  └─ mongo-data/
  ├─ server/                                # 後端程式碼
  │  ├─ repositories/                       # 資料庫邏輯層 (Repository Pattern)
  │  ├─ routes/                             # API 路由層
  │  ├─ .env                                # 環境變數 (需自行建立)
  │  ├─ app.js                              # 伺服器入口
  │  ├─ db.js                               # 資料庫連線
  │  └─ package.json                        # 專案設定檔
  └─ tests/                                 # 測試檔案
     ├─ api.http                            # REST Client 測試腳本
     └─ Week11_API.postman_collection.json  # Postman 匯入檔
```

### 常見問題 FAQ

Q: 為什麼 npm run dev 失敗？
A: 請確認是否有安裝依賴 (npm install)，以及 MongoDB 是否已啟動。

Q: 重複報名沒有跳錯誤？
A: 請確認伺服器啟動時是否有印出 [DB] Indexes ensured，這代表唯一索引已建立。

### 何謂 CRUD ?
CRUD 是取 Create、Read、Update、Delete 開頭字母所組成。是常對資料庫做的四個動作。
1. Create 新增/創造
2. Read 讀取
3. Update 更新/修改
4. Delete 刪除
這邊我以常用的某海鮮電商為例。
我看到喜歡的商品，按下「直接購買」並結帳。這時候，系統裡就生出了一筆新的訂單。這就是 Create。
通常剛下單會希望貨趕快到，這時我打開 App 去看「待收貨」清單，想知道包裹到哪了。這個動作就是去資料庫把資料撈出來看。這就是 Read。
你突然發現付款方式選錯了，今天國X Cube 的回饋比中O LinePay 卡多，趕快去訂單頁面按修改，把信用卡改成Cube。這就是修改原本的資料。這就是 Update。
之後睡不著又繼續滑啊滑，發現哇X 這家比較便宜耶，於是在前賣家出貨前按了「取消訂單」。這筆訂單就從待辦事項裡消失了。這就是 Delete。
