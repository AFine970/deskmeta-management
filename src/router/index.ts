// router/index.ts
import { createRouter, createWebHashHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'Home',
    component: () => import('../ui/views/Home.vue')
  },
  {
    path: '/layout',
    name: 'LayoutDesigner',
    component: () => import('../ui/views/LayoutDesigner.vue')
  },
  {
    path: '/students',
    name: 'StudentManagement',
    component: () => import('../ui/views/StudentManagement.vue')
  },
  {
    path: '/fill',
    name: 'SeatFill',
    component: () => import('../ui/views/SeatFill.vue')
  },
  {
    path: '/animation',
    name: 'Animation',
    component: () => import('../ui/views/AnimationView.vue')
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

export default router
