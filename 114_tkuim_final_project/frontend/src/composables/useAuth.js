// useAuth.js - Authentication composable
import { ref } from 'vue'
import axios from 'axios'

const isLoggedIn = ref(false)
const currentUser = ref(null)
const currentPage = ref('login')

export function useAuth() {
    const checkLoginStatus = () => {
        isLoggedIn.value = localStorage.getItem('isLoggedIn') === 'true'
        const savedUser = localStorage.getItem('user')
        if (savedUser) {
            currentUser.value = JSON.parse(savedUser)
            if (currentUser.value.token) {
                axios.defaults.headers.common['Authorization'] = `Bearer ${currentUser.value.token}`
            }
            currentPage.value = 'main'
        }
    }

    const handleLoginSuccess = (user, fetchDataCallback) => {
        isLoggedIn.value = true
        currentUser.value = user
        if (user.token) {
            axios.defaults.headers.common['Authorization'] = `Bearer ${user.token}`
        }
        currentPage.value = 'main'
        if (fetchDataCallback) fetchDataCallback()
    }

    const handleLogout = () => {
        localStorage.removeItem('isLoggedIn')
        localStorage.removeItem('user')
        delete axios.defaults.headers.common['Authorization']
        isLoggedIn.value = false
        currentUser.value = null
        currentPage.value = 'login'
    }

    const updateCurrentUser = (userData) => {
        currentUser.value = { ...currentUser.value, ...userData }
        localStorage.setItem('user', JSON.stringify(currentUser.value))
    }

    return {
        isLoggedIn,
        currentUser,
        currentPage,
        checkLoginStatus,
        handleLoginSuccess,
        handleLogout,
        updateCurrentUser
    }
}
