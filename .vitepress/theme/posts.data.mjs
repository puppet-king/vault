import fs from 'node:fs';
import { createContentLoader } from 'vitepress';

const INLINE_TAG_RE = /(?<=^|\s)#([\u4e00-\u9fa5][\u4e00-\u9fa5\w-]*|[a-zA-Z][\w-]*)/gm;
const WORD_RE = /[\u4e00-\u9fa5]|[a-zA-Z0-9]+/g;

function getNavOrderMap() {
  try {
    const cfg = fs.readFileSync('.vitepress/config.mjs', 'utf8');
    const links = Array.from(cfg.matchAll(/link:\s*'(\/(?:posts|translations)\/[^']+)'/g), m => m[1]);
    return new Map(links.map((link, idx) => [link, idx]));
  } catch {
    return new Map();
  }
}

export default createContentLoader(['posts/**/*.md', 'translations/**/index.md'], {
  includeSrc: true,
  transform(raw) {
    const navOrder = getNavOrderMap();
    return raw
      .map(({ url, frontmatter, src = '' }) => {
        const body = src
          .replace(/^---[\s\S]*?---/, '')
          .replace(/```[\s\S]*?```/g, '');
        const inlineTags = Array.from(body.matchAll(INLINE_TAG_RE), m => m[1]);
        const fmTags = Array.isArray(frontmatter.tags) ? frontmatter.tags.map(String) : [];
        const tags = [...new Set([...fmTags, ...inlineTags])];

        const plain = body.replace(/<[^>]+>|\[([^\]]+)\]\([^)]+\)|[#*>_`~-]/g, '$1');
        const words = (plain.match(WORD_RE) || []).length;
        const readingTime = Math.max(1, Math.ceil(words / 350));

        return {
          title: frontmatter.title || url,
          url,
          date: frontmatter.date ? new Date(frontmatter.date).toISOString().slice(0, 10) : '',
          category: frontmatter.category || '随笔',
          tags,
          words,
          readingTime,
          description: frontmatter.description || ''
        };
      })
      .sort((a, b) => {
        const dateCmp = b.date.localeCompare(a.date);
        if (dateCmp !== 0) return dateCmp;
        const idxA = navOrder.has(a.url) ? navOrder.get(a.url) : 9999;
        const idxB = navOrder.has(b.url) ? navOrder.get(b.url) : 9999;
        return idxA - idxB;
      });
  }
});
