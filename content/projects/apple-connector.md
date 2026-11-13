---
title: "apple-connector"
date: 2026-11-13
description: "让本机 Agent 通过 CLI 读写 Apple 日历与提醒事项，权限与操作可审计。"
showtoc: false
---

让同机 Agent 在明确授权范围内读写 Apple 日历与提醒事项的本地 CLI。

## 解决的问题

Agent 能理解「下周三提醒我交材料」，却碰不到系统里的日历和提醒事项。apple-connector 把这条链路补上：Agent 调用结构化 CLI，工具负责权限、幂等、审批、审计和原生数据访问。

它只运行在 Apple Silicon Mac（macOS 14+）上，管理页面仅监听本机 loopback 并在一小时后过期；不提供局域网、云端或 MCP 入口。

## 设计要点

- **Skill + CLI**：Skill 说明调用时机与流程，CLI 是唯一公开业务入口，所有机器调用使用 `--json`。
- **两层权限**：macOS 系统权限与连接器 profile 分开管理，profile 限定容器、动作、字段和是否需要审批。
- **写入可恢复**：每个逻辑写入使用稳定幂等 key，保留操作状态；`outcome_unknown` 时不换 key 重试。
- **原生数据路径**：Calendar / Reminders 通过 Swift helper 调用 EventKit，CLI 不直接访问 helper、socket 或数据库。

## 使用入口

[前往 npm 查看安装说明](https://www.npmjs.com/package/@jachy/apple-connector)

[查看源码](https://github.com/jachy-h/apple-connector)

首次接入由 Agent 引导：检查环境、加载 Skill、运行 `agent init`，用户在本机临时页面完成 macOS 授权与 profile 配置，Agent 再做一次有界只读验证。

## 适用范围

适合在同一台 Mac 上使用 Agent、并希望它处理日程与待办的场景。它不替代日历或提醒事项本身，也不支持远程 Agent、跨设备授权和共享/重复对象的写入；遇到权限拒绝、歧义或冲突时会停止，而不是降级授权或猜测目标。

[阅读设计与实现记录](/posts/solutions/apple-connector/)

[查看其他项目](/projects/)
