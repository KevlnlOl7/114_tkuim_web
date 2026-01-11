<script setup>
import { computed } from 'vue'
import { Pie } from 'vue-chartjs'
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js'

ChartJS.register(ArcElement, Tooltip, Legend)

const props = defineProps(['stats', 'categories'])

const defaultColors = ['#1ABC9C', '#E67E22', '#34495E', '#16A085', '#27AE60', '#2980B9', '#8E44AD', '#C0392B']

const chartData = computed(() => {
  const labels = Object.keys(props.stats)
  const colors = labels.map((label, index) => {
    // Try to find color in categories prop
    if (props.categories) {
        const cat = props.categories.find(c => c.name === label)
        if (cat) return cat.color
    }
    // Fallback
    return defaultColors[index % defaultColors.length]
  })
  
  return {
    labels,
    datasets: [
      {
        backgroundColor: colors,
        data: Object.values(props.stats),
        borderWidth: 2,
        borderColor: '#fff'
      }
    ]
  }
})

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'bottom',
      labels: {
        padding: 15,
        usePointStyle: true,
        font: { size: 12 }
      }
    },
    tooltip: {
      callbacks: {
        label: function(context) {
          const value = context.raw
          const total = context.dataset.data.reduce((a, b) => a + b, 0)
          const percentage = ((value / total) * 100).toFixed(1)
          return `$${value} (${percentage}%)`
        }
      }
    }
  }
}
</script>

<template>
  <div class="chart-container">
    <h3>📊 支出類別分析</h3>
    <div v-if="Object.keys(stats).length > 0" class="chart-wrapper">
      <Pie :data="chartData" :options="chartOptions" />
    </div>
    <p v-else class="empty-chart">還沒有支出資料喔！</p>
  </div>
</template>

<style scoped>
.chart-container {
  background: white;
  padding: 20px;
  border-radius: 12px;
  text-align: center;
}

.chart-container h3 {
  margin: 0 0 15px 0;
  color: #2d3436;
  font-size: 1.1rem;
}

.chart-wrapper {
  height: 350px;
  position: relative;
  width: 100%;
}

.empty-chart {
  color: #95a5a6;
  padding: 40px 0;
}

/* Dark Mode */
:global(.dark) .chart-container {
  background: #16213e;
}
:global(.dark) .chart-container h3 {
  color: #e0e0e0;
}
:global(.dark) .empty-chart {
  color: #636e72;
}
</style>