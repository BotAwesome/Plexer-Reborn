/**
 * LocalStorage and SessionStorage wrapper utilities
 */

export const storage = {
  // LocalStorage methods
  local: {
    get(key) {
      try {
        const item = localStorage.getItem(key)
        return item ? JSON.parse(item) : null
      } catch (error) {
        console.error(`Error reading localStorage key "${key}":`, error)
        return null
      }
    },
    
    set(key, value) {
      try {
        localStorage.setItem(key, JSON.stringify(value))
      } catch (error) {
        console.error(`Error setting localStorage key "${key}":`, error)
      }
    },
    
    remove(key) {
      try {
        localStorage.removeItem(key)
      } catch (error) {
        console.error(`Error removing localStorage key "${key}":`, error)
      }
    },
    
    clear() {
      try {
        localStorage.clear()
      } catch (error) {
        console.error('Error clearing localStorage:', error)
      }
    }
  },
  
  // SessionStorage methods
  session: {
    get(key) {
      try {
        const item = sessionStorage.getItem(key)
        return item ? JSON.parse(item) : null
      } catch (error) {
        console.error(`Error reading sessionStorage key "${key}":`, error)
        return null
      }
    },
    
    set(key, value) {
      try {
        sessionStorage.setItem(key, JSON.stringify(value))
      } catch (error) {
        console.error(`Error setting sessionStorage key "${key}":`, error)
      }
    },
    
    remove(key) {
      try {
        sessionStorage.removeItem(key)
      } catch (error) {
        console.error(`Error removing sessionStorage key "${key}":`, error)
      }
    },
    
    clear() {
      try {
        sessionStorage.clear()
      } catch (error) {
        console.error('Error clearing sessionStorage:', error)
      }
    }
  }
}


