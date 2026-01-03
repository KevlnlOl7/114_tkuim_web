<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import axios from 'axios'
import Chart from './components/Chart.vue'     // 圓餅圖
import BarChart from './components/BarChart.vue' // 新增：長條圖

// --- 變數 ---
const transactions = ref([])
const stats = ref({})       // 圓餅圖資料
const trendData = ref({})   // 長條圖資料

// 搜尋與篩選條件
const keyword = ref('')
const startDate = ref('')
const endDate = ref('')

// 編輯相關
const isEditing = ref(false)
const editId = ref(null)

// 表單
const form = ref({
  title: '', amount: '', category: 'Food',
  date: new Date().toISOString().split('T')[0],
  type: 'expense', payment_method: 'Cash'
})

// --- 核心功能 ---
const fetchData = async () => {
  try {
    // 1. 列表 (帶入搜尋與日期參數)
    let url = `http://127.0.0.1:8000/api/transactions?keyword=${keyword.value}`
    if (startDate.value) url += `&start_date=${startDate.value}`
    if (endDate.value) url += `&end_date=${endDate.value}`
    
    const listRes = await axios.get(url)
    transactions.value = listRes.data // 後端已經排好序了

    // 2. 圓餅圖 (類別統計)
    const statsRes = await axios.get('http://127.0.0.1:8000/api/dashboard/stats')
    stats.value = statsRes.data

    // 3. 長條圖 (趨勢統計)
    const trendRes = await axios.get('http://127.0.0.1:8000/api/dashboard/trend')
    trendData.value = trendRes.data

  } catch (error) { console.error(error) }
}

const handleSubmit = async () => {
  if (!form.value.title || !form.value.amount) return alert("請輸入完整資訊")
  const payload = { ...form.value, amount: Number(form.value.amount) }
  try {
    if (isEditing.value) {
      await axios.put(`http://127.0.0.1:8000/api/transactions/${editId.value}`, payload)
      cancelEdit()
    } else {
      await axios.post('http://127.0.0.1:8000/api/transactions', payload)
      resetForm()
    }
    fetchData()
  } catch (error) { alert("操作失敗") }
}

const removeTransaction = async (id) => {
  if(!confirm("確定要刪除嗎？")) return;
  await axios.delete(`http://127.0.0.1:8000/api/transactions/${id}`)
  fetchData()
}

// 編輯模式
const startEdit = (item) => {
  isEditing.value = true
  editId.value = item.id
  form.value = { ...item }
  window.scrollTo({ top: 0, behavior: 'smooth' })
}
const cancelEdit = () => { isEditing.value = false; editId.value = null; resetForm() }
const resetForm = () => {
  form.value = {
    title: '', amount: '', category: 'Food',
    date: new Date().toISOString().split('T')[0],
    type: 'expense', payment_method: 'Cash'
  }
}
const exportExcel = () => { window.open('http://127.0.0.1:8000/api/export', '_blank') }

// 監聽搜尋條件改變
watch([keyword, startDate, endDate], () => { fetchData() })

// 計算總資產 (排除轉帳 transfer)
const totalAmount = computed(() => {
  return transactions.value.reduce((sum, item) => {
    if (item.type === 'income') return sum + item.amount
    if (item.type === 'expense') return sum - item.amount
    return sum // 轉帳不影響總資產
  }, 0)
})

onMounted(() => fetchData())
</script>

