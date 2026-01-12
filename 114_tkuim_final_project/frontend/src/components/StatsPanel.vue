<script setup>
import { computed, ref } from 'vue'
import { t, currentLocale } from '../i18n.js'
import Chart from './Chart.vue'
import BarChart from './BarChart.vue'

const props = defineProps({
  stats: { type: Object, required: true },
  trendData: { type: Object, required: true }, // Initial data from backend
  transactions: { type: Array, default: () => [] }, // For frontend dynamic calc
  budgetLimit: { type: Number, default: 0 },
  monthlyExpense: { type: Number, default: 0 },
  totalAmount: { type: Number, default: 0 },
  categories: { type: Array, default: () => [] }
})

const emit = defineEmits(['update-budget', 'import', 'export', 'download-sample'])

const showBudgetInput = ref(false)
const newBudget = ref(0)
const fileInput = ref(null)

// Analysis Chart Controls
const analysisType = ref('category')
const analysisFilterType = ref('preset') // preset, year, month, day, range
const analysisPreset = ref('thisMonth')
const analysisYear = ref(new Date().getFullYear())
const analysisMonth = ref(new Date().toISOString().slice(0, 7)) // YYYY-MM
const analysisDay = ref(new Date().toISOString().slice(0, 10)) // YYYY-MM-DD
const analysisStart = ref('')
const analysisEnd = ref('')

// Trend Chart Controls
const chartGranularity = ref('day')
const trendFilterType = ref('preset') // preset, year, month, day, range
const trendPreset = ref('30d')
const trendYear = ref(new Date().getFullYear())
const trendMonth = ref(new Date().toISOString().slice(0, 7))
const trendDay = ref(new Date().toISOString().slice(0, 10))
const trendStart = ref('')
const trendEnd = ref('')

const years = computed(() => {
  const current = new Date().getFullYear()
  const list = []
  for (let i = 0; i < 5; i++) list.push(current - i)
  return list
})

const filterByDate = (transactions, type, preset, year, month, day, start, end) => {
    let filtered = [...transactions]
    const now = new Date()
    
    if (type === 'preset') {
        if (preset === '7d' || preset === 'last_7_days') {
            const limit = new Date(); limit.setDate(now.getDate() - 7); limit.setHours(0,0,0,0)
            filtered = filtered.filter(t => new Date(t.date) >= limit)
        } else if (preset === '30d' || preset === 'last_30_days') {
            const limit = new Date(); limit.setDate(now.getDate() - 30); limit.setHours(0,0,0,0)
            filtered = filtered.filter(t => new Date(t.date) >= limit)
        } else if (preset === 'thisYear' || preset === 'this_year') {
            const limit = new Date(now.getFullYear(), 0, 1)
            filtered = filtered.filter(t => new Date(t.date) >= limit)
        } else if (preset === 'thisMonth' || preset === 'this_month') {
            const s = new Date(now.getFullYear(), now.getMonth(), 1)
            const e = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)
            filtered = filtered.filter(t => new Date(t.date) >= s && new Date(t.date) <= e)
        } else if (preset === 'lastMonth' || preset === 'last_month') {
            const s = new Date(now.getFullYear(), now.getMonth() - 1, 1)
            const e = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59)
            filtered = filtered.filter(t => new Date(t.date) >= s && new Date(t.date) <= e)
        }
        // 'all' passes through
    } else if (type === 'year') {
        filtered = filtered.filter(t => new Date(t.date).getFullYear() === parseInt(year))
    } else if (type === 'month') {
        if (month) filtered = filtered.filter(t => t.date.startsWith(month))
    } else if (type === 'day') {
        if (day) filtered = filtered.filter(t => t.date.startsWith(day)) // Assuming YYYY-MM-DD
    } else if (type === 'range') {
        if (start) filtered = filtered.filter(t => new Date(t.date) >= new Date(start))
        if (end) filtered = filtered.filter(t => new Date(t.date) <= new Date(end + 'T23:59:59'))
    }
    return filtered
}

const processedTrendData = computed(() => {
  if (!props.transactions || props.transactions.length === 0) return props.trendData

  const filtered = filterByDate(props.transactions, trendFilterType.value, trendPreset.value, trendYear.value, trendMonth.value, trendDay.value, trendStart.value, trendEnd.value)

  // 2. Group
  const groups = {}
  filtered.forEach(t => {
    const d = new Date(t.date)
    if (isNaN(d.getTime())) return // Skip invalid dates
    
    let key = ''
    if (chartGranularity.value === 'day') {
      key = `${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')}`
    } else if (chartGranularity.value === 'month') {
      key = `${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,'0')}`
    } else {
      key = `${d.getFullYear()}`
    }

    if (!groups[key]) groups[key] = { expense: 0, income: 0 }
    if (t.type === 'expense') groups[key].expense += t.amount
    if (t.type === 'income') groups[key].income += t.amount
  })

  // 3. Sort & Format
  const sortedKeys = Object.keys(groups).sort()
  return {
    dates: sortedKeys,
    expenses: sortedKeys.map(k => groups[k].expense),
    incomes: sortedKeys.map(k => groups[k].income)
  }
})

