<template>
  <div class="min-h-screen bg-netflix-black">
    <Header />
    <Sidebar />
    
    <MainContent>
      <div class="p-8">
        <h1 class="text-3xl font-bold mb-6">Bookmarks</h1>
        
        <div v-if="bookmarks.length === 0" class="text-center py-12">
          <p class="text-gray-400">Noch keine Bookmarks vorhanden</p>
        </div>
        
        <div v-else class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          <MediaCard
            v-for="bookmark in bookmarks"
            :key="bookmark.id"
            :media="bookmark"
            @click="handleMediaClick(bookmark)"
          />
        </div>
      </div>
    </MainContent>
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useBookmarksStore } from '@/stores/bookmarks'
import Header from '@/components/layout/Header.vue'
import Sidebar from '@/components/layout/Sidebar.vue'
import MainContent from '@/components/layout/MainContent.vue'
import MediaCard from '@/components/common/MediaCard.vue'

const router = useRouter()
const bookmarksStore = useBookmarksStore()

const bookmarks = computed(() => bookmarksStore.bookmarks)

const handleMediaClick = (media) => {
  const type = media.type === 'movie' ? 'movie' : 'show'
  router.push(`/media/${type}/${media.id}`)
}

onMounted(() => {
  bookmarksStore.loadBookmarks()
})
</script>



