import { computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import plexService from '@/services/plexService'

/**
 * Composable for Plex API interactions
 */
export function usePlexAPI() {
  const authStore = useAuthStore()
  
  const isInitialized = computed(() => {
    return !!authStore.serverUrl && !!authStore.plexToken
  })
  
  const init = () => {
    if (authStore.serverUrl && authStore.plexToken) {
      plexService.init(authStore.serverUrl, authStore.plexToken)
    }
  }
  
  const authenticate = async (username, password) => {
    return await plexService.authenticate(username, password)
  }
  
  const getServers = async (token) => {
    return await plexService.getServers(token)
  }
  
  const search = async (query, options = {}) => {
    if (!isInitialized.value) {
      init()
    }
    return await plexService.search(query, options)
  }
  
  const getLibrarySections = async () => {
    if (!isInitialized.value) {
      init()
    }
    return await plexService.getLibrarySections()
  }
  
  const getAutocomplete = async (sectionId, query) => {
    if (!isInitialized.value) {
      init()
    }
    return await plexService.getAutocomplete(sectionId, query)
  }
  
  const getFilters = async (sectionId) => {
    if (!isInitialized.value) {
      init()
    }
    return await plexService.getFilters(sectionId)
  }
  
  const getSorts = async (sectionId) => {
    if (!isInitialized.value) {
      init()
    }
    return await plexService.getSorts(sectionId)
  }
  
  const getMediaMetadata = async (mediaKey) => {
    if (!isInitialized.value) {
      init()
    }
    return await plexService.getMediaMetadata(mediaKey)
  }
  
  const getChildren = async (mediaKey) => {
    if (!isInitialized.value) {
      init()
    }
    return await plexService.getChildren(mediaKey)
  }
  
  const getStreamingUrl = (mediaKey, partKey) => {
    if (!isInitialized.value) {
      init()
    }
    return plexService.getStreamingUrl(mediaKey, partKey)
  }
  
  return {
    isInitialized,
    init,
    authenticate,
    getServers,
    search,
    getLibrarySections,
    getAutocomplete,
    getFilters,
    getSorts,
    getMediaMetadata,
    getChildren,
    getStreamingUrl
  }
}


