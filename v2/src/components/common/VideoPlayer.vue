<template>
  <div class="fixed inset-0 z-50 bg-black bg-opacity-90 flex items-center justify-center">
    <div class="w-full max-w-6xl mx-4">
      <div class="relative">
        <button
          @click="$emit('close')"
          class="absolute -top-10 right-0 text-white hover:text-gray-300 transition-colors"
        >
          <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        
        <video
          ref="videoElement"
          class="w-full"
          controls
        ></video>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useVideoPlayer } from '@/composables/useVideoPlayer'

const props = defineProps({
  url: {
    type: String,
    required: true
  }
})

const emit = defineEmits(['close'])

const videoElement = ref(null)
const { initPlayer, destroy } = useVideoPlayer()

onMounted(() => {
  if (videoElement.value && props.url) {
    initPlayer(videoElement.value, props.url)
  }
})

onUnmounted(() => {
  destroy()
})
</script>



