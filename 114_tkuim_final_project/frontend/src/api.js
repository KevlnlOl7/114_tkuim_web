// api.js - Centralized API configuration
import axios from 'axios'

// API Base URL - can be overridden by environment variable
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'

// Create axios instance with default config
const api = axios.create({
    baseURL: API_BASE_URL,
    timeout: 30000,
    headers: {
        'Content-Type': 'application/json'
    }
})

// Request interceptor - add auth token
api.interceptors.request.use(
    (config) => {
        const user = localStorage.getItem('user')
        if (user) {
            try {
                const parsed = JSON.parse(user)
                if (parsed.token) {
                    config.headers.Authorization = `Bearer ${parsed.token}`
                }
            } catch (e) {
                // Ignore parse errors
            }
        }
        return config
    },
    (error) => Promise.reject(error)
)

// Response interceptor - handle common errors
api.interceptors.response.use(
    (response) => response,
    (error) => {
        // Handle 401 Unauthorized - auto logout
        if (error.response?.status === 401) {
            const currentPath = window.location.pathname
            // Don't auto-logout on login page
            if (!currentPath.includes('login')) {
                localStorage.removeItem('isLoggedIn')
                localStorage.removeItem('user')
                // Optionally reload to show login
            }
        }
        return Promise.reject(error)
    }
)

export default api
export { API_BASE_URL }
