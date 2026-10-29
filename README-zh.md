# Vault — 个人知识库与博客

[English Documentation (README.md)](./README.md)

基于 [VitePress](https://vitepress.dev/) 与 [赫蹏 (Heti)](https://github.com/sivan/heti) 构建的个人知识库、随笔与外文精译站点。

## 核心特性

- **排版与阅读体验**：
  - 集成赫蹏（`heti`）中文排版增强（中西文自动留白、标点挤压优化）。
  - 顶部阅读进度条、字数与阅读时长估算、所见即所得正文打印（`打印` 按钮）。
  - 支持 `==荧光笔高亮==` 语法、MathJax 数学公式、长代码块自动折叠（超过 8 行）、站内链接与文末注释悬浮预览卡片。
  - 公众号风格「听全文」极简音频条（支持播放/暂停、拖拽进度、倍速切换），基于微软 Edge Neural TTS 生成并托管于七牛云 CDN。
- **SEO 与 AI 索引支持**：
  - 构建时自动生成 `/rss.xml`、`/sitemap.xml`、`/robots.txt`、`/llms.txt` 与 `/llms-full.txt`。

## 脚本说明（`scripts/` 与 `pnpm`）

| 命令 | 对应脚本文件 | 作用说明 |
| :--- | :--- | :--- |
| `pnpm dev` | — | 启动本地 VitePress 开发服务器。 |
| `pnpm build` | — | 打包生成静态站点至 `.vitepress/dist`，同时自动生成 `rss.xml`、`robots.txt`、`sitemap.xml`、`llms.txt` 与 `llms-full.txt`。 |
| `pnpm fetch` | `scripts/fetch.mjs` | 抓取外文原版文章（如 Paul Graham 随笔），自动处理字符编码与 HTML 清洗，转换为干净的 Markdown 保存至 `translations/<slug>/en.md`。 |
| `pnpm tts` | `scripts/tts.mjs` | 扫描全站中文（`index.md` / `posts/*.md`）与英文（`en.md`）文章，剔除 Markdown 语法符号后调用 `edge-tts`（中文默认 `zh-CN-YunxiNeural`、英文默认 `en-US-AndrewNeural`）合成 `.mp3` 音频，直接上传至七牛云对象存储（`vault/audio/<slug>.mp3`），并通过本地哈希缓存（`.vitepress/cache/tts-uploaded.json`）与远端 `HEAD` 校验跳过未修改文章。 |
| `pnpm deploy` | `scripts/deploy.mjs` | 一键全流程发布脚本：<br>1. 调用 `scripts/tts.mjs` 增量同步文章音频至七牛云；<br>2. 执行 `pnpm build` 打包静态站点；<br>3. 通过 SSH + `tar` 流式上传 `.vitepress/dist` 至远程服务器；<br>4. 读取 `sitemap.xml` 并将新增中文页面 URL 自动主动推送至百度搜索资源平台（已推送记录缓存在 `.vitepress/cache/baidu-pushed.json`，避免重复消耗每日配额）。 |

## 环境变量配置（`.env`）

首次使用请将 `.env.example` 复制为 `.env` 并填入实际配置（`.env` 已在 `.gitignore` 中排除，不会提交到 Git 仓库）：

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
