<template>
  <div v-if="hasError" class="min-h-screen flex items-center justify-center bg-netflix-black p-8">
    <div class="max-w-md w-full bg-netflix-dark rounded-lg p-8 text-center">
      <svg class="w-16 h-16 mx-auto mb-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
      <h2 class="text-2xl font-bold mb-2 text-netflix-red">Fehler aufgetreten</h2>
      <p class="text-gray-400 mb-6">{{ errorMessage }}</p>
      <button
        @click="retry"
        class="px-6 py-3 bg-netflix-red rounded-lg hover:bg-red-700 transition-colors"
      >
        Erneut versuchen
      </button>
    </div>
  </div>
  <slot v-else></slot>
</template>

<script setup>
import { ref, onErrorCaptured } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const hasError = ref(false)
const errorMessage = ref('')

onErrorCaptured((err) => {
  hasError.value = true
  errorMessage.value = err.message || 'Ein unerwarteter Fehler ist aufgetreten'
  console.error('Error captured:', err)
  return false
})

const retry = () => {
  hasError.value = false
  errorMessage.value = ''
  router.go(0)
}
</script>

