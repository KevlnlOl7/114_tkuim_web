<script setup>
import { computed, ref, onMounted } from 'vue'
import { Line } from 'vue-chartjs'
import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  PointElement, 
  LineElement, 
  Title, 
  Tooltip, 
  Legend, 
  Filler 
} from 'chart.js'
import { t } from '../i18n.js'

ChartJS.register(
  CategoryScale, 
  LinearScale, 
  PointElement, 
  LineElement, 
  Title, 
  Tooltip, 
  Legend, 
  Filler
)

const props = defineProps({
  data: { type: Object, required: true },
  chartId: { type: String, default: 'trend-line-chart' },
  width: { type: Number, default: 400 },
  height: { type: Number, default: 300 },
  cssClasses: { type: String, default: '' },
  styles: { type: Object, default: () => {} },
  plugins: { type: Array, default: () => [] },
  isDarkMode: { type: Boolean, default: false }
})

// Gradient ref
const chartRef = ref(null)

const getGradient = (ctx, chartArea, colorStart, colorEnd) => {
  const gradient = ctx.createLinearGradient(0, chartArea.bottom, 0, chartArea.top)
  gradient.addColorStop(0, colorStart)
  gradient.addColorStop(1, colorEnd)
  return gradient
}

const chartData = computed(() => {
  if (!props.data || !props.data.labels) return { labels: [], datasets: [] }

  const labels = props.data.labels
  const expenses = props.data.expenses || []
  const incomes = props.data.incomes || []

  // Create chart data with "function" for backgroundColor to support gradients
  return {
    labels: labels,
    datasets: [
      {
        label: t('income') || 'Income',
        data: incomes,
        borderColor: '#2ecc71',
        backgroundColor: (context) => {
          const chart = context.chart
          const { ctx, chartArea } = chart
          if (!chartArea) return null // Initial load
          return getGradient(ctx, chartArea, 'rgba(46, 204, 113, 0.0)', 'rgba(46, 204, 113, 0.4)')
        },
        tension: 0.4, // Smooth curve
        fill: true,
        pointRadius: 3,
        pointHoverRadius: 6
      },
      {
        label: t('expense') || 'Expense',
        data: expenses,
        borderColor: '#e74c3c',
        backgroundColor: (context) => {
          const chart = context.chart
          const { ctx, chartArea } = chart
          if (!chartArea) return null
          return getGradient(ctx, chartArea, 'rgba(231, 76, 60, 0.0)', 'rgba(231, 76, 60, 0.4)')
        },
        tension: 0.4,
        fill: true,
        pointRadius: 3,
        pointHoverRadius: 6
      }
    ]
  }
})

const chartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  interaction: {
    mode: 'index',
    intersect: false,
  },
  plugins: {
    legend: {
      labels: {
        color: props.isDarkMode ? '#e0e0e0' : '#4a5568'
      }
    },
    tooltip: {
      mode: 'index',
      intersect: false,
      backgroundColor: props.isDarkMode ? 'rgba(0,0,0,0.8)' : 'rgba(255,255,255,0.9)',
      titleColor: props.isDarkMode ? '#fff' : '#333',
      bodyColor: props.isDarkMode ? '#fff' : '#666',
      borderColor: props.isDarkMode ? '#444' : '#ddd',
      borderWidth: 1,
      padding: 10,
    }
  },
  scales: {
    x: {
      grid: {
        display: false,
        drawBorder: false
      },
      ticks: {
        color: props.isDarkMode ? '#a0a0a0' : '#666',
        maxTicksLimit: 8, // Limit to 8 labels max to prevent overcrowding
        maxRotation: 45, // Rotate labels if needed
        minRotation: 0,
        autoSkip: true, // Auto-skip labels when crowded
        font: {
          size: 11
        },
        callback: function(value, index, ticks) {
          // Show only MM/DD format for compact display
          const label = this.getLabelForValue(value)
          if (!label) return label
          const parts = label.split('-')
          if (parts.length === 3) {
            return parts[1] + '/' + parts[2] // MM/DD format
          }
          return label
        }
      }
    },
    y: {
      beginAtZero: true,
      grid: {
        color: props.isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
        drawBorder: false
      },
      ticks: {
        color: props.isDarkMode ? '#a0a0a0' : '#666'
      }
    }
  }
}))
</script>

<template>
  <div class="trend-chart-container">
    <div v-if="chartData.labels && chartData.labels.length > 0" class="canvas-wrapper">
        <Line
        ref="chartRef"
        :data="chartData"
        :options="chartOptions"
        :chart-id="chartId"
        :plugins="plugins"
        :css-classes="cssClasses"
        :styles="styles"
        :width="width"
        :height="height"
        />
    </div>
    <div v-else class="no-data">
        {{ t('no_chart_data') || 'No Data' }}
    </div>
  </div>
</template>

<style scoped>
.trend-chart-container {
  width: 100%;
  height: 300px; /* Fixed height to prevent collapse */
  position: relative;
}
.canvas-wrapper {
  width: 100%;
  height: 100%;
}
.no-data {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100%;
    color: #aaa;
    font-size: 0.9rem;
}
</style>
