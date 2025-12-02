import { defineStore } from 'pinia'
import { storage } from '@/utils/storage'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    plexToken: null,
    selectedServer: null,
    servers: [],
    isAuthenticated: false
  }),
  
  getters: {
    hasToken: (state) => !!state.plexToken,
    hasServer: (state) => !!state.selectedServer,
    serverUrl: (state) => state.selectedServer?.uri || null,
    serverName: (state) => state.selectedServer?.name || null
  },
  
  actions: {
    setToken(token) {
      this.plexToken = token
      this.isAuthenticated = !!token
      if (token) {
        storage.local.set('plexToken', token)
      } else {
        storage.local.remove('plexToken')
      }
    },
    
    setServers(servers) {
      this.servers = servers
      storage.local.set('plexServers', servers)
    },
    
    setSelectedServer(server) {
      this.selectedServer = server
      if (server) {
        storage.local.set('selectedServer', server)
      } else {
        storage.local.remove('selectedServer')
      }
    },
    
    loadFromStorage() {
      const token = storage.local.get('plexToken')
      const servers = storage.local.get('plexServers') || []
      const selectedServer = storage.local.get('selectedServer')
      
      if (token) {
        this.setToken(token)
      }
      
      if (servers.length > 0) {
        this.servers = servers
      }
      
      if (selectedServer) {
        this.selectedServer = selectedServer
      }
    },
    
    logout() {
      this.plexToken = null
      this.selectedServer = null
      this.servers = []
      this.isAuthenticated = false
      storage.local.clear()
    }
  }
})


