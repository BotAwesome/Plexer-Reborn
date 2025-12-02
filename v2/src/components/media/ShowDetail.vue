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
      
      <!-- Seasons -->
      <SeasonAccordion :seasons="seasons" />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useMedia } from '@/composables/useMedia'
import SeasonAccordion from './SeasonAccordion.vue'

const props = defineProps({
  media: {
    type: Object,
    required: true
  }
})

const authStore = useAuthStore()
const { loadChildren } = useMedia()

const seasons = ref([])

const getImageUrl = (path) => {
  if (!path || !authStore.serverUrl || !authStore.plexToken) return ''
  return `${authStore.serverUrl}${path}?X-Plex-Token=${authStore.plexToken}`
}

onMounted(async () => {
  if (props.media.key) {
    const children = await loadChildren(props.media.key)
    seasons.value = children || []
  }
})
</script>


