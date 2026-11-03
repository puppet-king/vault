<script setup>
import { ref, computed, onBeforeUnmount } from 'vue';

const props = defineProps({
  mode: {
    type: String,
    default: 'direction' // 'direction' | 'power' | 'overshoot'
  }
});

// Cubic Bezier mathematical evaluator
function createCubicBezier(x1, y1, x2, y2) {
  if (x1 === y1 && x2 === y2) return (t) => t;
  const sampleCurveX = (t) => (((1 - 3 * x2 + 3 * x1) * t + (3 * x2 - 6 * x1)) * t + 3 * x1) * t;
  const sampleCurveY = (t) => (((1 - 3 * y2 + 3 * y1) * t + (3 * y2 - 6 * y1)) * t + 3 * y1) * t;
  const sampleCurveDerivativeX = (t) => (3 * (1 - 3 * x2 + 3 * x1) * t + 2 * (3 * x2 - 6 * x1)) * t + 3 * x1;

  const solveCurveX = (x) => {
    let t2 = x;
    for (let i = 0; i < 8; i++) {
      const x2Val = sampleCurveX(t2) - x;
      if (Math.abs(x2Val) < 1e-6) return t2;
      const d2 = sampleCurveDerivativeX(t2);
      if (Math.abs(d2) < 1e-6) break;
      t2 = t2 - x2Val / d2;
    }
    let t0 = 0, t1 = 1;
    t2 = x;
    while (t0 < t1) {
      const x2Val = sampleCurveX(t2);
      if (Math.abs(x2Val - x) < 1e-6) return t2;
      if (x > x2Val) t0 = t2;
      else t1 = t2;
      t2 = (t1 - t0) * 0.5 + t0;
    }
    return t2;
  };

  return (t) => {
    if (t <= 0) return 0;
    if (t >= 1) return 1;
    return sampleCurveY(solveCurveX(t));
  };
}

function bounceOut(x) {
  const n1 = 7.5625;
  const d1 = 2.75;
  if (x < 1 / d1) return n1 * x * x;
  if (x < 2 / d1) return n1 * (x -= 1.5 / d1) * x + 0.75;
  if (x < 2.5 / d1) return n1 * (x -= 2.25 / d1) * x + 0.9375;
  return n1 * (x -= 2.625 / d1) * x + 0.984375;
}

function elasticOut(x) {
  const c4 = (2 * Math.PI) / 3;
  return x === 0 ? 0 : x === 1 ? 1 : Math.pow(2, -10 * x) * Math.sin((x * 10 - 0.75) * c4) + 1;
}

