<script setup>
import { computed, watch } from 'vue'
import { t, t_category, currentLocale, currencyOptions } from '../i18n.js'
import axios from 'axios'

const props = defineProps({
  form: { type: Object, required: true },
  categories: { type: Array, required: true },
  paymentMethods: { type: Array, default: () => [] },
  isEditing: { type: Boolean, default: false },
  rateUpdatedAt: { type: String, default: '' }
})

const emit = defineEmits(['submit', 'cancel', 'update:form', 'update:rateUpdatedAt', 'manage-categories', 'manage-payment-methods'])

const localForm = computed({
  get: () => props.form,
  set: (val) => emit('update:form', val)
})

const availableCategories = computed(() => {
  return props.categories.filter(c => c.type === localForm.value.type)
})

const setDate = (offset) => {
  const d = new Date()
  d.setDate(d.getDate() + offset)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  localForm.value.date = `${year}-${month}-${day}`
}

const setDefaultCurrency = () => {
  localStorage.setItem('default_currency', localForm.value.currency)
  alert(t('default_set_hint').replace('{currency}', localForm.value.currency))
}

// Watch currency change for exchange rate
watch(() => localForm.value.currency, async (newVal) => {
  if (newVal === 'TWD') {
    localForm.value.exchange_rate = 1
    localForm.value.foreign_amount = ''
    emit('update:rateUpdatedAt', '')
    return
  }
  try {
    const res = await axios.get(`/api/rates/${newVal}`)
    localForm.value.exchange_rate = Number(res.data.rate.toFixed(6))
    const utc = res.data.updated_at
    if (utc) {
      const d = new Date(utc + (utc.includes('UTC') ? '' : ' UTC'))
      emit('update:rateUpdatedAt', d.toLocaleString('zh-TW', { timeZone: 'Asia/Taipei', hour12: false }) + ' (' + t('taipei_time') + ')')
    }
    if (localForm.value.foreign_amount) {
      localForm.value.amount = Math.round(localForm.value.foreign_amount * localForm.value.exchange_rate)
    }
  } catch (e) { console.error(e) }
})

watch(() => [localForm.value.foreign_amount, localForm.value.exchange_rate], ([fa, rate]) => {
  if (localForm.value.currency !== 'TWD' && fa && rate) {
    localForm.value.amount = Math.round(fa * rate)
  }
})

const handleSubmit = () => {
  if (!localForm.value.title || !localForm.value.amount) {
    alert(t('fill_all_required'))
    return
  }
  if (localForm.value.type === 'transfer') {
    if (!localForm.value.target_account) {
      alert(t('select_target_account'))
      return
    }
    if (localForm.value.payment_method === localForm.value.target_account) {
      alert(t('same_account_error'))
      return
    }
  }
  emit('submit')
}
</script>

