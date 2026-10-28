import { defineConfig } from 'vitepress';

export default defineConfig({
  lang: 'zh-CN',
  title: '知识库',
  description: '个人博客 · 随笔与译文',
  themeConfig: {
    nav: [
      { text: '首页', link: '/' },
      { text: '随笔', link: '/posts/hello-world' },
      { text: '译文', link: '/translations/superlinear/' },
      { text: '关于', link: '/about' }
    ],
    socialLinks: [
      { icon: 'github', link: 'https://github.com/puppet-king/vault' }
    ],
    outline: {
      label: '目录'
    }
  }
});