const PRESETS = {
  direction: {
    title: '动效方向与加减速对比（同屏频闪轨迹 + 实时演示）',
    subtitle: '轨道上的圆点代表每 10% 时间间隔的频闪快照：圆点越稀疏代表此刻速度越快，圆点越密集代表正在减速刹车。',
    items: [
      {
        id: 'linear',
        name: 'linear（匀速）',
        css: 'linear',
        tag: '机械生硬 · 仅用于旋转/进度条',
        color: '#64748b',
        eval: (t) => t,
        desc: '全程等距匀速，起止瞬间无物理惯性，用于弹窗或抽屉位移会显得机械生硬。'
      },
      {
        id: 'easeOutCubic',
        name: 'ease-out（缓出 · Cubic）',
        css: 'cubic-bezier(0.215, 0.61, 0.355, 1)',
        tag: '✅ 进场首选 · 先快后慢',
        color: '#2563eb',
        eval: createCubicBezier(0.215, 0.61, 0.355, 1),
        desc: '前半段点位稀疏（瞬间高速响应点击），后半段点位密集（平稳摩擦停靠），适合弹窗/抽屉展开。'
      },
      {
        id: 'easeInCubic',
        name: 'ease-in（缓入 · Cubic）',
        css: 'cubic-bezier(0.55, 0.055, 0.675, 0.19)',
        tag: '✅ 退场首选 · 先慢后快',
        color: '#d97706',
        eval: createCubicBezier(0.55, 0.055, 0.675, 0.19),
        desc: '前半段点位密集（微蓄力启动），后半段点位稀疏（全速飞出屏幕），适合关闭弹窗与删除卡片。'
      },
      {
        id: 'easeInOutCubic',
        name: 'ease-in-out（缓入缓出）',
        css: 'cubic-bezier(0.645, 0.045, 0.355, 1)',
        tag: '✅ 屏内位移 · 慢-快-慢',
        color: '#059669',
        eval: createCubicBezier(0.645, 0.045, 0.355, 1),
        desc: '首尾两端点位密集、中段稀疏，适合起点和终点都在屏幕内的状态切换（如 Tab 滑块、手风琴折叠）。'
      }
    ]
  },
  power: {
    title: '缓出曲线（Ease-Out）的 6 级陡峭度阶梯对比（Sine → Expo）',
    subtitle: '次方数越高，前 20% 时间内冲出的距离越远（初速度爆发力越强），后 80% 时间的阻尼收尾越绵长。',
    items: [
      {
        id: 'easeOutSine',
        name: '1级 · easeOutSine（正弦）',
        css: 'cubic-bezier(0.39, 0.575, 0.565, 1)',
        tag: '最温和 · 颜色/透明度渐变',
        color: '#64748b',
        eval: createCubicBezier(0.39, 0.575, 0.565, 1),
        desc: '斜率变化最平缓，适合背景色过渡、阴影呼吸、透明度渐变等不需要明显顿挫感的氛围动画。'
      },
      {
        id: 'easeOutQuad',
        name: '2级 · easeOutQuad（二次方）',
        css: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        tag: '轻柔 · 按钮/小浮层 (<40px)',
        color: '#0891b2',
        eval: createCubicBezier(0.25, 0.46, 0.45, 0.94),
        desc: '轻巧柔和的减速感，适合按钮 Hover 上浮、Tooltip 提示框、下拉小菜单等短距离微交互。'
      },
      {
        id: 'easeOutCubic',
        name: '3级 · easeOutCubic（三次方）',
        css: 'cubic-bezier(0.215, 0.61, 0.355, 1)',
        tag: '最常用 · 通用卡片/模态框',
        color: '#2563eb',
        eval: createCubicBezier(0.215, 0.61, 0.355, 1),
        desc: '启动速度与收尾减速比较均衡，适合大多数卡片入场、居中模态框弹出与通知横幅。'
      },
      {
        id: 'easeOutQuart',
        name: '4级 · easeOutQuart（四次方）',
        css: 'cubic-bezier(0.165, 0.84, 0.44, 1)',
        tag: '干脆利落 · 底部抽屉/侧边栏',
        color: '#7c3aed',
        eval: createCubicBezier(0.165, 0.84, 0.44, 1),
        desc: '初速度更快、阻尼感更强，贴近原生移动端系统半屏抽屉与页面推入（Push）的物理质感。'
      },
      {
        id: 'easeOutQuint',
        name: '5级 · easeOutQuint（五次方）',
        css: 'cubic-bezier(0.23, 1, 0.32, 1)',
        tag: '强爆发力 · 跨屏大图滑入',
        color: '#db2777',
        eval: createCubicBezier(0.23, 1, 0.32, 1),
        desc: '前 20% 时间即走完 75% 路程，随后进入细腻的慢速微滑，适合全屏抽屉或长距离视觉位移。'
      },
      {
        id: 'easeOutExpo',
        name: '6级 · easeOutExpo（指数级）',
        css: 'cubic-bezier(0.19, 1, 0.22, 1)',
        tag: '闪电响应 · 需配 450ms+ 时长',
        color: '#e11d48',
        eval: createCubicBezier(0.19, 1, 0.22, 1),
        desc: '近乎瞬移起步后缓慢悬停，极具现代科技感，但必须搭配 450ms~600ms 时长才不会显得像闪现。'
      }
    ]
  },
  overshoot: {
    title: '终点形态对比：精准停靠 vs 微过冲回弹（Back） vs 物理振荡（Elastic / Bounce）',
    subtitle: '注意观察右侧 100% 终点虚线：冲出虚线右侧的区域即为“过冲回弹（Overshoot）”。',
    items: [
      {
        id: 'easeOutCubic',
        name: 'easeOutCubic（精准停靠）',
        css: 'cubic-bezier(0.215, 0.61, 0.355, 1)',
        tag: '稳重克制 · 绝不越界',
        color: '#2563eb',
        eval: createCubicBezier(0.215, 0.61, 0.355, 1),
        desc: '严格停在 100% 边界，适合贴边抽屉、顶部导航栏（防止过冲导致底部边缘脱离屏幕漏出穿帮背景）。'
      },
      {
        id: 'easeOutBack',
        name: 'easeOutBack（微过冲回弹）',
        css: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
        tag: '✨ 灵动活泼 · 越界约 10% 后回正',
        color: '#8b5cf6',
        eval: createCubicBezier(0.175, 0.885, 0.32, 1.275),
        desc: '控制点 y2 = 1.275 > 1，冲过终点约 10% 后柔和回弹一次，极适合居中气泡、徽章解锁、气泡菜单。'
      },
      {
        id: 'elasticOut',
        name: 'elasticOut（物理弹簧振荡）',
        css: 'linear(0, 1.15 20%, 0.93 40%, 1.03 60%, 0.99 80%, 1)',
        tag: '多次往复振荡 · 适合小图标',
        color: '#d97706',
        eval: elasticOut,
        desc: '围绕 100% 终点多次正弦衰减摆动，适合点赞心形放大、消息图标摇晃提醒，不建议用于大面积弹窗。'
      },
      {
        id: 'bounceOut',
        name: 'bounceOut（重力落地反弹）',
        css: 'linear(0, 1 36%, 0.75 54%, 1 72%, 0.94 81%, 1 90%, 0.98 95%, 1)',
        tag: '🏀 触底反弹 · 不越过 100% 边界',
        color: '#e11d48',
        eval: bounceOut,
        desc: '模拟硬物撞击 100% 地面后多次向内弹起衰减，适合游戏化掉落奖励或趣味空状态插画。'
      }
    ]
  }
};

