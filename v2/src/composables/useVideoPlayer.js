import { ref, onUnmounted } from 'vue'
import videoService from '@/services/videoService'

/**
 * Composable for video player functionality
 */
export function useVideoPlayer() {
  const player = ref(null)
  const hls = ref(null)
  const videoElement = ref(null)
  const isPlaying = ref(false)
  const isLoading = ref(false)
  
  /**
   * Initialize player
   */
  const initPlayer = (element, url, options = {}) => {
    videoElement.value = element
    
    // Force audio transcoding for AC-3 compatibility
    const transcodedUrl = videoService.forceAudioTranscoding(url)
    
    // Initialize HLS if needed
    if (transcodedUrl.includes('.m3u8') || transcodedUrl.includes('hls')) {
      hls.value = videoService.initHLSPlayer(element, transcodedUrl)
    } else {
      element.src = transcodedUrl
    }
    
    // Initialize Plyr
    player.value = videoService.initPlyrPlayer(element, options)
    
    // Event listeners
    player.value.on('play', () => {
      isPlaying.value = true
    })
    
    player.value.on('pause', () => {
      isPlaying.value = false
    })
    
    player.value.on('ready', () => {
      isLoading.value = false
    })
    
    player.value.on('loadstart', () => {
      isLoading.value = true
    })
  }
  
  /**
   * Play video
   */
  const play = () => {
    if (player.value) {
      player.value.play()
    }
  }
  
  /**
   * Pause video
   */
  const pause = () => {
    if (player.value) {
      player.value.pause()
    }
  }
  
  /**
   * Destroy player
   */
  const destroy = () => {
    if (hls.value) {
      videoService.destroyHLS(hls.value)
      hls.value = null
    }
    
    if (player.value) {
      videoService.destroyPlayer(player.value)
      player.value = null
    }
    
    if (videoElement.value) {
      videoElement.value = null
    }
    
    isPlaying.value = false
    isLoading.value = false
  }
  
  // Cleanup on unmount
  onUnmounted(() => {
    destroy()
  })
  
  return {
    player,
    hls,
    videoElement,
    isPlaying,
    isLoading,
    initPlayer,
    play,
    pause,
    destroy
  }
}

