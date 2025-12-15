// --- 1. Global Setup & Debug ---
console.log("StockWeb Script Loaded");

window.onerror = function (msg, url, line) {
    console.error("JS Error:", msg, "at", line);
    alert("Script Error: " + msg);
};

// --- 2. Fake API Data ---
const MOCK_API = {
    getOrderBook: () => ({
        sell: [
            { p: '--', v: '--' }, { p: '--', v: '--' }, { p: '--', v: '--' }, { p: '--', v: '--' }, { p: '--', v: '6,297' }
        ],
        buy: [
            { p: '15.45', v: '2,046' }, { p: '15.40', v: '739' }, { p: '15.35', v: '323' }, { p: '15.30', v: '316' }, { p: '15.25', v: '158' }
        ]
    }),
    getNews: () => [
        { title: '盤中速報 - 錸德(2349)股價拉至漲停 15.45元', time: '12/15 10:47' },
        { title: '盤中速報 - 錸德(2349)急拉3.03%報15.35元', time: '12/15 10:30' },
        { title: '錸德: 公告本公司有價證券達到注意交易資訊標準', time: '12/12 16:00' }
    ],
    getPriceHistory: () => {
        const data = [14.6];
        for (let i = 0; i < 10; i++) data.push(14.6 + i * 0.05);
        for (let i = 0; i < 5; i++) data.push(15.2);
        for (let i = 0; i < 35; i++) data.push(15.45);
        return data;
    },
    // New: Daily K
    getDailyK: () => {
        let price = 15.45;
        const data = [];
        for (let i = 0; i < 30; i++) {
            price = price + (Math.random() - 0.5) * 1;
            data.push(parseFloat(price.toFixed(2)));
        }
        return data.reverse();
    },
    // New: Weekly K
    getWeeklyK: () => {
        let price = 15.45;
        const data = [];
        for (let i = 0; i < 52; i++) {
            price = price + (Math.random() - 0.5) * 2;
            data.push(parseFloat(price.toFixed(2)));
        }
        return data.reverse();
    },
    // New: Chips Data
    getChipsData: () => {
        return Array.from({ length: 30 }, () => Math.floor(Math.random() * 2000) - 1000);
    },
    // New: Dividend Data
    getDividendData: () => [
        { year: '2001', cash: 0.5, stock: 3.0, yield: '0.68%', price: 73.5, date: '2001/07/13' },
        { year: '2002', cash: 0.1, stock: 1.5, yield: '0.36%', price: 27.9, date: '2002/07/19' },
        { year: '2004', cash: 0.25, stock: 0.26, yield: '1.97%', price: 13.0, date: '2004/08/10' },
        { year: '2009', cash: 0, stock: 0, yield: '0.0%', price: 7.84, date: '2009/11/03' },
        { year: '2020', cash: 0, stock: 0, yield: '0.0%', price: 8.5, date: '2020/06/15' },
        { year: '2021', cash: 0, stock: 0, yield: '0.0%', price: 10.2, date: '2021/07/20' },
        { year: '2022', cash: 0.05, stock: 0, yield: '0.4%', price: 12.5, date: '2022/08/10' },
        { year: '2023', cash: 0.1, stock: 0, yield: '0.7%', price: 14.1, date: '2023/07/05' }
    ]
};

// --- 3. Interaction Functions ---
function switchPage(pageId) {
    console.log("Switching to", pageId);
    document.querySelectorAll('.page-section').forEach(el => el.classList.remove('active'));
    document.getElementById('page-' + pageId).classList.add('active');

    document.querySelectorAll('.nav-link').forEach(el => el.classList.remove('active'));

    if (pageId === 'dashboard') {
        const el = document.getElementById('nav-dashboard');
        if (el) el.classList.add('active');
    } else {
        // All analysis sub-pages (analysis, chips, dividend) fall under this
        const el = document.getElementById('nav-analysis');
        if (el) el.classList.add('active');
    }

    // Init specific page charts
    if (pageId === 'analysis') {
        setTimeout(() => {
            initBusinessChart();
            initValueChart();
        }, 100);
    } else if (pageId === 'chips') {
        setTimeout(() => {
            initChipsMainChart();
        }, 100);
    } else if (pageId === 'dividend') {
        setTimeout(() => {
            initDividendChart();
        }, 100);
    }
}

function switchChartPeriod(period) {
    // 1. Update UI Tabs
    document.getElementById('tab-intraday').classList.remove('active');
    document.getElementById('tab-daily').classList.remove('active');
    document.getElementById('tab-weekly').classList.remove('active');

    document.getElementById('tab-' + period).classList.add('active');

    // 2. Update Chart Data
    let newData;
    if (period === 'daily') newData = MOCK_API.getDailyK();
    else if (period === 'weekly') newData = MOCK_API.getWeeklyK();
    else newData = MOCK_API.getPriceHistory();

    if (mainChart) {
        mainChart.data.labels = Array.from({ length: newData.length }, (_, i) => i);
        mainChart.data.datasets[0].data = newData;
        mainChart.update();
    }
}

function handlePlaceOrder() {
    alert("下單成功！(模擬交易)");
}

function handleLogin() {
    alert("登入功能尚未開放");
}

