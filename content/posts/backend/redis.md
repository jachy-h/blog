---
title: "Redis 命令笔记：连接、读写与过期时间"
date: 2023-11-20T14:29:42+08:00
categories: ["后端"]
tags: ["Redis", "命令行"]
draft: false
editorialLabel: "笔记"
description: "redis-cli 的常用连接方式，以及使用示例键检查读写、存在性与过期时间。"
---

这是一份命令速查，用于已经可以访问的 Redis 实例，不包含部署、持久化和高可用配置。示例使用 `blog:demo:` 前缀，练习时请确认不会覆盖实际业务键。

## 连接与确认

默认连接本机 Redis：

```bash
redis-cli
```

在交互界面执行 `PING`，正常应得到 `PONG`。

指定地址和端口，需要密码时交互输入：

```bash
redis-cli -h 127.0.0.1 -p 6379 --askpass
```

`-p` 后面必须提供端口号；`--askpass` 用于交互输入密码。此前笔记里的连接命令漏写了端口，不应直接复制。

参考：[Redis CLI 文档](https://redis.io/docs/latest/develop/tools/cli/)。

## 读写与存在性

以下命令在 `redis-cli` 中执行：

```text
SET blog:demo:message hello
GET blog:demo:message
EXISTS blog:demo:message
```

对于上述示例，GET 返回字符串 `hello`，EXISTS 返回 `1`。使用 DEL 删除键后，再执行 EXISTS 应返回 `0`。

## 设置过期时间

```text
EXPIRE blog:demo:message 60
TTL blog:demo:message
```

`EXPIRE` 需要键名和秒数。TTL 返回剩余秒数；键存在但未设置过期时返回 `-1`，键不存在时返回 `-2`。

也可以在写入时同时设置过期时间：

```text
SET blog:demo:temporary hello EX 60
```

这样可以避免把“写入”和“设置过期”拆为两条命令后，中途失败而留下没有过期时间的键。

参考：[EXPIRE](https://redis.io/docs/latest/commands/expire/)、[SET](https://redis.io/docs/latest/commands/set/)、[TTL](https://redis.io/docs/latest/commands/ttl/)。

## 清理示例键

```text
DEL blog:demo:message blog:demo:temporary
```

原笔记还列出了 [DUMP](https://redis.io/docs/latest/commands/dump/)：它返回键值的序列化表示，并不是查看字符串内容的常用方式。日常检查字符串值使用 GET；其他数据类型需要对应的查询命令。
