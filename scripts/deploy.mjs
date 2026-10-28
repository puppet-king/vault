import { execSync } from 'node:child_process';

try {
  process.loadEnvFile('.env');
} catch {}

const KEY = process.env.DEPLOY_KEY;
const HOST = process.env.DEPLOY_HOST;
const REMOTE_DIR = process.env.DEPLOY_DIR || '/var/www/vault';
const SITE_URL = process.env.SITE_URL || '';

if (!KEY || !HOST) {
  console.error('Missing DEPLOY_KEY or DEPLOY_HOST in .env');
  process.exit(1);
}

const run = (cmd, opts = { stdio: 'inherit' }) => execSync(cmd, opts);

console.log('1/2 Building VitePress site...');
run('npm run build');

console.log(`2/2 Deploying .vitepress/dist to ${HOST}:${REMOTE_DIR}...`);
run(`tar -czf - -C .vitepress/dist . | ssh -i "${KEY}" ${HOST} "mkdir -p ${REMOTE_DIR} && rm -rf ${REMOTE_DIR}/* && tar -xzf - -C ${REMOTE_DIR}"`);

console.log(`Deployed successfully -> ${SITE_URL || HOST}`);
