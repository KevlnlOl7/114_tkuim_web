<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import { t } from '../i18n.js'
import { Pie } from 'vue-chartjs'
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js'
import axios from 'axios'

ChartJS.register(ArcElement, Tooltip, Legend)

const props = defineProps({
  currentUser: { type: Object, required: true }
})

const accountBalances = ref([])
const loading = ref(true)

const fetchBalances = async () => {
  if (!props.currentUser) return
  loading.value = true
  try {
    const res = await axios.get(`/api/dashboard/accounts?user_id=${props.currentUser.id}`)
    accountBalances.value = res.data
  } catch (err) {
    console.error(err)
  } finally {
    loading.value = false
  }
}

onMounted(fetchBalances)
watch(() => props.currentUser, fetchBalances)

const netWorth = computed(() => {
  return accountBalances.value.reduce((a, b) => a + b.balance, 0)
})

const positiveAssets = computed(() => {
  return accountBalances.value.filter(item => item.balance > 0).reduce((a, b) => a + b.balance, 0)
})

const negativeLiabilities = computed(() => {
  return accountBalances.value.filter(item => item.balance < 0).reduce((a, b) => a + b.balance, 0)
})

const chartData = computed(() => {
  // Only show positive assets in Pie chart usually? Or show absolute values?
  // Let's show absolute values for distribution layout
  const labels = accountBalances.value.map(item => t(item.account.toLowerCase()) || item.account)
  const data = accountBalances.value.map(item => item.balance)
  
  return {
    labels,
    datasets: [{
      data,
      backgroundColor: [
        '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40', '#667eea', '#764ba2'
      ]
    }]
  }
})

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { position: 'right' }
  }
}

// Expose refresh method
defineExpose({ fetchBalances })
</script>

<template>
  <div class="assets-dashboard">
    <div class="header">
      <h2>{{ t('net_assets') || 'Net Assets' }}</h2>
      <div class="header-right">
        <div class="net-worth" :class="{ positive: netWorth >= 0, negative: netWorth < 0 }">
          {{ netWorth >= 0 ? '+' : '' }}{{ netWorth.toLocaleString() }}
        </div>
        <button @click="fetchBalances" class="btn-refresh" title="重新整理">↻</button>
      </div>
    </div>
    
    <div v-if="loading" class="loading">{{ t('loading') }}...</div>
    
    <div v-else>
        <div class="summary-cards">
        <div class="card asset-card">
            <label>{{ t('total_assets') }}</label>
            <div class="val positive">+{{ positiveAssets.toLocaleString() }}</div>
        </div>
        <div class="card liability-card">
            <label>{{ t('total_liabilities') }}</label>
            <!-- Liabilities usually shown as negative in calculation but absolute for display? -->
            <!-- If balance is negative, it's debt. -->
            <div class="val negative">{{ negativeLiabilities.toLocaleString() }}</div>
        </div>
        </div>

        <div class="details-grid">
        <!-- Chart -->
        <div class="chart-container">
            <Pie :data="chartData" :options="chartOptions" />
        </div>

        <!-- List -->
        <div class="account-list">
            <div v-for="item in accountBalances" :key="item.account" class="account-item">
            <div class="acc-name">{{ t(item.account.toLowerCase()) || item.account }}</div>
            <div class="acc-bal" :class="{ positive: item.balance >= 0, negative: item.balance < 0 }">
                {{ item.balance.toLocaleString() }}
            </div>
            </div>
            <div v-if="accountBalances.length === 0" class="no-data">
                {{ t('no_data') }}
            </div>
        </div>
        </div>
    </div>
  </div>
</template>

<style scoped>
.assets-dashboard {
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 4px 6px rgba(0,0,0,0.05);
  margin-bottom: 20px;
}
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #eee;
  padding-bottom: 15px;
  margin-bottom: 15px;
}
.header-right { display: flex; align-items: center; gap: 10px; }
.header h2 { margin: 0; font-size: 1.2rem; color: #2c3e50; }
.net-worth { font-size: 1.5rem; font-weight: bold; }
.net-worth.positive { color: #27ae60; }
.net-worth.negative { color: #c0392b; }

.btn-refresh {
    background: none; border: none; font-size: 1.2rem; cursor: pointer; color: #7f8c8d;
    transition: transform 0.3s;
}
.btn-refresh:hover { transform: rotate(180deg); color: #2c3e50; }

.summary-cards { display: flex; gap: 15px; margin-bottom: 20px; }
.card { flex: 1; background: #f8f9fa; padding: 15px; border-radius: 8px; text-align: center; }
.card label { font-size: 0.85rem; color: #7f8c8d; display: block; margin-bottom: 5px; }
.card .val { font-size: 1.2rem; font-weight: bold; }
.val.positive { color: #27ae60; }
.val.negative { color: #c0392b; }

.details-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; align-items: center; }
.chart-container { height: 200px; position: relative; }

.account-list { display: flex; flex-direction: column; gap: 10px; max-height: 200px; overflow-y: auto; }
.account-item { display: flex; justify-content: space-between; padding: 8px; background: #fff; border-bottom: 1px solid #f1f1f1; }
.acc-name { font-weight: 500; color: #34495e; }
.acc-bal { font-weight: bold; }
.acc-bal.positive { color: #27ae60; }
.acc-bal.negative { color: #c0392b; }

.loading { text-align: center; padding: 20px; color: #999; }

@media (max-width: 600px) {
  .details-grid { grid-template-columns: 1fr; }
}

:global(.dark) .assets-dashboard { background: #16213e; }
:global(.dark) .header h2 { color: #e0e0e0; }
:global(.dark) .header { border-color: #2d3748; }
:global(.dark) .card { background: #0f3460; }
:global(.dark) .card label { color: #a0a0a0; }
:global(.dark) .account-item { background: transparent; border-color: #2d3748; }
:global(.dark) .acc-name { color: #e0e0e0; }
</style>
