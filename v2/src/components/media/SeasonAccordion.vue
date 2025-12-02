<template>
  <div class="space-y-2">
    <div
      v-for="season in seasons"
      :key="season.key"
      class="bg-netflix-dark rounded-lg overflow-hidden"
    >
      <div class="px-6 py-4 flex items-center justify-between border-b border-netflix-gray">
        <button
          @click="toggleSeason(season.key)"
          class="flex-1 flex items-center space-x-4 hover:opacity-80 transition-opacity"
        >
          <img
            v-if="season.thumb"
            :src="getImageUrl(season.thumb)"
            :alt="season.title"
            class="w-16 h-16 object-cover rounded"
          />
          <div class="text-left">
            <h3 class="text-lg font-semibold">{{ season.title }}</h3>
            <p class="text-sm text-gray-400">{{ season.leafCount || 0 }} Episoden</p>
          </div>
          <svg
            :class="['w-5 h-5 transition-transform ml-auto', openSeasons.has(season.key) ? 'rotate-180' : '']"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        
        <div class="flex space-x-2 ml-4">
          <button
            @click="createSeasonM3U(season)"
            class="px-4 py-2 bg-netflix-gray rounded hover:bg-gray-600 transition-colors text-sm"
            title="M3U für ganze Staffel erstellen"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
            </svg>
          </button>
          
          <button
            v-if="openSeasons.has(season.key)"
            @click="toggleSelectionMode(season.key)"
            class="px-4 py-2 bg-netflix-gray rounded hover:bg-gray-600 transition-colors text-sm"
            :title="selectionMode.has(season.key) ? 'Auswahl abbrechen' : 'Episoden auswählen'"
          >
            {{ selectionMode.has(season.key) ? 'Abbrechen' : 'Auswählen' }}
          </button>
          
          <button
            v-if="selectionMode.has(season.key) && selectedEpisodes.get(season.key)?.size > 0"
            @click="createSelectedM3U(season)"
            class="px-4 py-2 bg-netflix-red rounded hover:bg-red-700 transition-colors text-sm"
          >
            M3U ({{ selectedEpisodes.get(season.key)?.size || 0 }})
          </button>
        </div>
      </div>
      
      <div
        v-if="openSeasons.has(season.key)"
        class="px-6 py-4"
      >
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <EpisodeCard
            v-for="episode in season.episodes"
            :key="episode.key"
            :episode="episode"
            :selectable="selectionMode.has(season.key)"
            :is-selected="isEpisodeSelected(season.key, episode)"
            @toggle-select="toggleEpisodeSelection(season.key, $event)"
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
import { useToast } from '@/composables/useToast'
import { usePlexAPI } from '@/composables/usePlexAPI'
import m3uService from '@/services/m3uService'
import videoService from '@/services/videoService'
import EpisodeCard from './EpisodeCard.vue'

const props = defineProps({
  seasons: {
    type: Array,
    default: () => []
  }
})

const authStore = useAuthStore()
const { loadChildren } = useMedia()
const { success, error: showError } = useToast()
const { getStreamingUrl } = usePlexAPI()

const openSeasons = ref(new Set())
const selectionMode = ref(new Map())
const selectedEpisodes = ref(new Map())

const getImageUrl = (path) => {
  if (!path || !authStore.serverUrl || !authStore.plexToken) return ''
  return `${authStore.serverUrl}${path}?X-Plex-Token=${authStore.plexToken}`
}

const toggleSeason = async (seasonKey) => {
  if (openSeasons.value.has(seasonKey)) {
    openSeasons.value.delete(seasonKey)
    selectionMode.value.delete(seasonKey)
    selectedEpisodes.value.delete(seasonKey)
  } else {
    openSeasons.value.add(seasonKey)
    
    // Load episodes if not already loaded
    const season = props.seasons.find(s => s['@_key'] === seasonKey || s.key === seasonKey)
    if (season && !season.episodes) {
      const children = await loadChildren(seasonKey)
      season.episodes = children || []
    }
  }
}

const toggleSelectionMode = (seasonKey) => {
  if (selectionMode.value.has(seasonKey)) {
    selectionMode.value.delete(seasonKey)
    selectedEpisodes.value.delete(seasonKey)
  } else {
    selectionMode.value.set(seasonKey, true)
    selectedEpisodes.value.set(seasonKey, new Set())
  }
}

const isEpisodeSelected = (seasonKey, episode) => {
  const episodeId = episode['@_ratingKey'] || episode.ratingKey || episode.key
  return selectedEpisodes.value.get(seasonKey)?.has(episodeId) || false
}

const toggleEpisodeSelection = (seasonKey, episode) => {
  const episodeId = episode['@_ratingKey'] || episode.ratingKey || episode.key
  const selected = selectedEpisodes.value.get(seasonKey) || new Set()
  
  if (selected.has(episodeId)) {
    selected.delete(episodeId)
  } else {
    selected.add(episodeId)
  }
  
  selectedEpisodes.value.set(seasonKey, selected)
}

const getEpisodeStreamUrl = (episode) => {
  const partKey = episode.Media?.[0]?.Part?.[0]?.['@_key'] || episode['@_key']
  const url = getStreamingUrl(episode['@_ratingKey'], partKey)
  return videoService.forceAudioTranscoding(url)
}

const createSeasonM3U = async (season) => {
  try {
    if (!season.episodes || season.episodes.length === 0) {
      showError('Keine Episoden gefunden')
      return
    }
    
    const episodes = season.episodes.map(ep => ({
      title: `${ep['@_grandparentTitle']} - S${ep['@_parentIndex']}E${ep['@_index']} - ${ep['@_title']}`,
      url: getEpisodeStreamUrl(ep),
      duration: ep['@_duration']
    }))
    
    const playlistName = `${season['@_parentTitle']} - ${season['@_title']}`
    m3uService.createEpisodesM3U(episodes, playlistName)
    success('M3U-Playlist für Staffel erstellt')
  } catch (err) {
    showError('M3U-Erstellung fehlgeschlagen')
  }
}

const createSelectedM3U = async (season) => {
  try {
    const seasonKey = season['@_key'] || season.key
    const selected = selectedEpisodes.value.get(seasonKey)
    
    if (!selected || selected.size === 0) {
      showError('Keine Episoden ausgewählt')
      return
    }
    
    const selectedEps = season.episodes.filter(ep => {
      const episodeId = ep['@_ratingKey'] || ep.ratingKey || ep.key
      return selected.has(episodeId)
    })
    
    const episodes = selectedEps.map(ep => ({
      title: `${ep['@_grandparentTitle']} - S${ep['@_parentIndex']}E${ep['@_index']} - ${ep['@_title']}`,
      url: getEpisodeStreamUrl(ep),
      duration: ep['@_duration']
    }))
    
    const playlistName = `${season['@_parentTitle']} - ${season['@_title']} (Auswahl)`
    m3uService.createEpisodesM3U(episodes, playlistName)
    success(`M3U-Playlist mit ${episodes.length} Episoden erstellt`)
    
    // Reset selection
    selectionMode.value.delete(seasonKey)
    selectedEpisodes.value.delete(seasonKey)
  } catch (err) {
    showError('M3U-Erstellung fehlgeschlagen')
  }
}

onMounted(() => {
  // Open first season by default
  if (props.seasons.length > 0) {
    const firstSeasonKey = props.seasons[0]['@_key'] || props.seasons[0].key
    openSeasons.value.add(firstSeasonKey)
  }
})
</script>