<template>
  <div class="card form-card" :class="{ 'edit-mode': isEditing }">
    <div class="form-header">
      <h3>{{ isEditing ? '✏️ ' + t('update') : '📝 ' + t('add_transaction') }}</h3>
      <button v-if="isEditing" @click="$emit('cancel')" class="btn-sm">{{ t('cancel') }}</button>
    </div>
    
    <div class="form-body">
      <div class="form-row">
        <div class="input-group">
          <div class="category-label-row">
            <label>{{ t('type') }}</label>
            <span></span>
          </div>
          <select v-model="localForm.type">
            <option value="expense">{{ t('expense') }} 💸</option>
            <option value="income">{{ t('income') }} 💰</option>
            <option value="transfer">{{ t('transfer') }} 🔄</option>
          </select>
        </div>
        <div class="input-group">
          <div class="category-label-row">
            <label>{{ t('date') }}</label>
            <div class="date-shortcuts">
              <span @click="setDate(-2)" class="date-chip">{{ t('short_dby') }}</span>
              <span @click="setDate(-1)" class="date-chip">{{ t('short_yest') }}</span>
              <span @click="setDate(0)" class="date-chip">{{ t('short_today') }}</span>
            </div>
          </div>
          <input v-model="localForm.date" type="date" :lang="currentLocale" required />
        </div>
        <div class="input-group">
          <div class="category-label-row">
            <label>{{ localForm.type === 'transfer' ? t('from_account') : t('account') }}</label>
            <button type="button" @click="$emit('manage-payment-methods')" class="btn-sm">⚙️</button>
          </div>
          <select v-model="localForm.payment_method">
            <option v-for="pm in paymentMethods" :key="pm.name" :value="pm.name">
              {{ pm.icon }} {{ t(pm.name.toLowerCase().replace(' ', '_')) || pm.name }}
            </option>
          </select>
        </div>
      </div>
      
      <div class="form-row two-col">
        <div class="input-group">
          <label>{{ t('item_desc') }}</label>
          <input v-model="localForm.title" placeholder="..." required />
        </div>
        <div class="input-group">
          <label>{{ t('amount') }}</label>
          <div class="amount-wrapper">
            <select v-model="localForm.currency">
              <option v-for="c in currencyOptions" :key="c.code" :value="c.code">
                {{ c.code }} {{ c.name }}
              </option>
            </select>
            <button type="button" @click="setDefaultCurrency" class="btn-icon-sm" title="設為預設">⭐</button>
            <input v-if="localForm.currency === 'TWD'" v-model="localForm.amount" type="number" placeholder="NT$" required />
            <input v-else v-model="localForm.foreign_amount" type="number" :placeholder="localForm.currency" required />
          </div>
        </div>
      </div>

      <div class="form-row two-col" v-if="localForm.currency !== 'TWD'">
        <div class="input-group">
          <div class="date-label-row">
            <label>{{ t('rate') }} (1 {{ localForm.currency }} ≈ ? TWD)</label>
            <span v-if="rateUpdatedAt" style="font-size:0.65rem; color:#888;">{{ rateUpdatedAt }}</span>
          </div>
          <input v-model="localForm.exchange_rate" type="number" step="0.0001" placeholder="匯率" />
        </div>
        <div class="input-group">
          <label>{{ t('to_twd') }}</label>
          <input :value="Math.round(localForm.foreign_amount * localForm.exchange_rate) || 0" disabled style="background:#f0f0f0;" />
        </div>
      </div>
      
      <div class="form-row one-col" v-if="localForm.type !== 'transfer'">
        <div class="input-group">
          <div class="category-label-row">
            <label>{{ t('category') }}</label>
            <button type="button" @click="$emit('manage-categories')" class="btn-sm">⚙️ {{ t('manage') }}</button>
          </div>
          <select v-model="localForm.category">
            <option v-for="cat in availableCategories" :key="cat.name" :value="cat.name">
              {{ cat.icon }} {{ t_category(cat.name) }}
            </option>
          </select>
        </div>
      </div>
      
      <div class="form-row" v-if="localForm.type === 'transfer'">
        <div class="input-group flex-full">
          <label>{{ t('to_account') }}</label>
          <select v-model="localForm.target_account" required>
            <option value="" disabled>-</option>
            <option v-for="pm in paymentMethods" :key="pm.name" :value="pm.name">
              {{ pm.icon }} {{ t(pm.name.toLowerCase().replace(' ', '_')) || pm.name }}
            </option>
          </select>
        </div>
      </div>
      
      <div class="form-row one-col">
        <div class="input-group">
          <label>📝 {{ t('note') }}</label>
          <textarea v-model="localForm.note" placeholder="..." rows="2" class="note-textarea"></textarea>
        </div>
      </div>
      
      <button type="button" @click="handleSubmit" class="btn-submit" :class="{ 'btn-update': isEditing }">
        {{ isEditing ? (localForm.type === 'expense' ? '💸 ' : (localForm.type === 'income' ? '💰 ' : '🔄 ')) + t('update') : (localForm.type === 'expense' ? '💸 ' : (localForm.type === 'income' ? '💰 ' : '🔄 ')) + t('submit') }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.card { 
  background: white; 
  border-radius: 12px; 
  padding: 20px 24px; 
  box-shadow: 0 2px 8px rgba(0,0,0,0.05); 
  border: 1px solid #e0e0e0; 
  margin-bottom: 15px; 
}
.form-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.form-header h3 { font-size: 1rem; margin: 0; }
.form-body { display: flex; flex-direction: column; gap: 16px; }

/* Grid layout for consistent alignment */
.form-row { 
  display: grid; 
  grid-template-columns: repeat(3, 1fr); 
  gap: 16px; 
}
.form-row.two-col { grid-template-columns: repeat(2, 1fr); }
.form-row.one-col { grid-template-columns: 1fr; }

.input-group { display: flex; flex-direction: column; }
.input-group.span-2 { grid-column: span 2; }
.input-group.span-3 { grid-column: span 3; }
.input-group label { font-size: 0.8rem; color: #555; font-weight: 600; margin-bottom: 6px; }

input, select { 
  padding: 10px 12px; 
  border: 2px solid #e0e0e0; 
  border-radius: 8px; 
  font-size: 0.95rem; 
  width: 100%; 
  box-sizing: border-box;
  transition: border-color 0.2s, box-shadow 0.2s;
}
input:focus, select:focus { border-color: #667eea; outline: none; box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1); }

/* Amount row with currency */
.amount-wrapper { display: flex; gap: 6px; align-items: center; }
.amount-wrapper select { width: auto; min-width: 100px; flex-shrink: 0; }
.amount-wrapper input { flex: 1; min-width: 60px; }
.amount-wrapper .btn-icon-sm { flex-shrink: 0; }

.btn-submit { 
  background: linear-gradient(135deg, #34495e 0%, #2c3e50 100%); 
  color: white; 
  border: none; 
  padding: 12px; 
  border-radius: 8px; 
  font-weight: bold; 
  cursor: pointer; 
  width: 100%; 
  margin-top: 8px; 
  font-size: 0.95rem; 
  transition: all 0.3s;
}
.btn-submit:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(0,0,0,0.15); }
.btn-update { background: linear-gradient(135deg, #f39c12 0%, #e67e22 100%); }
.btn-sm { background: #e0e0e0; padding: 4px 10px; border: none; border-radius: 4px; cursor: pointer; font-size: 0.8rem; }
.btn-icon-sm { background: transparent; border: none; font-size: 0.9rem; cursor: pointer; padding: 4px; }

.note-textarea { 
  width: 100%; 
  padding: 10px; 
  border: 2px solid #e0e0e0; 
  border-radius: 8px; 
  font-family: inherit; 
  resize: vertical; 
  min-height: 50px; 
  font-size: 0.9rem; 
  box-sizing: border-box;
}
.note-textarea:focus { border-color: #667eea; outline: none; }

.date-label-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
.date-label-row label { margin-bottom: 0; }
.date-shortcuts { display: flex; gap: 4px; }
.date-chip { 
  font-size: 0.65rem; 
  padding: 2px 6px; 
  background: #f0f0f0; 
  border-radius: 10px; 
  cursor: pointer; 
  color: #555; 
  transition: all 0.2s; 
}
.date-chip:hover { background: #667eea; color: white; }

.category-label-row { 
  display: flex; 
  justify-content: space-between; 
  align-items: center; 
  margin-bottom: 4px;
  min-height: 29px; /* Force consistent height for alignment */
}
.category-label-row label { margin: 0; }

@media (max-width: 600px) {
  .form-row { grid-template-columns: 1fr !important; }
  .input-group.span-2, .input-group.span-3 { grid-column: span 1; }
}

:global(.dark) .card { background: #16213e; border-color: #2d3748; }
:global(.dark) .card h3 { color: #e0e0e0; }
:global(.dark) input, :global(.dark) select { background: #2d3748; color: #e0e0e0; border-color: #4a5568; }
:global(.dark) .date-chip { background: #2d3748; color: #a0a0a0; }
:global(.dark) .date-chip:hover { background: #4a5568; color: white; }
</style>
