---
name: vault_translator
description: 知识库（Vault）外文长文抓取、外链图片本地化、中国读者本土化案例改造、调用 handraw-style 规划与生成手绘配图并转 WebP 压缩、深度去 AI 味中文精译、双语 TTS 语音合成与一键发布的六步标准工作流技能。当用户需要将英文博客/文章翻译并收录进知识库时使用。
---

# Vault Translator：知识库译文全流程处理技能

本技能定义了将外部英文文章（如 Paul Graham、Derek Sivers、Piotr Wozniak 等经典长文）收录至 `C:\project\vault` 知识库的**六步标准化流水线（6-Stage Pipeline）**。严格按以下阶段依次执行，确保每篇译文兼具原汁原味的思想深度、零外部图床依赖、符合中国读者直觉的本土化案例与 `handraw-style` 手绘视觉配图，以及完整的双语语音和 SEO 索引。

---

## 阶段一：原文抓取与原始媒体资源本地化（Stage 1: Fetch & WebP Localization）

1. **确定文章目录名（Slug）**：
   - 取文章 URL 的核心路径词（如 `https://sive.rs/srs` → `srs`，`twenty-rules-of-formulating-knowledge` → `twenty-rules`），目标目录为 `translations/<slug>/`。
2. **抓取英文原文并生成 `translations/<slug>/en.md`**：
   - 优先使用 `pnpm fetch <url>` 抓取。
   - 若目标站点启用了 Cloudflare 质询或反爬拦截，使用 `curl.exe -sL` 配合本地代理或 Wayback Machine（`https://web.archive.org/web/2024id_/<url>`）获取完整 HTML，提取正文（保留代码块 `<pre>`、标题层级、列表、表格与图片）。
   - `en.md` 顶部固定格式：
     ```markdown
     # <Original English Title>

     > [返回中文译版](./index.md) · Source: [<url>](<url>)
     ```
3. **外链图片下载与自适应 WebP 压缩**：
   - 扫描原文中所有外链图片（`.jpg`, `.png`, `.gif`），调用 `.agent/skills/vault_translator/scripts/img_to_webp.py` 下载并转换至 `public/images/<slug>/`：
     ```powershell
     C:\ProgramData\miniconda3\python.exe .agent/skills/vault_translator/scripts/img_to_webp.py public/images/<slug> <img_url_1> <img_url_2> ...
     ```
   - 该脚本会自动在内存中对比**有损压缩**（`quality=80, method=6`，适合连续色调照片/复杂图表）与**无损压缩**（`lossless=True, method=6`，适合软件界面截图/少色块 GIF），保留体积更小的 `.webp` 文件。
   - 将 `en.md` 中的所有外链图片地址替换为站内绝对路径 `/images/<slug>/<name>.webp`，确保**零外部图床依赖**。

---

## 阶段二：水土不服审读与 `handraw-style` 手绘视觉定制（Stage 2: Localization & Handraw Visual Creation）

在动笔翻译前，先审读原文中的案例、典故与配图，针对不适合中国读者的内容执行本土化改造，并**调用 `handraw-style` 技能完成插图/信息图创作与 WebP 压缩**：

1. **冷门西方典故/历史/地理文字案例替换**：
   - 若原文使用了欧美特定年代的冷门商业案例、欧洲历史批次或英文长句背诵来解释通用方法论，在不改变原作者核心论点的前提下，可在中文译版 `index.md` 中替换为**中国读者耳熟能详的本土案例**（并在译者注中简要说明）：
     - *历史/科技史拆解*：如用“北宋毕昇发明活字印刷术与沈括《梦溪笔谈》”替代冷门 90 年代美国软件公司史；
     - *无序集合转有序脉络*：如用“唐宋八大家（唐二家 → 宋领袖 → 眉山三苏 → 江西二家）”替代欧盟历次扩员批次；
     - *长序列与古诗文重叠挖空*：如用范仲淹《岳阳楼记》替代美国总统演讲词。

