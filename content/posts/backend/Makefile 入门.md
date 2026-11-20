---
title: "Makefile 入门"
date: 2023-11-20
categories: ["后端", "构建工具"]
draft: false
---

## 基本语法

- 声明变量：`xxx=xxx`
- 声明目标：`xxx:`
- 静默执行：命令前加 `@`，不打印命令本身

## 示例

```makefile
VERSION=0.0.1

install: ## 安装依赖
	go mod tidy

installSilent: ## 安装依赖，不输出
	@go mod tidy

list: ## 显示全部依赖
	go list -m all

local-list: ## 显示本地依赖
	go list cmdb/...

ver: ## 打印版本
	echo $(VERSION)
```

## 常用技巧

- 普通注释用 `#`；`##` 多用于配合 `make help` 生成目标说明
- 使用 `$(变量名)` 引用变量
- 使用 `@` 静音执行命令
