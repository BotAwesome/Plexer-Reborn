<template>
  <div class="min-h-screen flex items-center justify-center bg-netflix-black">
    <div class="w-full max-w-2xl p-8">
      <div class="text-center mb-8">
        <h1 class="text-3xl font-bold text-netflix-red mb-2">Server auswählen</h1>
        <p class="text-gray-400">Wähle einen Plex Server aus</p>
      </div>
      
      <div v-if="loading" class="flex justify-center py-12">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-netflix-red"></div>
      </div>
      
      <div v-else-if="servers.length === 0" class="bg-netflix-dark p-6 rounded-lg text-center">
        <p class="text-gray-400 mb-4">Keine Server gefunden.</p>
        <button
          @click="loadServers"
          class="px-4 py-2 bg-netflix-gray hover:bg-netflix-gray/80 rounded-lg transition-colors"
        >
          Erneut versuchen
        </button>
      </div>
      
      <div v-else>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            v-for="server in servers"
            :key="server.name"
            @click="selectServer(server)"
            :class="[
              'p-6 bg-netflix-dark rounded-lg border-2 transition-all hover:border-netflix-red',
              selectedServer?.name === server.name ? 'border-netflix-red' : 'border-netflix-gray'
            ]"
          >
            <h3 class="text-xl font-semibold mb-2">{{ server.name }}</h3>
            <p class="text-sm text-gray-400">{{ server.address }}:{{ server.port }}</p>
            <p class="text-xs text-gray-500 mt-1">Version {{ server.version }}</p>
          </button>
        </div>
        
        <div class="mt-6 text-center">
          <button
            @click="loadServers"
            class="px-4 py-2 bg-netflix-gray hover:bg-netflix-gray/80 rounded-lg transition-colors text-sm"
          >
            Server neu laden
          </button>
        </div>
      </div>
      
      <div v-if="error" class="mt-4 p-3 bg-red-900/50 border border-red-500 rounded-lg text-red-200 text-sm">
        {{ error }}
      </div>
      
      <div class="mt-6 text-center">
        <button
          @click="router.push('/login')"
          class="text-sm text-gray-400 hover:text-white transition-colors"
        >
          ← Zurück zum Login
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { usePlexAPI } from '@/composables/usePlexAPI'
import { useToast } from '@/composables/useToast'

const router = useRouter()
const authStore = useAuthStore()
const { getServers } = usePlexAPI()
const { error: showError, success: showSuccess } = useToast()

const servers = ref([])
const selectedServer = ref(null)
const loading = ref(false)
const error = ref(null)

const loadServers = async () => {
  if (!authStore.plexToken) {
    router.push('/login')
    return
  }
  
  loading.value = true
  error.value = null
  
  try {
    const serverList = await getServers(authStore.plexToken)
    servers.value = serverList
    authStore.setServers(serverList)
    
    // Check if there's a previously selected server
    const savedServer = authStore.selectedServer
    if (savedServer && serverList.find(s => s.name === savedServer.name)) {
      selectedServer.value = savedServer
    }
  } catch (err) {
    error.value = 'Fehler beim Laden der Server. Bitte versuche es erneut.'
    showError(error.value)
  } finally {
    loading.value = false
  }
}

const selectServer = (server) => {
  selectedServer.value = server
  authStore.setSelectedServer(server)
  showSuccess(`Server "${server.name}" ausgewählt`)
  
  // Navigate to search
  router.push('/search')
}

onMounted(() => {
  // Load from store if available
  if (authStore.servers.length > 0) {
    servers.value = authStore.servers
    if (authStore.selectedServer) {
      selectedServer.value = authStore.selectedServer
    }
  } else {
    loadServers()
  }
})
</script>



