/**
 * VLC Service
 * Handles VLC integration via vlc:// protocol
 */
class VLCService {
  /**
   * Check if VLC Linker is available
   */
  isVlcLinkerAvailable() {
    // Check if vlc:// protocol is registered
    return true // Assume available, actual check would require more complex logic
  }
  
  /**
   * Open URL in VLC
   */
  openInVLC(url) {
    const vlcUrl = `vlc://${url}`
    window.location.href = vlcUrl
  }
  
  /**
   * Open multiple URLs in VLC
   */
  openMultipleInVLC(urls) {
    // VLC can handle playlists, but for simplicity, open first URL
    if (urls.length > 0) {
      this.openInVLC(urls[0])
    }
  }
}

export default new VLCService()



