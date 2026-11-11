import fsSync from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import { defineConfig, createContentLoader } from 'vitepress';
import { works } from './theme/works.mjs';

try {
  process.loadEnvFile('.env');
} catch {}

let audioDurations = {};
try {
  const rawCache = JSON.parse(fsSync.readFileSync('.vitepress/cache/tts-uploaded.json', 'utf8'));
  for (const [k, v] of Object.entries(rawCache)) {
    if (v?.duration > 0) audioDurations[k] = v.duration;
  }
} catch {}

const SITE_URL = process.env.SITE_URL || 'https://example.com';
const BAIDU_VERIFICATION = process.env.BAIDU_SITE_VERIFICATION || '';
const ICP_NUMBER = process.env.ICP_NUMBER || '';
const QINIU_DOMAIN = (process.env.QINIU_DOMAIN || '').replace(/\/+$/, '');
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
  srcExclude: ['README.md', 'README-zh.md', '.agent/**', '.agents/**'],
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
      // 支持 ==荧光笔高亮== 语法（兼容内部含行内代码）及修复中文括号旁 **加粗** 失效问题
      const applyPairTag = (children, marker, openTag, closeTag) => {
        let count = 0;
        for (const child of children) {
          if (child.type === 'text' || child.type === 'html_inline') {
            count += child.content.split(marker).length - 1;
          }
        }
        if (count < 2) return;
        let pairsLeft = Math.floor(count / 2) * 2;
        let isOpen = false;
        for (const child of children) {
          if ((child.type === 'text' || child.type === 'html_inline') && child.content.includes(marker) && pairsLeft > 0) {
            child.type = 'html_inline';
            const parts = child.content.split(marker);
            let out = '';
            for (let i = 0; i < parts.length; i++) {
              out += parts[i];
              if (i < parts.length - 1) {
                if (pairsLeft > 0) {
                  out += isOpen ? closeTag : openTag;
                  isOpen = !isOpen;
                  pairsLeft--;
                } else {
                  out += marker;
                }
              }
            }
            child.content = out;
          }
        }
      };

      md.core.ruler.after('inline', 'mark_highlight', state => {
        for (const token of state.tokens) {
          if (token.type !== 'inline' || !token.children) continue;
          applyPairTag(token.children, '==', '<mark class="vp-mark">', '</mark>');
          applyPairTag(token.children, '**', '<strong>', '</strong>');
        }
      });
    }
  },
  themeConfig: {
    logo: '/favicon.svg',
    audioBaseUrl: QINIU_DOMAIN ? `${QINIU_DOMAIN}/vault/audio` : '',
    audioDurations,
    nav: [
      { text: '首页', link: '/' },
      {
        text: '随笔',
        items: [
          { text: 'CSS 动画缓动曲线指南', link: '/posts/css-easing/' }
        ]
      },
      {
        text: '译文',
        items: [
          { text: '如何反驳（反驳金字塔）', link: '/translations/disagree/' },
          { text: '如何制定真正有效的设计原则', link: '/translations/developing-design-principles/' },
          { text: '你脑海中的头号念头', link: '/translations/top-idea/' },
          { text: '创造者与管理者的时间表', link: '/translations/makersschedule/' },
          { text: '迪特·拉姆斯：好设计的十项原则', link: '/translations/dieter-rams-10-principles/' },
          { text: '乔尔测试：12 步写出好代码', link: '/translations/joel-test/' },
          { text: '好产品经理，坏产品经理', link: '/translations/good-pm-bad-pm/' },
          { text: '打造一亿美元公司的五种方式', link: '/translations/five-ways-to-100m/' },
          { text: '抽象漏洞法则', link: '/translations/leaky-abstractions/' },
          { text: '十年学会编程', link: '/translations/21-days/' },
          { text: '金钱心理学', link: '/translations/the-psychology-of-money/' },
          { text: '默认存活还是默认死亡？', link: '/translations/aord/' },
          { text: '深度工作的苦与乐', link: '/translations/deep-work/' },
          { text: '杰维斯法则', link: '/translations/gervais-principle/' },
          { text: '如何不靠运气变得富有', link: '/translations/rich/' },
          { text: '别自称“程序员”', link: '/translations/dont-call-yourself-a-programmer/' },
          { text: '一千个铁杆粉丝', link: '/translations/1000-true-fans/' },
          { text: '要么“太棒了”，要么“不”', link: '/translations/hellyeah/' },
          { text: '世界运转的微小法则', link: '/translations/little-ways/' },
          { text: '顺应 Web 的纹理', link: '/translations/the-webs-grain/' },
          { text: '多元思维模型大全', link: '/translations/mental-models/' },
          { text: '人生的尾声', link: '/translations/the-tail-end/' },
          { text: '如何做出卓越的工作', link: '/translations/greatwork/' },
          { text: '知识拆解二十条准则', link: '/translations/twenty-rules/' },
          { text: '用间隔重复记住编程语言', link: '/translations/srs/' },
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
