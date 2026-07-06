import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useSearchStore = defineStore('search', () => {
  const keyword = ref('')
  const results = ref<any[]>([])
  const loading = ref(false)
  const hasSearched = ref(false)

  const setKeyword = (value: string) => {
    keyword.value = value
  }

  const setResults = (data: any[]) => {
    results.value = data
    hasSearched.value = true
  }

  const setLoading = (value: boolean) => {
    loading.value = value
  }

  const clearResults = () => {
    results.value = []
    hasSearched.value = false
  }

  return {
    keyword,
    results,
    loading,
    hasSearched,
    setKeyword,
    setResults,
    setLoading,
    clearResults
  }
})
