<script setup>
import { ref, computed } from 'vue'
import axios from 'axios'
import { t } from '../i18n.js'

const props = defineProps(['show', 'categories', 'currentUser'])
const emit = defineEmits(['close', 'updated'])

const activeTab = ref('expense')
const newCat = ref({ name: '', icon: '🌟', color: '#3498db' })
const predefinedIcons = [
  // Food
  "🍔", "🍟", "🍕", "🌭", "🥪", "🌮", "🌯", "🥙", "🥚", "🍳", "🥘", "🍲", "🥣", "🥗", "🍿", "🧂", "🥫", "🍱", "🍘", "🍙", "🍚", "🍛", "🍜", "🍝", "🍠", "🍢", "🍣", "🍤", "🍥", "🥮", "🍡", "🥟", "🥠", "🥡", "🍦", "🍧", "🍨", "🍩", "🍪", "🎂", "🍰", "🧁", "🥧", "🍫", "🍬", "🍭", "🍮", "🍯", "🍼", "🥛", "☕", "🫖", "🍵", "🍶", "🍾", "🍷", "🍸", "🍹", "🍺", "🍻", "🥂", "🥃", "🥤", "🧃", "🧉", "🧊",
  // Shopping / Gifts
  "🛒", "🛍️", "🎁", "🎈", "🧧", "💎", "💍", "💄", "👓", "🕶", "🎒", "👠", "👟", "👗", "👕", "👖", "🧢", 
  // Transport
  "🚗", "🚕", "🚙", "🚌", "🚎", "🏎", "🚓", "🚑", "🚒", "🚐", "🛻", "🚚", "🚛", "🚜", "🏍", "🛵", "🚲", "🛴", "🚨", "🚔", "🚍", "🚘", "🚖", "🚃", "🚋", "🚄", "🚅", "🚈", "🚂", "🚆", "🚇", "🚊", "🚉", "🚁", "🛩", "✈", "🛫", "🛬", "🚀", "🚢", "⛽", "🚧", "🚦",
  // Housing / Daily
  "🏠", "🏡", "🏢", "🏬", "🏣", "🏤", "🏥", "🏦", "🏨", "🏪", "🏫", "🏩", "🐶", "🐱", "🐭", "🐹", "🐰", "🦊", "🐻", "🐼", "🐨", "🐯", "🦁", "🐮", "🐷", "🐸", "🐔", "🐧", "🐦", "🐤", "🦆", "🦅", "🦉", "🦇", "🐺", "🐗", "🐴", "🦄",
  // Entertainment
  "⚽", "🏀", "🏈", "⚾", "🥎", "🎾", "🏐", "🏉", "🎱", "🥏", "🏓", "🏸", "🏒", "⛸", "🎮", "🕹", "🎰", "🎲", "🧩", "🧸", "♠", "♥", "♦", "♣", "♟", "🃏", "🀄", "🎴", "🎭", "🖼", "🎨", "🧵", "🧶", "🎼", "🎤", "🎧", "🎷", "🎸", "🎹", "🎺", "🎻", "🥁", "🎬", "🏹",
  // Medical / Health
  "💊", "💉", "🩸", "🩹", "🩺", "🌡", "🦠", "🦷", "🦴", "🧘‍♀️", "🏊‍♀️", "🏋️‍♀️", 
  // Work / Education
  "💼", "📁", "📂", "🗂", "📅", "📆", "🗒", "📉", "📈", "📊", "📋", "📌", "📍", "📎", "📏", "📐", "✂", "📚", "🖊️", "💻", "🖥", "🖨", "🖱", "📱",
  // Money
  "💰", "💴", "💵", "💶", "💷", "💸", "💳", "🧾", "💹", "💲", "🤑"
]

const filteredCategories = computed(() => {
  return props.categories.filter(c => c.type === activeTab.value)
})

const addCategory = async () => {
  if (!newCat.value.name) return alert(t('input_name_hint'))
  
  try {
    await axios.post('http://127.0.0.1:8000/api/categories', {
      ...newCat.value,
      type: activeTab.value,
      user_id: props.currentUser ? props.currentUser.id : null
    })
    emit('updated')
    newCat.value.name = '' // Reset name
    // Keep icon/color or reset?
  } catch (err) {
    alert(t('add_failed'))
  }
}