<template>
  <div class="app-background">
    <div class="container">
      <h1 class="app-title">💰 PyMoney 記帳本</h1>

      <div class="dashboard-grid">
        <div class="card balance-card">
          <h3>目前淨資產</h3>
          <h2 :class="totalAmount >= 0 ? 'income-text' : 'expense-text'">${{ totalAmount }}</h2>
          <button @click="exportExcel" class="btn-outline">📥 匯出 Excel</button>
        </div>
        <div class="card chart-card">
          <Chart :stats="stats" />
        </div>
        <div class="card bar-chart-card full-width-card">
          <BarChart :trendData="trendData" />
        </div>
      </div>

      <div class="card form-card" :class="{ 'edit-mode': isEditing }">
        <div class="form-header">
          <h3>{{ isEditing ? '✏️ 修改紀錄' : '📝 新增一筆' }}</h3>
          <button v-if="isEditing" @click="cancelEdit" class="btn-sm">取消</button>
        </div>
        
        <div class="form-body">
          <div class="form-row">
            <div class="input-group">
              <label>類型</label>
              <select v-model="form.type">
                <option value="expense">支出 💸</option>
                <option value="income">收入 💰</option>
                <option value="transfer">轉帳 🔄</option> </select>
            </div>
            <div class="input-group">
              <label>日期</label>
              <input v-model="form.date" type="date" required />
            </div>
            <div class="input-group">
              <label>支付/帳戶</label>
              <select v-model="form.payment_method">
                <option value="Cash">現金</option>
                <option value="Credit Card">信用卡</option>
                <option value="Bank">銀行帳戶</option>
                <option value="LinePay">LinePay</option>
              </select>
            </div>
          </div>
          
          <div class="form-row">
            <div class="input-group flex-2">
              <label>項目說明</label>
              <input v-model="form.title" placeholder="例如: 提款、午餐" required />
            </div>
            <div class="input-group">
              <label>金額</label>
              <input v-model="form.amount" type="number" placeholder="$" required />
            </div>
          </div>

          <div class="form-row" v-if="form.type !== 'transfer'">
            <div class="input-group flex-full">
              <label>分類</label>
              <select v-model="form.category">
                <option value="Food">🍔 食物</option>
                <option value="Transport">🚌 交通</option>
                <option value="Entertainment">🎬 娛樂</option>
                <option value="Rent">🏠 房租</option>
                <option value="Salary">💼 薪水</option>
                <option value="Other">✨ 其他</option>
              </select>
            </div>
          </div>

          <button @click="handleSubmit" class="btn-submit" :class="{ 'btn-update': isEditing }">
            {{ isEditing ? '完成修改' : '確認新增' }}
          </button>
        </div>
      </div>

      <div class="list-section">
        <div class="filter-bar">
          <div class="search-box">
            <input v-model="keyword" type="text" placeholder="🔍 關鍵字..." />
          </div>
          <div class="date-range">
            <input v-model="startDate" type="date" />
            <span>至</span>
            <input v-model="endDate" type="date" />
          </div>
        </div>

        <div v-if="transactions.length === 0" class="empty-state">無資料...</div>

        <div v-else class="transaction-list">
          <div v-for="item in transactions" :key="item.id" class="list-item">
            <div class="item-left">
              <div class="date-badge">
                <span class="day">{{ item.date.split('-')[2] }}</span>
                <span class="month">{{ item.date.split('-')[1] }}月</span>
              </div>
              <div class="item-info">
                <div class="item-title">{{ item.title }}</div>
                <div class="tags">
                  <span class="tag type-tag" :class="item.type">
                    {{ item.type === 'transfer' ? '轉帳' : item.category }}
                  </span>
                  <span class="tag method">{{ item.payment_method }}</span>
                </div>
              </div>
            </div>
            
            <div class="item-right">
              <span class="amount" :class="item.type">
                {{ item.type === 'expense' ? '-' : (item.type === 'income' ? '+' : '') }} ${{ item.amount }}
              </span>
              <div class="actions">
                <button @click="startEdit(item)" class="btn-icon">✎</button> 
                <button @click="removeTransaction(item.id)" class="btn-icon del">🗑️</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Reset */
