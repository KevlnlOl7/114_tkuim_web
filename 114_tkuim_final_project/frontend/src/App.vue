<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import axios from 'axios'
import Chart from './components/Chart.vue'
import BarChart from './components/BarChart.vue'

// --- 變數 ---
const transactions = ref([])
const stats = ref({})
const trendData = ref({})
const budgetLimit = ref(0) // 預算上限

// 搜尋與篩選
const keyword = ref('')
const startDate = ref('')
const endDate = ref('')

// 編輯相關
const isEditing = ref(false)
const editId = ref(null)

// 預算設定模式
const showBudgetInput = ref(false)
const newBudget = ref(0)

// 表單
const form = ref({
  title: '', amount: '', category: 'Food',
  date: new Date().toISOString().split('T')[0],
  type: 'expense', payment_method: 'Cash'
})

// --- API 功能 ---
const fetchData = async () => {
  try {
    // 1. 列表
    let url = `http://127.0.0.1:8000/api/transactions?keyword=${keyword.value}`
    if (startDate.value) url += `&start_date=${startDate.value}`
    if (endDate.value) url += `&end_date=${endDate.value}`
    
    const listRes = await axios.get(url)
    transactions.value = listRes.data 

    // 2. 圖表數據
    const statsRes = await axios.get('http://127.0.0.1:8000/api/dashboard/stats')
    stats.value = statsRes.data
    const trendRes = await axios.get('http://127.0.0.1:8000/api/dashboard/trend')
    trendData.value = trendRes.data
    
    // 3. 預算設定
    const budgetRes = await axios.get('http://127.0.0.1:8000/api/budget')
    budgetLimit.value = budgetRes.data.limit

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

// 預算設定
const saveBudget = async () => {
  try {
    await axios.post('http://127.0.0.1:8000/api/budget', { limit: Number(newBudget.value) })
    budgetLimit.value = Number(newBudget.value)
    showBudgetInput.value = false
    alert("預算設定成功！")
  } catch (error) { alert("設定失敗") }
}
const toggleBudgetEdit = () => {
  newBudget.value = budgetLimit.value
  showBudgetInput.value = !showBudgetInput.value
}

// 編輯與重置
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

// 監聽
watch([keyword, startDate, endDate], () => { fetchData() })

// [計算] 總淨資產
const totalAmount = computed(() => {
  return transactions.value.reduce((sum, item) => {
    if (item.type === 'income') return sum + item.amount
    if (item.type === 'expense') return sum - item.amount
    return sum
  }, 0)
})

// [計算] 本月總支出 (用來跟預算比對)
const monthlyExpense = computed(() => {
  const now = new Date()
  const currentMonth = now.toISOString().slice(0, 7) // 取得 "2024-06" 格式
  
  return transactions.value
    .filter(item => item.type === 'expense' && item.date.startsWith(currentMonth))
    .reduce((sum, item) => sum + item.amount, 0)
})

// [計算] 預算百分比
const budgetPercent = computed(() => {
  if (budgetLimit.value === 0) return 0
  const p = (monthlyExpense.value / budgetLimit.value) * 100
  return Math.min(p, 100) // 最多顯示 100%
})

onMounted(() => fetchData())
</script>

<template>
  <div class="app-background">
    <div class="container">
      <h1 class="app-title">💰 PyMoney 記帳本</h1>

      <div class="dashboard-grid">
        <div class="card budget-card full-width-card">
          <div class="budget-header">
            <h3>📅 本月預算 ({{ new Date().getMonth() + 1 }}月)</h3>
            <button @click="toggleBudgetEdit" class="btn-sm">⚙️ 設定</button>
          </div>

          <div v-if="showBudgetInput" class="budget-input-area">
            <input v-model="newBudget" type="number" placeholder="輸入預算金額" />
            <button @click="saveBudget" class="btn-confirm">儲存</button>
          </div>

          <div v-else class="budget-display">
            <div class="budget-info">
              <span>已花費: <b>${{ monthlyExpense }}</b></span>
              <span>預算: ${{ budgetLimit }}</span>
            </div>
            
            <div class="progress-container">
              <div 
                class="progress-bar" 
                :style="{ width: budgetPercent + '%', backgroundColor: monthlyExpense > budgetLimit ? '#ff7675' : '#74b9ff' }"
              ></div>
            </div>
            
            <p v-if="monthlyExpense > budgetLimit" class="warning-text">⚠️ 已經超支了！請節制一點！</p>
            <p v-else class="safe-text">✨ 還有 ${{ budgetLimit - monthlyExpense }} 可以花</p>
          </div>
        </div>

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
                <option value="transfer">轉帳 🔄</option>
              </select>
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
.full-width-card { grid-column: span 2; } 

/* Budget Card (New) */
.budget-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
.budget-header h3 { margin: 0; color: #2c3e50; font-size: 1.1rem; }
.budget-input-area { display: flex; gap: 10px; }
.btn-confirm { background: #2ecc71; color: white; border: none; padding: 8px 15px; border-radius: 6px; cursor: pointer; }

.budget-info { display: flex; justify-content: space-between; font-size: 0.9rem; margin-bottom: 5px; color: #555; }
.progress-container { width: 100%; height: 12px; background: #e0e0e0; border-radius: 6px; overflow: hidden; position: relative; }
.progress-bar { height: 100%; transition: width 0.5s, background-color 0.5s; }
.warning-text { color: #ff7675; font-weight: bold; margin-top: 8px; font-size: 0.9rem; text-align: right; }
.safe-text { color: #2ecc71; font-weight: bold; margin-top: 8px; font-size: 0.9rem; text-align: right; }

/* Balance Card */
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

/* Filter Bar */
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
.amount.transfer { color: #7f8c8d; } 

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