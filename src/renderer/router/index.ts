import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      redirect: '/home'
    },
    {
      path: '/home',
      name: 'Home',
      component: () => import('../views/HomeView.vue')
    },
    {
      path: '/category',
      name: 'Category',
      component: () => import('../views/CategoryView.vue')
    },
    {
      path: '/detail/:id',
      name: 'Detail',
      component: () => import('../views/DetailView.vue')
    },
    {
      path: '/search',
      name: 'Search',
      component: () => import('../views/SearchView.vue')
    },
    {
      path: '/live',
      name: 'Live',
      component: () => import('../views/LiveView.vue')
    },
    {
      path: '/favorites',
      name: 'Favorites',
      component: () => import('../views/FavoritesView.vue')
    },
    {
      path: '/history',
      name: 'History',
      component: () => import('../views/HistoryView.vue')
    },
    {
      path: '/settings',
      name: 'Settings',
      component: () => import('../views/SettingsView.vue')
    }
  ]
})

export default router
