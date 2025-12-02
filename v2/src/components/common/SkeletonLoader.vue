<template>
  <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
    <div
      v-for="i in count"
      :key="i"
      class="bg-netflix-gray rounded-lg overflow-hidden animate-pulse"
    >
      <div class="aspect-video bg-netflix-dark"></div>
      <div class="p-4">
        <div class="h-4 bg-netflix-dark rounded mb-2"></div>
        <div class="h-3 bg-netflix-dark rounded w-2/3"></div>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  count: {
    type: Number,
    default: 10
  }
})
</script>


