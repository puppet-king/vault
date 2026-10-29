import fs from 'node:fs/promises';
import path from 'node:path';
import { defineConfig, createContentLoader } from 'vitepress';
import { works } from './theme/works.mjs';

try {
  process.loadEnvFile('.env');
} catch {}

const SITE_URL = process.env.SITE_URL || 'https://example.com';
const BAIDU_VERIFICATION = process.env.BAIDU_SITE_VERIFICATION || '';
const ICP_NUMBER = process.env.ICP_NUMBER || '';
const SITE_TITLE = 'puppet4105的知识库';
const SITE_DESC = '个人知识库与博客，记录思考、技术随笔、外文精译与独立开发作品。';

async function generateMetaFiles(outDir) {
  const posts = await createContentLoader(['posts/**/*.md', 'translations/**/index.md'], {
    includeSrc: true
  }).load();

  posts.sort((a, b) => new Date(b.frontmatter.date || 0) - new Date(a.frontmatter.date || 0));

  // 1. 生成 rss.xml
  const rssItems = posts
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

  const rssXml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${SITE_TITLE}</title>
    <link>${SITE_URL}</link>
    <description>${SITE_DESC}</description>
    <language>zh-CN</language>
${rssItems}
  </channel>
</rss>
`;

  // 2. 生成 robots.txt
  const robotsTxt = `User-agent: *
Allow: /
Disallow: /stats

Sitemap: ${SITE_URL}/sitemap.xml
# LLMs index: ${SITE_URL}/llms.txt
# LLMs full content: ${SITE_URL}/llms-full.txt
`;

  // 3. 生成 llms.txt（遵循 llmstxt.org 规范）
  const postListMd = posts
    .map(post => {
      const title = post.frontmatter.title || post.url;
      const link = `${SITE_URL}${post.url}`;
      const desc = post.frontmatter.description ? `: ${post.frontmatter.description}` : '';
      return `- [${title}](${link})${desc}`;
    })
    .join('\n');

  const worksListMd = works
    .map(w => `- **${w.name}${w.fullName ? `（${w.fullName}）` : ''}**: ${w.desc || ''}`)
    .join('\n');

  const llmsTxt = `# ${SITE_TITLE}

> ${SITE_DESC}

- [全量知识库正文 (llms-full.txt)](${SITE_URL}/llms-full.txt): 包含本站所有文章与译文的完整 Markdown 正文

## 文章与译文

${postListMd}

## 我的作品（微信小程序）

${worksListMd}
`;

  // 4. 生成 llms-full.txt（全站文章完整 Markdown 聚合）
  const fullSections = posts
    .map(post => {
      const title = post.frontmatter.title || post.url;
      const link = `${SITE_URL}${post.url}`;
      const body = (post.src || '').replace(/^---[\s\S]*?---\s*/, '').trim();
      return `================================================================================\nURL: ${link}\nTITLE: ${title}\n================================================================================\n\n${body}`;
    })
    .join('\n\n\n');

  const llmsFullTxt = `# ${SITE_TITLE} - Full Content\n\n> ${SITE_DESC}\n\n${fullSections}\n`;

  await fs.mkdir(outDir, { recursive: true });
  await Promise.all([
    fs.writeFile(path.join(outDir, 'rss.xml'), rssXml, 'utf8'),
    fs.writeFile(path.join(outDir, 'robots.txt'), robotsTxt, 'utf8'),
    fs.writeFile(path.join(outDir, 'llms.txt'), llmsTxt, 'utf8'),
    fs.writeFile(path.join(outDir, 'llms-full.txt'), llmsFullTxt, 'utf8')
  ]);
}

// 预生成到 public/ 目录，方便本地 dev 模式下也能直接访问
generateMetaFiles(path.resolve('public')).catch(() => {});

export default defineConfig({
  lang: 'zh-CN',
  title: SITE_TITLE,
  description: '个人博客 · 随笔与译文',
  lastUpdated: true,
  head: [
    ['link', { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' }],
    ['link', { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' }],
    ...(BAIDU_VERIFICATION ? [['meta', { name: 'baidu-site-verification', content: BAIDU_VERIFICATION }]] : [])
  ],
  sitemap: {
    hostname: SITE_URL
  },
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
    logo: '/favicon.svg',
    nav: [
      { text: '首页', link: '/' },
      {
        text: '译文',
        items: [
          { text: '品牌时代', link: '/translations/brandage/' },
          { text: '何时去做自己热爱的事', link: '/translations/when/' },
          { text: '超线性回报', link: '/translations/superlinear/' },
          { text: '如何亏掉时间与金钱', link: '/translations/selfindulgence/' }
        ]
      },
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
    },
    footer: {
      copyright: `©2026 puppet4105${ICP_NUMBER ? ` &nbsp;<a href="https://beian.miit.gov.cn/" target="_blank" rel="noopener noreferrer">${ICP_NUMBER}</a>` : ''}`
    }
  },
  async buildEnd(siteConfig) {
    await generateMetaFiles(siteConfig.outDir);
  }
});
