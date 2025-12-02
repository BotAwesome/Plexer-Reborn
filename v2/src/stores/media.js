import { defineStore } from 'pinia'
import { storage } from '@/utils/storage'

export const useMediaStore = defineStore('media', {
  state: () => ({
    currentMedia: null,
    watchedItems: new Set()
  }),
  
  getters: {
    isWatched: (state) => (mediaId) => {
      return state.watchedItems.has(mediaId)
    }
  },
  
  actions: {
    setCurrentMedia(media) {
      this.currentMedia = media
    },
    
    markAsWatched(mediaId) {
      this.watchedItems.add(mediaId)
      this.saveWatchedItems()
    },
    
    markAsUnwatched(mediaId) {
      this.watchedItems.delete(mediaId)
      this.saveWatchedItems()
    },
    
    loadWatchedItems() {
      const watched = storage.session.get('watchedItems')
      if (watched && Array.isArray(watched)) {
        this.watchedItems = new Set(watched)
      }
    },
    
    saveWatchedItems() {
      storage.session.set('watchedItems', Array.from(this.watchedItems))
    }
  }
})