2. **调用 `handraw-style` 进行配图创作与 WebP 压缩回填**：
   - 当需要重绘原文中过时/水土不服的英文示意图、补充认知降负图解，或为长文规划配图与封面时，**必须读取并遵循 `handraw-style` 技能包**：
     - 技能主入口：[SKILL.md](file:///C:/Users/qqq43/.gemini/skills/handraw-style/SKILL.md)
     - 文章配图规划与回填子技能：[article-illustration-planner/SKILL.md](file:///C:/Users/qqq43/.gemini/skills/handraw-style/skills/article-illustration-planner/SKILL.md)
     - 风格图鉴 / 排版图鉴 / 主题色图鉴：[STYLES.md](file:///C:/Users/qqq43/.gemini/skills/handraw-style/STYLES.md)、[LAYOUTS.md](file:///C:/Users/qqq43/.gemini/skills/handraw-style/LAYOUTS.md)、[COLORS.md](file:///C:/Users/qqq43/.gemini/skills/handraw-style/COLORS.md)
   - **`handraw-style` 协同执行规范**：
     1. **体裁判定与风格统领**：
        - **知识 / 干货 / 方法论类译文（模式 A）**：启动“认知降负与高保真图替繁文机制”，从 `LAYOUTS.md` 的 170 种排版图型（如 `IG-004` 双列对比、`IG-008` 流程步骤、`IG-010` 阶段进阶、`IG-013` 漏斗转化、`IG-002` 中心标注）中匹配图型，搭配清爽利落的手绘风格（如 `#001 极简白描`、`#018 Minimal Deadpan Dialogue Cartoon`、`#054 包豪斯几何`、`#216 扁平矢量设计`）与经典主题色（`C-01`–`C-36`）。严禁物理微缩桌面杂物摆拍与童话小人，画面 100% 聚焦图表本身，纯净留白。
        - **散文 / 随笔 / 思想叙事类译文（模式 B）**：不删改原文文字，在情绪转折与核心隐喻处规划意境插画（如 `#268 当代人文水墨漫画`、`#041` 等），整篇文章锁定同一套手绘风格编号与主题色，保持全篇视觉调性高度统一。
     2. **画幅比例规范**：
        - 横版插图 / 架构图解：默认 `4:3`（`1448×1086`）；
        - 竖版信息图 / 社媒卡片：严格采用 `3:4` 黄金画幅（`1086×1448`，严禁 `2:3` 或 `9:16` 防止多端截断）；
        - 文章封面大图：固定 `2.35:1`（`1792×1024`）。
     3. **生图、压缩转 WebP 与回填闭环**：
        - 按照 `handraw-style` 生成结构化中英双语提示词（图文模式或纯图模式），支持**【方式 A · 自主生图回填】**（输出提示词供用户出图后回填）或**【方式 B · 全自动生图插入】**（调用 `image-generator` 或生图工具直接生成图片）；
        - 图片生成或拿到本地路径后，**必须立即运行 `img_to_webp.py` 将图片压缩转换为 `.webp`**，统一存放至 `public/images/<slug>/` 目录：
          ```powershell
          C:\ProgramData\miniconda3\python.exe .agent/skills/vault_translator/scripts/img_to_webp.py public/images/<slug> <generated_image_path>
          ```
        - 在 `translations/<slug>/index.md` 对应锚点处插入 `/images/<slug>/<name>.webp`。

3. **过时软件操作说明的现代化升级**：
   - 若原文包含早期软件（如 SuperMemo 98/2000）的繁琐操作表格，在中文版中用 VitePress `::: tip 💡 ...` 容器改写为现代主流工具（如新版 Anki / SuperMemo）的快捷操作指南。

---

## 阶段三：深度去 AI 味中文精译（Stage 3: Humanized Chinese Translation）

创建 `translations/<slug>/index.md`，严格遵循 [humanizer_zh](file:///C:/Users/qqq43/.gemini/skills/humanizer_zh/SKILL.md) 文风规范：

1. **标准 Frontmatter 与头部元信息**：
   ```markdown
   ---
   title: 中文标题
   date: YYYY-MM-DD
   category: 译文
   tags: [作者名, 译文, 领域标签1, 领域标签2]
   description: 100字以内的核心看点摘要（用于首页列表、SEO、RSS 与站内悬浮预览卡片）。
   ---

   # 中文标题

   > 原文：[Original Title](<url>) · 作者：<Author>（<Date>） · [查看英文原版](./en.md)
   ```
   *(注：`date` 填写原文发表日期，用于内页归档；首页列表已隐藏该日期，不会造成时效混淆。)*
2. **文风与排版铁律**：
   - **零破折号**：正文中严禁出现中文破折号 `——`，一律改用冒号、逗号、括号或直接断句。
   - **消除翻译腔与 AI 套话**：杜绝“非 X 即 Y”、“这不仅……更是……”、“综上所述”、“不可否认的是”、“赋能/闭环/底层逻辑”等套话，用自然、干练、有呼吸感的母语中文表达。
   - **荧光笔重点高亮**：每篇精选 6～12 处最核心的洞察句，使用 `==重点句子==` 语法标记（渲染为柔和荧光笔高亮）。
   - **Vue 模板特殊字符防冲突**：若正文中出现双花括号语法（如 Anki 挖空指令 `{{c1::关键词}}`），必须使用 `<code v-pre>{{c1::关键词}}</code>` 包裹，防止 VitePress 的 Vue 编译器将其误判为 JS 插值表达式而报错。

---

## 阶段四：站内导航与双向内链织网（Stage 4: Navigation & Internal Linking）

1. **更新顶部导航栏**：
   - 在 [.vitepress/config.mjs](file:///C:/project/vault/.vitepress/config.mjs) 的 `themeConfig.nav` -> `译文` 下拉列表顶部加入新译文入口：
     ```js
     { text: '短标题', link: '/translations/<slug>/' },
     ```
2. **激活站内双向悬浮预览（Hover Preview）**：
   - 检查站内已有文章中是否引用了该文的外部原链，将其替换为站内链接 `/translations/<slug>/`；同时在新译文中将关联文章链接指向站内路径，使鼠标悬浮时自动弹出摘要预览卡。

---

## 阶段五：双语 TTS 语音合成与构建校验（Stage 5: TTS Audio & Build Verification）

1. **双语语音合成与七牛云上传**：
   - 运行 `node scripts/tts.mjs`（或直接进入阶段六运行 `pnpm deploy`）。
   - 脚本会自动清洗 Markdown 标记，调用本机 `edge-tts` 为中文版（`zh-CN-YunxiNeural`）和英文版（`en-US-AndrewNeural`）合成自然神经语音，直连上传至七牛云 CDN（`https://static.juqingsong.cn/vault/audio/translations-<slug>.mp3`），并将 `{ hash, duration }` 写入 `.vitepress/cache/tts-uploaded.json`。
2. **构建检查**：
   - 确认 `pnpm build` 无任何 Vue 模板解析错误或死链报错，且自动生成最新的 `sitemap.xml`、`rss.xml`、`llms.txt` 与 `llms-full.txt`。

---

## 阶段六：一键发布、百度推送与 Git 同步（Stage 6: Deploy, SEO Push & Git Sync）

1. **部署上线与百度增量推送**：
   - 始终使用 `pnpm`（严禁使用 `npm`）执行 `pnpm deploy`。
   - 确认 4 个步骤全部成功：
     - `1/4 Syncing article TTS audio to Qiniu...`
     - `2/4 Building VitePress site...`
     - `3/4 Deploying .vitepress/dist to root@...`
     - `4/4 Pushing new URL(s) to Baidu...`
2. **Git 提交与远程同步**：
   - 检查 `git status`（确保 `.env` 与构建产物未被追踪），将新增的 `translations/<slug>/`、`public/images/<slug>/`、`.vitepress/config.mjs` 及缓存记录 `.vitepress/cache/*.json` 提交并推送到 `origin main`：
     ```powershell
     git add .
     git commit -m "feat: add translation of <slug> with localized assets and audio"
     git push origin main
     ```
