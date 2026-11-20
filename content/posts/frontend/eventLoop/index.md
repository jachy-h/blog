---
title: "浏览器事件循环-微任务和宏任务，调用栈，渲染队列：布局，绘制与合成"
date: 2024-01-12T11:15:14+08:00
categories: ["前端"]
draft: false
---

> 翻译计划：2024.1

> 此文翻译自：https://blog.xnim.me/event-loop-and-render-queue#heading-task-queue
> 已经获取作者授权

此文关注**事件队列**、**执行顺序**，以及开发者如何**优化代码**。完整思路如下：
![event-loop](pics/01.png)

## 事件队列

古老的操作系统不支持多线程，那时候的事件循环类似这样一个简单的循环：

```js
while (true) {
    if (execQueue.isNotEmpty()) {
        execQueue.pop().exec();
    }
}
```

在老的操作系统上，这段代码会跑满全部 CPU。（真的吗？——年轻的译者注）
现代操作系统的调度器非常复杂，包括优先级、执行队列和其他技术。

我们可以把事件循环理解为一个圆圈，系统一圈一圈地检查有没有待执行的任务（pending task）。
![circle](pics/02.png)

下面这些行为都会在事件循环里生成任务：

1. `script` 标签
2. 延迟任务：`setTimeout`、`setInterval`、`requestIdleCallback`
3. 浏览器的事件处理 API：`click`、`mousedown`、`input`、`blur` 等
   1. 有些事件由用户触发，比如点击、切换 tab
   2. 有些事件来自代码，比如 ajax 的响应
