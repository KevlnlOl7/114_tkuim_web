<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import axios from 'axios'
import { t, t_category } from '../i18n.js'

const props = defineProps({
  currentUser: { type: Object, default: null },
  categories: { type: Array, default: () => [] },
  paymentMethods: { type: Array, default: () => [] }
})

const emit = defineEmits(['show-toast', 'refresh-data'])

const recurring = ref([])
const loading = ref(false)
const showAddModal = ref(false)
const editingId = ref(null)

const newRecurring = ref({
  title: '',
  amount: 0,
  category: 'Food',
  type: 'expense',
  payment_method: 'Cash',
  note: '',
  frequency: 'monthly',
  next_date: new Date().toISOString().slice(0, 10),
  is_active: true
})

const frequencyOptions = [
  { value: 'daily', label: '每日' },
  { value: 'weekly', label: '每週' },
  { value: 'monthly', label: '每月' },
  { value: 'yearly', label: '每年' }
]

const expenseCategories = computed(() => 
  props.categories.filter(c => c.type === 'expense')
)

const incomeCategories = computed(() => 
  props.categories.filter(c => c.type === 'income')
)

const availableCategories = computed(() => 
  newRecurring.value.type === 'expense' ? expenseCategories.value : incomeCategories.value
)

const fetchRecurring = async () => {
  if (!props.currentUser) return
  loading.value = true
  try {
    const res = await axios.get(`/api/recurring?user_id=${props.currentUser.id}`)
    recurring.value = res.data
  } catch (err) {
    console.error('Failed to fetch recurring transactions', err)
  } finally {
    loading.value = false
  }
}

const openAddModal = () => {
  editingId.value = null
  newRecurring.value = {
    title: '',
    amount: 0,
    category: expenseCategories.value[0]?.name || 'Food',
    type: 'expense',
    payment_method: props.paymentMethods[0]?.name || 'Cash',
    note: '',
    frequency: 'monthly',
    next_date: new Date().toISOString().slice(0, 10),
    is_active: true
  }
  showAddModal.value = true
}

const openEditModal = (item) => {
  editingId.value = item.id
  newRecurring.value = { ...item }
  showAddModal.value = true
}

const saveRecurring = async () => {
  if (!newRecurring.value.title || newRecurring.value.amount <= 0) {
    emit('show-toast', t('fill_all_required') || '請填寫完整資訊', 'error')
    return
  }
  try {
    const payload = {
      ...newRecurring.value,
      user_id: props.currentUser?.id
    }
    
    if (editingId.value) {
      await axios.put(`/api/recurring/${editingId.value}`, payload)
      emit('show-toast', t('update_success') || '更新成功', 'success')
    } else {
      await axios.post('/api/recurring', payload)
      emit('show-toast', t('create_success') || '建立成功', 'success')
    }
    
    showAddModal.value = false
    fetchRecurring()
  } catch (err) {
    emit('show-toast', t('op_failed') || '操作失敗', 'error')
  }
}

const deleteRecurring = async (id) => {
  if (!confirm(t('confirm_delete') || '確定要刪除嗎？')) return
  try {
    await axios.delete(`/api/recurring/${id}`)
    emit('show-toast', t('delete_success') || '已刪除', 'success')
    fetchRecurring()
  } catch (err) {
    emit('show-toast', t('op_failed') || '刪除失敗', 'error')
  }
}

const executeRecurring = async (id) => {
  try {
    const res = await axios.post(`/api/recurring/${id}/execute`)
    emit('show-toast', t('recurring_executed') || '交易已執行', 'success')
    emit('refresh-data')
    fetchRecurring()
  } catch (err) {
    emit('show-toast', t('op_failed') || '執行失敗', 'error')
  }
}

const isUpcoming = (dateStr) => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const nextDate = new Date(dateStr)
  nextDate.setHours(0, 0, 0, 0)
  const diff = (nextDate - today) / (1000 * 60 * 60 * 24)
  return diff <= 3 && diff >= 0
}

