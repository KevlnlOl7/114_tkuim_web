<script setup>
import { computed } from 'vue'
import { Pie } from 'vue-chartjs' // 引入圓餅圖
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js'

// 註冊 Chart.js 的元件
ChartJS.register(ArcElement, Tooltip, Legend)

// 接收父層傳來的 stats 資料
const props = defineProps(['stats'])

// 把資料轉成 Chart.js 看得懂的格式
const chartData = computed(() => {
  return {
    labels: Object.keys(props.stats), // 例如 ['Food', 'Transport']
    datasets: [
      {
        backgroundColor: ['#E74C3C', '#F1C40F', '#3498DB', '#9B59B6'], // 顏色
        data: Object.values(props.stats) // 例如 [500, 1200]
      }
    ]
  }
})

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false
}
</script>

<template>
  <div class="chart-container">
    <h3>支出類別分析</h3>
    <Pie v-if="Object.keys(stats).length > 0" :data="chartData" :options="chartOptions" />
    <p v-else>還沒有支出資料喔！</p>
  </div>
</template>

<style scoped>
.chart-container {
  height: 300px; /* 圖表高度 */
  background: white;
  padding: 20px;
  border-radius: 8px;
  margin-bottom: 20px;
  text-align: center;
}
</style>