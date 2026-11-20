# Jachy 的博客

站点：[jinyu.cool](https://jinyu.cool/)。Hugo + PaperMod，主题作为底层保留，站点的模板、样式与脚本覆盖在 `layouts/` 与 `assets/` 中。

```bash
git submodule update --init --recursive
hugo server
hugo --minify
```

## 设计系统

- 方向：技术编辑感。纸 / 墨 / 朱砂三色，明暗双主题；中文使用系统字体，拉丁展示字体自托管于 `static/fonts/`。
- 外壳：`layouts/baseof.html`、`layouts/_partials/head.html`、`header.html`、`footer.html`。
- 样式：`assets/css/extended/` 按编号组织，`00-tokens` 到 `95-code`；`head.html` 只打包 Chroma 与站点样式。
- 脚本：`assets/js/site.js` 负责主题、移动端菜单、目录高亮、代码复制、分享与收尾动效；搜索逻辑保留在 `assets/js/fastsearch.js`。
- 主题不再跟随上游更新；需要改动页面时直接改站点 `layouts/`，不要修改 `themes/PaperMod`。

页面模板：

| 页面 | 模板 | 样式 |
|---|---|---|
| 首页 | `layouts/index.html`、`_partials/home.html`、`home_projects.html`、`project_row.html` | `30-home.css` |
| 文章 / 项目详情 / 关于 | `layouts/single.html`、`_partials/toc.html`、`post_meta.html`、`share.html` | `40-article.css`、`95-code.css` |
| 文章列表 / 归档 | `layouts/list.html`、`layouts/archives.html` | `50-index.css` |
| 分类 / 标签 | `layouts/taxonomy.html`、`layouts/term.html` | `50-index.css` |
| 项目索引 | `layouts/projects.html` | `50-index.css` |
| 搜索 | `layouts/search.html` | `60-search.css` |
| 404 | `layouts/404.html` | `70-404.css` |

## 首页与内容维护

首页定位为「AI 辅助开发与个人工具构建」，依次展示个人介绍、代表项目、精选文章、最近记录与订阅入口。

- 首页文案：`layouts/_partials/home.html`；样式：`assets/css/extended/30-home.css`。
- 代表项目：`data/projects.yaml`。`caseStudy` 指向站内介绍，`url` 保留应用、源码或包页面入口。
- 精选文章：在文章 front matter 中设置 `featured: true`、`featuredWeight: 1`（数字越小越靠前）、`description` 和 `editorialLabel`。建议保持三篇，按质量选择。
- 最近记录：自动取非精选文章中最新的五篇。
- 短记录：使用 `editorialLabel: "笔记"`，会在文章与列表的元信息中显示。
- 未完成内容：`draft: true`。本地检查草稿可用 `hugo server -D`。
- 内容整理保留原来的文件路径与发布日期，实质更新时补充 `lastmod`。涉及工具版本或套餐，注明验证时间。
- 项目介绍只陈述已确认的功能。新增复盘时补充真实需求、实现取舍、验证与限制；未测量的数据不写为成绩。

## 2026-11-19 视觉改版

完成全站视觉与结构更新：新首页、两栏文章页、统一索引页、分类/标签、项目、搜索与 404；替换默认导航、页脚、移动端菜单与代码块；移除 emoji 项目图标与随机分类色相。设计系统与验收记录见：

- `docs/v1.0.0-plan.md`
- `docs/v1.0.0-progress.md`

## 内容编辑约定

技术文章优先交代问题、方案、取舍、验证与限制。个人观点标明为观点；建议验证项不写成已执行结果。旧代码片段未重测时明确保留历史背景。事实修正附官方文档，保留原 URL 和发布日期，以 `lastmod` 标记编辑时间。
