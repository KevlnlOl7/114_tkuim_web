<script setup>
import { computed, ref } from 'vue'
import { t, currentLocale } from '../i18n.js'
import Chart from './Chart.vue'
import BarChart from './BarChart.vue'

const props = defineProps({
  stats: { type: Object, required: true },
  trendData: { type: Object, required: true },
  budgetLimit: { type: Number, default: 0 },
  monthlyExpense: { type: Number, default: 0 },
  totalAmount: { type: Number, default: 0 },
  categories: { type: Array, default: () => [] }
})

const emit = defineEmits(['update-budget', 'import', 'export', 'download-sample'])

const showBudgetInput = ref(false)
const newBudget = ref(0)
const fileInput = ref(null)

const currentMonthLabel = computed(() => {
  return new Date().toLocaleString(currentLocale.value, { month: 'long' })
})

const budgetPercent = computed(() => {
  if (props.budgetLimit === 0) return 0
  const p = (props.monthlyExpense / props.budgetLimit) * 100
  return Math.min(p, 100)
})

const toggleBudgetEdit = () => {
  newBudget.value = props.budgetLimit
  showBudgetInput.value = !showBudgetInput.value
}

const saveBudget = () => {
  if (Number(newBudget.value) < 0) {
    alert(t('budget_negative_error') || '預算不能為負數')
    return
  }
  emit('update-budget', Number(newBudget.value))
  showBudgetInput.value = false
}

const triggerFileInput = () => {
  fileInput.value.click()
}

const handleImport = (event) => {
  const file = event.target.files[0]
  if (file) {
    emit('import', file)
    event.target.value = ''
  }
}
</script>

<template>
  <div class="dashboard-grid">
    <div class="card budget-card full-width-card">
      <div class="budget-header">
        <h3>📅 {{ t('budget_title') }} ({{ currentMonthLabel }})</h3>
        <button @click="toggleBudgetEdit" class="btn-sm">⚙️ {{ t('settings') }}</button>
      </div>
      <div v-if="showBudgetInput" class="budget-input-area">
        <input v-model="newBudget" type="number" :placeholder="t('budget')" />
        <button @click="saveBudget" class="btn-confirm">{{ t('save') }}</button>
      </div>
      <div v-else class="budget-display">
        <div class="budget-info">
          <span>{{ t('spend') }}: <b>${{ monthlyExpense }}</b></span>
          <span>{{ t('budget') }}: ${{ budgetLimit }}</span>
        </div>
        <div class="progress-container">
          <div class="progress-bar" :style="{ width: budgetPercent + '%', backgroundColor: monthlyExpense > budgetLimit ? '#ff7675' : '#74b9ff' }"></div>
        </div>
        <p v-if="monthlyExpense > budgetLimit" class="warning-text">⚠️ {{ t('over') }}</p>
        <p v-else class="safe-text">✨ {{ t('remaining') }} ${{ budgetLimit - monthlyExpense }}</p>
      </div>
    </div>

    <div class="card balance-card">
      <h3>{{ t('net_assets') }}</h3>
      <h2 :class="totalAmount >= 0 ? 'income-text' : 'expense-text'">${{ totalAmount }}</h2>
      
      <div class="button-group">
        <input type="file" ref="fileInput" @change="handleImport" accept=".xlsx,.xls,.csv" style="display: none" />
        <button @click="triggerFileInput" class="btn-outline">{{ t('import_data') }}</button>
        <button @click="$emit('download-sample')" class="btn-outline sample-btn" title="下載匯入範例格式">⬇️ 範例</button>
        <button @click="$emit('export')" class="btn-outline">{{ t('export_excel') }}</button>
      </div>
    </div>

    <div class="card chart-card">
      <h3>{{ t('expense_analysis') }}</h3>
      <Chart :stats="stats" :categories="categories" :emptyText="t('no_chart_data')" />
    </div>
    
    <div class="card bar-chart-card full-width-card">
      <h3>{{ t('trend_chart') }}</h3>
      <BarChart :trendData="trendData" :expenseLabel="t('expense')" :incomeLabel="t('income')" />
    </div>
  </div>
</template>

<style scoped>
.dashboard-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px; }
.full-width-card { grid-column: span 2; }
.card { background: white; border-radius: 12px; padding: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); border: 1px solid #e0e0e0; }

/* Budget Card */
.budget-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
.budget-header h3 { margin: 0; color: #2c3e50; font-size: 1.1rem; }
.budget-input-area { display: flex; gap: 10px; }
.budget-input-area input { flex: 1; padding: 10px; border: 2px solid #ddd; border-radius: 6px; font-size: 1rem; }
.btn-confirm { background: #2ecc71; color: white; border: none; padding: 8px 15px; border-radius: 6px; cursor: pointer; }
.budget-info { display: flex; justify-content: space-between; font-size: 0.9rem; margin-bottom: 5px; color: #555; }
.progress-container { width: 100%; height: 12px; background: #e0e0e0; border-radius: 6px; overflow: hidden; position: relative; }
.progress-bar { height: 100%; transition: width 0.5s, background-color 0.5s; }
.warning-text { color: #ff7675; font-weight: bold; margin-top: 8px; font-size: 0.9rem; text-align: right; }
.safe-text { color: #2ecc71; font-weight: bold; margin-top: 8px; font-size: 0.9rem; text-align: right; }

/* Balance Card */
.balance-card { background: #34495e; color: white; text-align: center; display: flex; flex-direction: column; justify-content: center; align-items: center; }
.balance-card h3 { color: white; }
.balance-card h2 { font-size: 2.2rem; margin: 10px 0; }
.income-text { color: #2ecc71; }
.expense-text { color: #ff7675; }

.button-group { display: flex; gap: 10px; margin-top: 10px; }
.btn-outline { background: transparent; border: 1px solid rgba(255,255,255,0.5); color: white; padding: 5px 15px; border-radius: 20px; cursor: pointer; }
.btn-outline:hover { background: rgba(255,255,255,0.1); }

.btn-sm { background: #ddd; padding: 4px 8px; border: none; border-radius: 4px; cursor: pointer; }

@media (max-width: 600px) {
  .dashboard-grid { grid-template-columns: 1fr; }
  .full-width-card { grid-column: span 1; }
}

:global(.dark) .card { background: #16213e; border-color: #2d3748; }
:global(.dark) .card h3 { color: #e0e0e0; }
:global(.dark) .budget-info { color: #a0a0a0; }
:global(.dark) .progress-container { background: #2d3748; }
:global(.dark) .budget-input-area input { background: #2d3748; color: #e0e0e0; border-color: #4a5568; }
</style>
