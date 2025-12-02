import { ref, computed } from 'vue'
import { useSearchStore } from '@/stores/search'
import { usePlexAPI } from './usePlexAPI'

/**
 * Composable for search functionality
 */
export function useSearch() {
  const searchStore = useSearchStore()
  const { search: searchAPI, getAutocomplete } = usePlexAPI()
  
  const query = ref('')
  const autocompleteResults = ref([])
  const showAutocomplete = ref(false)
  const abortController = ref(null)
  
  const hasQuery = computed(() => query.value.trim().length > 0)
  const hasAutocomplete = computed(() => autocompleteResults.value.length > 0)
  
  /**
   * Perform search with debouncing
   */
  const performSearch = async (searchQuery, filters = {}, sort = null) => {
    // Cancel previous request
    if (abortController.value) {
      abortController.value.abort()
    }
    
    abortController.value = new AbortController()
    
    try {
      searchStore.setLoading(true)
      searchStore.setError(null)
      
      const options = {
        ...filters,
        sort: sort
      }
      
      const results = await searchAPI(searchQuery, options)
      searchStore.setResults(results)
      searchStore.setQuery(searchQuery)
      searchStore.addToHistory(searchQuery)
      
      return results
    } catch (error) {
      if (error.name !== 'AbortError') {
        searchStore.setError(error.message)
        console.error('Search error:', error)
      }
      throw error
    } finally {
      searchStore.setLoading(false)
      abortController.value = null
    }
  }
  
  /**
   * Get autocomplete suggestions
   */
  const getAutocompleteSuggestions = async (sectionId, searchQuery) => {
    if (!searchQuery || searchQuery.trim().length < 2) {
      autocompleteResults.value = []
      showAutocomplete.value = false
      return
    }
    
    try {
      const results = await getAutocomplete(sectionId, searchQuery)
      autocompleteResults.value = results
      showAutocomplete.value = true
    } catch (error) {
      console.error('Autocomplete error:', error)
      autocompleteResults.value = []
      showAutocomplete.value = false
    }
  }
  
  /**
   * Clear search
   */
  const clearSearch = () => {
    query.value = ''
    autocompleteResults.value = []
    showAutocomplete.value = false
    searchStore.clearResults()
  }
  
  /**
   * Cancel current search
   */
  const cancelSearch = () => {
    if (abortController.value) {
      abortController.value.abort()
      abortController.value = null
    }
    searchStore.setLoading(false)
  }
  
  return {
    query,
    autocompleteResults,
    showAutocomplete,
    hasQuery,
    hasAutocomplete,
    performSearch,
    getAutocompleteSuggestions,
    clearSearch,
    cancelSearch
  }
}



