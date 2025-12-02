import axios from 'axios'
import { XMLParser } from 'fast-xml-parser'
import { useAuthStore } from '@/stores/auth'

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  textNodeName: '#text',
  parseAttributeValue: true
})

/**
 * Plex API Service
 * Handles all Plex API communication using Axios and fast-xml-parser
 */
class PlexService {
  constructor() {
    this.baseURL = null
    this.token = null
  }
  
  /**
   * Initialize service with server URL and token
   */
  init(serverUrl, token) {
    this.baseURL = serverUrl
    this.token = token
  }
  
  /**
   * Get authorization headers
   */
  getHeaders() {
    return {
      'X-Plex-Token': this.token,
      'Accept': 'application/xml'
    }
  }
  
  /**
   * Make API request
   */
  async request(endpoint, params = {}) {
    if (!this.baseURL || !this.token) {
      throw new Error('Plex service not initialized. Call init() first.')
    }
    
    const url = `${this.baseURL}${endpoint}`
    const config = {
      headers: this.getHeaders(),
      params: {
        ...params,
        'X-Plex-Token': this.token
      }
    }
    
    try {
      const response = await axios.get(url, config)
      return parser.parse(response.data)
    } catch (error) {
      console.error('Plex API Error:', error)
      throw error
    }
  }
  
  /**
   * Authenticate with Plex
   */
  async authenticate(username, password) {
    try {
      const response = await axios.post('https://plex.tv/users/sign_in.json', null, {
        auth: {
          username,
          password
        },
        headers: {
          'X-Plex-Client-Identifier': 'plexer-reborn-v2',
          'X-Plex-Product': 'Plexer-Reborn',
          'X-Plex-Version': '2.0.0'
        }
      })
      
      const data = response.data
      return {
        token: data.user.authToken || data.user.authentication_token,
        username: data.user.username
      }
    } catch (error) {
      console.error('Authentication error:', error)
      throw error
    }
  }
  
  /**
   * Get available servers for authenticated user
   */
  async getServers(token) {
    try {
      const response = await axios.get('https://plex.tv/api/v2/resources', {
        headers: {
          'X-Plex-Token': token || this.token,
          'X-Plex-Client-Identifier': 'plexer-reborn-v2',
          'X-Plex-Product': 'Plexer-Reborn',
          'X-Plex-Version': '2.0.0',
          'Accept': 'application/json'
        },
        params: {
          includeHttps: 1,
          includeRelay: 0
        }
      })
      
      const resources = response.data
      console.log('All resources:', resources)
      
      // Filter for servers - check both 'server' and 'plex' provides
      const servers = resources.filter(r => {
        const isServer = r.provides === 'server' || r.product === 'Plex Media Server'
        const isOwned = r.owned === 1 || r.owned === true
        console.log(`Resource: ${r.name}, provides: ${r.provides}, product: ${r.product}, owned: ${r.owned}, isServer: ${isServer}, isOwned: ${isOwned}`)
        return isServer && isOwned
      })
      
      console.log('Filtered servers:', servers)
      
      return servers.map(server => {
        // Prefer non-local connections, fallback to local, then first available
        const connection = server.connections?.find(c => c.local === false) || 
                          server.connections?.find(c => c.local === true) ||
                          server.connections?.[0]
        
        console.log(`Server: ${server.name}, connections:`, server.connections)
        
        return {
          name: server.name,
          uri: connection?.uri || `http://${server.address || connection?.address}:${server.port || connection?.port}`,
          address: connection?.address || server.address,
          port: connection?.port || server.port,
          version: server.productVersion || server.version
        }
      })
    } catch (error) {
      console.error('Get servers error:', error)
      throw error
    }
  }
  
  /**
   * Search for media
   */
  async search(query, options = {}) {
    const params = {
      query: query,
      ...options
    }
    
    return this.request('/search', params)
  }
  
  /**
   * Get library sections
   */
  async getLibrarySections() {
    return this.request('/library/sections')
  }
  
  /**
   * Get autocomplete suggestions
   */
  async getAutocomplete(sectionId, query) {
    return this.request(`/library/sections/${sectionId}/autocomplete`, {
      query: query
    })
  }
  
  /**
   * Get available filters
   */
  async getFilters(sectionId) {
    return this.request(`/library/sections/${sectionId}/filters`)
  }
  
  /**
   * Get available sorts
   */
  async getSorts(sectionId) {
    return this.request(`/library/sections/${sectionId}/sorts`)
  }
  
  /**
   * Get media metadata
   */
  async getMediaMetadata(mediaKey) {
    return this.request(`/library/metadata/${mediaKey}`)
  }
  
  /**
   * Get children (episodes/seasons)
   */
  async getChildren(mediaKey) {
    return this.request(`/library/metadata/${mediaKey}/children`)
  }
  
  /**
   * Get streaming URL for media
   */
  getStreamingUrl(mediaKey, partKey) {
    if (!this.baseURL || !this.token) {
      throw new Error('Plex service not initialized')
    }
    
    return `${this.baseURL}/library/parts/${partKey}?X-Plex-Token=${this.token}`
  }
}

export default new PlexService()


