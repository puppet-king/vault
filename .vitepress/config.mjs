import fs from 'node:fs/promises';
import path from 'node:path';
import { defineConfig, createContentLoader } from 'vitepress';

const SITE_URL = 'https://docs.juqingsong.cn';

async function generateRss(outDir) {
  const posts = await createContentLoader(['posts/**/*.md', 'translations/**/index.md'], {
    excerpt: true,
    render: true
  }).load();

  posts.sort((a, b) => new Date(b.frontmatter.date || 0) - new Date(a.frontmatter.date || 0));

  const items = posts
    .map(post => {
      const title = post.frontmatter.title || post.url;
      const link = `${SITE_URL}${post.url}`;
      const pubDate = post.frontmatter.date ? new Date(post.frontmatter.date).toUTCString() : new Date().toUTCString();
      const desc = post.frontmatter.description || '';
      return `    <item>
      <title><![CDATA[${title}]]></title>
      <link>${link}</link>
      <guid>${link}</guid>
      <pubDate>${pubDate}</pubDate>
      <description><![CDATA[${desc}]]></description>
    </item>`;
    })
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>知识库</title>
    <link>${SITE_URL}</link>
    <description>个人知识库 · 随笔与译文</description>
    <language>zh-CN</language>
${items}
  </channel>
</rss>
`;

  await fs.mkdir(outDir, { recursive: true });
  await fs.writeFile(path.join(outDir, 'rss.xml'), xml, 'utf8');
}

// 预生成一份到 public/rss.xml，方便 dev 模式下直接访问 /rss.xml
generateRss(path.resolve('public')).catch(() => {});

export default defineConfig({
  lang: 'zh-CN',
  title: '知识库',
  description: '个人博客 · 随笔与译文',
  lastUpdated: true,
  markdown: {
    math: true,
    config(md) {
      // 支持 ==荧光笔高亮== 语法
      md.core.ruler.after('inline', 'mark_highlight', state => {
        for (const token of state.tokens) {
          if (token.type !== 'inline' || !token.children) continue;
          for (const child of token.children) {
            if (child.type === 'text' && child.content.includes('==')) {
              child.type = 'html_inline';
              child.content = child.content.replace(/==([^=\n]+)==/g, '<mark class="vp-mark">$1</mark>');
            }
          }
        }
      });
    }
  },
  themeConfig: {
    nav: [
      { text: '首页', link: '/' },
      { text: '译文', link: '/translations/superlinear/' },
      { text: '作品', link: '/works' },
      { text: '关于', link: '/about' },
      { text: 'RSS', link: '/rss.xml', target: '_blank' }
    ],
    search: {
      provider: 'local',
      options: {
        translations: {
          button: { buttonText: '搜索文档', buttonAriaLabel: '搜索文档' },
          modal: {
            noResultsText: '无法找到相关结果',
            resetButtonTitle: '清除查询条件',
            footer: { selectText: '选择', navigateText: '切换', closeText: '关闭' }
          }
        }
      }
    },
    lastUpdated: {
      text: '最后更新于',
      formatOptions: { dateStyle: 'short', timeStyle: 'short' }
    },
    socialLinks: [
      { icon: 'github', link: 'https://github.com/puppet-king/vault' }
    ],
    outline: {
      level: [2, 3],
      label: '目录'
    }
  },
  async buildEnd(siteConfig) {
    await generateRss(siteConfig.outDir);
  }
});
