---
title: 首页
---

<script setup>
import { ref, computed } from 'vue'
import { data as posts } from './.vitepress/theme/posts.data.mjs'

const activeTag = ref('')

const allTags = computed(() => {
  const counts = {}
  for (const post of posts) {
    for (const tag of post.tags) {
      counts[tag] = (counts[tag] || 0) + 1
    }
  }
  return Object.entries(counts).map(([name, count]) => ({ name, count }))
})

const filteredPosts = computed(() =>
  activeTag.value ? posts.filter(p => p.tags.includes(activeTag.value)) : posts
)
</script>

# Vault

记录思考、技术随笔与外文精译。

<div v-if="allTags.length" style="display: flex; flex-wrap: wrap; gap: 0.5rem; margin: 1.25rem 0;">
  <button
    @click="activeTag = ''"
    :style="{
      padding: '0.2rem 0.65rem',
      borderRadius: '999px',
      fontSize: '0.85rem',
      cursor: 'pointer',
      border: '1px solid var(--vp-c-divider)',
      background: activeTag === '' ? 'var(--vp-c-brand-1)' : 'var(--vp-c-bg-soft)',
      color: activeTag === '' ? '#fff' : 'var(--vp-c-text-1)'
    }"
  >
    全部 ({{ posts.length }})
  </button>
  <button
    v-for="tag in allTags"
    :key="tag.name"
    @click="activeTag = activeTag === tag.name ? '' : tag.name"
    :style="{
      padding: '0.2rem 0.65rem',
      borderRadius: '999px',
      fontSize: '0.85rem',
      cursor: 'pointer',
      border: '1px solid var(--vp-c-divider)',
      background: activeTag === tag.name ? 'var(--vp-c-brand-1)' : 'var(--vp-c-bg-soft)',
      color: activeTag === tag.name ? '#fff' : 'var(--vp-c-text-1)'
    }"
  >
    {{ tag.name }} ({{ tag.count }})
  </button>
</div>

## 文章列表

<ul>
  <li v-for="post in filteredPosts" :key="post.url" style="margin-bottom: 1.25em;">
    <span style="color: var(--vp-c-text-2); font-family: monospace; margin-right: 0.75em;">{{ post.date }}</span>
    <a :href="post.url" style="font-weight: 600;">{{ post.title }}</a>
    <span
      v-for="tag in post.tags"
      :key="tag"
      @click="activeTag = tag"
      style="font-size: 0.8em; padding: 0.1em 0.45em; border-radius: 4px; background: var(--vp-c-bg-soft); margin-left: 0.4em; cursor: pointer; color: var(--vp-c-brand-1);"
    >
      {{ tag }}
    </span>
    <p v-if="post.description" style="margin: 0.25em 0 0; color: var(--vp-c-text-2); font-size: 0.92em;">{{ post.description }}</p>
  </li>
</ul>
