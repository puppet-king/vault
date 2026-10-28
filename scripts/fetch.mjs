import fs from 'node:fs/promises';
import path from 'node:path';

const url = 'https://www.paulgraham.com/superlinear.html';
const res = await fetch(url);
if (!res.ok) throw new Error(`HTTP ${res.status}`);
const html = await res.text();

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

const outDir = path.resolve('translations/superlinear');
await fs.mkdir(outDir, { recursive: true });
const enMd = `# Superlinear Returns\n\n> [返回中文译版](./index.md) · Source: [${url}](${url})\n\n${enBody}\n`;
await fs.writeFile(path.join(outDir, 'en.md'), enMd, 'utf8');
console.log(`Fetched ${url} -> translations/superlinear/en.md (${enMd.length} chars)`);
