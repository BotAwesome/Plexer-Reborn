<template>
  <div class="bg-netflix-gray rounded-lg overflow-hidden">
    <div class="aspect-video bg-netflix-dark relative group cursor-pointer" @click="playEpisode">
      <img
        v-if="episode.thumb"
        :src="getImageUrl(episode.thumb)"
        :alt="episode.title"
        class="w-full h-full object-cover"
      />
      
      <!-- Play Overlay -->
      <div class="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
        <svg class="w-16 h-16 text-white" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clip-rule="evenodd" />
        </svg>
      </div>
      
      <!-- Watched Badge -->
      <button
        @click.stop="toggleWatched"
        class="absolute top-2 right-2 rounded-full p-1 hover:bg-black hover:bg-opacity-30 transition-colors"
        :title="isWatched ? 'Als ungesehen markieren' : 'Als gesehen markieren'"
      >
        <svg class="w-5 h-5" :class="isWatched ? 'text-green-500' : 'text-gray-400'" fill="currentColor" viewBox="0 0 20 20">
          <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
          <path fill-rule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clip-rule="evenodd" />
        </svg>
      </button>
      
      <!-- Selection Checkbox -->
      <input
        v-if="selectable"
        type="checkbox"
        :checked="isSelected"
        @click.stop
        @change="$emit('toggle-select', episode)"
        class="absolute top-2 left-2 w-5 h-5 rounded cursor-pointer"
      />
    </div>
    
    <div class="p-4">
      <h4 class="font-semibold text-sm mb-1">{{ episode.title }}</h4>
      <p v-if="episode.index" class="text-xs text-gray-400 mb-2">Episode {{ episode.index }}</p>
      
      <!-- Action Buttons -->
      <div class="flex space-x-2">
        <button
          @click="downloadEpisode"
          class="p-2 bg-netflix-dark rounded hover:bg-black transition-colors"
          title="Download"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
        </button>
        
        <button
          @click="openInVLC"
          class="p-2 bg-netflix-dark rounded hover:bg-black transition-colors"
          title="In VLC öffnen"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </button>
        
        <button
          @click="copyLink"
          class="p-2 bg-netflix-dark rounded hover:bg-black transition-colors"
          title="Link kopieren"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
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
import { useToast } from '@/composables/useToast'
import { usePlexAPI } from '@/composables/usePlexAPI'
import downloadService from '@/services/downloadService'
import vlcService from '@/services/vlcService'
import videoService from '@/services/videoService'
import VideoPlayer from '@/components/common/VideoPlayer.vue'

const props = defineProps({
  episode: {
    type: Object,
    required: true
  },
  selectable: {
    type: Boolean,
    default: false
  },
  isSelected: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['toggle-select'])

const authStore = useAuthStore()
const mediaStore = useMediaStore()
const { success, error: showError } = useToast()
const { getStreamingUrl } = usePlexAPI()

const showPlayer = ref(false)
const streamingUrl = ref('')

const isWatched = computed(() => {
  return mediaStore.isWatched(props.episode['@_ratingKey'] || props.episode.ratingKey || props.episode.key)
})

const getImageUrl = (path) => {
  if (!path || !authStore.serverUrl || !authStore.plexToken) return ''
  return `${authStore.serverUrl}${path}?X-Plex-Token=${authStore.plexToken}`
}

const getEpisodeStreamUrl = () => {
  const partKey = props.episode.Media?.[0]?.Part?.[0]?.['@_key'] || props.episode['@_key']
  const url = getStreamingUrl(props.episode['@_ratingKey'], partKey)
  return videoService.forceAudioTranscoding(url)
}

const toggleWatched = () => {
  const mediaId = props.episode['@_ratingKey'] || props.episode.ratingKey || props.episode.key
  if (isWatched.value) {
    mediaStore.markAsUnwatched(mediaId)
    success('Als ungesehen markiert')
  } else {
    mediaStore.markAsWatched(mediaId)
    success('Als gesehen markiert')
  }
}

const playEpisode = () => {
  streamingUrl.value = getEpisodeStreamUrl()
  showPlayer.value = true
  
  // Mark as watched after playing
  const mediaId = props.episode['@_ratingKey'] || props.episode.ratingKey || props.episode.key
  mediaStore.markAsWatched(mediaId)
}

const downloadEpisode = async () => {
  try {
    const url = getEpisodeStreamUrl()
    const filename = `${props.episode['@_grandparentTitle']} - S${props.episode['@_parentIndex']}E${props.episode['@_index']} - ${props.episode['@_title']}.mp4`
    await downloadService.downloadFile(url, filename)
    success('Download gestartet')
  } catch (err) {
    showError('Download fehlgeschlagen')
  }
}

const openInVLC = () => {
  const url = getEpisodeStreamUrl()
  vlcService.openInVLC(url)
  success('In VLC geöffnet')
}

const copyLink = async () => {
  try {
    const url = getEpisodeStreamUrl()
    await navigator.clipboard.writeText(url)
    success('Link kopiert')
  } catch (err) {
    showError('Link konnte nicht kopiert werden')
  }
}
</script>


