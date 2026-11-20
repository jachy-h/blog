---
title: 在 Obsidian 中编辑博客
date: 2026-02-26T10:50:32+08:00
categories:
  - General
draft: false
---

在完成[一个免费博客方案]({{< ref "posts/devops/general/一个免费博客方案.md" >}})后，我们已经有了一个基于 Hugo 的博客。接下来通过 Obsidian 获得更好的编辑体验。

1. 创建一个新仓库，目录选博客项目中的 `content` 目录。
2. 配置一个名为 `hugo-new-file-template` 的模板，内容如下：

```
---
title: "{{title}}"
subtitle: ""
date: "{{date:YYYY-MM-DDTHH:mm:ss+08:00}}"
categories: []
draft: false
---
```

3. 新建文件并应用模板。

注意：首次提交时建议先创建分支，不要直接使用 `main`，避免频繁触发构建。

```bash
git checkout -b obsidian-branch
git push --set-upstream origin obsidian-branch
```

在 GitHub 中通过 pull request 合并，合并到 `main` 后触发构建。