const config = computed(() => PRESETS[props.mode] || PRESETS.direction);
const selectedIdx = ref(props.mode === 'direction' ? 1 : props.mode === 'power' ? 2 : 1);
const durationMs = ref(1000);
const isPlaying = ref(false);
const currentT = ref(1);
const showLabIframe = ref(false);

const STROBE_STEPS = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9];

function getSvgCurvePath(item, w = 180, h = 110, padX = 14, padY = 20) {
  const pts = [];
  const plotW = w - padX * 2;
  const plotH = h - padY * 2;
  for (let i = 0; i <= 50; i++) {
    const t = i / 50;
    const y = item.eval(t);
    const xPos = (padX + t * plotW).toFixed(1);
    const yPos = (padY + (1 - y) * plotH).toFixed(1);
    pts.push(`${i === 0 ? 'M' : 'L'}${xPos},${yPos}`);
  }
  return pts.join(' ');
}

function getStrobePositions(item) {
  return STROBE_STEPS.map(t => ({
    t,
    pct: Math.max(0, Math.min(1.18, item.eval(t))) * 82
  }));
}

let rafId = null;
function playOnce(idx = null) {
  if (idx !== null) selectedIdx.value = idx;
  if (rafId) cancelAnimationFrame(rafId);

  const start = performance.now();
  const dur = durationMs.value;
  isPlaying.value = true;
  currentT.value = 0;

  const step = (now) => {
    const elapsed = now - start;
    const t = Math.min(1, elapsed / dur);
    currentT.value = t;
    if (t < 1) {
      rafId = requestAnimationFrame(step);
    } else {
      isPlaying.value = false;
      rafId = null;
    }
  };
  rafId = requestAnimationFrame(step);
}

onBeforeUnmount(() => {
  if (rafId) cancelAnimationFrame(rafId);
});
</script>

