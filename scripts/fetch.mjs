import fs from 'node:fs/promises';
import path from 'node:path';

const urls = process.argv.slice(2).length
  ? process.argv.slice(2)
  : [
      'https://www.paulgraham.com/superlinear.html',
      'https://www.paulgraham.com/selfindulgence.html',
      'https://www.paulgraham.com/brandage.html',
      'https://www.paulgraham.com/when.html'
    ];

for (const url of urls) {
  const slug = path.basename(new URL(url).pathname, '.html');
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  const buf = await res.arrayBuffer();
  let html = new TextDecoder('utf-8').decode(buf);
  if (html.includes('\uFFFD')) {
    html = new TextDecoder('windows-1252').decode(buf);
  }

  const titleMatch = html.match(/<title>([\s\S]*?)<\/title>/i);
  const title = titleMatch ? titleMatch[1].trim() : slug;

  const tdMatch = html.match(/<td width=435>([\s\S]*?)<\/td>\s*<\/tr>\s*<\/table>/i);
  const raw = tdMatch ? tdMatch[1] : html;

  const enBody = raw
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<a name="([^"]+)"><\/a>/gi, '<span id="$1"></span>')
    .replace(/<br\s*\/?>\s*<br\s*\/?>/gi, '\n\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<p[^>]*>/gi, '\n\n')
    .replace(/<b>([\s\S]*?)<\/b>/gi, '**$1**')
    .replace(/<i>([\s\S]*?)<\/i>/gi, '*$1*')
    .replace(/<sup>([\s\S]*?)<\/sup>/gi, '<sup>$1</sup>')
    .replace(/<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, (_, href, label) => {
      const cleanLabel = label.replace(/<[^>]+>/g, '').trim();
      if (!cleanLabel) return '';
      const fullHref = href.startsWith('http') || href.startsWith('#') ? href : `https://www.paulgraham.com/${href}`;
      return `[${cleanLabel}](${fullHref})`;
    })
    .replace(/<(?!\/?(?:sup|span)\b)[^>]+>/gi, '')
    .replace(/&mdash;/g, '—')
    .replace(/&nbsp;/g, ' ')
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  const outDir = path.resolve('translations', slug);
  await fs.mkdir(outDir, { recursive: true });
  const enMd = `# ${title}\n\n> [返回中文译版](./index.md) · Source: [${url}](${url})\n\n${enBody}\n`;
  await fs.writeFile(path.join(outDir, 'en.md'), enMd, 'utf8');
  console.log(`Fetched ${url} -> translations/${slug}/en.md (${enMd.length} chars)`);
}
