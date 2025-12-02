<template>
  <div v-if="media" class="min-h-screen">
    <!-- Hero Section -->
    <div class="relative h-96 bg-netflix-dark">
      <img
        v-if="media.art"
        :src="getImageUrl(media.art)"
        :alt="media.title"
        class="w-full h-full object-cover opacity-50"
      />
      <div class="absolute inset-0 bg-gradient-to-t from-netflix-black to-transparent"></div>
      
      <div class="absolute bottom-0 left-0 right-0 p-8">
        <h1 class="text-4xl font-bold mb-2">{{ media.title }}</h1>
        <p v-if="media.year" class="text-lg text-gray-300">{{ media.year }}</p>
      </div>
    </div>
    
    <!-- Content -->
    <div class="p-8">
      <p v-if="media.summary" class="text-gray-300 mb-6">{{ media.summary }}</p>
      
      <!-- Actions -->
      <div class="flex space-x-4">
        <button class="px-6 py-3 bg-netflix-red rounded-lg hover:bg-red-700 transition-colors">
          Abspielen
        </button>
        <button class="px-6 py-3 bg-netflix-gray rounded-lg hover:bg-gray-600 transition-colors">
          Download
        </button>
      </div>
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

const authStore = useAuthStore()
const mediaStore = useMediaStore()

const getImageUrl = (path) => {
  if (!path || !authStore.serverUrl || !authStore.plexToken) return ''
  return `${authStore.serverUrl}${path}?X-Plex-Token=${authStore.plexToken}`
}
</script>


