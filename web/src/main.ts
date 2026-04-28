import { createApp } from 'vue';
import App from './App.vue';
import { router } from './router';
import './style.css';

createApp(App).use(router).mount('#app');

// Mobile keyboard handling: 100dvh is unreliable across Android WebViews.
// Force #app height to match visualViewport.height whenever it changes.
// Result: when soft keyboard appears, the app shrinks to fit the visible area
// instead of staying full-screen with the keyboard covering content.
(function bindViewport() {
  const vv = (window as any).visualViewport as VisualViewport | undefined;
  if (!vv) return;
  const apply = () => {
    const el = document.getElementById('app');
    if (!el) return;
    el.style.height = `${vv.height}px`;
  };
  apply();
  vv.addEventListener('resize', apply);
  vv.addEventListener('scroll', apply);
})();
