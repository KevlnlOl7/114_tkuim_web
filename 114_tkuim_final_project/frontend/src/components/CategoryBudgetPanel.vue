<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import axios from 'axios'
import { t, t_category } from '../i18n.js'

const props = defineProps({
  currentUser: { type: Object, default: null },
  categories: { type: Array, default: () => [] }
})

const emit = defineEmits(['show-toast'])

const budgets = ref([])
const budgetStatus = ref([])
const loading = ref(false)
const showAddModal = ref(false)

const currentMonth = ref(new Date().toISOString().slice(0, 7))
const newBudget = ref({ category: '', limit: 0 })

const expenseCategories = computed(() => 
  props.categories.filter(c => c.type === 'expense')
)

const fetchBudgets = async () => {
  if (!props.currentUser) return
  loading.value = true
  try {
    const [budgetsRes, statusRes] = await Promise.all([
      axios.get(`/api/category-budgets?month=${currentMonth.value}&user_id=${props.currentUser.id}`),
      axios.get(`/api/dashboard/category-budget-status?month=${currentMonth.value}&user_id=${props.currentUser.id}`)
    ])
    budgets.value = budgetsRes.data
    budgetStatus.value = statusRes.data
  } catch (err) {
    console.error('Failed to fetch category budgets', err)
  } finally {
    loading.value = false
  }
}

const saveBudget = async () => {
  if (!newBudget.value.category || newBudget.value.limit <= 0) {
    emit('show-toast', t('fill_all_required') || '請填寫完整資訊', 'error')
    return
  }
  try {
    await axios.post('/api/category-budgets', {
      category: newBudget.value.category,
      limit: Number(newBudget.value.limit),
      month: currentMonth.value,
      user_id: props.currentUser?.id
    })
    showAddModal.value = false
    newBudget.value = { category: '', limit: 0 }
    emit('show-toast', t('budget_saved') || '預算已儲存', 'success')
    fetchBudgets()
  } catch (err) {
    emit('show-toast', t('op_failed') || '操作失敗', 'error')
  }
}

const deleteBudget = async (id) => {
  if (!confirm(t('confirm_delete') || '確定要刪除嗎？')) return
  try {
    await axios.delete(`/api/category-budgets/${id}`)
    emit('show-toast', t('delete_success') || '已刪除', 'success')
    fetchBudgets()
  } catch (err) {
    emit('show-toast', t('op_failed') || '刪除失敗', 'error')
  }
}

const getProgressColor = (percent) => {
  if (percent >= 100) return '#e74c3c'
  if (percent >= 80) return '#f39c12'
  return '#27ae60'
}

const getCategoryIcon = (catName) => {
  const cat = props.categories.find(c => c.name === catName)
  return cat?.icon || '📁'
}

onMounted(fetchBudgets)
watch(() => props.currentUser, fetchBudgets)
watch(currentMonth, fetchBudgets)
</script>

<template>
  <div class="category-budget-panel">
    <div class="panel-header">
      <h3>📊 {{ t('category_budgets') || '分類預算' }}</h3>
      <div class="header-actions">
        <input type="month" v-model="currentMonth" class="month-picker" />
        <button @click="showAddModal = true" class="btn-add">+ {{ t('add') || '新增' }}</button>
      </div>
    </div>

    <div v-if="loading" class="loading">{{ t('loading') }}...</div>

    <div v-else-if="budgetStatus.length === 0" class="no-data">
      <span>{{ t('no_category_budgets') || '尚未設定分類預算' }}</span>
    </div>

    <div v-else class="budget-list">
      <div 
        v-for="item in budgetStatus.filter(s => s.limit > 0)" 
        :key="item.category" 
        class="budget-item"
        :class="{ over: item.percent >= 100, warning: item.percent >= 80 && item.percent < 100 }"
      >
        <div class="budget-info">
          <span class="category-icon">{{ getCategoryIcon(item.category) }}</span>
          <span class="category-name">{{ t_category(item.category) }}</span>
        </div>
        <div class="budget-progress">
          <div class="progress-bar">
            <div 
              class="progress-fill" 
              :style="{ 
                width: Math.min(item.percent || 0, 100) + '%',
                backgroundColor: getProgressColor(item.percent || 0)
              }"
            ></div>
          </div>
          <div class="progress-text">
            <span class="spent">${{ item.spent?.toLocaleString() || 0 }}</span>
            <span class="limit">/ ${{ item.limit?.toLocaleString() || 0 }}</span>
            <span class="percent" :style="{ color: getProgressColor(item.percent || 0) }">
              ({{ item.percent || 0 }}%)
            </span>
          </div>
        </div>
        <button 
          @click="deleteBudget(budgets.find(b => b.category === item.category)?.id)" 
          class="btn-delete"
          v-if="budgets.find(b => b.category === item.category)"
        >×</button>
      </div>
    </div>

    <!-- Add Budget Modal -->
    <div v-if="showAddModal" class="modal-overlay" @click.self="showAddModal = false">
      <div class="modal-card">
        <h3>📊 {{ t('add_category_budget') || '新增分類預算' }}</h3>
        
        <div class="form-group">
          <label>{{ t('category') }}</label>
          <select v-model="newBudget.category">
            <option value="" disabled>{{ t('select') || '請選擇' }}</option>
            <option v-for="cat in expenseCategories" :key="cat.name" :value="cat.name">
              {{ cat.icon }} {{ t_category(cat.name) }}
            </option>
          </select>
        </div>
        
        <div class="form-group">
          <label>{{ t('budget_limit') || '預算上限' }}</label>
          <input v-model.number="newBudget.limit" type="number" placeholder="0" />
        </div>
        
        <div class="modal-actions">
          <button @click="saveBudget" class="btn-confirm">{{ t('save') }}</button>
          <button @click="showAddModal = false" class="btn-cancel">{{ t('cancel') }}</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.category-budget-panel {
  background: white;
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 15px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.05);
  border: 1px solid #e0e0e0;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
  flex-wrap: wrap;
  gap: 10px;
}

