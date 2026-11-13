---
title: "让 Agent 读写 Apple 日历与提醒事项：apple-connector 的工程取舍"
date: 2026-11-13T11:00:00+08:00
categories: ["个人工具", "AI"]
tags: ["Apple", "EventKit", "Agent", "CLI", "macOS"]
description: "从 MCP 退回 CLI、两层权限、幂等写入，以及一个跑了 63 天的原生进程暴露出的内存问题。"
editorialLabel: "项目 · Agent 工具"
draft: false
---

Agent 已经能理解「下周三下午三点提醒我交材料」，但它碰不到你的日历和提醒事项。要让这句话变成一条真实的提醒，中间缺的不是模型能力，而是一个可靠、可授权、出错后能恢复的系统接口。

`apple-connector` 是我为这件事写的本地工具：一个运行在 Mac 上的 CLI，让同机的 Agent 在明确授权范围内读写 Apple 日历与提醒事项。它只支持 Apple Silicon、macOS 14 及以上，管理页面只监听本机 loopback，并且默认一小时后过期；没有局域网、云端或 MCP 入口。

这篇文章记录几个关键取舍：为什么从 MCP 退回 CLI，授权为什么不是一次弹窗，写入为什么要幂等和审批，以及一个长期运行的原生进程暴露出的问题。

## 从 MCP 退回 CLI

`apple-connector` 的 v0.8.x 以 stdio MCP 作为 Agent 入口。它能用，但把两类责任混在了一起：协议负责「怎么调用」，工具还要负责「什么时候调用、按什么顺序调用、出错后怎么恢复」。后者恰恰是 Agent 最容易出错、也最需要被约束的部分。

v0.9.0 把 stdio MCP 完全删除，改成 Skill + CLI：

- **Skill** 是一份随包分发的说明，告诉 Agent 什么时候用日历、什么时候用提醒事项；更新或删除前必须先查询；同名对象不能靠标题猜。
- **CLI** 是唯一公开的业务入口，所有机器调用使用 `--json`，输出固定信封。
- **Application Core** 统一执行 schema 校验、身份验证、范围授权、幂等、审批、操作状态和审计。

这不是说 MCP 不适合这类场景。MCP 的价值在于把能力暴露给任意宿主；但在这里，宿主和数据本来就在同一台机器上，Agent 只需要能执行命令。少一层常驻协议进程，也少一组需要长期维护的工具契约和绕过授权的可能。

当前的结构大致是这样：

```text
Agent
  ↓
Skill（调用时机与流程）
  ↓
apple-connector CLI（唯一公开业务入口）
  ↓
Application Core ──→ 临时管理页（loopback，默认 1 小时）
  ├─ 身份与范围授权        ├─ 系统权限
  ├─ 幂等与审批            ├─ Profile 配置
  ├─ 操作状态与审计        ├─ 待审批写入
  ↓                        └─ 审计查看
Swift Native Helper（EventKit，JSONL）
  ↓
Apple Calendar / Reminders
```

CLI 不直接调用 helper。helper、Unix socket、SQLite 和管理页 API 都属于内部实现，Skill 明确禁止 Agent 触碰它们。

## 授权不是一次弹窗

把系统权限交给 Agent，最容易犯的错是把它简化成一次「允许访问日历」的弹窗。macOS 的 TCC 权限回答的是「这个进程能不能访问数据」，却没有回答「它能不能改这一条、能不能删那一条」。

所以这里有两层权限：

1. **系统权限**：当前执行链路是否能访问日历或提醒事项。
2. **连接器权限**：某个 Agent profile 被允许访问哪些容器、执行哪些动作、看到哪些字段，以及写入是否需要人工审批。

两层都通过一个临时管理页配置。这个页面由 CLI 按需拉起，绑定 loopback，默认一小时后过期；页面里的会话、CSRF 和 Origin 边界都按本机管理面处理，它不是 Agent API，也不是远程服务。

首次接入的流程也因此被拆成「人做人的部分，Agent 做 Agent 的部分」：

```text
Agent: apple-connector agent init --json
  → 返回 onboardingId 和本机临时 URL
用户: 在页面授权 macOS 权限、选择容器、设置 profile
用户: 回到对话回复「已完成」
Agent: apple-connector agent init-status --id <id> --json
  → configured 后，用 credential-file 做一次有界只读查询
```

在用户回复之前，Agent 不应该打开页面、轮询状态或发起业务调用。这个约束看起来啰嗦，但它把「授权」留在了人这一侧，也避免 Agent 把临时链接当成普通工具反复试探。

## 写入比读取危险

日历和提醒事项是用户会认真看的数据。一次重复创建的会议、一次误删的提醒，造成的困扰远大于一次读取失败。因此写入路径上有几个硬约束。

**每个逻辑写入使用稳定的幂等 key。** 超时、连接中断或结果未知时，不换 key 重做，而是用同一个 key 或 operation ID 查询已有记录。否则重试很容易变成「再建一条一样的」。

**敏感内容走文件，不进命令行。** 标题、备注、地点放在权限为 `0600` 的临时 JSON 文件里，通过 `--input` 传入，操作结束后删除。命令行参数会进入进程列表和 shell 历史，不适合放私人内容。

**写入可能是两阶段的。** 如果 profile 要求审批，操作会先进入 `prepared` 状态：Agent 保留 operation ID、输入和 key，打开审批页等待；用户确认后再查询 `operation get`，然后提交完全相同的写入。只有 `succeeded` 才算成功。

