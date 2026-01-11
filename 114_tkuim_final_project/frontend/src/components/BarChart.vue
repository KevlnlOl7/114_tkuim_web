<script setup>
import { computed } from 'vue'
import { Bar } from 'vue-chartjs'
import { Chart as ChartJS, Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale } from 'chart.js'

// 註冊 Chart.js 元件
ChartJS.register(Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale)

const props = defineProps(['trendData', 'expenseLabel', 'incomeLabel'])

const chartData = computed(() => {
  return {
    labels: props.trendData.dates || [],
    datasets: [
      {
        label: props.expenseLabel || '支出',
        backgroundColor: '#ff7675',
        data: props.trendData.expenses || []
      },
      {
        label: props.incomeLabel || '收入',
        backgroundColor: '#2ecc71',
        data: props.trendData.incomes || []
      }
    ]
  }
})

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  scales: {
    y: { beginAtZero: true }
  }
}
</script>

<template>
  <div class="chart-container">
    <div class="canvas-wrapper">
      <Bar v-if="trendData.dates && trendData.dates.length > 0" :data="chartData" :options="chartOptions" />
      <p v-else class="no-data">...</p>
    </div>
  </div>
</template>

<style scoped>
.chart-container { position: relative; height: 300px; width: 100%; }
.canvas-wrapper { height: 100%; width: 100%; position: relative; }
.no-data { color: #aaa; text-align: center; line-height: 300px; }
</style>