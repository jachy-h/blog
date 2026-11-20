---
title: "MinIO 对象存储笔记"
subtitle: ""
date: 2023-11-20T06:32:24+08:00
categories:
  - server
draft: false
---

对中小企业来说，如果不想把存储放到云上，MinIO 是不错的选择。

MinIO 可以直接作为对象存储使用，也可以作为云上对象存储服务的网关层，对接 Amazon S3 和 Microsoft Azure。

## 优点

- 部署简单
- 支持海量存储，单个对象最大 5 TB
- 兼容 Amazon S3 接口
- 冗余开销低，对磁盘损坏容忍度高
- 读写性能好

## 基本概念

- **Object**：存储到 MinIO 的基本对象，就是文件。
- **Bucket**：用来存储 Object 的逻辑空间。每个 Bucket 之间的数据相互隔离；对客户端来说，就是存放文件的顶层文件夹。
- **Drive**：存储数据的磁盘，在 MinIO 启动时以参数传入。MinIO 中的所有对象都会存储在 drive 中。
- **Set**：一组 Drive 的集合。分布式部署会根据集群规模自动划分一个或多个 Set，每个 Set 中的 Drive 分布在不同位置，一个对象存储在一个 Set 上。

参考：[MinIO 架构介绍](https://xie.infoq.cn/article/66ffc331f851f5873a3e1b2d3)

## 快速启动

参考 [Docker Hub 上的 MinIO 镜像](https://hub.docker.com/r/minio/minio)：

```bash
docker run -p 9000:9000 -p 9001:9001 quay.io/minio/minio server /data --console-address ":9001"
```