4. `promise` 状态变化（关于 promise，可以看[这篇文章](https://dev.to/xnimorz/101-series-promises-1-how-promises-work-1k1i)，emmm 这篇是我准备留给 2 月份翻译的）
5. `DOMMutationObserver`、`IntersectionObserver` 这类 Observer 家族
6. `RequestAnimationFrame`

> Almost everything we described above is planned through `WebAPI` (or browserAPI).
> 注：这句不知道该咋翻译，不过不重要……

举个例子，有这一行代码：
`setTimeout(function a() {}, 100)`
执行 `setTimeout` 时，浏览器（WebAPI）会把任务延迟 100ms。到 100ms 时，就把 `function a()` 推进任务队列（TaskQueue）。事件循环在下次循环中拿到并执行这个任务。

说到任务，JS 代码和浏览器的执行最终都会反映在 DOM 上。

1. JS 代码：
   - 读取 DOM 元素数据：size、attributes、positions 等
   - 修改属性：`data-*`、`width`、`height`、`position`、CSS 属性等
   - 增删 HTML 节点
2. 然后浏览器渲染数据，用户就能看到更新了。

现代浏览器用一个线程执行 JS 代码和渲染页面（除非开了 Web/Shared/Service worker）。

这就意味着，事件循环里必须留一部分时间给渲染，可以把它叫做渲染队列（render queue）。
![Pastedimage20240116200322.png](pics/03.png)

## 渲染队列是怎么执行的？

帧渲染（Frame rendering）不是一个单独的动作，有好几个步骤，每个步骤还会再细分子步骤。下面是一般渲染一帧需要做的事情：
![Pasted image 20240130102334.png](pics/20240130102334.png)
下面逐步看每个阶段的细节。

### Request Animation Frame（RAF）
![1.png](pics/20240130104201.png)

浏览器已经准备好渲染了，我们可以订阅这个时机，并为这个动画步骤渲染和准备这一帧。这个 callback 比较适合用在动画，或者对 DOM 的一些操作上。

✍️ 关于 RAF 的几个有趣的点：

1. RAF 的 callback 有一个参数 `DOMHighResTimeStamp`。这个参数是从文档的生命周期开始至今的毫秒值，不需要再用 `performance.now()`，这里就有平替。
2. RAF 返回一个描述符（id），可以用来取消 RAF（`cancelAnimationFrame`），用法和 `setTimeout` 一样。
3. 如果用户最小化了浏览器，浏览器就不会再进行渲染，也意味着不会再收到 RAF 的回调。
4. 改变 DOM 元素尺寸和读取元素属性的 JS 代码，可能强制触发一次布局计算。
5. Safari 在帧渲染之后调用 RAF，是唯一和大家不一样的浏览器。[https://github.com/whatwg/html/issues/2569#issuecomment-332150901](https://github.com/whatwg/html/issues/2569#issuecomment-332150901)

那么，如何检查浏览器渲染帧率？看下面的代码：

```js
const checkRequestAnimationDiff = () => {
    let prev;
    function call() {
        requestAnimationFrame((timestamp) => {
            if (prev) {
                console.log(timestamp - prev); 
	            // 60FPS的时候这里应该是 16.6ms左右
            }
            prev = timestamp;
            call();
        });
    }
    call();
}
checkRequestAnimationDiff();
```

这里是执行结果：

![20240130110113.png](pics/20240130110113.png)

### Style（recalculation）重新计算样式
![20240130110226.png](pics/20240130110226.png)

✍️ 浏览器会在这一步重新计算样式，这里也会计算媒体查询。

这里的重新计算，包括直接改值的 `a.style.left = '10px'`，以及 CSS 内容更改，比如 `element.classList.add('my-styles-class')`。浏览器会按 CSSOM 和渲染树重新计算。（译者注：CSSOM 即 CSS Object Model）

如果打开控制台，打开 [hashnode.com](http://hashnode.com/)，可以在 **Style** 阶段看到花费的时间。
![20240130111417.png](pics/20240130111417.png)

### Layout 布局

✍️ 这一步计算布局、元素位置、尺寸以及相互之间的影响关系。页面上的 DOM 越多，这一步就越费劲。
![20240130135834.png](pics/20240130135834.png)

布局（Layout）在浏览器里是相当费劲的操作。下面是会触发布局的一些行为：

1. 读取跟元素尺寸和位置相关的属性（`offsetWidth`、`offsetLeft`、`getBoundingClientRect` 等）
2. 写入跟元素尺寸和位置相关的属性。不过也有一些例外（比如 `transform` 和 `will-change`）。

> 下面这段没咋看懂，好在也不影响主题
> `transform` operates in `composition` process. `will-change` would signal to the browser, that changing the property should be calculated in `composition` stage. Here you can check the actual list of the reasons for that: [https://source.chromium.org/chromium/chromium/src/+/master:third_party/blink/renderer/core/paint/compositing/compositing_reason_finder.cc;l=39](https://source.chromium.org/chromium/chromium/src/+/master:third_party/blink/renderer/core/paint/compositing/compositing_reason_finder.cc;l=39)

小结一下，Layout 负责：

1. 计算布局变化
2. 元素插入到布局

✍️ Layout 在元素改变大小或读取元素属性的时候执行。这个过程叫强制布局（force layout）。下方链接列出了会触发强制布局的属性：[https://gist.github.com/paulirish/5d52fb081b3570c81e3a](https://gist.github.com/paulirish/5d52fb081b3570c81e3a)。

✍️ 当强制布局触发时，浏览器会暂停 JS 主线程。调用栈里有东西也不行，硬停。

比如下面的例子：

```js
div1.style.height = "200px"; // Change element size
var height1 = div1.clientHeight; // Read property
```

浏览器需要先计算 `div1` 尺寸，才能得到 `clientHeight`，所以浏览器暂停了 JS 执行：`Style` 步骤检查改变的部分，`Layout` 重新计算尺寸。`Layout` 不仅计算 `div1` 前面的元素，后面的也要算。现代浏览器会优化到不必每次都计算全部 DOM，但也不一定，最糟的情况就会全算。这种读写交替会触发多次布局。我们可以在下图中看到被更改或移动的元素：
![20240207160430.png](pics/20240207160430.png)

浏览器会尽量减少计算布局，所以会把一些动作分组计算：

```js
div1.style.height = "200px";
var height1 = div1.clientHeight; // <-- layout 1
div2.style.margin = "300px";
var height2 = div2.clientHeight; // <-- layout 2
```

第一行改了 `div1` 的高度。第二行浏览器要读取属性，但高度改变还没生效，所以浏览器要强制重新布局。第三、四行也一样。

所以可以换成一种更优的分组写法：

```js
div1.style.height = "200px";
div2.style.margin = "300px";
var height1 = div1.clientHeight; // <-- layout 1
var height2 = div2.clientHeight;
```

上面的写法把写操作放在一起、读操作放在一起，只触发一次布局，因为到第四行时已经拿到了全部数据。

现在事件循环从单个循环变成了多个循环，因为我们会在任务和微任务的时候随时触发强制布局（force layout）。
![20240208103233.png](pics/20240208103233.png)

有些页面会这样优化布局：

1. 减少 DOM 节点数
2. 把属性读写动作分组，减少不必要的布局
3. 用 force composite 替代 force layout

### Paint 绘制

![20240208103540.png](pics/20240208103540.png)

✍️ 我们在可视区域有了元素的位置和尺寸，现在要给它涂颜色/背景，开画。

![20240208103740.png](pics/20240208103740.png)
这步操作通常不会花费太多时间，除了第一次渲染。这步之后，我们就可以**真正地绘制一帧**了。最后一步叫合成（Composition）。

### Composition 合成

![20240208104314.png](pics/20240208104314.png)

✍️ 合成（Composition）是唯一一个默认使用 GPU 的阶段。这一步浏览器只执行特定的 CSS，比如 `transform`。

**重要提示**：`transform: translate` 不能“开启”GPU 渲染。所以之前有传言说可以通过 `transform: translateZ(0)` 开启 GPU 渲染，实际不行，是误解。

现代浏览器只会自行将一部分操作转为 GPU 操作。我目前没找到最新的信息，感兴趣的人可以自己看源码。[https://source.chromium.org/chromium/chromium/src/+/master:third_party/blink/renderer/core/paint/compositing/compositing_reason_finder.cc;l=39](https://source.chromium.org/chromium/chromium/src/+/master:third_party/blink/renderer/core/paint/compositing/compositing_reason_finder.cc;l=39)

![20240208125213.png](pics/20240208125213.png)

✍️ `transform` 是复杂动画的最佳选择：

1. 不会每次都重新布局，节省 CPU 时间
2. 这些动画不容易卡顿（用 top、right、bottom、left 可能会卡）

## 如何优化渲染？

✍️ 在每一帧渲染中，最难的操作是布局（layout）。有复杂动画时，每次渲染都要移动受影响的 DOM 元素，这需要 13-20ms（或更多），就会丢帧，看起来性能不好。

想优化性能，可以跳过一些渲染阶段：

![20240208130233.png](pics/20240208130233.png)
✍️ 如果只是简单改变颜色、背景，可以跳过布局（layout）。

![20240208130329.png](pics/20240208130329.png)
✍️ 也可以用 `transform` 移动，同时不读取 DOM 属性，从而跳过布局（layout）和绘制（paint）两个阶段。这样浏览器可能把它们缓存在内存里。

✍️ **小结一下，具体建议如下：**

1. 尽量用 CSS 做动画，JS 代码总有开销
2. 用 `transform` 移动
3. 用 `will-change` 属性，给浏览器标记“准备好”要变的 DOM 元素。[https://developer.mozilla.org/en-US/docs/Web/CSS/will-change](https://developer.mozilla.org/en-US/docs/Web/CSS/will-change)
4. 批量改变 DOM
5. 用 `requestAnimationFrame` 有计划地在下一帧做变化
6. 合并对 CSS 属性的**读/写**操作，并缓存结果
7. 关注强制布局属性 [https://gist.github.com/paulirish/5d52fb081b3570c81e3a](https://gist.github.com/paulirish/5d52fb081b3570c81e3a)
8. 遇到异常情况，最好打开控制台看看，找到具体是哪个阶段的问题
9. 一步一步优化，不要一次改多个地方

## 最终事件循环长啥样？

![20240208133830.png](pics/20240208133830.png)
我们可以在 [https://github.com/w3c/longtasks/blob/loaf-explainer/loaf-explainer.md#the-current-situation](https://github.com/w3c/longtasks/blob/loaf-explainer/loaf-explainer.md#the-current-situation) 看到现代浏览器事件循环的示意代码：

```js
while (true) {
    const taskStartTime = performance.now();
    // It's unspecified where UI events fit in. Should each have their own task?
    const task = eventQueue.pop();
    if (task)
        task.run();
    if (performance.now() - taskStartTime > 50)
        reportLongTask();

    if (!hasRenderingOpportunity())
        continue;

    invokeAnimationFrameCallbacks();
    while (needsStyleAndLayout()) {
        styleAndLayout();
        invokeResizeObservers();
    }
    markPaintTiming();
    render();
}
```

---

- 2024.2.8 13:51 终于翻完了初稿
