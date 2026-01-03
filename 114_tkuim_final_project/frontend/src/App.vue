<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import axios from 'axios'
import Chart from './components/Chart.vue'

// --- 狀態變數 ---
const transactions = ref([])
const stats = ref({})
const keyword = ref('') // 搜尋關鍵字
const isEditing = ref(false) // 是否處於編輯模式
const editId = ref(null) // 正在編輯哪一筆 ID

// 表單資料 (新增了 payment_method)
const form = ref({
  title: '',
  amount: '',
  category: 'Food',
  date: new Date().toISOString().split('T')[0],
  type: 'expense',
  payment_method: 'Cash'
})

// --- 核心功能 ---

// 1. [Read] 抓取資料 (支援搜尋)
const fetchData = async () => {
  try {
    // 把搜尋關鍵字傳給後端
    const url = `http://127.0.0.1:8000/api/transactions?keyword=${keyword.value}`
    const listRes = await axios.get(url)
    transactions.value = listRes.data.reverse()

    // 順便更新圖表
    const statsRes = await axios.get('http://127.0.0.1:8000/api/dashboard/stats')
    stats.value = statsRes.data
  } catch (error) { console.error(error) }
}

// 2. [Create & Update] 提交表單 (自動判斷是新增還是更新)
const handleSubmit = async () => {
  if (!form.value.title || !form.value.amount) return alert("請輸入完整資訊")

  const payload = { ...form.value, amount: Number(form.value.amount) }

  try {
    if (isEditing.value) {
      // 編輯模式：呼叫 PUT API
      await axios.put(`http://127.0.0.1:8000/api/transactions/${editId.value}`, payload)
      alert("更新成功！")
      cancelEdit() // 退出編輯模式
    } else {
      // 新增模式：呼叫 POST API
      await axios.post('http://127.0.0.1:8000/api/transactions', payload)
      alert("新增成功！")
      resetForm() // 清空表單
    }
    fetchData() // 重新抓資料
  } catch (error) { alert("操作失敗") }
}

// 3. [Delete] 刪除
const removeTransaction = async (id) => {
  if(!confirm("確定要刪除嗎？")) return;
  await axios.delete(`http://127.0.0.1:8000/api/transactions/${id}`)
  fetchData()
}

