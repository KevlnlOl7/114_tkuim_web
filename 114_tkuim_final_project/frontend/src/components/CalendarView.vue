<script setup>
import { ref, computed } from 'vue'

const props = defineProps(['trendData'])
const emit = defineEmits(['date-selected'])

const currentDate = ref(new Date())

const currentYear = computed(() => currentDate.value.getFullYear())
const currentMonth = computed(() => currentDate.value.getMonth())

const monthNames = ["一月", "二月", "三月", "四月", "五月", "六月", "七月", "八月", "九月", "十月", "十一月", "十二月"]

const daysInMonth = computed(() => new Date(currentYear.value, currentMonth.value + 1, 0).getDate())
const firstDayOfWeek = computed(() => new Date(currentYear.value, currentMonth.value, 1).getDay())

// Transform trendData to map
const dailyDataMap = computed(() => {
  const map = {}
  if (!props.trendData || !props.trendData.dates) return map
  
  props.trendData.dates.forEach((date, index) => {
    map[date] = {
      expense: props.trendData.expenses[index] || 0,
      income: props.trendData.incomes[index] || 0
    }
  })
  return map
})

const calendarDays = computed(() => {
  const days = []
  // Empty slots
  for (let i = 0; i < firstDayOfWeek.value; i++) {
    days.push({ day: '', date: '', empty: true })
  }
  // Days
  for (let i = 1; i <= daysInMonth.value; i++) {
    const dateStr = `${currentYear.value}-${String(currentMonth.value + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`
    
    const data = dailyDataMap.value[dateStr]
    const hasData = !!data
    const totalExpense = data ? data.expense : 0

    days.push({ 
      day: i, 
      date: dateStr, 
      empty: false,
      hasData,
      totalExpense
    })
  }
  return days
})

const prevMonth = () => {
  currentDate.value = new Date(currentYear.value, currentMonth.value - 1, 1)
}

const nextMonth = () => {
  currentDate.value = new Date(currentYear.value, currentMonth.value + 1, 1)
}

const selectDate = (date) => {
  if (date) emit('date-selected', date)
}
</script>

<template>
  <div class="calendar-container">
    <div class="calendar-header">
      <button @click="prevMonth" class="btn-nav">&lt;</button>
      <h3>{{ currentYear }}年 {{ monthNames[currentMonth] }}</h3>
      <button @click="nextMonth" class="btn-nav">&gt;</button>
    </div>
    
    <div class="calendar-grid">
      <div class="weekday">日</div>
      <div class="weekday">一</div>
      <div class="weekday">二</div>
      <div class="weekday">三</div>
      <div class="weekday">四</div>
      <div class="weekday">五</div>
      <div class="weekday">六</div>
      
      <div 
        v-for="(item, index) in calendarDays" 
        :key="index"
        class="day-cell"
        :class="{ 'empty': item.empty, 'has-data': item.hasData }"
        @click="!item.empty && selectDate(item.date)"
      >
        <span v-if="!item.empty" class="day-num">{{ item.day }}</span>
        <div v-if="!item.empty && item.hasData" class="day-dots">
          <span class="dot"></span>
          <span v-if="item.totalExpense > 0" class="expense-tag">-${{ item.totalExpense }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.calendar-container {
  background: white;
  border-radius: 12px;
  padding: 15px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  margin-bottom: 20px;
}

.calendar-header {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 20px;
  margin-bottom: 15px;
}

.calendar-header h3 {
  margin: 0;
  font-size: 1.1rem;
  color: #2d3436;
}

.btn-nav {
  background: #f1f2f6;
  border: none;
  width: 36px;
  height: 36px;
  min-width: 36px; /* Prevent shrinking/squashing */
  border-radius: 50%;
  cursor: pointer;
  font-weight: bold;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
  padding: 0; /* Removing padding is crucial */
  line-height: 1;
  transition: all 0.2s;
}
.btn-nav:hover { background: #dce1e6; }

.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 5px;
}

.weekday {
  text-align: center;
  font-size: 0.85rem;
  color: #636e72;
  padding: 5px 0;
  font-weight: bold;
}

.day-cell {
  aspect-ratio: 1;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 5px;
  cursor: pointer;
  transition: all 0.2s;
  background: #fafafa;
  position: relative;
  border: 1px solid transparent;
}

.day-cell:hover:not(.empty) {
  background: #eef2f7;
  border-color: #667eea;
}

.day-cell.empty {
  background: transparent;
  cursor: default;
}

.day-num {
  font-size: 0.9rem;
  font-weight: bold;
  color: #2d3436;
}

.day-dots {
  display: flex;
  flex-direction: column;
  align-items: center;
  font-size: 0.6rem;
  margin-top: 2px;
}

.dot {
  width: 4px;
  height: 4px;
  background: #667eea;
  border-radius: 50%;
  margin-bottom: 2px;
}

.expense-tag {
  color: #e74c3c;
  font-weight: bold;
  font-size: 0.65rem;
}

/* Dark Mode */
:global(.dark) .calendar-container { background: #16213e; }
:global(.dark) .calendar-header h3 { color: #e0e0e0; }
:global(.dark) .weekday { color: #a0a0a0; }
:global(.dark) .day-cell { background: #0f3460; }
:global(.dark) .day-num { color: #e0e0e0; }
:global(.dark) .day-cell:hover:not(.empty) { background: #1a1a2e; border-color: #667eea; }
:global(.dark) .btn-nav { background: #2d3748; color: white; }
</style>
