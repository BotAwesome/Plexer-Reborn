/**
 * Download Service
 * Handles direct downloads of media files
 */
class DownloadService {
  /**
   * Download a single file
   */
  async downloadFile(url, filename) {
    try {
      const response = await fetch(url)
      const blob = await response.blob()
      const downloadUrl = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = downloadUrl
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(downloadUrl)
    } catch (error) {
      console.error('Download error:', error)
      throw error
    }
  }
  
  /**
   * Download multiple files
   */
  async downloadFiles(urls, filenames) {
    for (let i = 0; i < urls.length; i++) {
      await this.downloadFile(urls[i], filenames[i])
      // Small delay between downloads
      await new Promise(resolve => setTimeout(resolve, 500))
    }
  }
}

export default new DownloadService()



