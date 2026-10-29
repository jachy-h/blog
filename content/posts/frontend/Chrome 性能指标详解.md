---
title: "读懂页面加载时间线：FP、FCP、DCL、Load 与 LCP"
date: 2023-12-29
categories: ["前端", "性能优化"]
tags: ["Chrome", "性能分析"]
description: "区分页面绘制、DOM 解析与资源加载，避免把不同指标当作同一个完成时间。"
draft: false
---

分析页面加载时，“页面好了”可能指有内容可看，也可能指 DOM 已解析，或者首屏主要内容已经出现。这些是不同的时刻。

## 先分清观察对象

| 指标 | 观察什么 | 不能据此判断什么 |
| --- | --- | --- |
| FP（First Paint） | 浏览器首次绘制的时间点 | 正文或主要内容已经出现 |
| FCP（First Contentful Paint） | 首次绘制文本、图像等内容的时间点 | 首屏主要内容已经完整呈现 |
| DCL（DOMContentLoaded） | HTML 解析完成，且延迟脚本已执行 | 所有图片和其他资源已加载 |
| Load | 页面及依赖资源加载完成的事件；懒加载资源等存在例外 | 页面不会再请求数据或发生变化 |
| LCP（Largest Contentful Paint） | 视口内符合条件的最大内容元素的呈现时间 | 页面全部加载完成或交互已经流畅 |

这些指标关注不同对象，不能简单按一条固定顺序排列。绘制指标可参考 [PerformancePaintTiming](https://developer.mozilla.org/en-US/docs/Web/API/PerformancePaintTiming) 和 [FCP 说明](https://web.dev/articles/fcp)。

## DCL 不等待所有资源

`DOMContentLoaded` 等待 HTML 解析和 `defer`、模块脚本的下载与执行，不会等待图片、子框架和异步脚本全部完成。

样式表可能通过阻塞相关脚本间接影响 DCL，因此也不能把它理解为与其他资源完全无关的纯解析时间。

参考：[MDN：DOMContentLoaded](https://developer.mozilla.org/en-US/docs/Web/API/Document/DOMContentLoaded_event)。

## Load 也不是应用的终点

`load` 适合观察页面加载生命周期，但现代页面仍可能在它之后请求接口、渲染数据或加载图片。懒加载资源不会按普通资源的方式阻塞该事件。

如果用户需要的内容来自后续请求，只看 Load 容易漏掉实际等待过程。

参考：[MDN：load 事件](https://developer.mozilla.org/en-US/docs/Web/API/Window/load_event)。

## LCP 关注主要内容的呈现

LCP 从符合条件的内容元素中选择候选者，并关注其在视口内的可见尺寸。它不是选取任意 DOM 节点，也不是简单计算页面中最大的盒子。

页面加载过程中候选元素可能变化。例如先出现的标题可以是候选，后出现的大图也可能成为候选。因此分析 LCP 时，需要一起看被报告的元素、资源请求和渲染时间线。

参考：[web.dev：LCP](https://web.dev/articles/lcp)。

## 我会如何使用这些指标

下面是排查方向，不是仅凭指标就能确定的诊断：

- **FCP 很晚**：检查内容首次出现之前，网络与主线程分别在等待什么。
- **FCP 较早而 LCP 很晚**：定位 LCP 元素，检查其资源发现、下载与呈现过程。
- **DCL 较早但首屏仍空白**：检查数据请求与后续脚本渲染。
- **Load 很晚但主要内容早已可见**：识别拖延事件的资源，再判断它是否影响用户任务。

比较两次结果时，应保持设备、网络条件和缓存状态尽量一致，并保留时间线。指标可以帮助缩小范围，具体原因仍需通过请求和执行记录确认。
