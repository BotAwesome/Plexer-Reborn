import { defineStore } from 'pinia'
import { storage } from '@/utils/storage'

const MAX_HISTORY_ITEMS = 10

export const useSearchStore = defineStore('search', {
  state: () => ({
    currentQuery: '',
    currentFilters: {},
    currentSort: null,
    currentPage: 1,
    lastResults: [],
    isLoading: false,
    error: null
  }),
  
  getters: {
    hasResults: (state) => state.lastResults.length > 0,
    history: () => {
      return storage.local.get('searchHistory') || []
    }
  },
  
  actions: {
    setQuery(query) {
      this.currentQuery = query
    },
    
    setFilters(filters) {
      this.currentFilters = filters
    },
    
    setSort(sort) {
      this.currentSort = sort
    },
    
    setResults(results) {
      this.lastResults = results
    },
    
    setLoading(loading) {
      this.isLoading = loading
    },
    
    setError(error) {
      this.error = error
    },
    
    addToHistory(query) {
      if (!query || !query.trim()) return
      
      const history = this.history
      const trimmedQuery = query.trim()
      
      // Remove if already exists
      const filtered = history.filter(item => item !== trimmedQuery)
      
      // Add to beginning
      filtered.unshift(trimmedQuery)
      
      // Limit to MAX_HISTORY_ITEMS
      const limited = filtered.slice(0, MAX_HISTORY_ITEMS)
      
      storage.local.set('searchHistory', limited)
    },
    
    removeFromHistory(query) {
      const history = this.history
      const filtered = history.filter(item => item !== query)
      storage.local.set('searchHistory', filtered)
    },
    
    clearHistory() {
      storage.local.remove('searchHistory')
    },
    
    clearResults() {
      this.lastResults = []
      this.currentQuery = ''
      this.currentFilters = {}
      this.currentSort = null
      this.currentPage = 1
      this.error = null
    }
  }
})


