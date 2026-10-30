import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// 微软语音节点与七牛云均为国内/亚洲直连节点，移除终端代理环境变量避免限速或卡死
for (const k of ['HTTP_PROXY', 'HTTPS_PROXY', 'ALL_PROXY', 'http_proxy', 'https_proxy', 'all_proxy']) {
  delete process.env[k];
}

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

const urlSafeBase64 = v =>
  Buffer.from(v).toString('base64').replace(/\+/g, '-').replace(/\//g, '_');

function makeUploadToken(key) {
  const policy = JSON.stringify({
    scope: `${BUCKET}:${key}`,
    deadline: Math.floor(Date.now() / 1000) + 3600
  });
  const encodedPolicy = urlSafeBase64(policy);
  const sign = urlSafeBase64(crypto.createHmac('sha1', SK).update(encodedPolicy).digest());
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
    .replace(/^>\s*(?:原文：|\[(?:阅读|返回)).*$/gm, '')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/\[!\[[^\]]*\]\([^)]+\)\]\([^)]+\)/g, '')
    .replace(/!\[[^\]]*\]\([^)]+\)/g, '')
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

function splitIntoChunks(text, maxLen = 900) {
  const paras = text.split(/\n+/);
  const chunks = [];
  let cur = '';
  for (const p of paras) {
    const trimmed = p.trim();
    if (!trimmed) continue;
    if (cur && (cur.length + trimmed.length + 2) > maxLen) {
      chunks.push(cur);
      cur = trimmed;
    } else {
      cur = cur ? `${cur}\n${trimmed}` : trimmed;
    }
  }
  if (cur) chunks.push(cur);
  return chunks;
}

const PY_SYNTH = `
import asyncio, json, os, sys, edge_tts

for k in ('HTTP_PROXY', 'HTTPS_PROXY', 'ALL_PROXY', 'http_proxy', 'https_proxy', 'all_proxy'):
    os.environ.pop(k, None)

async def main():
    data = json.load(open(sys.argv[1], encoding='utf-8'))
    voice = data['voice']
    chunks = data['chunks']
    out_path = data['out']
    sem = asyncio.Semaphore(8)

    async def fetch_audio(text):
        comm = edge_tts.Communicate(text, voice)
        buf = bytearray()
        async for msg in comm.stream():
            if msg['type'] == 'audio':
                buf.extend(msg['data'])
        return bytes(buf)

    async def one(text):
        async with sem:
            for attempt in range(5):
                try:
                    b = await asyncio.wait_for(fetch_audio(text), timeout=45)
                    if b:
                        return b
                except Exception:
                    await asyncio.sleep(1.0)
            raise RuntimeError('TTS chunk failed')

    results = await asyncio.gather(*(one(c) for c in chunks))
    with open(out_path, 'wb') as f:
        for b in results:
            f.write(b)

asyncio.run(main())
`;

function findPythonWithEdgeTts() {
  const candidates = [
    'python',
    'C:\\ProgramData\\miniconda3\\python.exe',
    'C:\\Python314\\python.exe'
  ];
  for (const bin of candidates) {
    try {
      execFileSync(bin, ['-c', 'import edge_tts'], { stdio: 'ignore' });
      return bin;
    } catch {}
  }
  execFileSync('python', ['-m', 'pip', 'install', 'edge-tts', '-q'], { stdio: 'inherit' });
  return 'python';
}

const PYTHON_BIN = findPythonWithEdgeTts();

function synthArticle(text, voice, slug) {
  const chunks = splitIntoChunks(text, 1000);
  const tmpJson = path.join(os.tmpdir(), `vault-tts-${slug}.json`);
  const tmpMp3 = path.join(os.tmpdir(), `vault-tts-${slug}-out.mp3`);
  fs.writeFileSync(tmpJson, JSON.stringify({ voice, chunks, out: tmpMp3 }), 'utf8');
  try {
    execFileSync(PYTHON_BIN, ['-c', PY_SYNTH, tmpJson], { stdio: 'inherit' });
    return fs.readFileSync(tmpMp3);
  } finally {
    try { fs.unlinkSync(tmpJson); } catch {}
    try { fs.unlinkSync(tmpMp3); } catch {}
  }
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
].sort((a, b) => Number(a.endsWith('en.md')) - Number(b.endsWith('en.md')));

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

  const existing = cache[slug];
  const existingHash = typeof existing === 'object' ? existing?.hash : existing;
  const existingDur = typeof existing === 'object' ? existing?.duration : 0;

  if (existingHash === hash && existingDur > 0) {
    continue;
  }

  if (!process.argv.includes('--force')) {
    try {
      const headRes = await fetch(remoteUrl, { method: 'HEAD' });
      if (headRes.ok) {
        const len = Number(headRes.headers.get('content-length') || 0);
        const duration = Math.max(1, Math.round(len / 6000));
        cache[slug] = { hash, duration };
        fs.mkdirSync('.vitepress/cache', { recursive: true });
        fs.writeFileSync(cacheFile, JSON.stringify(cache, null, 2));
        console.log(`[TTS] Exists on Qiniu (${duration}s), cached: ${remoteUrl}`);
        continue;
      }
    } catch {}
  }

  console.log(`[TTS] Generating (${voice}) -> ${slug}.mp3 ...`);
  const mp3Buf = synthArticle(text, voice, slug);
  const duration = Math.max(1, Math.round(mp3Buf.length / 6000));
  console.log(`[TTS] Uploading (${(mp3Buf.length / 1024 / 1024).toFixed(2)} MB, ${duration}s) -> ${remoteUrl} ...`);
  await uploadToQiniu(mp3Buf, key);
  cache[slug] = { hash, duration };
  fs.mkdirSync('.vitepress/cache', { recursive: true });
  fs.writeFileSync(cacheFile, JSON.stringify(cache, null, 2));
  console.log(`[TTS] Uploaded: ${remoteUrl}`);
}
