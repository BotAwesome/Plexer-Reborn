<template>
  <div class="mb-6 flex items-center space-x-4">
    <select
      v-model="selectedFilter"
      @change="applyFilters"
      class="px-4 py-2 bg-netflix-gray border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-netflix-red"
    >
      <option value="">Alle Typen</option>
      <option value="movie">Filme</option>
      <option value="show">Serien</option>
    </select>
    
    <select
      v-model="selectedSort"
      @change="applySort"
      class="px-4 py-2 bg-netflix-gray border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-netflix-red"
    >
      <option value="">Standard</option>
      <option value="titleSort:asc">Titel A-Z</option>
      <option value="titleSort:desc">Titel Z-A</option>
      <option value="year:desc">Jahr (neueste)</option>
      <option value="year:asc">Jahr (älteste)</option>
      <option value="rating:desc">Bewertung</option>
    </select>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useSearchStore } from '@/stores/search'
import { useSearch } from '@/composables/useSearch'

const searchStore = useSearchStore()
const { performSearch } = useSearch()

const selectedFilter = ref('')
const selectedSort = ref('')

const applyFilters = () => {
  const filters = selectedFilter.value ? { type: selectedFilter.value } : {}
  searchStore.setFilters(filters)
  if (searchStore.currentQuery) {
    performSearch(searchStore.currentQuery, filters, selectedSort.value)
  }
}

const applySort = () => {
  searchStore.setSort(selectedSort.value)
  if (searchStore.currentQuery) {
    performSearch(searchStore.currentQuery, searchStore.currentFilters, selectedSort.value)
  }
}
</script>


