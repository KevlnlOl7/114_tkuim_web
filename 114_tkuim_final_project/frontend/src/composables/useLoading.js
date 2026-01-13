import { ref } from 'vue'

/**
 * Composable for managing loading states and preventing duplicate clicks
 * Usage:
 *   const { isLoading, withLoading } = useLoading()
 *   await withLoading('save', async () => await saveData())
 */
export function useLoading() {
    // Track multiple loading states by key
    const loadingStates = ref({})

    // Check if any operation is loading
    const isLoading = (key = 'default') => {
        return loadingStates.value[key] === true
    }

    // Check if any loading is happening
    const isAnyLoading = () => {
        return Object.values(loadingStates.value).some(v => v === true)
    }

    // Wrap an async function with loading state management
    const withLoading = async (key, asyncFn) => {
        if (loadingStates.value[key]) {
            // Prevent duplicate execution if already loading
            console.warn(`Operation "${key}" is already in progress`)
            return null
        }

        loadingStates.value[key] = true
        try {
            const result = await asyncFn()
            return result
        } finally {
            loadingStates.value[key] = false
        }
    }

    // Set loading state manually
    const setLoading = (key, value) => {
        loadingStates.value[key] = value
    }

    return {
        loadingStates,
        isLoading,
        isAnyLoading,
        withLoading,
        setLoading
    }
}
