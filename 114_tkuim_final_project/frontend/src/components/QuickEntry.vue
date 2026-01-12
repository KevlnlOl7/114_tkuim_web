<script setup>
import { ref, onMounted } from 'vue'
import axios from 'axios'
import { t, t_category } from '../i18n.js'

const props = defineProps({
  currentUser: { type: Object, default: null },
  categories: { type: Array, default: () => [] }
})

const emit = defineEmits(['use-template'])

const templates = ref([])
const showAddModal = ref(false)
const newTemplate = ref({
  name: '',
  title: '',
  amount: 0,
  category: 'Food',
  type: 'expense',
  payment_method: 'Cash',
  note: ''
})

const fetchTemplates = async () => {
  try {
    let url = 'http://127.0.0.1:8000/api/templates'
    if (props.currentUser) {
      url += `?user_id=${props.currentUser.id}`
    }
    const res = await axios.get(url)
    templates.value = res.data
  } catch (err) {
    console.error('Failed to fetch templates', err)
  }
}

const addTemplate = async () => {
  if (!newTemplate.value.name || !newTemplate.value.title || !newTemplate.value.amount) {
    alert('請填寫完整資訊')
    return
  }
  try {
    const payload = {
      ...newTemplate.value,
      user_id: props.currentUser?.id
    }
    await axios.post('http://127.0.0.1:8000/api/templates', payload)
    showAddModal.value = false
    newTemplate.value = { name: '', title: '', amount: 0, category: 'Food', type: 'expense', payment_method: 'Cash', note: '' }
    fetchTemplates()
  } catch (err) {
    alert('建立模板失敗')
  }
}

const deleteTemplate = async (id) => {
  if (!confirm('確定要刪除這個模板嗎？')) return
  try {
    await axios.delete(`http://127.0.0.1:8000/api/templates/${id}`)
    fetchTemplates()
  } catch (err) {
    alert('刪除失敗')
  }
}

const useTemplate = (template) => {
  emit('use-template', {
    title: template.title,
    amount: template.amount,
    category: template.category,
    type: template.type,
    payment_method: template.payment_method,
    note: template.note || ''
  })
}

onMounted(() => {
  fetchTemplates()
})
</script>

<template>
  <div class="quick-entry-section">
    <div class="quick-entry-header">
      <h4>⚡ {{ t('quick_entry') }}</h4>
      <button @click="showAddModal = true" class="btn-add-template">+ {{ t('save_as_template') }}</button>
    </div>
    
    <div v-if="templates.length === 0" class="no-templates">
      <span>{{ t('no_templates') }}</span>
    </div>
    
    <div v-else class="template-grid">
      <div 
        v-for="tpl in templates" 
        :key="tpl.id" 
        class="template-card"
        :class="tpl.type"
      >
        <div class="template-content" @click="useTemplate(tpl)">
          <span class="template-name">{{ tpl.name }}</span>
          <span class="template-amount">${{ tpl.amount }}</span>
          <span class="template-category">{{ t_category(tpl.category) }}</span>
        </div>
        <button @click.stop="deleteTemplate(tpl.id)" class="template-delete">×</button>
      </div>
    </div>
    
    <!-- Add Template Modal -->
    <div v-if="showAddModal" class="modal-overlay" @click.self="showAddModal = false">
      <div class="modal-card">
        <h3>📝 {{ t('save_as_template') }}</h3>
        
        <div class="form-group">
          <label>{{ t('template_name') }}</label>
          <input v-model="newTemplate.name" type="text" :placeholder="t('template_name_ph')" />
        </div>
        
        <div class="form-group">
          <label>{{ t('item_desc') }}</label>
          <input v-model="newTemplate.title" type="text" />
        </div>
        
        <div class="form-row">
          <div class="form-group">
            <label>{{ t('type') }}</label>
            <select v-model="newTemplate.type">
              <option value="expense">{{ t('expense') }}</option>
              <option value="income">{{ t('income') }}</option>
            </select>
          </div>
          <div class="form-group">
            <label>{{ t('amount') }}</label>
            <input v-model.number="newTemplate.amount" type="number" />
          </div>
        </div>
        
        <div class="form-row">
          <div class="form-group">
            <label>{{ t('category') }}</label>
            <select v-model="newTemplate.category">
              <option v-for="cat in categories.filter(c => c.type === newTemplate.type)" :key="cat.name" :value="cat.name">
                {{ cat.icon }} {{ t_category(cat.name) }}
              </option>
            </select>
          </div>
          <div class="form-group">
            <label>{{ t('account') }}</label>
            <select v-model="newTemplate.payment_method">
              <option value="Cash">{{ t('cash') }}</option>
              <option value="Credit Card">{{ t('credit_card') }}</option>
              <option value="Bank">{{ t('bank') }}</option>
              <option value="LinePay">{{ t('linepay') }}</option>
            </select>
          </div>
        </div>
        
        <div class="modal-actions">
          <button @click="addTemplate" class="btn-confirm">{{ t('save') }}</button>
          <button @click="showAddModal = false" class="btn-cancel">{{ t('cancel') }}</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.quick-entry-section {
  background: white;
  border-radius: 12px;
  padding: 15px 20px;
  margin-bottom: 15px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.05);
  border: 1px solid #e0e0e0;
}

.quick-entry-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.quick-entry-header h4 {
  margin: 0;
  color: #2c3e50;
  font-size: 1rem;
}

.btn-add-template {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-add-template:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.no-templates {
  text-align: center;
  color: #999;
  padding: 15px;
  font-size: 0.9rem;
}

.template-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.template-card {
  display: flex;
  align-items: center;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  border-radius: 10px;
  padding: 8px 12px;
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
}

.template-card.expense {
  background: linear-gradient(135deg, #fff5f5 0%, #fed7d7 100%);
}

.template-card.income {
  background: linear-gradient(135deg, #f0fff4 0%, #c6f6d5 100%);
}

.template-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}

.template-content {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.template-name {
  font-weight: bold;
  font-size: 0.9rem;
  color: #2d3436;
}

.template-amount {
  font-size: 0.85rem;
  color: #636e72;
}

.template-category {
  font-size: 0.7rem;
  color: #b2bec3;
}

.template-delete {
  background: transparent;
  border: none;
  color: #b2bec3;
  font-size: 1.2rem;
  cursor: pointer;
  padding: 0 5px;
  margin-left: 8px;
  transition: color 0.2s;
}

.template-delete:hover {
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

.form-row {
  display: flex;
  gap: 10px;
}

.form-row .form-group {
  flex: 1;
}

.modal-actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  margin-top: 15px;
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
:global(.dark) .quick-entry-section {
  background: #16213e;
  border-color: #2d3748;
}

:global(.dark) .quick-entry-header h4 {
  color: #e0e0e0;
}

:global(.dark) .template-card {
  background: linear-gradient(135deg, #2d3748 0%, #4a5568 100%);
}

:global(.dark) .template-card.expense {
  background: linear-gradient(135deg, #4a3030 0%, #5c4040 100%);
}

:global(.dark) .template-card.income {
  background: linear-gradient(135deg, #304a30 0%, #405c40 100%);
}

:global(.dark) .template-name {
  color: #e0e0e0;
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
