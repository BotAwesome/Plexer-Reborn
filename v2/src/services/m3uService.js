/**
 * M3U Service
 * Handles M3U playlist generation
 */
class M3UService {
  /**
   * Generate M3U playlist content
   */
  generateM3UContent(items, playlistName = 'Plexer-Reborn Playlist') {
    let content = '#EXTM3U\n'
    content += `#PLAYLIST:${playlistName}\n\n`
    
    items.forEach((item, index) => {
      content += `#EXTINF:${item.duration || -1},${item.title}\n`
      content += `${item.url}\n\n`
    })
    
    return content
  }
  
  /**
   * Download M3U file
   */
  downloadM3U(items, filename = 'playlist.m3u', playlistName = 'Plexer-Reborn Playlist') {
    const content = this.generateM3UContent(items, playlistName)
    const blob = new Blob([content], { type: 'audio/x-mpegurl' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
  }
  
  /**
   * Create M3U for movie
   */
  createMovieM3U(movie) {
    const items = [{
      title: movie.title,
      url: movie.streamingUrl,
      duration: movie.duration
    }]
    
    this.downloadM3U(items, `${movie.title}.m3u`, movie.title)
  }
  
  /**
   * Create M3U for episodes
   */
  createEpisodesM3U(episodes, playlistName) {
    const items = episodes.map(episode => ({
      title: episode.title,
      url: episode.streamingUrl,
      duration: episode.duration
    }))
    
    this.downloadM3U(items, `${playlistName}.m3u`, playlistName)
  }
}

export default new M3UService()