还有一个容易被忽略的状态：`outcome_unknown`。请求可能已经到达系统，也可能没有。这时唯一安全的做法是不改 key、不改 payload，先取回持久化记录，再看是否需要重试。把「不确定」当成失败并重新发起，正是很多自动化工具有时会重复写数据的原因。

读取侧同样保守：更新和删除前先列出对象，用容器 ID 加对象 ID 定位；同名、多匹配、缺字段都停下来问。Calendar 和 Reminder 的更新是整体替换，Agent 必须先读回对象，保留所有未修改字段，包括空值和 `false`。

## 为什么最后还是写了 Swift

最开始的计划是 TypeScript + JXA，尽量不引入原生代码。日历和提醒事项先验证 Apple Events 脚本接口，JXA 通过 Objective-C bridge 调 EventKit 只是候选方案。

实际做下来，Calendar 和 Reminders 的产品路径最终落在了一个 Swift helper 上：它作为长期存活的单进程，通过 JSONL 与 Node 侧通信，内部用 EventKit 枚举容器、读取对象、执行写入并回读核验。JXA 仍然保留在仓库里，用于诊断和历史脚本，但不再是 Calendar / Reminders 的生产数据路径。

原因不复杂：EventKit 能给出稳定的对象 ID、容器枚举和写入后的核验结果，这些是「不按标题猜」的前提。原生层也把数据访问收敛到一个受控进程里，Node 侧只负责授权、幂等和编排，不直接拼 AppleScript。

这个选择有代价：构建需要 Xcode，helper 要做版本契约和发布验证，长期运行的内存行为也必须自己负责。最后一点很快就找上门了。

## 63 天，5.4 GB

今年 9 月启动的 helper 一直没重启，到 11 月已经运行了 63 天。用 `ps` 看 RSS 只有 5 MB，看起来一切正常；但 RSS 低是因为页面几乎都被换出到了 swap。换成 `footprint` 看真实占用：

```text
$ footprint 92172
apple-connector-helper [92172]: 64-bit    Footprint: 5518 MB
  Dirty      Clean  Reclaimable    Regions    Category
5492 MB        0 B          0 B       1380    MALLOC_SMALL
```

5.4 GB，而且随请求数线性增长。`heap` 显示泄漏主体是 Foundation 桥接产生的临时对象：约 6340 万个 80 字节的 `Swift.StringStorage`，以及大量 `CFDateComponents`、`_NSSwiftTimeZone`、`Foundation.Calendar`。

复现后发现规律：10 万次 `hello` 不增长，2000 次 `reminders.listLists` 也不增长；但 500 次 `reminders.list`（limit=50）能到 1.27 GB。把 `main.swift` 复制到 `/tmp`，只在主循环外包一层 `autoreleasepool` 重新编译，同样 2000 次请求就稳定在 34.7 MB。

根因是 helper 的主循环每处理一条请求，EventKit / Foundation 产生的 autoreleased 临时对象都落在同一个从未 drain 的 autorelease pool 里。修复本身很小：把单条请求的处理抽成函数，每轮循环独立排空：

```swift
while let line = readLine(strippingNewline: true) {
    autoreleasepool {
        respond(to: line, helper: helper, decoder: decoder, encoder: encoder)
    }
}
```

这个问题的教训不在 Swift 语法，而在验证方式：

- 长期存活的进程不能只看 RSS，被换出的页面会让占用看起来很小；要看 physical footprint。
- 「高频短请求」和「少量重请求」暴露的是不同类型的问题，前者测循环开销，后者才测每次请求留下的对象。
- 回归测试要测真实资源增量。现在有一条 opt-in 用例：在专用列表创建探针提醒，连续调用 `reminders.list`，断言 footprint 增量低于阈值，并在 `finally` 里逐条删除探针。

v0.9.7 修复后，`npm test` 100/100 通过，新 helper 重启后的初始 footprint 为 3.4 MB。问题不复杂，但如果没去看真实占用，它会在后台安静地吃掉几个 GB。

## 边界比功能更重要

这个工具刻意保留了不少「不做」：

- 不支持远程 Agent、公网 MCP、跨设备授权同步。
- 不管理共享或重复对象，不修改重复系列，不处理邀请和参与者。
- CLI 不理解自然语言，时间必须转换成带显式时区的 RFC 3339，或明确的 date-only 加 IANA 时区。
- 权限被拒绝、目标有歧义、发生冲突或需要审批时，停下来，不降级授权，也不绕过审批。
- 所有机器接口使用 `--json`，不接受「看起来像成功」的模糊输出。

这些限制让工具看起来没那么「智能」，但它们决定了 Agent 出错时会发生什么：是产生一条可以撤销的提醒，还是留下一个说不清来源的副作用。

## 现在可以怎么用

`apple-connector` 已发布在 npm，当前版本 0.9.7：

```bash
npm install -g @jachy/apple-connector
apple-connector skill path --json
apple-connector agent init --json
```

把 `skill path` 返回的目录按当前 Agent 支持的方式加载，再把 `agent init` 返回的本机链接交给用户完成授权即可。完整的安装、恢复与撤销说明在项目仓库里。

- [项目介绍](/projects/apple-connector/)
- [npm](https://www.npmjs.com/package/@jachy/apple-connector)
- [GitHub](https://github.com/jachy-h/apple-connector)

工具的价值不在于让 Agent 更像人，而在于让它的每一次越界都可见、可撤销。这也是我在这项目里花最多时间的地方。

[查看其他项目](/projects/)
