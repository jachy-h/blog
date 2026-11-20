---
title: "RabbitMQ 概念与工作模式笔记"
subtitle: ""
date: 2023-11-20T14:28:43+08:00
categories: ["后端", "消息队列"]
draft: false
---

## 基本概念

- **Server（Broker）**：接收客户端连接、实现 AMQP 的实体服务。
- **Connection**：客户端与 Server 之间的网络连接。
- **Channel**：网络信道，消息读写的通道。每个 channel 代表一个会话任务。
- **Message**：客户端与服务端之间传输的数据，由 `Properties` 和 `Body` 组成。
- **Virtual Host**：逻辑隔离。多条产品线共用一个 RabbitMQ 时，可以用它做分离。
- **Exchange**：交换机。接收消息，并根据 routing key 把消息路由到队列。
- **Binding**：Exchange 与 Queue 之间的虚拟连接，一个 binding 可以包含多个 routing key。
- **Routing Key**：路由规则。
- **Queue**：也称 Message Queue，用于保存消息并转发给消费者。

### Message 的 Properties

常用属性是 delivery mode 和 headers（自定义属性）。其他属性包括：

- `content_type`、`content_encoding`、`priority`
- `correlation_id`：可以认为是消息的唯一 id
- `reply_to`：回复消息的目标队列
- `expiration`：消息过期时间
- `message_id`、`timestamp`、`type`、`user_id`、`app_id`、`cluster_id`

`Body` 则是消息体本身。

### Exchange 类型

- **Direct**：直连（默认 exchange）。routing key 完全匹配时，消息才会被投递。
- **Fanout**：扇出。把消息路由给绑定到它身上的所有队列。不需要 routing key，只要把 queue 绑在这个 exchange 上即可；这类交换机会把消息写到绑定的全部队列，速度也最快。
- **Topic**：队列通过路由键绑定到交换机，交换机再根据消息里的路由值，把消息路由给一个或多个绑定队列（模糊匹配）。
  - `#` 匹配一个或多个词
  - `*` 匹配一个词
- **Headers**：不常用。

## 工作模式

通过 exchange、routing key、queue 的不同组合，可以搭配出不同的工作模式。

### 1. 点对点（简单）队列

routing key 一对一。

- 不需要 exchange
- 一个 producer，一个 consumer

### 2. 工作队列（公平性）

一对多，但只有一个消费者能收到。

- 不需要 exchange
- 一个 producer，多个 consumer，一条消息只会给到一个消费者
- 默认轮询分发；设置合适的 prefetch 后，分发会更接近消费者的实际处理能力

### 3. 发布/订阅

一对多，所有消费者都能收到。

- 一个 producer，多个 consumer
- 每个消费者都有自己的队列
- 生产者把消息发给 exchange
- 每个消费者的队列都绑定到 exchange 上
- 消息通过交换机传到每个消费者的队列

### 4. 路由

- 生产者发送消息到 exchange，并指定 routing key
- exchange 根据 routing key 把消息转给消费者队列
- 消费者队列把 routing key 绑到 exchange 上

### 5. 主题

可以理解为带通配符的“路由”模式。

参考：[RabbitMQ 工作模式](https://juejin.cn/post/6844904083875168263)