const processedStats = computed(() => {
  if (!props.transactions || props.transactions.length === 0) {
    if (analysisType.value === 'category' && analysisFilterType.value === 'preset' && analysisPreset.value === 'thisMonth') {
        return props.stats
    }
    return {}
  }

  let filtered = props.transactions.filter(t => t.type === 'expense')
  filtered = filterByDate(filtered, analysisFilterType.value, analysisPreset.value, analysisYear.value, analysisMonth.value, analysisDay.value, analysisStart.value, analysisEnd.value)


  // 2. Group by Dimension
  const stats = {}
  filtered.forEach(item => {
    let key = 'Unknown'
    if (analysisType.value === 'category') {
      key = item.category || 'Uncategorized'
    } else if (analysisType.value === 'method') {
      key = t(item.payment_method.toLowerCase()) || item.payment_method // Try translate method
    } else if (analysisType.value === 'member') {
      // Use user_display_name if available, else fallback
      // Since transactions are flattened with user_display_name in backend
      key = item.user_display_name || 'Unknown'
    }
    
    if (!stats[key]) stats[key] = 0
    stats[key] += item.amount
  })

  return stats
})

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
    const msg = t('budget_negative_error') || '預算不能為負數'
    console.log('Budget validation failed:', msg)
    alert(msg)
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
      <div class="chart-header">
        <h3>{{ t('expense_analysis') }}</h3>
        <div class="chart-controls">
           <select v-model="analysisType">
             <option value="category">{{ t('category') || '類別' }}</option>
             <option value="method">{{ t('payment_method') || '帳戶' }}</option>
             <option value="member">{{ t('member') || '成員' }}</option>
           </select>
           
           <select v-model="analysisFilterType">
             <option value="preset">{{ t('preset') || '快速' }}</option>
             <option value="year">{{ t('year') || '年' }}</option>
             <option value="month">{{ t('month') || '月' }}</option>
             <option value="day">{{ t('day') || '日' }}</option>
             <option value="range">{{ t('range') || '期間' }}</option>
           </select>

           <select v-if="analysisFilterType === 'preset'" v-model="analysisPreset">
             <option value="thisMonth">{{ t('this_month') || '本月' }}</option>
             <option value="lastMonth">{{ t('last_month') || '上月' }}</option>
             <option value="thisYear">{{ t('this_year') || '今年' }}</option>
             <option value="all">{{ t('all_time') || '全部' }}</option>
           </select>
           
           <select v-if="analysisFilterType === 'year'" v-model="analysisYear">
             <option v-for="y in years" :key="y" :value="y">{{ y }}</option>
           </select>

           <input v-if="analysisFilterType === 'month'" type="month" v-model="analysisMonth" />
           <input v-if="analysisFilterType === 'day'" type="date" v-model="analysisDay" />
           
           <div v-if="analysisFilterType === 'range'" class="range-inputs">
             <input type="date" v-model="analysisStart" />
             <span>~</span>
             <input type="date" v-model="analysisEnd" />
           </div>
        </div>
      </div>
      <Chart :stats="processedStats" :categories="categories" :emptyText="t('no_chart_data')" />
    </div>
    
    <div class="card bar-chart-card full-width-card">
      <div class="chart-header">
        <h3>{{ t('trend_chart') }}</h3>
        <div class="chart-controls">
          <select v-model="chartGranularity">
            <option value="day">{{ t('day') || '日' }}</option>
            <option value="month">{{ t('month') || '月' }}</option>
            <option value="year">{{ t('year') || '年' }}</option>
          </select>
          
          <select v-model="trendFilterType">
             <option value="preset">{{ t('preset') || '快速' }}</option>
             <option value="year">{{ t('year') || '年' }}</option>
             <option value="month">{{ t('month') || '月' }}</option>
             <option value="day">{{ t('day') || '日' }}</option>
             <option value="range">{{ t('range') || '期間' }}</option>
          </select>

          <select v-if="trendFilterType === 'preset'" v-model="trendPreset">
            <option value="7d">{{ t('last_7_days') || '近7天' }}</option>
            <option value="30d">{{ t('last_30_days') || '近30天' }}</option>
            <option value="thisYear">{{ t('this_year') || '今年' }}</option>
            <option value="all">{{ t('all_time') || '全部' }}</option>
          </select>

          <select v-if="trendFilterType === 'year'" v-model="trendYear">
             <option v-for="y in years" :key="y" :value="y">{{ y }}</option>
          </select>

          <input v-if="trendFilterType === 'month'" type="month" v-model="trendMonth" />
          <input v-if="trendFilterType === 'day'" type="date" v-model="trendDay" />
          
          <div v-if="trendFilterType === 'range'" class="range-inputs">
             <input type="date" v-model="trendStart" />
             <span>~</span>
             <input type="date" v-model="trendEnd" />
          </div>
        </div>
      </div>
      <BarChart :trendData="processedTrendData" :expenseLabel="t('expense')" :incomeLabel="t('income')" />
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
/* Chart Controls */
.chart-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; flex-wrap: wrap; gap: 10px; }
.chart-controls { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
.chart-controls select, .chart-controls input { padding: 4px 8px; border: 1px solid #ddd; border-radius: 6px; font-size: 0.9rem; cursor: pointer; }
.range-inputs { display: flex; align-items: center; gap: 5px; }
:global(.dark) .chart-controls select, :global(.dark) .chart-controls input { background: #2d3748; color: #e0e0e0; border-color: #4a5568; }
</style>