* { box-sizing: border-box; }
body { margin: 0; font-family: "Segoe UI", Roboto, Arial, sans-serif; }
.app-background { min-height: 100vh; background-color: #f4f5f7; padding: 20px; }
.container { max-width: 800px; margin: 0 auto; }
.app-title { text-align: center; color: #333; margin-bottom: 20px; font-size: 1.8rem; }

/* Cards */
.card { background: white; border-radius: 12px; padding: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); border: 1px solid #e0e0e0; }

/* Dashboard Grid */
.dashboard-grid { 
  display: grid; 
  grid-template-columns: 1fr 1fr; 
  gap: 15px; 
  margin-bottom: 20px; 
}
.full-width-card { grid-column: span 2; } /* 長條圖佔滿整行 */

.balance-card { background: #34495e; color: white; text-align: center; display: flex; flex-direction: column; justify-content: center; align-items: center;}
.balance-card h2 { font-size: 2.2rem; margin: 10px 0; }
.income-text { color: #2ecc71; } .expense-text { color: #ff7675; }
.btn-outline { background: transparent; border: 1px solid rgba(255,255,255,0.5); color: white; padding: 5px 15px; border-radius: 20px; cursor: pointer; margin-top: 5px; }
.btn-outline:hover { background: rgba(255,255,255,0.1); }

/* Form */
.form-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
.form-row { display: flex; gap: 10px; margin-bottom: 10px; }
.input-group { display: flex; flex-direction: column; flex: 1; }
.input-group.flex-2 { flex: 2; } 
.input-group.flex-full { width: 100%; }
.input-group label { font-size: 0.85rem; color: #666; font-weight: bold; margin-bottom: 5px; }
input, select { padding: 10px; border: 2px solid #ddd; border-radius: 6px; font-size: 1rem; width: 100%; }
input:focus, select:focus { border-color: #3498db; outline: none; }
.btn-submit { background: #34495e; color: white; border: none; padding: 12px; border-radius: 6px; font-weight: bold; cursor: pointer; width: 100%; margin-top: 5px; }
.btn-update { background: #f39c12; }
.btn-sm { background: #ddd; padding: 4px 8px; border: none; border-radius: 4px; cursor: pointer; }

/* Filter Bar (新功能!) */
.filter-bar { display: flex; gap: 10px; margin-bottom: 15px; flex-wrap: wrap; }
.search-box { flex: 1; min-width: 200px; }
.date-range { display: flex; align-items: center; gap: 5px; background: white; padding: 5px; border-radius: 6px; border: 2px solid #ddd; }
.date-range input { border: none; padding: 5px; width: 130px; font-size: 0.9rem; }

/* List */
.list-item { display: flex; justify-content: space-between; align-items: center; background: white; padding: 15px; margin-bottom: 10px; border-radius: 8px; border-left: 4px solid #34495e; box-shadow: 0 2px 4px rgba(0,0,0,0.05); }
.item-left { display: flex; align-items: center; gap: 15px; }
.date-badge { text-align: center; background: #eee; padding: 5px 10px; border-radius: 6px; min-width: 50px; }
.date-badge .day { display: block; font-size: 1.1rem; font-weight: bold; }
.date-badge .month { font-size: 0.75rem; color: #666; }
.item-title { font-weight: bold; font-size: 1.1rem; color: #2c3e50; }
.tags { display: flex; gap: 5px; margin-top: 4px; }
.tag { font-size: 0.75rem; padding: 2px 6px; border-radius: 4px; background: #e0e0e0; color: #555; }
.tag.method { background: #dff9fb; color: #22a6b3; }
.type-tag.transfer { background: #dfe6e9; color: #2d3436; font-weight: bold; }

.amount { font-weight: bold; font-size: 1.2rem; }
.amount.expense { color: #c0392b; }
.amount.income { color: #27ae60; }
.amount.transfer { color: #7f8c8d; } /* 轉帳灰色 */

.actions { display: flex; gap: 5px; }
.btn-icon { background: transparent; border: 1px solid #ddd; width: 30px; height: 30px; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center; }
.btn-icon.del { color: red; border-color: #ffcccc; }

@media (max-width: 600px) {
  .dashboard-grid { grid-template-columns: 1fr; }
  .full-width-card { grid-column: span 1; }
  .filter-bar { flex-direction: column; }
  .form-row { flex-direction: column; }
}
</style>