<template>
  <div
    class="group relative bg-netflix-gray rounded-lg overflow-hidden cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-netflix-red/20 fade-in"
    @click="$emit('click', media)"
  >
    <!-- Thumbnail -->
    <div class="aspect-video bg-netflix-dark relative">
      <img
        v-if="media.thumb"
        :src="getThumbnailUrl(media.thumb)"
        :alt="media.title"
        class="w-full h-full object-cover"
        @error="handleImageError"
      />
      <div v-else class="w-full h-full flex items-center justify-center text-gray-500">
        <svg class="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </div>
      
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
    
    <!-- Info -->
    <div class="p-4">
      <h3 class="font-semibold text-sm mb-1 line-clamp-2">{{ media.title }}</h3>
      <p v-if="media.year" class="text-xs text-gray-400">{{ media.year }}</p>
      <p v-if="media.type" class="text-xs text-gray-500 mt-1">
        {{ media.type === 'movie' ? 'Film' : 'Serie' }}
      </p>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useMediaStore } from '@/stores/media'

const props = defineProps({
  media: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['click'])

const authStore = useAuthStore()
const mediaStore = useMediaStore()

const isWatched = computed(() => {
  return mediaStore.isWatched(props.media.id)
})

const getThumbnailUrl = (thumb) => {
  if (!thumb || !authStore.serverUrl || !authStore.plexToken) return ''
  
  // Construct Plex thumbnail URL
  return `${authStore.serverUrl}${thumb}?X-Plex-Token=${authStore.plexToken}`
}

const handleImageError = (event) => {
  event.target.style.display = 'none'
}
</script>


