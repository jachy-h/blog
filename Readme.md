# Jachy 的博客

站点：[jinyu.cool](https://jinyu.cool/)。Hugo 0.168.0 + PaperMod，主题通过 Git submodule 引入。

```bash
git submodule update --init --recursive
hugo server
hugo --minify
```

## 首页与内容维护

首页定位为「AI 辅助开发与个人工具构建」，依次展示个人介绍、代表项目、精选文章、最近记录与订阅入口。

- 首页文案：`layouts/_partials/home.html`；样式：`assets/css/extended/projects.css`。
- 代表项目：`data/projects.yaml`。`caseStudy` 指向站内介绍，`url` 保留应用、源码或包页面入口。
- 精选文章：在文章 front matter 中设置 `featured: true`、`featuredWeight: 1`（数字越小越靠前）、`description` 和 `editorialLabel`。建议保持三篇，按质量选择。
- 最近记录：自动取非精选文章中最新的四篇。
- 短记录：使用 `editorialLabel: "笔记"`，会在文章与列表的元信息中显示。
- 未完成内容：`draft: true`。本地检查草稿可用 `hugo server -D`。
- 内容整理保留原来的文件路径与发布日期，实质更新时补充 `lastmod`。涉及工具版本或套餐，注明验证时间。
- 项目介绍只陈述已确认的功能。新增复盘时补充真实需求、实现取舍、验证与限制；未测量的数据不写为成绩。

## 2026-10-29 调整

完成首页重组、关于页和项目目录；精选工作流、简谱与浏览器插件三篇内容；重整工作流文章的时间背景与判断边界；隐藏四篇测试或占位内容；统一中文导航与日期格式，清除 SEO 配置占位值。

发布前使用 Hugo 构建并检查生成页面。此次修改不包含自动部署；推送 main 会触发现有 GitHub Pages 工作流。

## 内容编辑约定

技术文章优先交代问题、方案、取舍、验证与限制。个人观点标明为观点；建议验证项不写成已执行结果。旧代码片段未重测时明确保留历史背景。事实修正附官方文档，保留原 URL 和发布日期，以 `lastmod` 标记编辑时间。

本轮重点编辑 Agent 工作流思考、API 消息角色、Svelte 插件组织、页面加载指标与 Redis 命令五篇文章。
