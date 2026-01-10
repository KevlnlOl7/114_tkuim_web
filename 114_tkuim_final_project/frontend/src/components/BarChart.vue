<script setup>
import { computed } from 'vue'
import { Bar } from 'vue-chartjs'
import { Chart as ChartJS, Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale } from 'chart.js'

// 註冊 Chart.js 元件
ChartJS.register(Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale)

const props = defineProps(['trendData'])

const chartData = computed(() => {
  return {
    labels: props.trendData.dates || [],
    datasets: [
      {
        label: '支出',
        backgroundColor: '#ff7675',
        data: props.trendData.expenses || []
      },
      {
        label: '收入',
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
    <h3>📊 收支趨勢圖</h3>
    <div class="canvas-wrapper">
      <Bar v-if="props.trendData.dates && props.trendData.dates.length > 0" :data="chartData" :options="chartOptions" />
      <p v-else class="no-data">還沒有足夠的資料顯示趨勢</p>
    </div>
  </div>
</template>

<style scoped>
.chart-container { height: 100%; text-align: center; display: flex; flex-direction: column; }
.canvas-wrapper { flex: 1; min-height: 200px; position: relative; }
.no-data { color: #aaa; margin-top: 50px; }
h3 { margin-bottom: 10px; font-size: 1rem; color: #555; }
</style>