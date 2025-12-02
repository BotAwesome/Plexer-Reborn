<template>
  <div class="space-y-2">
    <div
      v-for="season in seasons"
      :key="season.key"
      class="bg-netflix-dark rounded-lg overflow-hidden"
    >
      <button
        @click="toggleSeason(season.key)"
        class="w-full px-6 py-4 flex items-center justify-between hover:bg-netflix-gray transition-colors"
      >
        <div class="flex items-center space-x-4">
          <img
            v-if="season.thumb"
            :src="getImageUrl(season.thumb)"
            :alt="season.title"
            class="w-16 h-16 object-cover rounded"
          />
          <div>
            <h3 class="text-lg font-semibold">{{ season.title }}</h3>
            <p class="text-sm text-gray-400">{{ season.leafCount || 0 }} Episoden</p>
          </div>
        </div>
        <svg
          :class="['w-5 h-5 transition-transform', openSeasons.has(season.key) ? 'rotate-180' : '']"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      
      <div
        v-if="openSeasons.has(season.key)"
        class="px-6 py-4 border-t border-netflix-gray"
      >
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <EpisodeCard
            v-for="episode in season.episodes"
            :key="episode.key"
            :episode="episode"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useMedia } from '@/composables/useMedia'
import EpisodeCard from './EpisodeCard.vue'

const props = defineProps({
  seasons: {
    type: Array,
    default: () => []
  }
})

const authStore = useAuthStore()
const { loadChildren } = useMedia()

const openSeasons = ref(new Set())

const getImageUrl = (path) => {
  if (!path || !authStore.serverUrl || !authStore.plexToken) return ''
  return `${authStore.serverUrl}${path}?X-Plex-Token=${authStore.plexToken}`
}

const toggleSeason = async (seasonKey) => {
  if (openSeasons.value.has(seasonKey)) {
    openSeasons.value.delete(seasonKey)
  } else {
    openSeasons.value.add(seasonKey)
    
    // Load episodes if not already loaded
    const season = props.seasons.find(s => s.key === seasonKey)
    if (season && !season.episodes) {
      const children = await loadChildren(seasonKey)
      season.episodes = children || []
    }
  }
}

onMounted(() => {
  // Open first season by default
  if (props.seasons.length > 0) {
    openSeasons.value.add(props.seasons[0].key)
  }
})
</script>


