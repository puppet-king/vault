import { execSync } from 'node:child_process';
import fs from 'node:fs';

try {
  process.loadEnvFile('.env');
} catch {}

const KEY = process.env.DEPLOY_KEY;
const HOST = process.env.DEPLOY_HOST;
const REMOTE_DIR = process.env.DEPLOY_DIR || '/var/www/vault';
const SITE_URL = process.env.SITE_URL || '';
const BAIDU_TOKEN = process.env.BAIDU_PUSH_TOKEN || '';

if (!KEY || !HOST) {
  console.error('Missing DEPLOY_KEY or DEPLOY_HOST in .env');
  process.exit(1);
}

const run = (cmd, opts = { stdio: 'inherit' }) => execSync(cmd, opts);

console.log('1/3 Building VitePress site...');
run('npm run build');

console.log(`2/3 Deploying .vitepress/dist to ${HOST}:${REMOTE_DIR}...`);
run(`tar -czf - -C .vitepress/dist . | ssh -i "${KEY}" ${HOST} "mkdir -p ${REMOTE_DIR} && rm -rf ${REMOTE_DIR}/* && tar -xzf - -C ${REMOTE_DIR}"`);

console.log(`Deployed successfully -> ${SITE_URL || HOST}`);

if (BAIDU_TOKEN && SITE_URL && fs.existsSync('.vitepress/dist/sitemap.xml')) {
  const cacheFile = '.vitepress/cache/baidu-pushed.json';
  const pushed = new Set(fs.existsSync(cacheFile) ? JSON.parse(fs.readFileSync(cacheFile, 'utf8')) : []);
  const xml = fs.readFileSync('.vitepress/dist/sitemap.xml', 'utf8');
  const urls = [...xml.matchAll(/<loc>(.*?)<\/loc>/g)]
    .map(m => m[1])
    .filter(u => !u.endsWith('/en.html') && !pushed.has(u));

  if (urls.length > 0) {
    console.log(`3/3 Pushing ${urls.length} new URL(s) to Baidu...`);
    try {
      const api = `http://data.zz.baidu.com/urls?site=${SITE_URL}&token=${BAIDU_TOKEN}`;
      const res = await fetch(api, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: urls.join('\n')
      });
      const data = await res.json();
      console.log('Baidu push result:', data);
      if (data.success) {
        urls.forEach(u => pushed.add(u));
        fs.mkdirSync('.vitepress/cache', { recursive: true });
        fs.writeFileSync(cacheFile, JSON.stringify([...pushed], null, 2));
      }
    } catch (e) {
      console.warn('Baidu push skipped:', e.message);
    }
  } else {
    console.log('3/3 Baidu push: all pages already pushed.');
  }
}
