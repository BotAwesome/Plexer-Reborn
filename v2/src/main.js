import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import { useAuthStore } from './stores/auth'
import { useMediaStore } from './stores/media'
import './styles/main.css'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)

// Initialize stores
const authStore = useAuthStore()
const mediaStore = useMediaStore()

// Load persisted data
authStore.loadFromStorage()
mediaStore.loadWatchedItems()

app.mount('#app')

