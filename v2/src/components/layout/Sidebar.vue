<template>
  <aside
    :class="[
      'fixed left-0 top-0 h-full bg-netflix-dark z-50 transition-transform duration-300',
      sidebarOpen ? 'translate-x-0' : '-translate-x-full',
      'w-64 border-r border-netflix-gray'
    ]"
  >
    <div class="flex flex-col h-full">
      <!-- Logo -->
      <div class="p-6 border-b border-netflix-gray">
        <h1 class="text-2xl font-bold text-netflix-red">Plexer-Reborn</h1>
        <p class="text-sm text-gray-400">V2</p>
      </div>
      
      <!-- Navigation -->
      <nav class="flex-1 p-4">
        <ul class="space-y-2">
          <li>
            <router-link
              to="/search"
              class="flex items-center px-4 py-3 rounded-lg transition-colors hover:bg-netflix-gray"
              active-class="bg-netflix-gray text-netflix-red"
            >
              <svg class="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              Suche
            </router-link>
          </li>
          <li>
            <router-link
              to="/bookmarks"
              class="flex items-center px-4 py-3 rounded-lg transition-colors hover:bg-netflix-gray"
              active-class="bg-netflix-gray text-netflix-red"
            >
              <svg class="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
              Bookmarks
            </router-link>
          </li>
        </ul>
      </nav>
      
      <!-- User Actions -->
      <div class="p-4 border-t border-netflix-gray">
        <button
          @click="handleLogout"
          class="w-full flex items-center px-4 py-3 rounded-lg transition-colors hover:bg-netflix-gray text-red-400"
        >
          <svg class="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l-4-4m0 0l-4 4m4-4v12" />
          </svg>
          Abmelden
        </button>
      </div>
    </div>
  </aside>
</template>

<script setup>
import { computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useUIStore } from '@/stores/ui'
import { useRouter } from 'vue-router'

const authStore = useAuthStore()
const uiStore = useUIStore()
const router = useRouter()

const sidebarOpen = computed(() => uiStore.sidebarOpen)

const handleLogout = () => {
  authStore.logout()
  router.push('/login')
}
</script>


