// useDarkMode.js - Dark mode composable
import { ref } from 'vue'

const isDarkMode = ref(localStorage.getItem('darkMode') === 'true')

export function useDarkMode() {
    const applyTheme = () => {
        if (isDarkMode.value) {
            document.documentElement.classList.add('dark')
        } else {
            document.documentElement.classList.remove('dark')
        }
    }

    const toggleTheme = () => {
        isDarkMode.value = !isDarkMode.value
        localStorage.setItem('darkMode', isDarkMode.value)
        applyTheme()
    }

    // Apply theme on load
    applyTheme()

    return {
        isDarkMode,
        toggleTheme,
        applyTheme
    }
}
