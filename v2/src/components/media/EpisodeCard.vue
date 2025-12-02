<template>
  <div class="bg-netflix-gray rounded-lg overflow-hidden">
    <div class="aspect-video bg-netflix-dark relative">
      <img
        v-if="episode.thumb"
        :src="getImageUrl(episode.thumb)"
        :alt="episode.title"
        class="w-full h-full object-cover"
      />
      
      <!-- Watched Badge -->
      <div
        v-if="isWatched"
        class="absolute top-2 right-2 bg-green-500 rounded-full p-1"
        title="Gesehen"
      >
        <svg class="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
        </svg>
      </div>
    </div>
    
    <div class="p-4">
      <h4 class="font-semibold text-sm mb-1">{{ episode.title }}</h4>
      <p v-if="episode.index" class="text-xs text-gray-400">Episode {{ episode.index }}</p>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useMediaStore } from '@/stores/media'

const props = defineProps({
  episode: {
    type: Object,
    required: true
  }
})

const authStore = useAuthStore()
const mediaStore = useMediaStore()

const isWatched = computed(() => {
  return mediaStore.isWatched(props.episode.ratingKey || props.episode.key)
})

const getImageUrl = (path) => {
  if (!path || !authStore.serverUrl || !authStore.plexToken) return ''
  return `${authStore.serverUrl}${path}?X-Plex-Token=${authStore.plexToken}`
}
</script>

