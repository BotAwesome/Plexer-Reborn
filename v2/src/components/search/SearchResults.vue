<template>
  <div>
    <!-- Loading State -->
    <div v-if="isLoading">
      <SkeletonLoader />
    </div>
    
    <!-- Error State -->
    <div v-else-if="error" class="bg-red-900/50 border border-red-500 rounded-lg p-6 text-center">
      <p class="text-red-200 mb-4">{{ error }}</p>
      <button
        @click="retrySearch"
        class="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
      >
        Erneut versuchen
      </button>
    </div>
    
    <!-- Empty State -->
    <div v-else-if="!hasResults && currentQuery" class="text-center py-12">
      <p class="text-gray-400 text-lg mb-2">Keine Ergebnisse gefunden</p>
      <p class="text-gray-500 text-sm">Versuche es mit einem anderen Suchbegriff</p>
    </div>
    
    <!-- Results -->
    <div v-else-if="hasResults" class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
      <MediaCard
        v-for="item in normalizedResults"
        :key="item.id"
        :media="item"
        @click="handleMediaClick(item)"
      />
    </div>
    
    <!-- Initial State -->
    <div v-else class="text-center py-12">
      <p class="text-gray-400 text-lg">Beginne mit der Suche...</p>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useSearchStore } from '@/stores/search'
import { useSearch } from '@/composables/useSearch'
import MediaCard from '@/components/common/MediaCard.vue'
import SkeletonLoader from '@/components/common/SkeletonLoader.vue'

const router = useRouter()
const searchStore = useSearchStore()
const { performSearch } = useSearch()

const isLoading = computed(() => searchStore.isLoading)
const error = computed(() => searchStore.error)
const hasResults = computed(() => searchStore.hasResults)
const currentQuery = computed(() => searchStore.currentQuery)

const normalizedResults = computed(() => {
  const results = searchStore.lastResults
  console.log('Raw search results:', results)
  
  if (!results || !results.MediaContainer) {
    console.log('No MediaContainer found')
    return []
  }
  
  const container = results.MediaContainer
  console.log('MediaContainer:', container)
  
  let items = []
  
  // Handle different response structures
  if (container.Metadata) {
    items = Array.isArray(container.Metadata) ? container.Metadata : [container.Metadata]
    console.log('Found Metadata items:', items.length)
  } else if (container.Video) {
    items = Array.isArray(container.Video) ? container.Video : [container.Video]
    console.log('Found Video items:', items.length)
  } else if (container.Directory) {
    items = Array.isArray(container.Directory) ? container.Directory : [container.Directory]
    console.log('Found Directory items:', items.length)
  }
  
  console.log('Items to normalize:', items)
  
  // Normalize items
  const normalized = items.map(item => ({
    id: item['@_ratingKey'] || item['@_key'],
    ratingKey: item['@_ratingKey'] || item['@_key'],
    key: item['@_key'],
    type: item['@_type'],
    title: item['@_title'],
    year: item['@_year'],
    thumb: item['@_thumb'] || item['@_art'],
    summary: item['@_summary']
  }))
  
  console.log('Normalized results:', normalized)
  return normalized
})

const handleMediaClick = (media) => {
  const type = media.type === 'movie' ? 'movie' : 'show'
  const id = media.ratingKey || media.id || media.key
  router.push(`/media/${type}/${id}`)
}

const retrySearch = () => {
  if (currentQuery.value) {
    performSearch(currentQuery.value, searchStore.currentFilters, searchStore.currentSort)
  }
}
</script>


