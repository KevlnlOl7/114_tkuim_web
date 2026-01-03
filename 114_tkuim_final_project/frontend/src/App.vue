<script setup>
import { ref, onMounted } from 'vue'
import axios from 'axios'

// 1. 定義變數來存資料
const transactions = ref([])

// 2. 定義一個函式去後端抓資料
const fetchData = async () => {
  try {
    // 呼叫你的後端 API
    const response = await axios.get('http://127.0.0.1:8000/api/transactions')
    // 把抓回來的資料存進變數
    transactions.value = response.data
    console.log("資料抓取成功:", response.data)
  } catch (error) {
    console.error("抓取失敗:", error)
    alert("連線失敗，請確認後端有沒有開！")
  }
}

// 3. 當畫面載入時，自動執行抓資料
onMounted(() => {
  fetchData()
})
</script>

<template>
  <div class="container">
    <h1>💰 PyMoney 記帳本</h1>
    
    <div class="card-list">
      <p v-if="transactions.length === 0">目前沒有紀錄，趕快去新增一筆吧！</p>

      <div v-else v-for="item in transactions" :key="item.id" class="card">
        <div class="info">
          <h3>{{ item.title }}</h3>
          <span class="category">{{ item.category }}</span>
          <small>{{ item.date }}</small>
        </div>
        <div class="amount" :class="item.type">
          {{ item.type === 'expense' ? '-' : '+' }} ${{ item.amount }}
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 簡單排版 CSS，讓它看起來像個樣子 */
.container {
  max-width: 600px;
  margin: 0 auto;
  padding: 20px;
  font-family: Arial, sans-serif;
}

h1 {
  text-align: center;
  color: #2c3e50;
}

.card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border: 1px solid #ddd;
  padding: 15px;
  margin-bottom: 10px;
  border-radius: 8px;
  box-shadow: 0 2px 5px rgba(0,0,0,0.05);
  background: white;
}

.info h3 {
  margin: 0;
  font-size: 1.1rem;
}

.category {
  background: #eee;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 0.8rem;
  color: #666;
  margin-right: 10px;
}

.amount {
  font-weight: bold;
  font-size: 1.2rem;
}

.amount.expense {
  color: #e74c3c; /* 紅色代表支出 */
}

.amount.income {
  color: #27ae60; /* 綠色代表收入 */
}
</style>