const deleteCategory = async (id) => {
  if (!confirm(t('delete_confirm_cat'))) return
  try {
    await axios.delete(`http://127.0.0.1:8000/api/categories/${id}`)
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
        <h3>⚙️ {{ t('category_mgmt') }}</h3>
        <button @click="$emit('close')" class="btn-close">×</button>
      </div>

      <div class="tabs">
        <button 
          :class="{ active: activeTab === 'expense' }" 
          @click="activeTab = 'expense'"
        >{{ t('expense') }}</button>
        <button 
          :class="{ active: activeTab === 'income' }" 
          @click="activeTab = 'income'"
        >{{ t('income') }}</button>
      </div>

      <!-- List -->
      <div class="category-list">
        <div v-for="cat in filteredCategories" :key="cat.id || cat.name" class="cat-item">
          <div class="cat-info">
            <span class="cat-icon" :style="{ backgroundColor: cat.color + '33' }">{{ cat.icon }}</span>
            <span class="cat-name">{{ cat.name }}</span>
            <span v-if="cat.is_default" class="badge">{{ t('default') }}</span>
          </div>
          <button @click="deleteCategory(cat.id)" class="btn-del">🗑️</button>
        </div>
      </div>

      <!-- Add Form -->
      <div class="add-form">
        <h4>{{ t('add_category') }}</h4>
        <div class="form-row">
          <div class="icon-selector">
            <span class="current-icon">{{ newCat.icon }}</span>
            <div class="icon-grid">
              <span v-for="icon in predefinedIcons" :key="icon" @click="newCat.icon = icon">{{ icon }}</span>
            </div>
          </div>
          <div class="inputs">
            <input v-model="newCat.name" :placeholder="t('category_name_ph')" maxlength="10" />
            <div class="color-picker-row">
              <label>{{ t('color') }}</label>
              <input v-model="newCat.color" type="color" />
            </div>
            <button @click="addCategory" class="btn-add">{{ t('submit') }}</button>
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
  background: white; width: 90%; max-width: 500px;
  padding: 20px; border-radius: 12px;
  max-height: 85vh; display: flex; flex-direction: column;
}
.modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
.btn-close { background: none; border: none; font-size: 1.5rem; cursor: pointer; }

.tabs { display: flex; gap: 10px; margin-bottom: 15px; border-bottom: 2px solid #eee; padding-bottom: 10px; }
.tabs button {
  background: none; border: none; padding: 5px 10px;
  font-size: 1rem; cursor: pointer; color: #888;
  font-weight: bold;
}
.tabs button.active { color: #667eea; border-bottom: 2px solid #667eea; margin-bottom: -12px; }

.category-list { flex: 1; overflow-y: auto; margin-bottom: 20px; border: 1px solid #eee; border-radius: 8px; padding: 10px; }
.cat-item { display: flex; justify-content: space-between; align-items: center; padding: 8px; border-bottom: 1px solid #f9f9f9; }
.cat-info { display: flex; align-items: center; gap: 10px; }
.cat-icon { width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; border-radius: 50%; }
.badge { font-size: 0.7rem; background: #eee; padding: 2px 6px; border-radius: 4px; color: #666; }
.btn-del { background: none; border: none; cursor: pointer; opacity: 0.5; }
.btn-del:hover { opacity: 1; }

.add-form { background: #f8f9fa; padding: 15px; border-radius: 8px; }
.form-row { display: flex; gap: 15px; }
.icon-selector { display: flex; flex-direction: column; gap: 5px; width: 120px; }
.current-icon { font-size: 2rem; text-align: center; display: block; margin-bottom: 5px; }
.icon-grid { display: flex; flex-wrap: wrap; gap: 4px; max-height: 100px; overflow-y: auto; background: white; padding: 5px; border-radius: 4px; border: 1px solid #ddd; }
.icon-grid span { cursor: pointer; padding: 2px; font-size: 1.2rem; }
.icon-grid span:hover { background: #eee; border-radius: 4px; }
.inputs { flex: 1; display: flex; flex-direction: column; gap: 10px; }
.inputs input[type="text"] { padding: 8px; border: 1px solid #ddd; border-radius: 4px; }
.color-picker-row { display: flex; align-items: center; gap: 10px; font-size: 0.85rem; }
.btn-add { background: #667eea; color: white; border: none; padding: 8px; border-radius: 4px; cursor: pointer; font-weight: bold; }
.btn-add:hover { background: #5a67d8; }

/* Dark Mode */
:global(.dark) .modal-content { background: #16213e; color: #e0e0e0; }
:global(.dark) .add-form { background: #1a1a2e; }
:global(.dark) .icon-grid { background: #2d3748; border-color: #4a5568; }
:global(.dark) .cat-item { border-bottom-color: #2d3748; }
:global(.dark) .badge { background: #2d3748; color: #a0a0a0; }
:global(.dark) .inputs input { background: #2d3748; border-color: #4a5568; color: #fff; }
</style>
