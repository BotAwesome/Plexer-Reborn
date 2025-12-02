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
      const response = await axios.post('https://plex.tv/users/sign_in.xml', {
        user: {
          login: username,
          password: password
        }
      }, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        auth: {
          username,
          password
        }
      })
      
      const data = parser.parse(response.data)
      return {
        token: data.user['@_authenticationToken'],
        username: data.user['@_username']
      }
    } catch (error) {
      console.error('Authentication error:', error)
      throw error
    }
  }
  
  /**
   * Get available servers for authenticated user
   */
  async getServers() {
    try {
      const response = await axios.get('https://plex.tv/api/servers', {
        headers: {
          'X-Plex-Token': this.token
        }
      })
      
      const data = parser.parse(response.data)
      const servers = Array.isArray(data.MediaContainer.Server)
        ? data.MediaContainer.Server
        : [data.MediaContainer.Server]
      
      return servers.map(server => ({
        name: server['@_name'],
        uri: server['@_uri'],
        address: server['@_address'],
        port: server['@_port'],
        version: server['@_version']
      }))
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

