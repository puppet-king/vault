---
title: 首页
---

<script setup>
import { data as posts } from './.vitepress/theme/posts.data.mjs'
</script>

# Vault

记录思考、技术随笔与外文精译。

## 全部文章

<ul>
  <li v-for="post in posts" :key="post.url" style="margin-bottom: 1.25em;">
    <span style="color: var(--vp-c-text-2); font-family: monospace; margin-right: 0.75em;">{{ post.date }}</span>
    <span style="font-size: 0.85em; padding: 0.1em 0.5em; border-radius: 4px; background: var(--vp-c-bg-soft); margin-right: 0.5em;">{{ post.category }}</span>
    <a :href="post.url" style="font-weight: 600;">{{ post.title }}</a>
    <p v-if="post.description" style="margin: 0.25em 0 0; color: var(--vp-c-text-2); font-size: 0.92em;">{{ post.description }}</p>
  </li>
</ul>
