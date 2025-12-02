import { defineStore } from 'pinia'
import { storage } from '@/utils/storage'

export const useBookmarksStore = defineStore('bookmarks', {
  state: () => ({
    bookmarks: []
  }),
  
  getters: {
    hasBookmarks: (state) => state.bookmarks.length > 0,
    isBookmarked: (state) => (mediaId) => {
      return state.bookmarks.some(bookmark => bookmark.id === mediaId)
    }
  },
  
  actions: {
    loadBookmarks() {
      const saved = storage.local.get('bookmarks')
      if (saved && Array.isArray(saved)) {
        this.bookmarks = saved
      }
    },
    
    addBookmark(media) {
      if (this.isBookmarked(media.id)) return
      
      this.bookmarks.push({
        id: media.id,
        type: media.type,
        title: media.title,
        year: media.year,
        thumb: media.thumb,
        addedAt: new Date().toISOString()
      })
      
      this.saveBookmarks()
    },
    
    removeBookmark(mediaId) {
      this.bookmarks = this.bookmarks.filter(bookmark => bookmark.id !== mediaId)
      this.saveBookmarks()
    },
    
    saveBookmarks() {
      storage.local.set('bookmarks', this.bookmarks)
    },
    
    clearBookmarks() {
      this.bookmarks = []
      storage.local.remove('bookmarks')
    }
  }
})


