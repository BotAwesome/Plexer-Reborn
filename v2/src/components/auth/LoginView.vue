<template>
  <div class="min-h-screen flex items-center justify-center bg-netflix-black">
    <div class="w-full max-w-md p-8">
      <div class="text-center mb-8">
        <h1 class="text-4xl font-bold text-netflix-red mb-2">Plexer-Reborn</h1>
        <p class="text-gray-400">V2 - Modern Plex Client</p>
      </div>
      
      <form @submit.prevent="handleLogin" class="bg-netflix-dark p-6 rounded-lg">
        <div class="mb-4">
          <label for="username" class="block text-sm font-medium mb-2">
            Benutzername
          </label>
          <input
            id="username"
            v-model="username"
            type="text"
            required
            class="w-full px-4 py-2 bg-netflix-gray border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-netflix-red"
            placeholder="Plex Benutzername"
          />
        </div>
        
        <div class="mb-6">
          <label for="password" class="block text-sm font-medium mb-2">
            Passwort
          </label>
          <input
            id="password"
            v-model="password"
            type="password"
            required
            class="w-full px-4 py-2 bg-netflix-gray border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-netflix-red"
            placeholder="Plex Passwort"
          />
        </div>
        
        <button
          type="submit"
          :disabled="loading"
          class="w-full bg-netflix-red text-white py-3 rounded-lg font-semibold hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span v-if="loading">Anmelden...</span>
          <span v-else>Anmelden</span>
        </button>
        
        <div v-if="error" class="mt-4 p-3 bg-red-900/50 border border-red-500 rounded-lg text-red-200 text-sm">
          {{ error }}
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { usePlexAPI } from '@/composables/usePlexAPI'
import { useToast } from '@/composables/useToast'

const router = useRouter()
const authStore = useAuthStore()
const { authenticate, getServers } = usePlexAPI()
const { error: showError, success: showSuccess } = useToast()

const username = ref('')
const password = ref('')
const loading = ref(false)
const error = ref(null)

const handleLogin = async () => {
  loading.value = true
  error.value = null
  
  try {
    // Authenticate
    const authResult = await authenticate(username.value, password.value)
    authStore.setToken(authResult.token)
    
    // Get servers
    const servers = await getServers(authResult.token)
    authStore.setServers(servers)
    
    showSuccess('Erfolgreich angemeldet!')
    
    // Navigate to server selection
    router.push('/server-select')
  } catch (err) {
    error.value = err.response?.data?.error || 'Anmeldung fehlgeschlagen. Bitte überprüfe deine Anmeldedaten.'
    showError(error.value)
  } finally {
    loading.value = false
  }
}
</script>



