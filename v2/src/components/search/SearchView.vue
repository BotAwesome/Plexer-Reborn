<template>
  <div class="min-h-screen bg-netflix-black">
    <Header>
      <template #search>
        <SearchBar />
      </template>
    </Header>
    
    <Sidebar />
    
    <MainContent>
      <div class="p-8">
        <FilterBar v-if="hasQuery" />
        <SearchResults />
        <SearchHistory v-if="!hasQuery && !hasResults" />
      </div>
    </MainContent>
    
    <MessageToast />
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useSearchStore } from '@/stores/search'
import Header from '@/components/layout/Header.vue'
import Sidebar from '@/components/layout/Sidebar.vue'
import MainContent from '@/components/layout/MainContent.vue'
import SearchBar from './SearchBar.vue'
import FilterBar from './FilterBar.vue'
import SearchResults from './SearchResults.vue'
import SearchHistory from './SearchHistory.vue'
import MessageToast from '@/components/common/MessageToast.vue'

const searchStore = useSearchStore()

const hasQuery = computed(() => searchStore.currentQuery.length > 0)
const hasResults = computed(() => searchStore.hasResults)
</script>

