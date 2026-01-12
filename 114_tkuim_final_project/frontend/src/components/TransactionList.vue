<script setup>
import { t, t_category, currentLocale } from '../i18n.js'

const props = defineProps({
  transactions: { type: Array, required: true },
  keyword: { type: String, default: '' },
  startDate: { type: String, default: '' },
  endDate: { type: String, default: '' },
  showCalendar: { type: Boolean, default: false }
})

const emit = defineEmits([
  'edit', 
  'delete', 
  'duplicate',
  'update:keyword',
  'update:startDate', 
  'update:endDate',
  'update:showCalendar',
  'date-selected'
])

const formatDateBadge = (dateStr) => {
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return ''
  return date.toLocaleString(currentLocale.value, { month: 'short' })
}
</script>

<template>
  <div class="list-section">
    <div class="filter-bar">
      <button 
        @click="$emit('update:showCalendar', !showCalendar)" 
        class="btn-icon calendar-btn" 
        :class="{ active: showCalendar }"
      >📅</button>
      <div class="search-box">
        <input 
          :value="keyword" 
          @input="$emit('update:keyword', $event.target.value)" 
          type="text" 
          :placeholder="t('keyword_search')" 
        />
      </div>
      <div class="date-range">
        <input 
          :value="startDate" 
          @input="$emit('update:startDate', $event.target.value)" 
          type="date" 
          :lang="currentLocale" 
        />
        <span>{{ t('to_date') }}</span>
        <input 
          :value="endDate" 
          @input="$emit('update:endDate', $event.target.value)" 
          type="date" 
          :lang="currentLocale" 
        />
      </div>
    </div>
    
    <slot name="calendar"></slot>

    <div v-if="transactions.length === 0" class="empty-state">{{ t('no_data') }}</div>
    <div v-else class="transaction-list">
      <div v-for="item in transactions" :key="item.id" class="list-item">
        <div class="item-left">
          <div class="date-badge">
            <span class="day">{{ item.date.split('-')[2] }}</span>
            <span class="month">{{ formatDateBadge(item.date) }}</span>
          </div>
          <div class="item-info">
            <div class="item-title">{{ item.title }}</div>
            <div class="tags">
              <span class="tag type-tag" :class="item.type">
                {{ item.type === 'transfer' ? t('transfer') : t_category(item.category) }}
              </span>
              <span class="tag method">{{ t(item.payment_method.toLowerCase()) || item.payment_method }}</span>
              <span v-if="item.user_display_name" class="tag owner">👤 {{ item.user_display_name }}</span>
            </div>
            <div v-if="item.note" class="item-note">📝 {{ item.note }}</div>
          </div>
        </div>
        <div class="item-right">
          <span class="amount" :class="item.type" style="display:flex; flex-direction:column; align-items:flex-end;">
            <span v-if="item.currency && item.currency !== 'TWD'" style="font-size: 0.75rem; color: #888;">
              {{ item.currency }} {{ item.foreign_amount }}
            </span>
            <span>{{ item.type === 'expense' ? '-' : (item.type === 'income' ? '+' : '') }} ${{ item.amount }}</span>
          </span>
          <div class="actions">
            <button @click="$emit('duplicate', item)" class="btn-icon copy" title="複製">📋</button>
            <button @click="$emit('edit', item)" class="btn-icon">✎</button> 
            <button @click="$emit('delete', item.id)" class="btn-icon del">🗑️</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.list-section { margin-top: 15px; }
.filter-bar { display: flex; gap: 8px; margin-bottom: 12px; flex-wrap: wrap; align-items: center; }
.calendar-btn { background: white; border: 2px solid #ddd; width: 36px; height: 36px; min-width: 36px; border-radius: 8px; font-size: 1rem; display: flex; align-items: center; justify-content: center; transition: all 0.3s; cursor: pointer; }
.calendar-btn.active { background: #667eea; color: white; border-color: #667eea; }
.search-box { flex: 1; min-width: 150px; }
.search-box input { width: 100%; padding: 8px; border: 2px solid #ddd; border-radius: 6px; font-size: 0.9rem; }
.date-range { display: flex; align-items: center; gap: 3px; background: white; padding: 4px 6px; border-radius: 6px; border: 2px solid #ddd; flex-shrink: 0; }
.date-range input { border: none; padding: 4px; width: 110px; font-size: 0.8rem; }
.date-range span { font-size: 0.75rem; color: #666; }
.empty-state { text-align: center; padding: 40px; color: #999; }
.transaction-list { display: flex; flex-direction: column; gap: 10px; }
.list-item { display: flex; justify-content: space-between; align-items: center; background: white; padding: 15px; border-radius: 8px; border-left: 4px solid #34495e; box-shadow: 0 2px 4px rgba(0,0,0,0.05); }
.item-left { display: flex; align-items: center; gap: 15px; }
.date-badge { text-align: center; background: #eee; padding: 5px 10px; border-radius: 6px; min-width: 50px; }
.date-badge .day { display: block; font-size: 1.1rem; font-weight: bold; }
.date-badge .month { font-size: 0.75rem; color: #666; }
.item-title { font-weight: bold; font-size: 1.1rem; color: #2c3e50; }
.tags { display: flex; gap: 5px; margin-top: 4px; }
.tag { font-size: 0.75rem; padding: 2px 6px; border-radius: 4px; background: #e0e0e0; color: #555; }
.tag.method { background: #dff9fb; color: #22a6b3; }
.tag.owner { background: #e8daef; color: #8e44ad; }
.type-tag.transfer { background: #dfe6e9; color: #2d3436; font-weight: bold; }
.item-note { font-size: 0.8rem; color: #636e72; margin-top: 5px; font-style: italic; }
.item-right { display: flex; flex-direction: column; align-items: flex-end; gap: 8px; }
.amount { font-weight: bold; font-size: 1.2rem; }
.amount.expense { color: #c0392b; }
.amount.income { color: #27ae60; }
.amount.transfer { color: #7f8c8d; }
.actions { display: flex; gap: 5px; }
.btn-icon { background: transparent; border: 1px solid #ddd; width: 30px; height: 30px; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center; }
.btn-icon.del { color: red; border-color: #ffcccc; }
.btn-icon.copy { color: #3498db; border-color: #d6eaf8; }

@media (max-width: 600px) {
  .filter-bar { flex-direction: column; }
}

:global(.dark) .list-item { background: #16213e; border-color: #2d3748; }
:global(.dark) .item-title { color: #e0e0e0; }
:global(.dark) .date-badge { background: #2d3748; }
:global(.dark) .date-badge .day { color: #e0e0e0; }
:global(.dark) .btn-icon { border-color: #4a5568; color: #a0a0a0; }
:global(.dark) .search-box input { background: #2d3748; color: #e0e0e0; border-color: #4a5568; }
:global(.dark) .date-range { background: #2d3748; border-color: #4a5568; }
:global(.dark) .date-range input { background: #2d3748; color: #e0e0e0; }
</style>
