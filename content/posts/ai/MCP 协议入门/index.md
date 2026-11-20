---
title: "MCP 协议入门"
date: 2025-05-20
categories: ["AI", "工具", "踩虫记"]
draft: false
---

![MCP 使用流程](<pics/MCP 使用流程理解.excalidraw.png>)

> **重要参考**：[MCP 中文入门指南](https://github.com/liaokongVFX/MCP-Chinese-Getting-Started-Guide)

## 什么是 MCP

MCP（Model Context Protocol）是一种用于 AI 模型与外部工具/数据源通信的协议标准。

## 调试 MCP Server

使用官方提供的 inspector 工具调试 MCP server：

```bash
npx -y @modelcontextprotocol/inspector <command> <arg1> <arg2>
```

## 使用场景

- 连接 AI 助手到本地文件系统
- 访问数据库
- 调用外部 API
- 执行命令行工具
