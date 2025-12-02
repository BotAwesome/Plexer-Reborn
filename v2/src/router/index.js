import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      redirect: '/login'
    },
    {
      path: '/login',
      name: 'Login',
      component: () => import('@/components/auth/LoginView.vue'),
      meta: { requiresAuth: false }
    },
    {
      path: '/server-select',
      name: 'ServerSelect',
      component: () => import('@/components/auth/ServerSelect.vue'),
      meta: { requiresAuth: false }
    },
    {
      path: '/search',
      name: 'Search',
      component: () => import('@/components/search/SearchView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/media/:type/:id',
      name: 'MediaDetail',
      component: () => import('@/components/media/MediaDetailView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/bookmarks',
      name: 'Bookmarks',
      component: () => import('@/components/bookmarks/BookmarksView.vue'),
      meta: { requiresAuth: true }
    }
  ]
})

// Route guards
router.beforeEach((to, from, next) => {
  const authStore = useAuthStore()
  
  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    next({ name: 'Login' })
  } else if (to.name === 'Login' && authStore.isAuthenticated) {
    next({ name: 'Search' })
  } else {
    next()
  }
})

export default router

