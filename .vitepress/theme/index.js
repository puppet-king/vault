import DefaultTheme from 'vitepress/theme';
import { onMounted, watch, nextTick } from 'vue';
import { useRoute } from 'vitepress';
import 'heti/umd/heti.min.css';
import { data as posts } from './posts.data.mjs';
import './custom.css';

const WORD_RE = /[\u4e00-\u9fa5]|[a-zA-Z0-9]+/g;

export default {
  extends: DefaultTheme,
  setup() {
    const route = useRoute();

    const setupProgressAndPreview = () => {
      if (document.querySelector('.vp-reading-progress')) return;

      // 1. 顶部阅读进度条
      const bar = document.createElement('div');
      bar.className = 'vp-reading-progress';
      document.body.appendChild(bar);

      // 2. 内链与文末注释悬浮预览卡片
      const popover = document.createElement('div');
      popover.className = 'vp-link-preview';
      document.body.appendChild(popover);

      let activeAnchor = null;
      const pageCache = new Map();

      const hidePopover = () => {
        activeAnchor = null;
        popover.classList.remove('is-visible');
      };

      window.addEventListener('scroll', () => {
        hidePopover();
        const docHeight = document.documentElement.scrollHeight - window.innerHeight;
        const pct = docHeight > 0 ? Math.min(100, (window.scrollY / docHeight) * 100) : 0;
        bar.style.width = `${pct}%`;
      }, { passive: true });

      document.addEventListener('click', hidePopover, true);

      const showPopover = (rect, title, body) => {
        popover.innerHTML = `${title ? `<div class="vp-link-preview-title">${title}</div>` : ''}<div>${body}</div>`;
        const top = rect.bottom + 8 + 160 > window.innerHeight ? Math.max(8, rect.top - 120) : rect.bottom + 8;
        const left = Math.min(window.innerWidth - 396, Math.max(12, rect.left));
        popover.style.top = `${top}px`;
        popover.style.left = `${left}px`;
        popover.classList.add('is-visible');
      };

      document.addEventListener('mouseover', async e => {
        const a = e.target.closest?.('.vp-doc a');
        if (!a) return;
        activeAnchor = a;
        const href = a.getAttribute('href') || '';
        const rect = a.getBoundingClientRect();

        // 页内锚点/尾注预览（如 #f1n）
        if (href.startsWith('#')) {
          const target = document.getElementById(href.slice(1));
          const p = target?.closest('p');
          if (p) showPopover(rect, `注释 ${a.textContent}`, p.innerText);
          return;
        }

        // 站内链接悬浮预览
        if (href.startsWith('/') || href.startsWith('./') || href.startsWith('../')) {
          if (href.endsWith('.xml')) return;
          try {
            const urlObj = new URL(href, window.location.href);
            const matchedPost = posts.find(p => p.url === urlObj.pathname || `${p.url}index.html` === urlObj.pathname);
            if (matchedPost && matchedPost.description) {
              showPopover(rect, matchedPost.title, matchedPost.description);
              return;
            }

            const url = urlObj.href;
            if (!pageCache.has(url)) {
              const res = await fetch(url);
              const html = await res.text();
              const doc = new DOMParser().parseFromString(html, 'text/html');
              const title = doc.querySelector('.vp-doc h1')?.textContent || doc.title;
              const firstP = Array.from(doc.querySelectorAll('.vp-doc p'))
                .map(el => el.textContent.trim())
                .find(t => t.length > 20) || '';
              pageCache.set(url, { title, excerpt: firstP.slice(0, 140) + (firstP.length > 140 ? '…' : '') });
            }
            if (activeAnchor !== a) return;
            const info = pageCache.get(url);
            if (info?.excerpt) showPopover(rect, info.title, info.excerpt);
          } catch {}
        }
      });

      document.addEventListener('mouseout', e => {
        const a = e.target.closest?.('.vp-doc a');
        if (a && !a.contains(e.relatedTarget)) {
          hidePopover();
        }
      });
    };

    const applyEnhance = async () => {
      document.querySelector('.vp-link-preview')?.classList.remove('is-visible');
      await nextTick();
      setupProgressAndPreview();

      const container = document.querySelector('.vp-doc > div');
      if (!container) return;

      const isEn = route.path.includes('/en');
      container.classList.toggle('heti', !isEn);
      if (!isEn) {
        const { default: Heti } = await import('heti/js/heti-addon.js');
        const heti = new Heti('.vp-doc .heti');
        heti.spacingElements([container]);
      }

      // 3. 字数与阅读时长统计
      container.querySelector('.post-reading-meta')?.remove();
      if (route.path !== '/' && !route.path.startsWith('/about')) {
        const h1 = container.querySelector('h1');
        if (h1) {
          const words = (container.innerText.match(WORD_RE) || []).length;
          const mins = Math.max(1, Math.ceil(words / (isEn ? 220 : 350)));
          const meta = document.createElement('div');
          meta.className = 'post-reading-meta';
          meta.style.cssText = 'color: var(--vp-c-text-2); font-size: 0.88em; margin: -0.25em 0 1.25em; display: flex; align-items: center;';
          const textSpan = document.createElement('span');
          textSpan.textContent = isEn
            ? `${words.toLocaleString()} words · ~${mins} min read`
            : `全篇约 ${words.toLocaleString()} 字 · 预计阅读 ${mins} 分钟`;
          const printBtn = document.createElement('button');
          printBtn.className = 'vp-print-btn';
          printBtn.textContent = isEn ? 'Print' : '打印';
          printBtn.onclick = () => window.print();
          meta.append(textSpan, printBtn);
          h1.insertAdjacentElement('afterend', meta);
        }
      }

      // 4. 代码块自动折叠（超过 8 行的代码块支持一键展开/收起）
      for (const block of container.querySelectorAll('div[class*="language-"]')) {
        if (block.querySelector('.vp-code-toggle')) continue;
        const lines = (block.querySelector('code')?.innerText.split('\n') || []).length;
        if (lines > 8) {
          block.classList.add('is-collapsed');
          const btn = document.createElement('button');
          btn.className = 'vp-code-toggle';
          btn.textContent = `展开全部 (${lines} 行)`;
          btn.onclick = () => {
            const collapsed = block.classList.toggle('is-collapsed');
            btn.textContent = collapsed ? `展开全部 (${lines} 行)` : '收起代码';
          };
          block.appendChild(btn);
        }
      }
    };

    onMounted(applyEnhance);
    watch(() => route.path, applyEnhance);
  }
};
