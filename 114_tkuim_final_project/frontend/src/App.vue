<script setup>
import { ref, onMounted, computed } from 'vue'
import axios from 'axios'
import Chart from './components/Chart.vue' // 引入剛剛做的圖表元件

// --- 資料狀態 ---
const transactions = ref([])
const stats = ref({}) // 存圖表用的統計資料
const form = ref({
  title: '',
  amount: '',
  category: 'Food',
  date: new Date().toISOString().split('T')[0],
  type: 'expense'
})

// --- API 邏輯 ---

// [Read] 抓取資料 (同時抓列表 + 圖表數據)
const fetchData = async () => {
  try {
    // 1. 抓列表
    const listRes = await axios.get('http://127.0.0.1:8000/api/transactions')
    transactions.value = listRes.data.reverse()

    // 2. 抓圖表統計
    const statsRes = await axios.get('http://127.0.0.1:8000/api/dashboard/stats')
    stats.value = statsRes.data
    
  } catch (error) {
    console.error("抓取失敗:", error)
  }
}

// [Create] 新增
const addTransaction = async () => {
  if (!form.value.title || !form.value.amount) return alert("請輸入標題和金額")
  
  try {
    await axios.post('http://127.0.0.1:8000/api/transactions', {
      ...form.value,
      amount: Number(form.value.amount)
    })
    alert("新增成功！")
    form.value.title = ''
    form.value.amount = ''
    fetchData() // 新增後重新抓取 (列表和圖表都會更新)
  } catch (error) {
    console.error(error)
    alert("新增失敗")
  }
}

// [Delete] 刪除
const removeTransaction = async (id) => {
  if(!confirm("確定要刪除這筆紀錄嗎？")) return;

  try {
    await axios.delete(`http://127.0.0.1:8000/api/transactions/${id}`)
    alert("刪除成功")
    fetchData() // 刪除後也要重新抓取，圖表才會變
  } catch (error) {
    console.error(error)
    alert("刪除失敗")
  }
}

// [Computed] 計算總餘額
const totalAmount = computed(() => {
  return transactions.value.reduce((sum, item) => {
    return item.type === 'income' ? sum + item.amount : sum - item.amount
  }, 0)
})

// 畫面載入時執行
onMounted(() => {
  fetchData()
})
</script>

<template>
  <div class="container">
    <h1 class="app-title">💰 PyMoney 記帳本</h1>

    <div class="dashboard-grid">
      <div class="card balance-card">
        <h3>目前資產餘額</h3>
        <h2 :class="totalAmount >= 0 ? 'income-text' : 'expense-text'">
          ${{ totalAmount }}
        </h2>
      </div>

      <div class="card chart-card">
        <Chart :stats="stats" />
      </div>
    </div>

    <div class="form-section">
      <h3>✏️ 新增一筆</h3>
      <div class="form-row">
        <select v-model="form.type">
          <option value="expense">支出 💸</option>
          <option value="income">收入 💰</option>
        </select>
        <input v-model="form.date" type="date" required />
      </div>
      <div class="form-row">
        <input v-model="form.title" placeholder="項目名稱 (如: 雞排)" required />
        <input v-model="form.amount" type="number" placeholder="金額" required />
      </div>
      <div class="form-row">
        <select v-model="form.category">
          <option value="Food">食物 (Food)</option>
          <option value="Transport">交通 (Transport)</option>
          <option value="Entertainment">娛樂 (Entertainment)</option>
          <option value="Other">其他 (Other)</option>
        </select>
        <button @click="addTransaction" class="btn-add">新增紀錄</button>
      </div>
    </div>

    <hr />

    <div class="list-section">
      <div v-if="transactions.length === 0" class="empty-msg">
        還沒有資料，趕快記一筆吧！📝
      </div>

      <div v-else v-for="item in transactions" :key="item.id" class="list-item">
        <div class="item-left">
          <div class="item-title">{{ item.title }}</div>
          <div class="item-meta">
            <span class="tag">{{ item.category }}</span>
            <span class="date">{{ item.date }}</span>
          </div>
        </div>
        <div class="item-right">
          <span class="amount" :class="item.type">
            {{ item.type === 'expense' ? '-' : '+' }} ${{ item.amount }}
          </span>
          <button @click="removeTransaction(item.id)" class="btn-del">❌</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 全局設定 */
.container { max-width: 800px; margin: 0 auto; padding: 20px; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #333; }
.app-title { text-align: center; color: #2c3e50; margin-bottom: 30px; }

/* Dashboard 網格佈局 */
.dashboard-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; }
.card { background: white; padding: 20px; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.1); }
.balance-card { display: flex; flex-direction: column; justify-content: center; align-items: center; }
.balance-card h3 { margin: 0 0 10px 0; color: #7f8c8d; font-size: 1rem; }
.balance-card h2 { font-size: 2.5rem; margin: 0; }
.income-text { color: #27ae60; }
.expense-text { color: #c0392b; }

/* 表單區塊 */
.form-section { background: #f8f9fa; padding: 20px; border-radius: 12px; margin-bottom: 30px; border: 1px solid #e9ecef; }
.form-section h3 { margin-top: 0; margin-bottom: 15px; color: #495057; }
.form-row { display: flex; gap: 10px; margin-bottom: 12px; }
input, select { flex: 1; padding: 10px; border: 1px solid #ced4da; border-radius: 6px; font-size: 1rem; }
.btn-add { flex: 1; background: #3498db; color: white; border: none; padding: 10px; border-radius: 6px; font-weight: bold; cursor: pointer; transition: 0.2s; }
.btn-add:hover { background: #2980b9; }

/* 列表區塊 */
.list-item { display: flex; justify-content: space-between; align-items: center; background: white; padding: 15px; margin-bottom: 12px; border-radius: 8px; box-shadow: 0 2px 5px rgba(0,0,0,0.05); border-left: 5px solid #bdc3c7; transition: transform 0.2s; }
.list-item:hover { transform: translateX(5px); }
.item-title { font-weight: bold; font-size: 1.1rem; margin-bottom: 4px; }
.item-meta { display: flex; gap: 10px; font-size: 0.85rem; color: #7f8c8d; }
.tag { background: #eef2f3; padding: 2px 8px; border-radius: 4px; }
.item-right { display: flex; align-items: center; gap: 15px; }
.amount { font-weight: bold; font-size: 1.2rem; }
.amount.expense { color: #e74c3c; }
.amount.income { color: #27ae60; }
.btn-del { background: none; border: none; cursor: pointer; font-size: 1.2rem; opacity: 0.5; transition: 0.2s; }
.btn-del:hover { opacity: 1; transform: scale(1.1); }
.empty-msg { text-align: center; padding: 40px; color: #adb5bd; font-size: 1.1rem; }

/* 手機版響應式調整 */
@media (max-width: 600px) {
  .dashboard-grid { grid-template-columns: 1fr; } /* 手機版變單欄 */
  .form-row { flex-direction: column; }
}
</style>