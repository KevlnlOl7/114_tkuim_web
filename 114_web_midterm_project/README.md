# KevlnlOl7.github.io

## 專案

| 項目         | 內容                                                                                      |
|------------------|---------------------------------------------------------------------------------------|
| 專案名稱      | 晴雨報馬仔（Weather Dashboard）                                                     |
| 組員          | 張傢寧 ( 412630153 ) 、 許方彥 ( 412631508 ) |
| 專案簡介       |   本專案是一套現代化的全球城市天氣資訊查詢系統，提供即時天氣數據與未來五日預報。用戶可以透過語意化的搜尋欄輸入城市名稱，系統會自動調整介面主色，根據當地天氣如晴天、多雲或雨天變換背景色，增強沉浸式體驗。系統內建空氣品質指數（AQI）查詢功能，並支援用戶收藏多個城市以快速切換查看最新資料。透過現代前端技術，實現響應式設計，最佳化手機、平板與折疊螢幕裝置體驗。此外，使用 LocalStorage 保持使用者收藏資料，提升使用便利性。此專案不僅著重功能完整，亦兼顧友善的錯誤提示、即時表單驗證與互動體驗，整體架構清晰易維護，適合具備基本前端技能的開發者。|
| 主要功能      | - 即時全球城市天氣查詢<br>- 五日氣溫預報 + 折線圖<br>- AQI 空氣品質查詢<br>- 地圖定位<br>- 收藏城市、熱門城市、歷史紀錄   |
| 技術/架構       | HTML5、CSS3、Bootstrap 5、JavaScript、Chart.js、OpenWeatherMap API、Google Maps API           |
| 介面特色       | - 在日光模式下 Hero Section 搜尋欄背景會根據當前天氣自動變換主色系：晴天紫色、多雲灰色、下雨藍色<br>- 卡片化資訊與動畫效果:<br>- 深色模式 |
| 進階特色       | - localStorage 記憶( 最近搜尋、收藏城市 )<br>- 自訂主題色動態切換<br>- 支援深色模式<br>- 多模組 CSS 管理<br>- 可擴充性高<br>- 完整支援 RWD            |
| 展示截圖     | ![](screenshots/Desktop_01.png)                           |
| GitHub Pages | https://kevlnlol7.github.io/        |          |


## 檔案結構
``` txt
114_web_midterm_project/
│
├── index.html                          # 主頁
├── script.js                           # 主程式
├── Styles/                             # styles.css 模組化，實在是太長了
│    └─ globalVarible.css               # 全域變數 :root
│    └─ headerAndHero.css               # 頁頭跟Hero
│    └─ weatherAnimationAndBar.css      # 天氣的動畫以及搜尋bar
│    └─ recommandAndSearch.css          # 精選城市，必有電詐園區：P
│    └─ weatherAndMap.css               # 天氣資訊以及估狗地圖
│    └─ forecast.css                    # 五日預報
│    └─ aqi.css                         # 空氣品質AQI
│    └─ aboutFooterAndAnimation.css     # 關於、頁腳、動畫
│    └─ feedback.css                    # 回饋表單
│    └─ rwd.css                         # 響應式設計，我連三星 Galaxy Fold 5 也有考慮到，也有考慮到切成橫置的情境。
├── README.md                           # 專案說明文件
└── screenshots/                        # 截圖資料夾





