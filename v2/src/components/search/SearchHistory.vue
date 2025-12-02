<template>
  <div>
    <div v-if="history.length > 0" class="mb-6">
      <h2 class="text-xl font-semibold mb-4">Suchverlauf</h2>
      <div class="flex flex-wrap gap-2">
        <div
          v-for="(item, index) in history"
          :key="index"
          class="px-4 py-2 bg-netflix-gray hover:bg-netflix-gray/80 rounded-lg transition-colors text-sm flex items-center space-x-2"
        >
          <button
            @click="selectHistoryItem(item)"
            class="flex-1 text-left"
          >
            <span>{{ item }}</span>
          </button>
          <button
            @click.stop="removeHistoryItem(item)"
            class="text-gray-400 hover:text-white ml-2"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
      <button
        @click="clearHistory"
        class="mt-4 text-sm text-gray-400 hover:text-white transition-colors"
      >
        Verlauf löschen
      </button>
    </div>
    
    <div v-else class="text-center py-8">
      <p class="text-gray-500">Noch keine Suchanfragen</p>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useSearchStore } from '@/stores/search'
import { useSearch } from '@/composables/useSearch'

const searchStore = useSearchStore()
const { performSearch } = useSearch()

const history = computed(() => searchStore.history)

const selectHistoryItem = (item) => {
  performSearch(item)
}

const removeHistoryItem = (item) => {
  searchStore.removeFromHistory(item)
}

const clearHistory = () => {
  searchStore.clearHistory()
}
</script>



