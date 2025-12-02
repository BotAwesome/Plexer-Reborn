import Plyr from 'plyr'
import Hls from 'hls.js'

/**
 * Video Service
 * Handles video player initialization and management
 */
class VideoService {
  /**
   * Initialize Plyr player
   */
  initPlyrPlayer(videoElement, options = {}) {
    const defaultOptions = {
      controls: [
        'play-large',
        'play',
        'progress',
        'current-time',
        'mute',
        'volume',
        'settings',
        'fullscreen'
      ],
      settings: ['quality', 'speed'],
      keyboard: { focused: true, global: false },
      tooltips: { controls: true, seek: true }
    }
    
    return new Plyr(videoElement, { ...defaultOptions, ...options })
  }
  
  /**
   * Initialize HLS player
   */
  initHLSPlayer(videoElement, url) {
    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false
      })
      
      hls.loadSource(url)
      hls.attachMedia(videoElement)
      
      return hls
    } else if (videoElement.canPlayType('application/vnd.apple.mpegurl')) {
      // Native HLS support (Safari)
      videoElement.src = url
      return null
    } else {
      throw new Error('HLS is not supported in this browser')
    }
  }
  
  /**
   * Force audio transcoding for AC-3 compatibility
   */
  forceAudioTranscoding(url) {
    if (!url) return url
    
    try {
      const urlObj = new URL(url)
      urlObj.searchParams.set('audioCodec', 'aac')
      urlObj.searchParams.set('maxAudioBitrate', '192')
      urlObj.searchParams.set('videoCodec', 'h264')
      urlObj.searchParams.set('maxVideoBitrate', '8000')
      urlObj.searchParams.set('container', 'mp4')
      
      if (!urlObj.searchParams.has('session')) {
        urlObj.searchParams.set('session', 'webplayer')
      }
      
      return urlObj.toString()
    } catch (error) {
      console.error('Error forcing audio transcoding:', error)
      return url
    }
  }
  
  /**
   * Cleanup player
   */
  destroyPlayer(player) {
    if (player && typeof player.destroy === 'function') {
      player.destroy()
    }
  }
  
  /**
   * Cleanup HLS player
   */
  destroyHLS(hls) {
    if (hls && typeof hls.destroy === 'function') {
      hls.destroy()
    }
  }
}

export default new VideoService()



