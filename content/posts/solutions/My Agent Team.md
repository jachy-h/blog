---
title: Agent 工具笔记
subtitle: ""
date: 2026-02-27T13:01:27+08:00
categories: []
draft: false
editorialLabel: "笔记"
---
> 以下为 2026 年 2 月的工具试用笔记，套餐与免费额度未重新验证，请以服务方当前说明为准。

## github copilot

已购买年套餐， 主要编程战斗力

## qwen code

`qwen code`  内置免费 1k 请求每月, 编程效果符合预期


## open code

`opencode` 的 `zen`, 自带 `minimax 2.5 free` , 速度挺快， 效果符合预期
https://opencode.ai/zen

## iflow cli

尝试中

## openrouter

对接很多模型， 但是用起来好慢， 暂时感觉有点问题


## coding

基于 `git worktree` 各自开辟 `feat/fix` 分支工作。 需要Git >= 2.5

```
# 1. 进入你希望新工作区所在的父目录
cd /path/to/your_project

# 2. 使用 git worktree add 创建新的工作区和分支
git worktree add -b codex/new-feature ../your_project-feature HEAD

# 3. 回到原工作区，检查并提交改动后，再合并任务分支
cd /path/to/your_project
git merge codex/new-feature
```