const formatDate = (dateStr) => {
  const d = new Date(dateStr)
  return d.toLocaleDateString('zh-TW', { month: 'short', day: 'numeric' })
}

const getFrequencyLabel = (freq) => {
  const opt = frequencyOptions.find(o => o.value === freq)
  return opt?.label || freq
}

const getCategoryIcon = (catName) => {
  const cat = props.categories.find(c => c.name === catName)
  return cat?.icon || '📁'
}

onMounted(fetchRecurring)
watch(() => props.currentUser, fetchRecurring)
</script>

<template>
  <div class="recurring-panel">
    <div class="panel-header">
      <h3>🔄 {{ t('recurring_transactions') || '重複交易' }}</h3>
      <button @click="openAddModal" class="btn-add">+ {{ t('add') || '新增' }}</button>
    </div>

    <div v-if="loading" class="loading">{{ t('loading') }}...</div>

    <div v-else-if="recurring.length === 0" class="no-data">
      <span>{{ t('no_recurring') || '尚未設定重複交易' }}</span>
    </div>

    <div v-else class="recurring-list">
      <div 
        v-for="item in recurring" 
        :key="item.id" 
        class="recurring-item"
        :class="{ 
          expense: item.type === 'expense', 
          income: item.type === 'income',
          upcoming: isUpcoming(item.next_date)
        }"
      >
        <div class="item-main" @click="openEditModal(item)">
          <div class="item-icon">{{ getCategoryIcon(item.category) }}</div>
          <div class="item-info">
            <div class="item-title">{{ item.title }}</div>
            <div class="item-meta">
              <span class="item-category">{{ t_category(item.category) }}</span>
              <span class="item-freq">{{ getFrequencyLabel(item.frequency) }}</span>
            </div>
          </div>
          <div class="item-right">
            <div class="item-amount" :class="item.type">
              {{ item.type === 'expense' ? '-' : '+' }}${{ item.amount?.toLocaleString() }}
            </div>
            <div class="item-next-date" :class="{ upcoming: isUpcoming(item.next_date) }">
              {{ t('next') || '下次' }}: {{ formatDate(item.next_date) }}
            </div>
          </div>
        </div>
        <div class="item-actions">
          <button 
            @click="executeRecurring(item.id)" 
            class="btn-execute"
            :title="t('execute_now') || '立即執行'"
          >▶️</button>
          <button 
            @click="deleteRecurring(item.id)" 
            class="btn-delete"
          >×</button>
        </div>
      </div>
    </div>

    <!-- Add/Edit Modal -->
    <div v-if="showAddModal" class="modal-overlay" @click.self="showAddModal = false">
      <div class="modal-card">
        <h3>🔄 {{ editingId ? (t('edit') || '編輯') : (t('add') || '新增') }} {{ t('recurring_transaction') || '重複交易' }}</h3>
        
        <div class="form-row">
          <div class="form-group">
            <label>{{ t('type') }}</label>
            <select v-model="newRecurring.type">
              <option value="expense">{{ t('expense') }} 💸</option>
              <option value="income">{{ t('income') }} 💰</option>
            </select>
          </div>
          <div class="form-group">
            <label>{{ t('frequency') || '頻率' }}</label>
            <select v-model="newRecurring.frequency">
              <option v-for="opt in frequencyOptions" :key="opt.value" :value="opt.value">
                {{ opt.label }}
              </option>
            </select>
          </div>
        </div>
        
        <div class="form-group">
          <label>{{ t('item_desc') }}</label>
          <input v-model="newRecurring.title" type="text" :placeholder="t('item_desc')" />
        </div>
        
        <div class="form-row">
          <div class="form-group">
            <label>{{ t('amount') }}</label>
            <input v-model.number="newRecurring.amount" type="number" placeholder="0" />
          </div>
          <div class="form-group">
            <label>{{ t('next_date') || '下次日期' }}</label>
            <input v-model="newRecurring.next_date" type="date" />
          </div>
        </div>
        
        <div class="form-row">
          <div class="form-group">
            <label>{{ t('category') }}</label>
            <select v-model="newRecurring.category">
              <option v-for="cat in availableCategories" :key="cat.name" :value="cat.name">
                {{ cat.icon }} {{ t_category(cat.name) }}
              </option>
            </select>
          </div>
          <div class="form-group">
            <label>{{ t('account') }}</label>
            <select v-model="newRecurring.payment_method">
              <option v-for="pm in paymentMethods" :key="pm.name" :value="pm.name">
                {{ pm.icon }} {{ pm.name }}
              </option>
            </select>
          </div>
        </div>
        
        <div class="form-group">
          <label>{{ t('note') }}</label>
          <input v-model="newRecurring.note" type="text" :placeholder="t('note')" />
        </div>
        
        <div class="modal-actions">
          <button @click="saveRecurring" class="btn-confirm">{{ t('save') }}</button>
          <button @click="showAddModal = false" class="btn-cancel">{{ t('cancel') }}</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.recurring-panel {
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
}