<template>
  <div v-if="props.mode === 'lab'" class="ced-card ced-lab-card no-print">
    <div class="ced-header" style="border-bottom: none; margin-bottom: 0; padding-bottom: 0;">
      <div>
        <div class="ced-title">🧪 39 种 CSS 动画缓动曲线全景交互实验室</div>
        <div class="ced-subtitle">
          支持底部抽屉、卡片位移、弹窗缩放三种 UI 场景实时预览，内置自定义 cubic-bezier(x1, y1, x2, y2) 控制点拖拽与 CSS 代码一键复制。
        </div>
      </div>
      <div class="ced-controls">
        <button type="button" class="ced-play-btn" @click="showLabIframe = !showLabIframe">
          {{ showLabIframe ? '收起页内实验室' : '▶ 在页内展开实验室' }}
        </button>
        <a
          href="/demos/css-easing.html"
          target="_blank"
          rel="noopener noreferrer"
          class="ced-ext-btn"
        >
          ↗ 新窗口全屏打开
        </a>
      </div>
    </div>
    <div v-if="showLabIframe" class="ced-iframe-wrap">
      <iframe
        src="/demos/css-easing.html"
        title="CSS 动画缓动曲线可视化实验室"
        class="ced-iframe"
        loading="lazy"
      ></iframe>
    </div>
  </div>

  <div v-else class="ced-card">
    <div class="ced-header">
      <div>
        <div class="ced-title">{{ config.title }}</div>
        <div class="ced-subtitle">{{ config.subtitle }}</div>
      </div>
      <div class="ced-controls no-print">
        <select v-model.number="durationMs" class="ced-select" aria-label="动画时长">
          <option :value="500">500ms（正常）</option>
          <option :value="1000">1000ms（慢放）</option>
          <option :value="1800">1800ms（超慢帧）</option>
        </select>
        <button type="button" class="ced-play-btn" @click="playOnce()">
          <span>{{ isPlaying ? '↻ 重新触发' : '▶ 播放对比' }}</span>
        </button>
      </div>
    </div>

    <div class="ced-tracks">
      <div
        v-for="(item, idx) in config.items"
        :key="item.id"
        class="ced-track-row"
        :class="{ 'is-active': idx === selectedIdx }"
        @click="playOnce(idx)"
      >
        <!-- Left Mini SVG Curve Thumbnail -->
        <div class="ced-mini-chart">
          <svg viewBox="0 0 64 48" class="ced-mini-svg">
            <rect x="6" y="9" width="52" height="30" fill="none" stroke="currentColor" stroke-opacity="0.2" stroke-dasharray="2,2" />
            <line x1="6" y1="39" x2="58" y2="9" stroke="currentColor" stroke-opacity="0.15" stroke-width="1" />
            <path
              :d="getSvgCurvePath(item, 64, 48, 6, 9)"
              fill="none"
              :stroke="item.color"
              stroke-width="2.2"
              stroke-linecap="round"
            />
          </svg>
        </div>

        <!-- Right Content: Header + Track + Description & CSS Code -->
        <div class="ced-row-main">
          <div class="ced-track-meta">
            <div class="ced-name-wrap">
              <span class="ced-track-name" :style="{ color: item.color }">{{ item.name }}</span>
              <code class="ced-inline-code">{{ item.css }}</code>
            </div>
            <span class="ced-track-tag">{{ item.tag }}</span>
          </div>

          <div class="ced-track-bar">
            <div class="ced-line-start"></div>
            <div class="ced-line-target">
              <span class="ced-target-label">100%</span>
            </div>

            <!-- Stroboscopic Ghost Trail Dots (Always visible on screen & print) -->
            <span
              v-for="dot in getStrobePositions(item)"
              :key="dot.t"
              class="ced-strobe-dot"
              :style="{ left: `${4 + dot.pct}%`, backgroundColor: item.color }"
            ></span>

            <!-- Animated Puck -->
            <div
              class="ced-puck"
              :style="{
                left: `${4 + item.eval(currentT) * 82}%`,
                backgroundColor: item.color
              }"
            ></div>
          </div>

          <div class="ced-row-desc">{{ item.desc }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.ced-card {
  margin: 1.5rem 0;
  padding: 1.1rem 1.25rem;
  border-radius: 14px;
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
}

.ced-header {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 0.9rem;
  padding-bottom: 0.7rem;
  border-bottom: 1px solid var(--vp-c-divider);
}

.ced-title {
  font-size: 0.96rem;
  font-weight: 700;
  color: var(--vp-c-text-1);
}

.ced-subtitle {
  font-size: 0.78rem;
  color: var(--vp-c-text-2);
  margin-top: 0.2rem;
}

.ced-controls {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-shrink: 0;
}

.ced-select {
  height: 30px;
  padding: 0 0.5rem;
  border-radius: 7px;
  font-size: 0.76rem;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  border: 1px solid var(--vp-c-divider);
  cursor: pointer;
}

.ced-play-btn {
  height: 30px;
  padding: 0 0.8rem;
  border-radius: 7px;
  font-size: 0.78rem;
  font-weight: 600;
  background: var(--vp-c-brand-1);
  color: #fff;
  border: none;
  cursor: pointer;
  transition: opacity 0.15s;
}

.ced-play-btn:hover {
  opacity: 0.9;
}

.ced-ext-btn {
  display: inline-flex;
  align-items: center;
  height: 30px;
  padding: 0 0.75rem;
  border-radius: 7px;
  font-size: 0.78rem;
  font-weight: 600;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  border: 1px solid var(--vp-c-divider);
  text-decoration: none !important;
  transition: border-color 0.15s;
}

.ced-ext-btn:hover {
  border-color: var(--vp-c-brand-1);
  color: var(--vp-c-brand-1);
}

.ced-iframe-wrap {
  margin-top: 1rem;
  border-radius: 10px;
  overflow: hidden;
  border: 1px solid var(--vp-c-divider);
}

.ced-iframe {
  width: 100%;
  height: 760px;
  border: 0;
  display: block;
}

.ced-tracks {
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
}

.ced-track-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.55rem 0.75rem;
  border-radius: 10px;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  cursor: pointer;
  transition: border-color 0.15s;
}

