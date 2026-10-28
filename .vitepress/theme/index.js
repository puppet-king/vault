import DefaultTheme from 'vitepress/theme';
import { onMounted, watch, nextTick } from 'vue';
import { useRoute } from 'vitepress';
import 'heti/umd/heti.min.css';
import './custom.css';

export default {
  extends: DefaultTheme,
  setup() {
    const route = useRoute();
    const applyHeti = async () => {
      await nextTick();
      const container = document.querySelector('.vp-doc > div');
      if (!container) return;
      const isEn = route.path.includes('/en');
      container.classList.toggle('heti', !isEn);
      if (!isEn) {
        const { default: Heti } = await import('heti/js/heti-addon.js');
        const heti = new Heti('.vp-doc .heti');
        heti.spacingElements([container]);
      }
    };
    onMounted(applyHeti);
    watch(() => route.path, applyHeti);
  }
};
