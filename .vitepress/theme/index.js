import DefaultTheme from 'vitepress/theme';
import { onMounted, watch, nextTick } from 'vue';
import { useRoute, useData } from 'vitepress';
import 'heti/umd/heti.min.css';
import { data as posts } from './posts.data.mjs';
import './custom.css';

const WORD_RE = /[\u4e00-\u9fa5]|[a-zA-Z0-9]+/g;
const SPEEDS = [1, 1.25, 1.5, 2];

const fmtTime = s => {
  if (!Number.isFinite(s) || s < 0) return '--:--';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
};

export default {
  extends: DefaultTheme,
  setup() {
    const route = useRoute();
    const { theme } = useData();
    let currentAudio = null;
    let audioObserver = null;

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

      // 3. 字数、阅读时长统计与极简音频条
      if (currentAudio) {
        currentAudio.pause();
        currentAudio = null;
      }
      if (audioObserver) {
        audioObserver.disconnect();
        audioObserver = null;
      }
      container.querySelector('.post-reading-meta')?.remove();
      container.querySelector('.vp-audio-slot')?.remove();

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

          const isArticle = route.path.startsWith('/translations/') || route.path.startsWith('/posts/');
          const audioBase = theme.value.audioBaseUrl;
          if (isArticle && audioBase) {
            const slug = route.path
              .replace(/\.html$/, '')
              .replace(/\/index$/, '')
              .replace(/^\/+|\/+$/g, '')
              .replace(/\//g, '-');
            const audioUrl = `${audioBase}/${slug}.mp3`;

            const slot = document.createElement('div');
            slot.className = 'vp-audio-slot';

            const player = document.createElement('div');
            player.className = 'vp-audio-player';
            slot.appendChild(player);

            const audio = new Audio(audioUrl);
            audio.preload = 'metadata';
            currentAudio = audio;

            const playBtn = document.createElement('button');
            playBtn.className = 'vp-audio-btn';
            playBtn.type = 'button';
            playBtn.setAttribute('aria-label', isEn ? 'Listen to article' : '朗读全文');
            const playIcon = '▶';
            const pauseIcon = '⏸';
            playBtn.textContent = playIcon;

            const label = document.createElement('span');
            label.className = 'vp-audio-label';
            label.textContent = isEn ? 'Listen' : '听全文';

            const slider = document.createElement('input');
            slider.type = 'range';
            slider.className = 'vp-audio-slider';
            slider.min = '0';
            slider.max = '100';
            slider.step = '0.1';
            slider.value = '0';

            const timeSpan = document.createElement('span');
            timeSpan.className = 'vp-audio-time';
            timeSpan.textContent = '00:00 / --:--';

            let speedIdx = 0;
            const speedBtn = document.createElement('button');
            speedBtn.type = 'button';
            speedBtn.className = 'vp-audio-speed';
            speedBtn.textContent = '1.0x';

            const togglePlay = () => {
              if (audio.paused) audio.play();
              else audio.pause();
            };

            const mainRow = document.createElement('div');
            mainRow.className = 'vp-audio-main';
            mainRow.onclick = togglePlay;
            mainRow.append(playBtn, label);

            const ctrlRow = document.createElement('div');
            ctrlRow.className = 'vp-audio-controls';
            ctrlRow.append(slider, timeSpan, speedBtn);

            audio.onplay = () => {
              playBtn.textContent = pauseIcon;
              label.textContent = isEn ? 'Playing' : '朗读中';
              player.classList.add('is-active');
            };
            audio.onpause = () => {
              playBtn.textContent = playIcon;
              label.textContent = isEn ? 'Listen' : '听全文';
            };
            audio.onended = () => {
              playBtn.textContent = playIcon;
              label.textContent = isEn ? 'Listen' : '听全文';
              slider.value = '0';
              player.classList.remove('is-active');
            };
            audio.onloadedmetadata = () => {
              timeSpan.textContent = `00:00 / ${fmtTime(audio.duration)}`;
            };
            audio.ontimeupdate = () => {
              if (!slider.matches(':active') && audio.duration) {
                slider.value = String((audio.currentTime / audio.duration) * 100);
              }
              timeSpan.textContent = `${fmtTime(audio.currentTime)} / ${fmtTime(audio.duration)}`;
            };
            audio.onerror = () => {
              slot.style.display = 'none';
            };

            slider.oninput = () => {
              if (audio.duration) {
                audio.currentTime = (Number(slider.value) / 100) * audio.duration;
                player.classList.add('is-active');
              }
            };

            speedBtn.onclick = () => {
              speedIdx = (speedIdx + 1) % SPEEDS.length;
              const rate = SPEEDS[speedIdx];
              audio.playbackRate = rate;
              speedBtn.textContent = `${rate % 1 === 0 ? rate.toFixed(1) : rate}x`;
            };

            player.append(mainRow, ctrlRow);
            meta.insertAdjacentElement('afterend', slot);

            audioObserver = new IntersectionObserver(([entry]) => {
              player.classList.toggle('is-floating', !entry.isIntersecting && entry.boundingClientRect.top < 0);
            });
            audioObserver.observe(slot);
          }
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