.ced-track-row.is-active {
  border-color: var(--vp-c-brand-1);
}

.ced-mini-chart {
  width: 64px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--vp-c-bg-soft);
  border-radius: 7px;
  padding: 2px;
}

.ced-mini-svg {
  width: 64px;
  height: 48px;
  display: block;
  color: var(--vp-c-text-3);
}

.ced-row-main {
  flex: 1;
  min-width: 0;
}

.ced-track-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.4rem;
  margin-bottom: 0.3rem;
}

.ced-name-wrap {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.45rem;
}

.ced-track-name {
  font-family: var(--vp-font-family-mono);
  font-size: 0.82rem;
  font-weight: 700;
}

.ced-inline-code {
  font-size: 0.7rem;
  padding: 0.08rem 0.35rem;
  border-radius: 4px;
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-2);
}

.ced-track-tag {
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--vp-c-text-2);
}

.ced-track-bar {
  position: relative;
  height: 20px;
  border-radius: 6px;
  background: var(--vp-c-bg-soft);
  overflow: hidden;
  margin-bottom: 0.3rem;
}

.ced-line-start {
  position: absolute;
  left: 4%;
  top: 0;
  bottom: 0;
  width: 1px;
  background: var(--vp-c-divider);
}

.ced-line-target {
  position: absolute;
  left: 86%;
  top: 0;
  bottom: 0;
  border-left: 1.5px dashed var(--vp-c-text-3);
}

.ced-target-label {
  position: absolute;
  left: 4px;
  top: 1px;
  font-size: 9px;
  font-family: var(--vp-font-family-mono);
  color: var(--vp-c-text-3);
}

.ced-strobe-dot {
  position: absolute;
  top: 50%;
  width: 5px;
  height: 5px;
  border-radius: 50%;
  transform: translate(-50%, -50%);
  opacity: 0.32;
  pointer-events: none;
}

.ced-puck {
  position: absolute;
  top: 50%;
  width: 12px;
  height: 12px;
  border-radius: 3.5px;
  transform: translate(-50%, -50%);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.25);
  border: 1.5px solid #fff;
  z-index: 2;
}

.ced-row-desc {
  font-size: 0.75rem;
  line-height: 1.45;
  color: var(--vp-c-text-2);
}

@media (max-width: 640px) {
  .ced-track-row {
    flex-direction: column;
    align-items: stretch;
  }
  .ced-mini-chart {
    width: 100%;
  }
}

@media print {
  .no-print {
    display: none !important;
  }
  .ced-card,
  .ced-track-row {
    break-inside: avoid;
    page-break-inside: avoid;
  }
  .ced-strobe-dot {
    opacity: 0.65 !important;
  }
}
</style>
