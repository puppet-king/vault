---
title: 我的作品
---

<script setup>
import { works } from './.vitepress/theme/works.mjs'
</script>

# 我的作品

微信扫一扫下方小程序码即可体验：

<div class="vp-works-grid">
  <div v-for="item in works" :key="item.name" class="vp-work-card">
    <img :src="item.qrcode" :alt="item.name" class="vp-work-qr" />
    <div class="vp-work-name">{{ item.name }}</div>
    <div v-if="item.desc" class="vp-work-desc">{{ item.desc }}</div>
  </div>
</div>
