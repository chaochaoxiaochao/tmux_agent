import { createRouter, createWebHashHistory } from 'vue-router';
import WindowWall from './views/WindowWall.vue';
import AttachedView from './views/AttachedView.vue';

export const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', component: WindowWall },
    { path: '/w/:id', component: AttachedView, props: true },
  ],
});
