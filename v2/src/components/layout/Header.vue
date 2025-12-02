<template>
  <header class="sticky top-0 z-40 bg-netflix-dark border-b border-netflix-gray">
    <div class="flex items-center justify-between px-4 md:px-6 py-4">
      <!-- Sidebar Toggle -->
      <button
        @click="toggleSidebar"
        class="p-2 rounded-lg hover:bg-netflix-gray transition-colors"
        aria-label="Toggle Sidebar"
      >
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>
      
      <!-- Search Bar (if on search page) -->
      <div v-if="showSearch" class="flex-1 max-w-2xl mx-4 md:mx-8">
        <slot name="search"></slot>
      </div>
      
      <!-- User Info -->
      <div class="flex items-center space-x-2 md:space-x-4">
        <span class="text-xs md:text-sm text-gray-400 hidden sm:inline">{{ serverName }}</span>
        <div class="w-8 h-8 bg-netflix-red rounded-full flex items-center justify-center text-sm font-bold">
          {{ serverInitial }}
        </div>
      </div>
    </div>
  </header>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useUIStore } from '@/stores/ui'
import { useAuthStore } from '@/stores/auth'

const route = useRoute()
const uiStore = useUIStore()
const authStore = useAuthStore()

const showSearch = computed(() => route.name === 'Search')
const serverName = computed(() => authStore.serverName || 'Kein Server')
const serverInitial = computed(() => {
  const name = authStore.serverName || 'P'
  return name.charAt(0).toUpperCase()
})

const toggleSidebar = () => {
  uiStore.toggleSidebar()
}
</script>


