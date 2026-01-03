<script setup>
import { ref, onMounted, computed } from 'vue' // 引入 computed
import axios from 'axios'

const transactions = ref([])
const form = ref({
  title: '',
  amount: '',
  category: 'Food',
  date: new Date().toISOString().split('T')[0],
  type: 'expense'
})

// [Read]
const fetchData = async () => {
  try {
    const response = await axios.get('http://127.0.0.1:8000/api/transactions')
    transactions.value = response.data.reverse()
  } catch (error) { console.error(error) }
}

// [Create]
const addTransaction = async () => {
  if (!form.value.title || !form.value.amount) return alert("請輸入完整資訊")
  try {
    await axios.post('http://127.0.0.1:8000/api/transactions', {
      ...form.value, amount: Number(form.value.amount)
    })
    alert("新增成功！")
    fetchData()
    form.value.title = ''; form.value.amount = ''
  } catch (error) { alert("新增失敗") }
}

// [Delete] 新增這個功能！
const removeTransaction = async (id) => {
  if(!confirm("確定要刪除這筆紀錄嗎？")) return; // 防呆確認
  
  try {
    await axios.delete(`http://127.0.0.1:8000/api/transactions/${id}`)
    alert("刪除成功")
    // 雖然可以重新 fetch，但直接在前端過濾掉比較快，體驗更好
    transactions.value = transactions.value.filter(t => t.id !== id)
  } catch (error) {
    console.error(error)
    alert("刪除失敗")
  }
}

// [加分] 計算總金額 (Vue 的 computed 功能)
const totalAmount = computed(() => {
  return transactions.value.reduce((sum, item) => {
    return item.type === 'income' ? sum + item.amount : sum - item.amount
  }, 0)
})

onMounted(() => { fetchData() })
</script>

<template>
  <div class="container">
    <h1>💰 PyMoney 記帳本</h1>

    <div class="balance-card">
      <h3>目前餘額</h3>
      <h2 :class="totalAmount >= 0 ? 'income' : 'expense'">
        ${{ totalAmount }}
      </h2>
    </div>

    <div class="form-card">
      <div class="form-row">
        <select v-model="form.type"><option value="expense">支出 💸</option><option value="income">收入 💰</option></select>
        <input v-model="form.date" type="date" required />
      </div>
      <div class="form-row">
        <input v-model="form.title" placeholder="消費項目" required />
        <input v-model="form.amount" type="number" placeholder="金額" required />
      </div>
      <div class="form-row">
        <select v-model="form.category">
          <option value="Food">食物</option><option value="Transport">交通</option>
          <option value="Entertainment">娛樂</option><option value="Other">其他</option>
        </select>
        <button @click="addTransaction" class="btn-add">新增</button>
      </div>
    </div>

    <hr />

    <div class="card-list">
      <div v-for="item in transactions" :key="item.id" class="card">
        <div class="info">
          <h3>{{ item.title }}</h3>
          <span class="category">{{ item.category }}</span> <small>{{ item.date }}</small>
        </div>
        <div class="right-section">
          <span class="amount" :class="item.type">
            {{ item.type === 'expense' ? '-' : '+' }} ${{ item.amount }}
          </span>
          <button @click="removeTransaction(item.id)" class="btn-delete">❌</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 基本樣式沿用之前的，新增以下 */
.container { max-width: 600px; margin: 0 auto; padding: 20px; font-family: sans-serif; }
.balance-card { text-align: center; margin-bottom: 20px; background: #fff; padding: 10px; border-radius: 8px; border: 2px solid #333; }
.form-card { background: #f4f4f4; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
.form-row { display: flex; gap: 10px; margin-bottom: 10px; }
input, select { flex: 1; padding: 8px; }
.btn-add { background: #2ecc71; color: white; border: none; cursor: pointer; }
.card { display: flex; justify-content: space-between; align-items: center; background: white; padding: 15px; margin-bottom: 10px; box-shadow: 0 2px 5px rgba(0,0,0,0.1); border-radius: 5px;}
.right-section { display: flex; align-items: center; gap: 15px; }
.btn-delete { background: transparent; border: none; cursor: pointer; font-size: 1.2rem; }
.btn-delete:hover { transform: scale(1.2); }
.income { color: #27ae60; }
.expense { color: #c0392b; }
</style>