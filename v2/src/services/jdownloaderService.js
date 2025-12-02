/**
 * JDownloader Service
 * Handles integration with JDownloader via HTTP API
 */
class JDownloaderService {
  constructor() {
    this.baseURL = 'http://localhost:9666'
  }
  
  /**
   * Check if JDownloader is available
   */
  async isAvailable() {
    try {
      const response = await fetch(`${this.baseURL}/jd/check`)
      return response.ok
    } catch (error) {
      return false
    }
  }
  
  /**
   * Add links to JDownloader
   */
  async addLinks(urls, packageName = 'Plexer-Reborn') {
    try {
      const response = await fetch(`${this.baseURL}/jd/addLinks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          links: urls,
          packageName: packageName
        })
      })
      
      if (!response.ok) {
        throw new Error('Failed to add links to JDownloader')
      }
      
      return await response.json()
    } catch (error) {
      console.error('JDownloader error:', error)
      throw error
    }
  }
  
  /**
   * Add single link
   */
  async addLink(url, filename) {
    return this.addLinks([url], filename)
  }
}

export default new JDownloaderService()


