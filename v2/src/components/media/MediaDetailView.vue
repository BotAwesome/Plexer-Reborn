<template>
  <div class="min-h-screen bg-netflix-black">
    <Header />
    <Sidebar />
    
    <MainContent>
      <div v-if="loading" class="flex justify-center py-12">
        <LoadingSpinner />
      </div>
      
      <MovieDetail v-else-if="mediaType === 'movie'" :media="currentMedia" />
      <ShowDetail v-else-if="mediaType === 'show'" :media="currentMedia" />
    </MainContent>
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useMedia } from '@/composables/useMedia'
import Header from '@/components/layout/Header.vue'
import Sidebar from '@/components/layout/Sidebar.vue'
import MainContent from '@/components/layout/MainContent.vue'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'
import MovieDetail from './MovieDetail.vue'
import ShowDetail from './ShowDetail.vue'

const route = useRoute()
const { loadMediaDetails, loading } = useMedia()

const mediaType = computed(() => route.params.type)
const mediaId = computed(() => route.params.id)
const currentMedia = computed(() => null) // Will be set by store

onMounted(async () => {
  if (mediaId.value) {
    await loadMediaDetails(mediaId.value)
  }
})
</script>

