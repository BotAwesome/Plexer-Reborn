<template>
  <main
    :class="[
      'transition-all duration-300',
      sidebarOpen ? 'md:ml-64 ml-0' : 'ml-0'
    ]"
  >
    <slot></slot>
  </main>
</template>

<script setup>
import { computed } from 'vue'
import { useUIStore } from '@/stores/ui'

const uiStore = useUIStore()
const sidebarOpen = computed(() => uiStore.sidebarOpen)
</script>


