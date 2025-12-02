import { defineStore } from 'pinia'

export const useUIStore = defineStore('ui', {
  state: () => ({
    sidebarOpen: true,
    loading: false,
    message: null,
    messageType: 'info' // 'info', 'success', 'error', 'warning'
  }),
  
  actions: {
    toggleSidebar() {
      this.sidebarOpen = !this.sidebarOpen
    },
    
    setSidebarOpen(open) {
      this.sidebarOpen = open
    },
    
    setLoading(loading) {
      this.loading = loading
    },
    
    showMessage(message, type = 'info') {
      this.message = message
      this.messageType = type
    },
    
    hideMessage() {
      this.message = null
      this.messageType = 'info'
    }
  }
})


