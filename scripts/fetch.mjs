import fs from 'node:fs/promises';
import path from 'node:path';

const urls = process.argv.slice(2).length
  ? process.argv.slice(2)
  : [
      'https://www.paulgraham.com/superlinear.html',
      'https://www.paulgraham.com/selfindulgence.html',
      'https://www.paulgraham.com/brandage.html',
      'https://www.paulgraham.com/when.html',
      'https://sive.rs/srs'
    ];

for (const url of urls) {
  const parsedUrl = new URL(url);
  const slug = path.basename(parsedUrl.pathname, '.html');
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  const buf = await res.arrayBuffer();
  let html = new TextDecoder('utf-8').decode(buf);
  if (html.includes('\uFFFD')) {
    html = new TextDecoder('windows-1252').decode(buf);
  }

  const h1Match = html.match(/<article[\s\S]*?<h1>([\s\S]*?)<\/h1>/i);
  const titleMatch = html.match(/<title>([\s\S]*?)<\/title>/i);
  const title = (h1Match ? h1Match[1] : titleMatch ? titleMatch[1].replace(/\s*\|.*$/, '') : slug).trim();

  const articleMatch = html.match(/<article>([\s\S]*?)<\/article>/i);
  const tdMatch = html.match(/<td width=435>([\s\S]*?)<\/td>\s*<\/tr>\s*<\/table>/i);
  let raw = articleMatch ? articleMatch[1] : tdMatch ? tdMatch[1] : html;

  raw = raw
    .replace(/<header>[\s\S]*?<\/header>/gi, '')
    .replace(/<footer>[\s\S]*?<\/footer>/gi, '');

  const preBlocks = [];
  raw = raw.replace(/<pre[^>]*>([\s\S]*?)<\/pre>/gi, (_, code) => {
    const clean = code
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&#39;/g, "'")
      .replace(/&quot;/g, '"')
      .replace(/^\n+|\n+$/g, '');
    const token = `__PRE_BLOCK_${preBlocks.length}__`;
    preBlocks.push(`\n\n\`\`\`\n${clean}\n\`\`\`\n\n`);
    return token;
  });

  let enBody = raw
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<a name="([^"]+)"><\/a>/gi, '<span id="$1"></span>')
    .replace(/<img[^>]*src="([^"]+)"[^>]*alt="([^"]*)"[^>]*\/?>/gi, (_, src, alt) => {
      const fullSrc = src.startsWith('http') ? src : new URL(src, parsedUrl.origin).href;
      return `![${alt}](${fullSrc})`;
    })
    .replace(/<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, (_, href, label) => {
      const cleanLabel = label.replace(/<[^>]+>/g, '').trim();
      const imgInside = label.match(/!\[[^\]]*\]\([^)]+\)/);
      const display = imgInside ? imgInside[0] : cleanLabel;
      if (!display) return '';
      const fullHref = href.startsWith('http') || href.startsWith('#')
        ? href
        : new URL(href, url).href;
      return `[${display}](${fullHref})`;
    })
    .replace(/<h3>([\s\S]*?)<\/h3>/gi, (_, t) => `\n\n## ${t.trim()}\n\n`)
    .replace(/<h4>([\s\S]*?)<\/h4>/gi, (_, t) => `\n\n### ${t.trim()}\n\n`)
    .replace(/<blockquote>([\s\S]*?)<\/blockquote>/gi, (_, t) => `\n\n> ${t.trim()}\n\n`)
    .replace(/<br\s*\/?>\s*<br\s*\/?>/gi, '\n\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<p[^>]*>/gi, '\n\n')
    .replace(/<(?:b|strong)>([\s\S]*?)<\/(?:b|strong)>/gi, (_, t) => `**${t.trim()}**`)
    .replace(/<(?:i|em)>([\s\S]*?)<\/(?:i|em)>/gi, (_, t) => `*${t.trim()}*`)
    .replace(/<sup>([\s\S]*?)<\/sup>/gi, '<sup>$1</sup>')
    .replace(/<(?!\/?(?:sup|span)\b)[^>]+>/gi, '')
    .replace(/&mdash;/g, '—')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\r\n/g, '\n')
    .replace(/^[ \t]+/gm, '')
    .replace(/[ \t]+\n/g, '\n');

  enBody = enBody
    .replace(/__PRE_BLOCK_(\d+)__/g, (_, i) => preBlocks[Number(i)])
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  const outDir = path.resolve('translations', slug);
  await fs.mkdir(outDir, { recursive: true });
  const enMd = `# ${title}\n\n> [返回中文译版](./index.md) · Source: [${url}](${url})\n\n${enBody}\n`;
  await fs.writeFile(path.join(outDir, 'en.md'), enMd, 'utf8');
  console.log(`Fetched ${url} -> translations/${slug}/en.md (${enMd.length} chars)`);
}
