import { ref, computed } from 'vue'

/**
 * Composable for Electron integration
 * Detects if running in Electron and provides Electron-specific functionality
 */
export function useElectron() {
  const isElectron = computed(() => {
    return typeof window !== 'undefined' && window.process && window.process.type === 'renderer'
  })
  
  const isNode = computed(() => {
    return typeof process !== 'undefined' && process.versions && process.versions.node
  })
  
  /**
   * Check if AC-3 audio is natively supported (Electron only)
   */
  const supportsAC3 = computed(() => {
    return isElectron.value
  })
  
  /**
   * Get Electron API (if available)
   */
  const getElectronAPI = () => {
    if (isElectron.value && window.electron) {
      return window.electron
    }
    return null
  }
  
  /**
   * Send message to Electron main process
   */
  const sendToMain = (channel, data) => {
    const electronAPI = getElectronAPI()
    if (electronAPI && electronAPI.send) {
      electronAPI.send(channel, data)
    }
  }
  
  /**
   * Listen to messages from Electron main process
   */
  const onMainMessage = (channel, callback) => {
    const electronAPI = getElectronAPI()
    if (electronAPI && electronAPI.on) {
      electronAPI.on(channel, callback)
    }
  }
  
  return {
    isElectron,
    isNode,
    supportsAC3,
    getElectronAPI,
    sendToMain,
    onMainMessage
  }
}



