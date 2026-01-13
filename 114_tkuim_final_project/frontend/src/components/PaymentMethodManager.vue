<script setup>
import { ref } from 'vue'
import axios from 'axios'
import { t } from '../i18n.js'

const props = defineProps(['show', 'paymentMethods', 'currentUser'])
const emit = defineEmits(['close', 'updated'])

const newMethod = ref({ name: '', icon: '💳' })
const predefinedIcons = [
  "💵", "💴", "💶", "💷", "💳", "💰", "🏦", "🏧", "💸", "🪙",
  "📱", "💻", "⌚", "📲", "🔗", "🎫", "🎟️", "🧾", "📋", "✅"
]

const addMethod = async () => {
  if (!newMethod.value.name) return alert(t('input_name_hint'))
  
  try {
    await axios.post('/api/payment-methods', {
      ...newMethod.value,
      user_id: props.currentUser ? props.currentUser.id : null
    })
    emit('updated')
    newMethod.value.name = ''
  } catch (err) {
    alert(t('add_failed'))
  }
}

const deleteMethod = async (id) => {
  if (!confirm(t('delete_confirm_method'))) return
  try {
    await axios.delete(`/api/payment-methods/${id}`)
    emit('updated')
  } catch (err) {
    alert(t('delete_failed'))
  }
}
</script>

<template>
  <div v-if="show" class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-content">
      <div class="modal-header">
        <h3>💳 {{ t('payment_method_mgmt') }}</h3>
        <button @click="$emit('close')" class="btn-close">×</button>
      </div>

      <!-- List -->
      <div class="method-list">
        <div v-for="method in paymentMethods" :key="method.id || method.name" class="method-item">
          <div class="method-info">
            <span class="method-icon">{{ method.icon || '💳' }}</span>
            <span class="method-name">{{ method.name }}</span>
            <span v-if="method.is_default" class="badge">{{ t('default') }}</span>
          </div>
          <button v-if="!method.is_default" @click="deleteMethod(method.id)" class="btn-del">🗑️</button>
        </div>
      </div>

      <!-- Add Form -->
      <div class="add-form">
        <h4>{{ t('add_payment_method') }}</h4>
        <div class="form-row">
          <div class="icon-selector">
            <span class="current-icon">{{ newMethod.icon }}</span>
            <div class="icon-grid">
              <span v-for="icon in predefinedIcons" :key="icon" @click="newMethod.icon = icon">{{ icon }}</span>
            </div>
          </div>
          <div class="inputs">
            <input v-model="newMethod.name" :placeholder="t('method_name_ph')" maxlength="15" />
            <button @click="addMethod" class="btn-add">{{ t('submit') }}</button>
          </div>
        </div>
      </div>

    </div>
  </div>
</template>

<style scoped>
.modal-overlay {
  position: fixed; top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.5);
  display: flex; justify-content: center; align-items: center;
  z-index: 1000;
  backdrop-filter: blur(5px);
}
.modal-content {
  background: white; width: 90%; max-width: 450px;
  padding: 20px; border-radius: 12px;
  max-height: 80vh; display: flex; flex-direction: column;
}
.modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
.btn-close { background: none; border: none; font-size: 1.5rem; cursor: pointer; }

.method-list { flex: 1; overflow-y: auto; margin-bottom: 20px; border: 1px solid #eee; border-radius: 8px; padding: 10px; }
.method-item { display: flex; justify-content: space-between; align-items: center; padding: 10px; border-bottom: 1px solid #f0f0f0; }
.method-item:last-child { border-bottom: none; }
.method-info { display: flex; align-items: center; gap: 10px; }
.method-icon { font-size: 1.5rem; }
.method-name { font-weight: 500; }
.badge { font-size: 0.7rem; background: #e0e0e0; padding: 2px 6px; border-radius: 4px; color: #666; }
.btn-del { background: none; border: none; cursor: pointer; opacity: 0.5; font-size: 1rem; }
.btn-del:hover { opacity: 1; }

.add-form { background: #f8f9fa; padding: 15px; border-radius: 8px; }
.add-form h4 { margin: 0 0 12px 0; font-size: 0.95rem; color: #555; }
.form-row { display: flex; gap: 15px; }
.icon-selector { display: flex; flex-direction: column; gap: 5px; width: 100px; }
.current-icon { font-size: 2rem; text-align: center; display: block; margin-bottom: 5px; }
.icon-grid { display: flex; flex-wrap: wrap; gap: 4px; max-height: 80px; overflow-y: auto; background: white; padding: 5px; border-radius: 4px; border: 1px solid #ddd; }
.icon-grid span { cursor: pointer; padding: 2px; font-size: 1.1rem; }
.icon-grid span:hover { background: #eee; border-radius: 4px; }
.inputs { flex: 1; display: flex; flex-direction: column; gap: 10px; }
.inputs input { padding: 10px; border: 1px solid #ddd; border-radius: 6px; font-size: 0.95rem; }
.btn-add { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; padding: 10px; border-radius: 6px; cursor: pointer; font-weight: bold; }
.btn-add:hover { opacity: 0.9; }

/* Dark Mode */
:global(.dark) .modal-content { background: #16213e; color: #e0e0e0; }
:global(.dark) .add-form { background: #1a1a2e; }
:global(.dark) .icon-grid { background: #2d3748; border-color: #4a5568; }
:global(.dark) .method-item { border-bottom-color: #2d3748; }
:global(.dark) .badge { background: #2d3748; color: #a0a0a0; }
:global(.dark) .inputs input { background: #2d3748; border-color: #4a5568; color: #fff; }
:global(.dark) .method-list { border-color: #2d3748; }
</style>
