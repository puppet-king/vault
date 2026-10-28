import { createContentLoader } from 'vitepress';

export default createContentLoader(['posts/*.md', 'translations/*/index.md'], {
  transform(raw) {
    return raw
      .map(({ url, frontmatter }) => ({
        title: frontmatter.title || url,
        url,
        date: frontmatter.date ? new Date(frontmatter.date).toISOString().slice(0, 10) : '',
        category: frontmatter.category || '随笔',
        description: frontmatter.description || ''
      }))
      .sort((a, b) => b.date.localeCompare(a.date));
  }
});
