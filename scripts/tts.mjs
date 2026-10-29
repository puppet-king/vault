import crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

try {
  process.loadEnvFile('.env');
} catch {}

const AK = process.env.QINIU_AK;
const SK = process.env.QINIU_SK;
const BUCKET = process.env.QINIU_BUCKET;
const DOMAIN = (process.env.QINIU_DOMAIN || '').replace(/\/+$/, '');
const VOICE_ZH = process.env.TTS_VOICE_ZH || 'zh-CN-YunxiNeural';
const VOICE_EN = process.env.TTS_VOICE_EN || 'en-US-AndrewNeural';

if (!AK || !SK || !BUCKET || !DOMAIN) {
  console.log('Skipping TTS: missing QINIU_* config in .env');
  process.exit(0);
}

function makeUploadToken(key) {
  const policy = JSON.stringify({
    scope: `${BUCKET}:${key}`,
    deadline: Math.floor(Date.now() / 1000) + 3600
  });
  const encodedPolicy = Buffer.from(policy).toString('base64url');
  const sign = crypto.createHmac('sha1', SK).update(encodedPolicy).digest('base64url');
  return `${AK}:${sign}:${encodedPolicy}`;
}

async function uploadToQiniu(buf, key) {
  const token = makeUploadToken(key);
  const form = new FormData();
  form.append('token', token);
  form.append('key', key);
  form.append('file', new Blob([buf], { type: 'audio/mpeg' }), path.basename(key));

  const res = await fetch('https://upload.qiniup.com', { method: 'POST', body: form });
  if (!res.ok) {
    throw new Error(`Qiniu upload failed (${res.status}): ${await res.text()}`);
  }
  return await res.json();
}

function cleanMarkdownForTts(raw) {
  const fmMatch = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  let title = '';
  let body = raw;
  if (fmMatch) {
    const tMatch = fmMatch[1].match(/^title:\s*(.+)$/m);
    if (tMatch) title = tMatch[1].trim().replace(/^['"]|['"]$/g, '');
    body = raw.slice(fmMatch[0].length);
  }

  body = body
    .replace(/^>\s*\[阅读(?:英文原版|中文精译版).*?\]\(.*?\)\s*$/gm, '')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/\[\\?\[\d+\\?\]\]\(#[^)]+\)/g, '')
    .replace(/<[^>]+>/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/==([^=\n]+)==/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^>\s?/gm, '')
    .replace(/^---+\s*$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  if (title && !body.startsWith(title)) {
    body = `${title}。\n\n${body}`;
  }
  return body;
}

function splitIntoChunks(text, maxLen = 1800) {
  const paras = text.split(/\n\n+/);
  const chunks = [];
  let cur = '';
  for (const p of paras) {
    if (cur && (cur.length + p.length + 2) > maxLen) {
      chunks.push(cur);
      cur = p;
    } else {
      cur = cur ? `${cur}\n\n${p}` : p;
    }
  }
  if (cur) chunks.push(cur);
  return chunks;
}

function synthChunk(text, voice, id) {
  return new Promise((resolve, reject) => {
    const tmpTxt = path.join(os.tmpdir(), `vault-tts-${id}.txt`);
    const tmpMp3 = path.join(os.tmpdir(), `vault-tts-${id}.mp3`);
    fs.writeFileSync(tmpTxt, text, 'utf8');
    const proc = spawn('edge-tts', ['--file', tmpTxt, '--voice', voice, '--write-media', tmpMp3], {
      stdio: 'ignore'
    });
    proc.on('close', code => {
      try { fs.unlinkSync(tmpTxt); } catch {}
      if (code === 0 && fs.existsSync(tmpMp3)) {
        const buf = fs.readFileSync(tmpMp3);
        try { fs.unlinkSync(tmpMp3); } catch {}
        resolve(buf);
      } else {
        try { fs.unlinkSync(tmpMp3); } catch {}
        reject(new Error(`edge-tts exited with code ${code}`));
      }
    });
    proc.on('error', reject);
  });
}

async function synthArticle(text, voice, slug) {
  const chunks = splitIntoChunks(text, 1800);
  const buffers = new Array(chunks.length);
  const concurrency = 6;
  let idx = 0;

  async function worker() {
    while (idx < chunks.length) {
      const i = idx++;
      buffers[i] = await synthChunk(chunks[i], voice, `${slug}-${i}`);
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, chunks.length) }, () => worker()));
  return Buffer.concat(buffers);
}

function collectMarkdownFiles(dir, list = []) {
  if (!fs.existsSync(dir)) return list;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) collectMarkdownFiles(full, list);
    else if (entry.name.endsWith('.md')) list.push(full);
  }
  return list;
}

const files = [
  ...collectMarkdownFiles('translations'),
  ...collectMarkdownFiles('posts')
];

const cacheFile = '.vitepress/cache/tts-uploaded.json';
const cache = fs.existsSync(cacheFile) ? JSON.parse(fs.readFileSync(cacheFile, 'utf8')) : {};

for (const file of files) {
  const rel = file.replace(/\\/g, '/');
  const slug = rel.replace(/\.md$/, '').replace(/\/index$/, '').replace(/\//g, '-');
  const isEn = rel.endsWith('/en.md');
  const voice = isEn ? VOICE_EN : VOICE_ZH;
  const key = `vault/audio/${slug}.mp3`;
  const remoteUrl = `${DOMAIN}/${key}`;

  const raw = fs.readFileSync(file, 'utf8');
  const text = cleanMarkdownForTts(raw);
  const hash = crypto.createHash('sha1').update(`${voice}:${text}`).digest('hex');

  if (cache[slug] === hash) {
    continue;
  }

  if (!cache[slug]) {
    try {
      const headRes = await fetch(remoteUrl, { method: 'HEAD' });
      if (headRes.ok) {
        cache[slug] = hash;
        fs.mkdirSync('.vitepress/cache', { recursive: true });
        fs.writeFileSync(cacheFile, JSON.stringify(cache, null, 2));
        console.log(`[TTS] Exists on Qiniu, cached: ${remoteUrl}`);
        continue;
      }
    } catch {}
  }

  console.log(`[TTS] Generating (${voice}) -> ${slug}.mp3 ...`);
  const mp3Buf = await synthArticle(text, voice, slug);
  console.log(`[TTS] Uploading (${(mp3Buf.length / 1024 / 1024).toFixed(2)} MB) -> ${remoteUrl} ...`);
  await uploadToQiniu(mp3Buf, key);
  cache[slug] = hash;
  fs.mkdirSync('.vitepress/cache', { recursive: true });
  fs.writeFileSync(cacheFile, JSON.stringify(cache, null, 2));
  console.log(`[TTS] Uploaded: ${remoteUrl}`);
}
