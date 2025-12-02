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
        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-4xl font-bold mb-2">{{ media.title }}</h1>
            <p v-if="media.year" class="text-lg text-gray-300">{{ media.year }}</p>
          </div>
          <button
            @click="toggleWatched"
            class="p-3 rounded-full hover:bg-netflix-gray transition-colors"
            :title="isWatched ? 'Als ungesehen markieren' : 'Als gesehen markieren'"
          >
            <svg class="w-8 h-8" :class="isWatched ? 'text-green-500' : 'text-gray-400'" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
              <path fill-rule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clip-rule="evenodd" />
            </svg>
          </button>
        </div>
      </div>
    </div>
    
    <!-- Content -->
    <div class="p-8">
      <p v-if="media.summary" class="text-gray-300 mb-6">{{ media.summary }}</p>
      
      <!-- Actions -->
      <div class="flex flex-wrap gap-4 mb-6">
        <button
          @click="playMovie"
          class="px-6 py-3 bg-netflix-red rounded-lg hover:bg-red-700 transition-colors flex items-center space-x-2"
        >
          <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clip-rule="evenodd" />
          </svg>
          <span>Abspielen</span>
        </button>
        
        <button
          @click="downloadMovie"
          class="px-6 py-3 bg-netflix-gray rounded-lg hover:bg-gray-600 transition-colors flex items-center space-x-2"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          <span>Download</span>
        </button>
        
        <button
          @click="openInVLC"
          class="px-6 py-3 bg-netflix-gray rounded-lg hover:bg-gray-600 transition-colors flex items-center space-x-2"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>In VLC öffnen</span>
        </button>
        
        <button
          @click="createM3U"
          class="px-6 py-3 bg-netflix-gray rounded-lg hover:bg-gray-600 transition-colors flex items-center space-x-2"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
          </svg>
          <span>M3U erstellen</span>
        </button>
        
        <button
          @click="copyLink"
          class="px-6 py-3 bg-netflix-gray rounded-lg hover:bg-gray-600 transition-colors flex items-center space-x-2"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          <span>Link kopieren</span>
        </button>
        
        <button
          @click="toggleBookmark"
          class="px-6 py-3 bg-netflix-gray rounded-lg hover:bg-gray-600 transition-colors flex items-center space-x-2"
        >
          <svg class="w-5 h-5" :class="isBookmarked ? 'fill-current' : ''" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
          </svg>
          <span>{{ isBookmarked ? 'Bookmark entfernen' : 'Bookmark' }}</span>
        </button>
      </div>
    </div>
    
    <!-- Video Player -->
    <VideoPlayer
      v-if="showPlayer"
      :url="streamingUrl"
      @close="showPlayer = false"
    />
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useMediaStore } from '@/stores/media'
import { useBookmarksStore } from '@/stores/bookmarks'
import { useToast } from '@/composables/useToast'
import { usePlexAPI } from '@/composables/usePlexAPI'
import downloadService from '@/services/downloadService'
import vlcService from '@/services/vlcService'
import m3uService from '@/services/m3uService'
import videoService from '@/services/videoService'
import VideoPlayer from '@/components/common/VideoPlayer.vue'

const props = defineProps({
  media: {
    type: Object,
    required: true
  }
})

const authStore = useAuthStore()
const mediaStore = useMediaStore()
const bookmarksStore = useBookmarksStore()
const { success, error: showError } = useToast()
const { getStreamingUrl } = usePlexAPI()

const showPlayer = ref(false)
const streamingUrl = ref('')

const isWatched = computed(() => mediaStore.isWatched(props.media['@_ratingKey'] || props.media.id))
const isBookmarked = computed(() => bookmarksStore.isBookmarked(props.media['@_ratingKey'] || props.media.id))

const getImageUrl = (path) => {
  if (!path || !authStore.serverUrl || !authStore.plexToken) return ''
  return `${authStore.serverUrl}${path}?X-Plex-Token=${authStore.plexToken}`
}

const getMovieStreamUrl = () => {
  const partKey = props.media.Media?.[0]?.Part?.[0]?.['@_key'] || props.media['@_key']
  const url = getStreamingUrl(props.media['@_ratingKey'], partKey)
  return videoService.forceAudioTranscoding(url)
}

const toggleWatched = () => {
  const mediaId = props.media['@_ratingKey'] || props.media.id
  if (isWatched.value) {
    mediaStore.markAsUnwatched(mediaId)
    success('Als ungesehen markiert')
  } else {
    mediaStore.markAsWatched(mediaId)
    success('Als gesehen markiert')
  }
}

const playMovie = () => {
  streamingUrl.value = getMovieStreamUrl()
  showPlayer.value = true
}

const downloadMovie = async () => {
  try {
    const url = getMovieStreamUrl()
    const filename = `${props.media['@_title']}.mp4`
    await downloadService.downloadFile(url, filename)
    success('Download gestartet')
  } catch (err) {
    showError('Download fehlgeschlagen')
  }
}

const openInVLC = () => {
  const url = getMovieStreamUrl()
  vlcService.openInVLC(url)
  success('In VLC geöffnet')
}

const createM3U = () => {
  const movie = {
    title: props.media['@_title'],
    url: getMovieStreamUrl(),
    duration: props.media['@_duration']
  }
  m3uService.createMovieM3U(movie)
  success('M3U-Playlist erstellt')
}

const copyLink = async () => {
  try {
    const url = getMovieStreamUrl()
    await navigator.clipboard.writeText(url)
    success('Link kopiert')
  } catch (err) {
    showError('Link konnte nicht kopiert werden')
  }
}

const toggleBookmark = () => {
  const mediaId = props.media['@_ratingKey'] || props.media.id
  if (isBookmarked.value) {
    bookmarksStore.removeBookmark(mediaId)
    success('Bookmark entfernt')
  } else {
    bookmarksStore.addBookmark({
      id: mediaId,
      type: 'movie',
      title: props.media['@_title'],
      year: props.media['@_year'],
      thumb: props.media['@_thumb']
    })
    success('Zu Bookmarks hinzugefügt')
  }
}
</script>


