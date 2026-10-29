# Vault — Personal Knowledge Base & Blog

[中文说明 (README-zh.md)](./README-zh.md)

A personal knowledge base, technical blog, and essay translation site built with [VitePress](https://vitepress.dev/) and [Heti (赫蹏)](https://github.com/sivan/heti) Chinese typography.

## Features

- **Typography & Reading Experience**:
  - Heti (`heti`) Chinese typography enhancements (auto CJK-Latin spacing, punctuation compression).
  - Reading progress bar, word count & reading time estimation, and distraction-free browser print (`Print`).
  - Inline `==highlight==` syntax, MathJax support, code block auto-folding (>8 lines), and internal link/footnote hover preview popovers.
  - Article audio player (`Listen` / `听全文`) powered by Microsoft Edge Neural TTS and hosted on Qiniu Cloud CDN.
- **SEO & AI Indexing**:
  - Auto-generated `/rss.xml`, `/sitemap.xml`, `/robots.txt`, `/llms.txt`, and `/llms-full.txt` on build.

## Scripts (`scripts/` & `pnpm`)

| Command | Script File | Description |
| :--- | :--- | :--- |
| `pnpm dev` | — | Start local VitePress development server. |
| `pnpm build` | — | Build static site into `.vitepress/dist` (also generates `rss.xml`, `robots.txt`, `sitemap.xml`, `llms.txt`, `llms-full.txt`). |
| `pnpm fetch` | `scripts/fetch.mjs` | Fetch original English essays (e.g., Paul Graham essays), clean up HTML/character encodings, and convert them to Markdown (`translations/<slug>/en.md`). |
| `pnpm tts` | `scripts/tts.mjs` | Convert Chinese (`index.md` / `posts/*.md`) and English (`en.md`) articles into `.mp3` audio via `edge-tts` (`zh-CN-YunxiNeural` / `en-US-AndrewNeural`) and upload directly to Qiniu Cloud OSS (`vault/audio/<slug>.mp3`) with incremental hash caching (`.vitepress/cache/tts-uploaded.json`). |
| `pnpm deploy` | `scripts/deploy.mjs` | Full one-click release pipeline:<br>1. Run `scripts/tts.mjs` to sync new/updated article audio to Qiniu Cloud.<br>2. Run `pnpm build` to build the static site.<br>3. Deploy `.vitepress/dist` to the remote server over SSH.<br>4. Incrementally push newly added Chinese page URLs from `sitemap.xml` to Baidu Search Resource Platform (cached in `.vitepress/cache/baidu-pushed.json`). |

## Environment Variables (`.env`)

Copy `.env.example` to `.env` before building or deploying (`.env` is gitignored):

```ini
DEPLOY_KEY=C:\path\to\your\private-key.pem
DEPLOY_HOST=root@your-server-ip
DEPLOY_DIR=/var/www/vault
SITE_URL=https://docs.example.com
BAIDU_PUSH_TOKEN=your-baidu-push-token
BAIDU_SITE_VERIFICATION=your-baidu-verification-code
ICP_NUMBER=your-icp-number
QINIU_AK=your-qiniu-ak
QINIU_SK=your-qiniu-sk
QINIU_BUCKET=your-qiniu-bucket
QINIU_DOMAIN=https://static.example.com
```
