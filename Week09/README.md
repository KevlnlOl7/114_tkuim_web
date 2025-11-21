## 如何打開服務

### 步驟一：啟動後端
1. cd Week09/server
2. npm install          # 安裝依賴套件
3. npm run dev          # 啟動伺服器（port 3001）
4.
### 步驟二：如何啟動前端
1. 在 VS Code Folders 開啟 114_TKUIM_WEB 資料夾，進入Week09 -> client -> signup_form.html
2. 右鍵 signup_form.html 選擇 "Open with Live Server"
3. 會自動開啟 http://127.0.0.1:5500/Week09/client/signup_form.html




## 加分挑戰
1. 套用 zod 或 yup 做更完整的資料驗證。 位於server/signup.js
2. 將資料暫存於 JSON 檔案或 SQLite，並提供 GET /api/signup/:id 查詢。 邏輯位於utils\db.js 實現位於server/signup.js
3. 撰寫 Jest / Vitest 後端單元測試，模擬 POST /api/signup。
4. 於前端加入重送機制（例如伺服器錯誤時 3 秒後自動重試一次）。 位於client\signup_form.js

檔案結構
```text
Week09                      # 專案根目錄
   ├─ client                # 前端(客戶端)資料夾
   │  ├─ signup_form.html   # 報名表單主頁面
   │  ├─ signup_form.js     # 表單互動邏輯（即時驗證、fetch API、LocalStorage）
   │  └─ style.css          # 效果bj4
   ├─ data
   │  └─ participants.json  # 報名資料檔案（後端自動生成並讀寫）
   ├─ scripts               # 測試腳本資料夾
   │  └─ test-api.sh        # Shell 腳本（批次測試所有 API 端點）
   ├─ server                # 後端(伺服器端)資料夾
   │  ├─ app.js
   │  ├─ package-lock.json
   │  ├─ package.json
   │  └─ routes
   │     └─ signup.js       # 報名相關路由（POST/GET/DELETE、Zod 驗證）
   ├─ tests
   │  ├─ api_test.http      # REST Client 測試檔
   │  └─ signup_test.js     # Jest 測試（自動化測試報名功能）
   └─ utils
      └─ db.js              # 資料存取模組（讀寫 JSON 檔案的 CRUD 函數）
```
