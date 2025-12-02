<template>
  <Transition
    enter-active-class="transition ease-out duration-300"
    enter-from-class="opacity-0 translate-y-2"
    enter-to-class="opacity-100 translate-y-0"
    leave-active-class="transition ease-in duration-200"
    leave-from-class="opacity-100 translate-y-0"
    leave-to-class="opacity-0 translate-y-2"
  >
    <div
      v-if="toast"
      :class="[
        'fixed top-4 right-4 z-50 px-6 py-4 rounded-lg shadow-lg max-w-md',
        toastTypeClasses[toast.type] || toastTypeClasses.info
      ]"
    >
      <div class="flex items-center">
        <span class="mr-3">{{ toast.message }}</span>
        <button
          @click="removeToast(toast.id)"
          class="ml-auto text-white/80 hover:text-white"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  </Transition>
</template>

<script setup>
import { computed } from 'vue'
import { useToast } from '@/composables/useToast'

const { toasts, removeToast } = useToast()

const toast = computed(() => toasts.value[toasts.value.length - 1] || null)

const toastTypeClasses = {
  success: 'bg-green-600 text-white',
  error: 'bg-red-600 text-white',
  warning: 'bg-yellow-600 text-white',
  info: 'bg-blue-600 text-white'
}
</script>



