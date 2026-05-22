import { createRouter, createWebHashHistory } from 'vue-router';
import WindowWall from './views/WindowWall.vue';
import AttachedView from './views/AttachedView.vue';
import AgentView from './views/AgentView.vue';

export const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', component: WindowWall },
    { path: '/agent', component: AgentView },
    { path: '/w/:session/:id/:pane?', component: AttachedView, props: true },
  ],
});