// 4. [Edit] 進入編輯模式
const startEdit = (item) => {
  isEditing.value = true
  editId.value = item.id
  // 把該筆資料填入表單
  form.value = { ...item }
  // 滾動到最上方
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

// 5. 退出編輯 / 重置表單
const cancelEdit = () => {
  isEditing.value = false
  editId.value = null
  resetForm()
}
const resetForm = () => {
  form.value = {
    title: '', amount: '', category: 'Food',
    date: new Date().toISOString().split('T')[0],
    type: 'expense', payment_method: 'Cash'
  }
}

// 6. [Export] 匯出 Excel
const exportExcel = () => {
  window.open('http://127.0.0.1:8000/api/export', '_blank')
}

// 監聽搜尋框：當關鍵字改變時，自動重新搜尋
watch(keyword, () => {
  fetchData()
})

const totalAmount = computed(() => transactions.value.reduce((sum, item) => item.type === 'income' ? sum + item.amount : sum - item.amount, 0))

onMounted(() => fetchData())
</script>

<template>
  <div class="container">
    <h1 class="app-title">💰 PyMoney 終極記帳本</h1>

    <div class="dashboard-grid">
      <div class="card balance-card">
        <h3>總資產</h3>
        <h2 :class="totalAmount >= 0 ? 'income-text' : 'expense-text'">${{ totalAmount }}</h2>
        <button @click="exportExcel" class="btn-export">📥 匯出 Excel</button>
      </div>
      <div class="card chart-card">
        <Chart :stats="stats" />
      </div>
    </div>

    <div class="form-section" :class="{ 'edit-mode': isEditing }">
      <div class="form-header">
        <h3>{{ isEditing ? '✏️ 編輯模式' : '📝 新增一筆' }}</h3>
        <button v-if="isEditing" @click="cancelEdit" class="btn-cancel">取消編輯</button>
      </div>
      
      <div class="form-row">
        <select v-model="form.type">
          <option value="expense">支出 💸</option>
          <option value="income">收入 💰</option>
        </select>
        <input v-model="form.date" type="date" required />
        <select v-model="form.payment_method">
          <option value="Cash">現金</option>
          <option value="Credit Card">信用卡</option>
          <option value="LinePay">LinePay</option>
        </select>
      </div>
      
      <div class="form-row">
        <input v-model="form.title" placeholder="項目名稱" required />
        <input v-model="form.amount" type="number" placeholder="金額" required />
      </div>
      
      <div class="form-row">
        <select v-model="form.category">
          <option value="Food">食物</option>
          <option value="Transport">交通</option>
          <option value="Entertainment">娛樂</option>
          <option value="Rent">房租</option>
          <option value="Salary">薪水</option>
          <option value="Other">其他</option>
        </select>
        <button @click="handleSubmit" class="btn-submit" :class="{ 'btn-update': isEditing }">
          {{ isEditing ? '確認修改' : '新增紀錄' }}
        </button>
      </div>
    </div>

    <hr />

    <div class="list-section">
      <div class="search-bar">
        <input v-model="keyword" type="text" placeholder="🔍 搜尋記帳紀錄..." />
      </div>

      <div v-if="transactions.length === 0" class="empty-msg">找不到資料... 🐢</div>

      <div v-else v-for="item in transactions" :key="item.id" class="list-item">
        <div class="item-left">
          <div class="item-title">{{ item.title }}</div>
          <div class="item-meta">
            <span class="tag">{{ item.category }}</span>
            <span class="method-tag">{{ item.payment_method }}</span> <span class="date">{{ item.date }}</span>
          </div>
        </div>
        <div class="item-right">
          <span class="amount" :class="item.type">
            {{ item.type === 'expense' ? '-' : '+' }} ${{ item.amount }}
          </span>
          <div class="actions">
            <button @click="startEdit(item)" class="btn-icon">✏️</button> 
            <button @click="removeTransaction(item.id)" class="btn-icon btn-del">🗑️</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 樣式大升級 */
.container { max-width: 800px; margin: 0 auto; padding: 20px; font-family: 'Segoe UI', sans-serif; }
.app-title { text-align: center; color: #333; margin-bottom: 20px; }

/* Dashboard */
.dashboard-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; }
.card { background: white; padding: 20px; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.08); }
.balance-card { text-align: center; display: flex; flex-direction: column; justify-content: center; align-items: center; }
.balance-card h2 { font-size: 2.5rem; margin: 10px 0; }
.income-text { color: #27ae60; } .expense-text { color: #c0392b; }
.btn-export { background: #2c3e50; color: white; border: none; padding: 8px 15px; border-radius: 20px; cursor: pointer; margin-top: 10px; }
.btn-export:hover { background: #1a252f; }

/* 表單區 - 編輯模式會有不同顏色的邊框 */
.form-section { background: #f8f9fa; padding: 20px; border-radius: 12px; margin-bottom: 30px; transition: 0.3s; border: 2px solid transparent; }
.form-section.edit-mode { border-color: #f39c12; background: #fffaf0; } /* 編輯時變橘色 */
.form-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
.btn-cancel { background: #95a5a6; color: white; border: none; padding: 5px 10px; border-radius: 5px; cursor: pointer; }

.form-row { display: flex; gap: 10px; margin-bottom: 12px; }
input, select { flex: 1; padding: 10px; border: 1px solid #ddd; border-radius: 6px; }
.btn-submit { flex: 1; background: #3498db; color: white; border: none; padding: 10px; border-radius: 6px; font-weight: bold; cursor: pointer; }
.btn-update { background: #f39c12; } /* 更新按鈕變橘色 */

/* 列表與搜尋 */
.search-bar input { width: 100%; padding: 12px; border-radius: 8px; border: 2px solid #eee; margin-bottom: 15px; box-sizing: border-box; }
.list-item { display: flex; justify-content: space-between; align-items: center; background: white; padding: 15px; margin-bottom: 10px; border-radius: 8px; box-shadow: 0 2px 5px rgba(0,0,0,0.05); }
.item-meta { display: flex; gap: 8px; font-size: 0.85rem; color: #888; margin-top: 4px; }
.tag { background: #eef2f3; padding: 2px 6px; border-radius: 4px; }
.method-tag { background: #fff3cd; color: #856404; padding: 2px 6px; border-radius: 4px; }

.item-right { display: flex; align-items: center; gap: 15px; }
.actions { display: flex; gap: 5px; }
.btn-icon { background: #f1f2f6; border: none; width: 35px; height: 35px; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: 0.2s; }
.btn-icon:hover { background: #e1e2e6; }
.btn-del:hover { background: #ffcccc; }

@media (max-width: 600px) { .dashboard-grid { grid-template-columns: 1fr; } .form-row { flex-direction: column; } }
</style>