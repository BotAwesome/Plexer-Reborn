const { contextBridge, ipcRenderer } = require('electron')

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electron', {
  // Send messages to main process
  send: (channel, data) => {
    const validChannels = ['app-message']
    if (validChannels.includes(channel)) {
      ipcRenderer.send(channel, data)
    }
  },
  
  // Receive messages from main process
  on: (channel, func) => {
    const validChannels = ['app-message']
    if (validChannels.includes(channel)) {
      ipcRenderer.on(channel, (event, ...args) => func(...args))
    }
  },
  
  // Invoke methods (async)
  invoke: async (channel, ...args) => {
    const validChannels = ['get-app-version', 'get-platform']
    if (validChannels.includes(channel)) {
      return await ipcRenderer.invoke(channel, ...args)
    }
  },
  
  // Check if running in Electron
  isElectron: true,
  
  // Platform info
  platform: process.platform
})