.panel-header h3 {
  margin: 0;
  font-size: 1.1rem;
  color: #2c3e50;
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

.recurring-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.recurring-item {
  display: flex;
  align-items: center;
  padding: 12px 15px;
  background: #f8f9fa;
  border-radius: 10px;
  transition: all 0.2s;
  border-left: 4px solid transparent;
}

.recurring-item.expense {
  border-left-color: #e74c3c;
}

.recurring-item.income {
  border-left-color: #27ae60;
}

.recurring-item.upcoming {
  background: #fff8e6;
  box-shadow: 0 2px 8px rgba(243, 156, 18, 0.2);
}

.item-main {
  display: flex;
  align-items: center;
  flex: 1;
  gap: 12px;
  cursor: pointer;
}

.item-icon {
  font-size: 1.5rem;
}

.item-info {
  flex: 1;
}

.item-title {
  font-weight: 600;
  color: #2c3e50;
  margin-bottom: 2px;
}

.item-meta {
  display: flex;
  gap: 10px;
  font-size: 0.8rem;
  color: #7f8c8d;
}

.item-freq {
  background: #e0e0e0;
  padding: 2px 8px;
  border-radius: 10px;
}

.item-right {
  text-align: right;
}

.item-amount {
  font-weight: bold;
  font-size: 1.1rem;
}

.item-amount.expense {
  color: #e74c3c;
}

.item-amount.income {
  color: #27ae60;
}

.item-next-date {
  font-size: 0.75rem;
  color: #7f8c8d;
}

.item-next-date.upcoming {
  color: #f39c12;
  font-weight: bold;
}

.item-actions {
  display: flex;
  gap: 8px;
  margin-left: 12px;
}

.btn-execute {
  background: #27ae60;
  border: none;
  color: white;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  cursor: pointer;
  font-size: 0.8rem;
  transition: all 0.2s;
}

.btn-execute:hover {
  transform: scale(1.1);
}

.btn-delete {
  background: transparent;
  border: none;
  color: #bdc3c7;
  font-size: 1.3rem;
  cursor: pointer;
  transition: color 0.2s;
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
  max-width: 450px;
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

.form-row {
  display: flex;
  gap: 12px;
}

.form-row .form-group {
  flex: 1;
}

.form-group {
  margin-bottom: 12px;
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
:global(.dark) .recurring-panel {
  background: #16213e;
  border-color: #2d3748;
}

:global(.dark) .panel-header h3 {
  color: #e0e0e0;
}

:global(.dark) .recurring-item {
  background: #1a2744;
}

:global(.dark) .recurring-item.upcoming {
  background: #3d3520;
}

:global(.dark) .item-title {
  color: #e0e0e0;
}

:global(.dark) .item-freq {
  background: #2d3748;
  color: #a0a0a0;
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
