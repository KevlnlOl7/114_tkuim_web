# StockWeb (鉅亨網 Vibe Coding Demo)

這是一個模仿 [Anue 鉅亨網](https://www.cnyes.com/) 風格的個股資訊網頁，以 **錸德 (2349)** 為範例。本專案展示了如何使用原生的 HTML、CSS 和 JavaScript 快速建構一個現代化、響應式且具備互動性的金融資訊儀表板。

## 🚀 特色 (Features)

*   **單頁應用架構 (SPA)**：
    *   整合 Dashboard (儀表板) 與 Analysis (個股分析) 多視圖切換，無須重新載入。
    *   內建子分頁系統：總覽、籌碼、股利。
*   **互動式圖表 (Interactive Charts)** (Powered by Chart.js)：
    *   **主圖表**：支援 **分時**、**日 K**、**週 K** 三種週期切換。
    *   **分析圖表**：營收構成 (甜甜圈圖)、法人買賣超 (堆疊長條圖)、股利政策 (分組長條圖)。
*   **動態模擬資料 (Mock Data)**：
    *   內建 `MOCK_API`，自動生成五檔報價 (Order Book)、多週期股價數據、籌碼數據與股利歷史。
    *   每次重新整理頁面都會呈現完整的模擬數據。
*   **Vibe Design**：
    *   還原鉅亨網的配色系統 (品牌橘 `#ff8c00`、漲跌幅紅綠)。
    *   清晰的資訊層級與卡片式設計。

## 📂 檔案結構 (File Structure)

```text
Week14/StockWeb/
├── index.html   # 主要入口，包含所有頁面結構 (Dashboard, Analysis, Chips, Dividend)
├── style.css    # 樣式表 (CSS Variables, Flexbox Layout)
├── script.js    # 核心邏輯 (SPA Routing, Mock Data, Chart Rendering)
├── README.md    # 專案說明文件
└── todo.md      # 專案待辦事項清單
```

## 🛠️ 技術棧 (Tech Stack)

*   **HTML5 / CSS3 / JavaScript (ES6+)**
*   **Chart.js** (資料視覺化)
*   **Google Fonts** (Noto Sans TC)

## 📖 如何使用 (Usage)

1.  直接使用瀏覽器開啟 `index.html`。
2.  **儀表板 (Dashboard)**：
    *   觀察即時走勢，點擊 **「日K」** / **「週K」** 切換不同週期的趨勢圖。
    *   右側查看五檔掛單與模擬下單功能。
3.  **個股分析 (Analysis)**：
    *   點擊 **「📊 詳細分析」** 進入分析介面。
    *   **總覽**：查看公司簡介、財務指標 (EPS, 本益比)、營收構成與新聞。
    *   **籌碼**：查看三大法人買賣超日報表 (模擬數據)。
    *   **股利**：查看歷年股利發放政策與殖利率表。
4.  **限制**：
    *   僅「台股」、「個股分析」及其子功能 (籌碼、股利) 可用，其餘按鈕 (如美股、基金) 點擊會顯示未實作提示。

## 📝 備註

*   本網頁為靜態前端 Demo，所有數據 (包含股價、籌碼、財務數字) 均為前端模擬生成，非真實股市數據。

---
*Created by Antigravity Vibe Coding*
