import DefaultTheme from 'vitepress/theme';
import { onMounted, watch, nextTick } from 'vue';
import { useRoute } from 'vitepress';
import 'heti/umd/heti.min.css';
import './custom.css';

const WORD_RE = /[\u4e00-\u9fa5]|[a-zA-Z0-9]+/g;

export default {
  extends: DefaultTheme,
  setup() {
    const route = useRoute();
    const applyEnhance = async () => {
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

      // 在文章详情页标题下方插入字数与阅读时长统计
      container.querySelector('.post-reading-meta')?.remove();
      if (route.path !== '/' && !route.path.startsWith('/about')) {
        const h1 = container.querySelector('h1');
        if (h1) {
          const words = (container.innerText.match(WORD_RE) || []).length;
          const mins = Math.max(1, Math.ceil(words / (isEn ? 220 : 350)));
          const meta = document.createElement('div');
          meta.className = 'post-reading-meta';
          meta.style.cssText = 'color: var(--vp-c-text-2); font-size: 0.88em; margin: -0.25em 0 1.25em;';
          meta.textContent = isEn
            ? `${words.toLocaleString()} words · ~${mins} min read`
            : `全篇约 ${words.toLocaleString()} 字 · 预计阅读 ${mins} 分钟`;
          h1.insertAdjacentElement('afterend', meta);
        }
      }
    };
    onMounted(applyEnhance);
    watch(() => route.path, applyEnhance);
  }
};