function handleNotImplemented() {
    alert("本 Demo 僅開放「台股(總覽)」、「個股分析」、「籌碼」與「股利」功能，其他功能尚未實作。");
}

// --- 4. Render Logic ---
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM Ready");

    try {
        renderOrderBook();
        renderNews();
        renderDividendTable();

        // Only init main chart if element exists
        if (document.getElementById('kLineChart')) {
            initMainChart();
        }

        // Set Time
        const now = new Date();
        const timeStr = `${now.getMonth() + 1}/${now.getDate()} ${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}`;
        const timeEl = document.getElementById('current-time');
        if (timeEl) timeEl.textContent = timeStr;

    } catch (e) {
        console.error("Init Error", e);
    }
});

// Helper renders
function renderOrderBook() {
    const el = document.getElementById('order-book-content');
    if (!el) return;

    const data = MOCK_API.getOrderBook();
    let html = '<div class="mb-4">';
    data.sell.forEach((item, i) => {
        html += `<div class="order-book-row text-down"><span>賣${5 - i}</span> <span>${item.p}</span> <span>${item.v}</span></div>`;
    });
    html += '</div><div style="border-top: 1px solid #eee; margin: 8px 0;"></div><div>';
    data.buy.forEach((item, i) => {
        html += `<div class="order-book-row text-up"><span>買${i + 1}</span> <span>${item.p}</span> <span>${item.v}</span></div>`;
    });
    html += '</div>';
    el.innerHTML = html;
}

function renderNews() {
    const el = document.getElementById('news-feed');
    if (!el) return;

    const news = MOCK_API.getNews();
    el.innerHTML = news.map(n => `
        <li class="border-bottom pb-2">
            <a href="#" class="hover:text-primary-color">
                <div class="font-bold mb-1">${n.title}</div>
                <div class="text-xs text-secondary">${n.time}</div>
            </a>
        </li>
    `).join('');
}

// Charts
let mainChart, bizChart, valChart;

function initMainChart() {
    const ctx = document.getElementById('kLineChart');
    if (!ctx || typeof Chart === 'undefined') return;

    const data = MOCK_API.getPriceHistory();
    mainChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: Array.from({ length: data.length }, (_, i) => i),
            datasets: [{
                label: 'Price',
                data: data,
                borderColor: '#da3926',
                backgroundColor: 'rgba(218, 57, 38, 0.1)',
                borderWidth: 2,
                fill: true,
                pointRadius: 0,
                tension: 0.1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { display: false },
                y: { position: 'right', grid: { color: '#f0f0f0' } }
            },
            animation: { duration: 1000 }
        }
    });
}

function initBusinessChart() {
    const ctx = document.getElementById('businessChart');
    if (!ctx || bizChart || typeof Chart === 'undefined') return;
    bizChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['光碟片', '組裝機器', '其他'],
            datasets: [{
                data: [70, 20, 10],
                backgroundColor: ['#3b82f6', '#10b981', '#f59e0b'],
                borderWidth: 0
            }]
        },
        options: { responsive: true, plugins: { legend: { position: 'right' } } }
    });
}

function initValueChart() {
    const ctx = document.getElementById('valueChart');
    if (!ctx || valChart || typeof Chart === 'undefined') return;
    valChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['D1', 'D2', 'D3', 'D4', 'D5'],
            datasets: [{
                label: '買超', data: [100, 200, 150, 300, 250], backgroundColor: '#da3926'
            }, {
                label: '賣超', data: [-50, -100, -20, -80, -120], backgroundColor: '#27a054'
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: { x: { stacked: true }, y: { stacked: true } }
        }
    });
}

function renderDividendTable() {
    const el = document.getElementById('dividend-table-body');
    if (!el) return;

    const data = MOCK_API.getDividendData().reverse();
    el.innerHTML = data.map(d => `
        <tr>
            <td>${d.date}</td>
            <td>${d.cash}</td>
            <td>${d.stock}</td>
            <td>${d.yield}</td>
        </tr>
    `).join('');
}

let chipsMainChart, dividendChart;

function initChipsMainChart() {
    const ctx = document.getElementById('chipsMainChart');
    if (!ctx || chipsMainChart || typeof Chart === 'undefined') return;

    const data = MOCK_API.getChipsData();
    const bgColors = data.map(v => v >= 0 ? '#da3926' : '#27a054');

    chipsMainChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: Array.from({ length: 30 }, (_, i) => `Day ${i + 1}`),
            datasets: [{
                label: '三大法人合計',
                data: data,
                backgroundColor: bgColors
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: true } }
        }
    });
}

function initDividendChart() {
    const ctx = document.getElementById('dividendChart');
    if (!ctx || dividendChart || typeof Chart === 'undefined') return;

    const rawData = MOCK_API.getDividendData();
    const labels = rawData.map(d => d.year);
    const cashData = rawData.map(d => d.cash);
    const stockData = rawData.map(d => d.stock);

    dividendChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: '現金股利',
                    data: cashData,
                    backgroundColor: '#0ea5e9',
                },
                {
                    label: '股票股利',
                    data: stockData,
                    backgroundColor: '#f59e0b',
                }
            ]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            scales: { x: { stacked: false }, y: { stacked: false } }
        }
    });
}
