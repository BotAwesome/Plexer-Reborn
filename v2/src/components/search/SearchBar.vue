<template>
  <div class="relative">
    <div class="relative">
      <input
        v-model="query"
        type="text"
        placeholder="Suche nach Filmen, Serien..."
        class="w-full px-4 py-3 pl-12 bg-netflix-gray border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-netflix-red text-white placeholder-gray-400"
        @input="handleInput"
        @focus="showAutocomplete = true"
        @blur="handleBlur"
        @keydown.enter="handleSearch"
        @keydown.escape="clearSearch"
      />
      <svg
        class="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
      <button
        v-if="query"
        @click="clearSearch"
        class="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
    
    <!-- Autocomplete Dropdown -->
    <Transition
      enter-active-class="transition ease-out duration-200"
      enter-from-class="opacity-0 translate-y-2"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition ease-in duration-150"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 translate-y-2"
    >
      <div
        v-if="showAutocomplete && hasAutocomplete"
        class="absolute top-full mt-2 w-full bg-netflix-dark border border-netflix-gray rounded-lg shadow-xl z-50 max-h-96 overflow-y-auto custom-scrollbar"
      >
        <div
          v-for="(item, index) in autocompleteResults"
          :key="index"
          @mousedown="selectAutocomplete(item)"
          class="px-4 py-3 hover:bg-netflix-gray cursor-pointer transition-colors"
        >
          <div class="font-medium">{{ item.title || item }}</div>
          <div v-if="item.year" class="text-sm text-gray-400">{{ item.year }}</div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'
import { useSearch } from '@/composables/useSearch'
import { useSearchStore } from '@/stores/search'
import { usePlexAPI } from '@/composables/usePlexAPI'
import { debounce } from '@/utils/debounce'

const searchStore = useSearchStore()
const { 
  query, 
  autocompleteResults, 
  showAutocomplete, 
  hasAutocomplete, 
  performSearch,
  getAutocompleteSuggestions,
  clearSearch: clearSearchComposable 
} = useSearch()
const { getLibrarySections } = usePlexAPI()

const sectionId = ref(null)

// Load library sections on mount
onMounted(async () => {
  try {
    const sections = await getLibrarySections()
    if (sections?.MediaContainer?.Directory?.length > 0) {
      sectionId.value = sections.MediaContainer.Directory[0]['@_key']
    }
  } catch (error) {
    console.error('Error loading library sections:', error)
  }
})

// Debounced autocomplete
const debouncedAutocomplete = debounce(async (searchQuery) => {
  if (sectionId.value && searchQuery.length >= 2) {
    await getAutocompleteSuggestions(sectionId.value, searchQuery)
  } else {
    autocompleteResults.value = []
    showAutocomplete.value = false
  }
}, 300)

const handleInput = () => {
  searchStore.setQuery(query.value)
  debouncedAutocomplete(query.value)
}

const handleBlur = () => {
  // Delay to allow click on autocomplete item
  setTimeout(() => {
    showAutocomplete.value = false
  }, 200)
}

const handleSearch = () => {
  if (query.value.trim()) {
    performSearch(query.value.trim())
    showAutocomplete.value = false
  }
}

const selectAutocomplete = (item) => {
  const searchQuery = item.title || item
  query.value = searchQuery
  handleSearch()
}

const clearSearch = () => {
  query.value = ''
  clearSearchComposable()
}

// Watch for store query changes
watch(() => searchStore.currentQuery, (newQuery) => {
  if (newQuery !== query.value) {
    query.value = newQuery
  }
})
</script>

