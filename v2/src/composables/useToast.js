import { ref } from 'vue'
import { eventBus } from '@/utils/eventBus'

/**
 * Composable for toast notifications
 */
export function useToast() {
  const toasts = ref([])
  
  /**
   * Show toast message
   */
  const showToast = (message, type = 'info', duration = 3000) => {
    const toast = {
      id: Date.now(),
      message,
      type,
      duration
    }
    
    toasts.value.push(toast)
    
    // Auto remove after duration
    if (duration > 0) {
      setTimeout(() => {
        removeToast(toast.id)
      }, duration)
    }
    
    // Emit event
    eventBus.emit('toast', toast)
    
    return toast.id
  }
  
  /**
   * Remove toast
   */
  const removeToast = (id) => {
    const index = toasts.value.findIndex(t => t.id === id)
    if (index > -1) {
      toasts.value.splice(index, 1)
    }
  }
  
  /**
   * Clear all toasts
   */
  const clearToasts = () => {
    toasts.value = []
  }
  
  /**
   * Show success toast
   */
  const success = (message, duration = 3000) => {
    return showToast(message, 'success', duration)
  }
  
  /**
   * Show error toast
   */
  const error = (message, duration = 5000) => {
    return showToast(message, 'error', duration)
  }
  
  /**
   * Show info toast
   */
  const info = (message, duration = 3000) => {
    return showToast(message, 'info', duration)
  }
  
  /**
   * Show warning toast
   */
  const warning = (message, duration = 4000) => {
    return showToast(message, 'warning', duration)
  }
  
  return {
    toasts,
    showToast,
    removeToast,
    clearToasts,
    success,
    error,
    info,
    warning
  }
}

