---
title: "Agent 工具笔记"
subtitle: ""
date: 2026-02-27T13:01:27+08:00
categories: []
draft: false
editorialLabel: "笔记"
---

> 以下为 2026 年 2 月的工具试用笔记。套餐与免费额度未重新验证，请以服务方当前说明为准。

## GitHub Copilot

已购买年套餐，是目前主要的编程工具。

## Qwen Code

`qwen code` 每月内置 1k 免费请求，编程效果符合预期。

## OpenCode

`opencode` 的 `zen` 自带 `minimax 2.5 free`，速度挺快，效果符合预期。
https://opencode.ai/zen

## iFlow CLI

尝试中。

## OpenRouter

对接的模型很多，但用起来很慢，暂时感觉有问题。

## Coding

基于 `git worktree` 各自开辟 `feat`/`fix` 分支工作，需要 Git >= 2.5。

```
# 1. 进入你希望新工作区所在的父目录
cd /path/to/your_project

# 2. 使用 git worktree add 创建新的工作区和分支
git worktree add -b codex/new-feature ../your_project-feature HEAD

# 3. 回到原工作区，检查并提交改动后，再合并任务分支
cd /path/to/your_project
git merge codex/new-feature
```
