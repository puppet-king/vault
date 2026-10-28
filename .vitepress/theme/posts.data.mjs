import { createContentLoader } from 'vitepress';

const INLINE_TAG_RE = /(?<=^|\s)#([\u4e00-\u9fa5][\u4e00-\u9fa5\w-]*|[a-zA-Z][\w-]*)/gm;

export default createContentLoader(['posts/**/*.md', 'translations/**/index.md'], {
  includeSrc: true,
  transform(raw) {
    return raw
      .map(({ url, frontmatter, src = '' }) => {
        const body = src
          .replace(/^---[\s\S]*?---/, '')
          .replace(/```[\s\S]*?```/g, '');
        const inlineTags = Array.from(body.matchAll(INLINE_TAG_RE), m => m[1]);
        const fmTags = Array.isArray(frontmatter.tags) ? frontmatter.tags.map(String) : [];
        const tags = [...new Set([...fmTags, ...inlineTags])];

        return {
          title: frontmatter.title || url,
          url,
          date: frontmatter.date ? new Date(frontmatter.date).toISOString().slice(0, 10) : '',
          category: frontmatter.category || '随笔',
          tags,
          description: frontmatter.description || ''
        };
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }
});
