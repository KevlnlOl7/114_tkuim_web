import { createApp } from 'vue'
import axios from 'axios'
import './style.css'
import App from './App.vue'

// Configure axios defaults
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'
axios.defaults.baseURL = API_BASE_URL

createApp(App).mount('#app')
