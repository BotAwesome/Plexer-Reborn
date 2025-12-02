<template>
  <div id="app" class="min-h-screen bg-netflix-black custom-scrollbar">
    <ErrorBoundary>
      <router-view v-slot="{ Component }">
        <Transition name="fade" mode="out-in">
          <component :is="Component" />
        </Transition>
      </router-view>
    </ErrorBoundary>
    <MessageToast />
  </div>
</template>

<script setup>
import ErrorBoundary from './components/common/ErrorBoundary.vue'
import MessageToast from './components/common/MessageToast.vue'
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>


