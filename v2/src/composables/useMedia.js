import { ref } from 'vue'
import { useMediaStore } from '@/stores/media'
import { usePlexAPI } from './usePlexAPI'

/**
 * Composable for media operations
 */
export function useMedia() {
  const mediaStore = useMediaStore()
  const { getMediaMetadata, getChildren, getStreamingUrl } = usePlexAPI()
  
  const loading = ref(false)
  const error = ref(null)
  
  /**
   * Load media details
   */
  const loadMediaDetails = async (mediaKey) => {
    loading.value = true
    error.value = null
    
    try {
      const metadata = await getMediaMetadata(mediaKey)
      mediaStore.setCurrentMedia(metadata)
      return metadata
    } catch (err) {
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }
  
  /**
   * Load children (episodes/seasons)
   */
  const loadChildren = async (mediaKey) => {
    loading.value = true
    error.value = null
    
    try {
      const children = await getChildren(mediaKey)
      return children
    } catch (err) {
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }
  
  /**
   * Mark as watched
   */
  const markAsWatched = (mediaId) => {
    mediaStore.markAsWatched(mediaId)
  }
  
  /**
   * Mark as unwatched
   */
  const markAsUnwatched = (mediaId) => {
    mediaStore.markAsUnwatched(mediaId)
  }
  
  /**
   * Check if watched
   */
  const isWatched = (mediaId) => {
    return mediaStore.isWatched(mediaId)
  }
  
  /**
   * Get streaming URL
   */
  const getStreamUrl = (mediaKey, partKey) => {
    return getStreamingUrl(mediaKey, partKey)
  }
  
  return {
    loading,
    error,
    loadMediaDetails,
    loadChildren,
    markAsWatched,
    markAsUnwatched,
    isWatched,
    getStreamUrl
  }
}



