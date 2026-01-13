// useToast.js - Reusable toast notification composable
import { ref } from 'vue'

const toast = ref({ show: false, message: '', type: 'info' })

export function useToast() {
    const showToast = (msg, type = 'info') => {
        toast.value = { show: true, message: msg, type }
        setTimeout(() => {
            toast.value.show = false
        }, 3000)
    }

    return {
        toast,
        showToast
    }
}