.panel-header h3 {
  margin: 0;
  font-size: 1.1rem;
  color: #2c3e50;
}

.header-actions {
  display: flex;
  gap: 10px;
  align-items: center;
}

.month-picker {
  padding: 6px 10px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 0.9rem;
}

.btn-add {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  padding: 6px 15px;
  border-radius: 20px;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-add:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.loading, .no-data {
  text-align: center;
  color: #999;
  padding: 20px;
}

.budget-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.budget-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 15px;
  background: #f8f9fa;
  border-radius: 10px;
  transition: all 0.2s;
}

.budget-item.warning {
  background: #fff8e6;
}

.budget-item.over {
  background: #fff0f0;
}

.budget-info {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 120px;
}

.category-icon {
  font-size: 1.2rem;
}

.category-name {
  font-weight: 600;
  color: #2c3e50;
}

.budget-progress {
  flex: 1;
}

.progress-bar {
  height: 8px;
  background: #e0e0e0;
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 4px;
}

.progress-fill {
  height: 100%;
  transition: width 0.5s, background-color 0.3s;
}

.progress-text {
  display: flex;
  gap: 5px;
  font-size: 0.85rem;
}

.spent {
  font-weight: 600;
  color: #2c3e50;
}

.limit {
  color: #7f8c8d;
}

.percent {
  font-weight: 600;
}

.btn-delete {
  background: transparent;
  border: none;
  color: #bdc3c7;
  font-size: 1.3rem;
  cursor: pointer;
  transition: color 0.2s;
  padding: 0 5px;
}

.btn-delete:hover {
  color: #e74c3c;
}

/* Modal */
.modal-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-card {
  background: white;
  border-radius: 16px;
  padding: 25px;
  max-width: 400px;
  width: 90%;
  animation: slideUp 0.3s ease;
}

@keyframes slideUp {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

.modal-card h3 {
  margin: 0 0 20px 0;
  color: #2c3e50;
}

.form-group {
  margin-bottom: 15px;
}

.form-group label {
  display: block;
  font-size: 0.85rem;
  color: #666;
  margin-bottom: 5px;
}

.form-group input,
.form-group select {
  width: 100%;
  padding: 10px;
  box-sizing: border-box;
  border: 2px solid #ddd;
  border-radius: 8px;
  font-size: 1rem;
}

.form-group input:focus,
.form-group select:focus {
  border-color: #667eea;
  outline: none;
}

.modal-actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  margin-top: 20px;
}

.btn-confirm {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 8px;
  cursor: pointer;
}

.btn-cancel {
  background: #e0e0e0;
  color: #333;
  border: none;
  padding: 10px 20px;
  border-radius: 8px;
  cursor: pointer;
}

/* Dark mode */
:global(.dark) .category-budget-panel {
  background: #16213e;
  border-color: #2d3748;
}

:global(.dark) .panel-header h3 {
  color: #e0e0e0;
}

:global(.dark) .budget-item {
  background: #1a2744;
}

:global(.dark) .budget-item.warning {
  background: #3d3520;
}

:global(.dark) .budget-item.over {
  background: #3d2020;
}

:global(.dark) .category-name,
:global(.dark) .spent {
  color: #e0e0e0;
}

:global(.dark) .progress-bar {
  background: #2d3748;
}

:global(.dark) .month-picker {
  background: #2d3748;
  color: #e0e0e0;
  border-color: #4a5568;
}

:global(.dark) .modal-card {
  background: #16213e;
}

:global(.dark) .modal-card h3 {
  color: #e0e0e0;
}

:global(.dark) .form-group label {
  color: #a0a0a0;
}

:global(.dark) .form-group input,
:global(.dark) .form-group select {
  background: #2d3748;
  color: #e0e0e0;
  border-color: #4a5568;
}
</style>
