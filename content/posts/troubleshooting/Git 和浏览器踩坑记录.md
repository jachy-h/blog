---
title: "Git 和浏览器踩坑记录"
date: 2023-11-20
categories: ["运维", "Git", "踩虫记"]
draft: false
---

## 问题：修改文件名大小写，Git 不敏感

### 问题描述

当修改项目某文件名的大小写时，`git status` 是不会查看到此文件有改动的。

### 解决方案

使用 `git mv` 命令进行两次重命名：

```bash
git mv foldername tempname && git mv tempname FolderName
```

### 参考

- [CSDN: Git 修改文件名大小写](https://blog.csdn.net/njafei/article/details/53433023)

---

## 问题：Chrome 访问非受信证书页面提示错误

### 问题描述

访问非受信证书页面时，提示「您的连接不是私密连接」错误。

### 解决方案

在当前页面直接键盘输入：

```
thisisunsafe
```

打完立刻就好了。

### 参考

- [腾讯云开发者社区](https://cloud.tencent.com/developer/article/1656694)

---

## 问题：Mac 浏览器连接已重置

### 问题描述

Mac 上浏览器访问某些网站时提示连接已重置。

### 解决方案

刷新 DNS 缓存：

```bash
sudo dscacheutil -flushcache; sudo killall -HUP mDNSResponder
```

---

## 问题：node 版本管理工具 n 下载 node 慢

### 问题描述

使用 `n` 工具安装 node 版本时，下载速度很慢。

### 解决方案

切换镜像源，并设置环境变量：

```bash
# 设置环境变量
export N_NODE_MIRROR=https://npmmirror.com/mirrors/node/

# 安装
sudo -E n stable
```

### 参考

- [墨天轮社区](https://www.modb.pro/db/522710)

---

## 问题：内容相同，MD5 竟然不一样

### 问题描述

两个文件内容完全相同，但计算出的 MD5 值却不一样。

### 原因分析

可能是文件编码、换行符（CRLF vs LF）、或隐藏字符等原因导致。

### 相关文章

- [掘金：内容相同，MD5 竟然不一样！？](https://juejin.cn/post/7322268449409450019)
