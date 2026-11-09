---
title: 首页
---

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { data as posts } from './.vitepress/theme/posts.data.mjs'
import { works } from './.vitepress/theme/works.mjs'

const activeTag = ref('')
const isExpanded = ref(false)
const maxVisibleCount = ref(8)
const measureContainerRef = ref(null)
const measureBtnRefs = ref([])

const allTags = computed(() => {
  const counts = {}
  for (const post of posts) {
    for (const tag of post.tags) {
      counts[tag] = (counts[tag] || 0) + 1
    }
  }
  return Object.entries(counts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'zh-CN'))
})

const needsExpand = computed(() => allTags.value.length > maxVisibleCount.value)
const hiddenCount = computed(() => Math.max(0, allTags.value.length - maxVisibleCount.value))
const visibleTags = computed(() =>
  isExpanded.value ? allTags.value : allTags.value.slice(0, maxVisibleCount.value)
)

const filteredPosts = computed(() =>
  activeTag.value ? posts.filter(p => p.tags.includes(activeTag.value)) : posts
)

function measureTwoRows() {
  const container = measureContainerRef.value
  const btns = measureBtnRefs.value
  if (!container || !btns || !btns.length) return

  const containerWidth = container.clientWidth
  if (!containerWidth) return

  const rowTops = []
  for (const btn of btns) {
    if (!btn) continue
    const top = btn.offsetTop
    if (!rowTops.some(t => Math.abs(t - top) <= 4)) {
      rowTops.push(top)
    }
  }

  if (rowTops.length <= 2) {
    maxVisibleCount.value = allTags.value.length
    return
  }

  const secondRowTop = rowTops[1]
  const toggleBtnReserveWidth = 112 // 预留第2行末尾「展开 (+N) ▾」按钮与间距宽度
  let fitCount = 0

  for (let i = 0; i < btns.length; i++) {
    const btn = btns[i]
    if (!btn) continue
    const top = btn.offsetTop
    if (top < secondRowTop - 4) {
      fitCount = i + 1
    } else if (Math.abs(top - secondRowTop) <= 4) {
      if (btn.offsetLeft + btn.offsetWidth + toggleBtnReserveWidth <= containerWidth) {
        fitCount = i + 1
      }
    } else {
      break
    }
  }

  maxVisibleCount.value = Math.max(3, fitCount)
}

function selectTagFromPost(tag) {
  activeTag.value = tag
  const idx = allTags.value.findIndex(t => t.name === tag)
  if (idx >= maxVisibleCount.value) {
    isExpanded.value = true
  }
}

onMounted(() => {
  nextTick(() => {
    measureTwoRows()
  })
  window.addEventListener('resize', measureTwoRows)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', measureTwoRows)
})
</script>

# puppet4105的知识库

记录思考、技术随笔与外文精译。

<div v-if="allTags.length" style="position: relative; margin: 1.25rem 0;">
  <!-- 隐藏的测量层：始终完整渲染以精确计算前 2 行可容纳的标签数 -->
  <div
    ref="measureContainerRef"
    aria-hidden="true"
    style="position: absolute; top: 0; left: 0; width: 100%; visibility: hidden; pointer-events: none; display: flex; flex-wrap: wrap; gap: 0.5rem; z-index: -1;"
  >
    <span style="padding: 0.2rem 0.65rem; font-size: 0.85rem; white-space: nowrap; border: 1px solid transparent;">
      全部 ({{ posts.length }})
    </span>
    <span
      v-for="(tag, idx) in allTags"
      :key="'m-' + tag.name"
      :ref="el => { if (el) measureBtnRefs[idx] = el }"
      style="padding: 0.2rem 0.65rem; font-size: 0.85rem; white-space: nowrap; border: 1px solid transparent;"
    >
      {{ tag.name }} ({{ tag.count }})
    </span>
  </div>
  <!-- 实际展示的标签栏 -->
  <div style="display: flex; flex-wrap: wrap; gap: 0.5rem;">
    <button
      @click="activeTag = ''"
      :style="{
        padding: '0.2rem 0.65rem',
        borderRadius: '999px',
        fontSize: '0.85rem',
        cursor: 'pointer',
        whiteSpace: 'nowrap',
        border: '1px solid var(--vp-c-divider)',
        background: activeTag === '' ? 'var(--vp-c-brand-1)' : 'var(--vp-c-bg-soft)',
        color: activeTag === '' ? '#fff' : 'var(--vp-c-text-1)'
      }"
    >
      全部 ({{ posts.length }})
    </button>
    <button
      v-for="tag in visibleTags"
      :key="tag.name"
      @click="activeTag = activeTag === tag.name ? '' : tag.name"
      :style="{
        padding: '0.2rem 0.65rem',
        borderRadius: '999px',
        fontSize: '0.85rem',
        cursor: 'pointer',
        whiteSpace: 'nowrap',
        border: '1px solid var(--vp-c-divider)',
        background: activeTag === tag.name ? 'var(--vp-c-brand-1)' : 'var(--vp-c-bg-soft)',
        color: activeTag === tag.name ? '#fff' : 'var(--vp-c-text-1)'
      }"
    >
      {{ tag.name }} ({{ tag.count }})
    </button>
    <button
      v-if="needsExpand"
      @click="isExpanded = !isExpanded"
      :style="{
        padding: '0.2rem 0.7rem',
        borderRadius: '999px',
        fontSize: '0.82rem',
        fontWeight: 500,
        cursor: 'pointer',
        whiteSpace: 'nowrap',
        border: '1px dashed var(--vp-c-brand-1)',
        background: 'transparent',
        color: 'var(--vp-c-brand-1)'
      }"
    >
      {{ isExpanded ? '收起 ▴' : `展开 (+${hiddenCount}) ▾` }}
    </button>
  </div>
</div>

## 文章列表

<ul>
  <li v-for="post in filteredPosts" :key="post.url" style="margin-bottom: 1.25em;">
    <a :href="post.url" style="font-weight: 600;">{{ post.title }}</a>
    <span style="color: var(--vp-c-text-3); font-size: 0.82em; margin-left: 0.6em;">
      {{ post.words }} 字 · 约 {{ post.readingTime }} 分钟
    </span>
    <span
      v-for="tag in post.tags"
      :key="tag"
      @click="selectTagFromPost(tag)"
      style="font-size: 0.8em; padding: 0.1em 0.45em; border-radius: 4px; background: var(--vp-c-bg-soft); margin-left: 0.4em; cursor: pointer; color: var(--vp-c-brand-1);"
    >
      {{ tag }}
    </span>
    <p v-if="post.description" style="margin: 0.25em 0 0; color: var(--vp-c-text-2); font-size: 0.92em;">{{ post.description }}</p>
  </li>
</ul>

## 我的作品

<div class="vp-works-grid">
  <div v-for="item in works" :key="item.name" class="vp-work-card">
    <img :src="item.qrcode" :alt="item.fullName || item.name" class="vp-work-qr" />
    <div class="vp-work-name">{{ item.name }}</div>
    <div v-if="item.fullName" class="vp-work-fullname">{{ item.fullName }}</div>
    <div v-if="item.desc" class="vp-work-desc">{{ item.desc }}</div>
    <a
      v-if="item.link"
      :href="item.link"
      target="_blank"
      rel="noopener noreferrer"
      class="vp-work-more"
    >查看更多 →</a>
  </div>
</div>
