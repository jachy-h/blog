---
title: "用 Svelte 组织浏览器插件：界面、脚本与构建边界"
categories: ["前端", "个人工具"]
tags: ["Svelte", "浏览器插件", "Vite"]
date: 2024-07-18T13:46:06+08:00
draft: false
featured: true
featuredWeight: 3
editorialLabel: "实践 · 浏览器插件"
description: "从修改页面时间的需求出发，记录 Svelte popup、原生脚本与 Vite 构建的组织方式。"
---

我在 2024 年做过一个修改目标页面时间的浏览器插件。这个需求除了一个设置界面，还涉及页面脚本与扩展脚本如何配合。

本文结合目录和配置，说明为什么只把 popup 交给 Svelte 和 Vite，并梳理执行环境与权限边界。原工程依赖版本未记录，文中的构建片段未经当前版本验证，不能作为开箱即用的完整模板。

## 为什么只给 popup 引入框架

当时的选择是：popup 有界面，使用 Svelte；content script 和 background 的逻辑则保留为原生 JavaScript。

这样做使 UI 构建与脚本资源的处理保持分离，也满足了我尝试 Svelte 的学习目的。需要纠正旧文中的一点：Svelte 采用编译方式组织界面代码，但“无运行时”不是准确的概括，不能据此断言它在任何应用中都更小。

框架选择需要在同等功能、依赖和构建条件下比较。这个插件没有留下可复核的体积测试，所以本文不做框架体积排名。

参考：[Svelte 官方介绍](https://svelte.dev/docs/svelte/overview)。

## 先分清三个执行位置

| 部分 | 在这个方案中的职责 | 需要注意的边界 |
| --- | --- | --- |
| popup | 展示设置界面 | 不能依赖弹窗持续打开来维持任务 |
| content script | 在匹配页面中运行扩展脚本 | 默认运行于隔离环境，不能直接把自身变量当作页面变量 |
| background service worker | 处理扩展后台事件 | 有生命周期，不是始终运行的普通页面 |

对“修改页面时间”这个需求，关键问题是修改发生在哪个 JavaScript 环境。只在默认隔离环境中替换 `Date`，不能据此断定页面自身脚本看到的时间也会改变。真正实现时，需要明确页面执行环境与注入方式。

本文没有展示完整的注入和通信代码，因此下面只能说明工程组织，不能证明完整的时间模拟行为已经通过验证。

参考：[Content scripts](https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts)、[扩展 service worker 生命周期](https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/lifecycle)。

## 项目结构

当时将 `popup` 作为独立的 Svelte 界面交给 Vite 构建。`content.js`、`background.js` 与图片等资源则作为静态文件进入产物目录。这里不对这些脚本做转译，也就需要自行确认目标浏览器支持所用语法。

```
├── README.md
├── dist --------------------- 构建后的文件， 用于作为插件发布
│   ├── background
│   ├── content
│   ├── imgs
│   ├── manifest.json
│   ├── popup
│   ├── svelte
│   └── vite.svg
├── jsconfig.json ------------ vscode配置文件
├── manifest.json ------------ 插件配置文件
├── package-lock.json
├── package.json
├── popup --------------------- 插件弹窗, 其中为本次svelte项目
│   ├── App.svelte
│   ├── app.css
│   ├── assets
│   ├── index.html
│   ├── lib
│   └── main.js
├── public -------------------- 静态资源
│   ├── background
│   ├── content
│   ├── imgs
│   └── vite.svg
├── svelte.config.js ---------- svelte配置文件
├── vite-env.d.ts ------------- vite配置文件
└── vite.config.js
```


## 构建配置
目标是把所有的文件构建到 `dist` 目录下， 并保持`manifest.json`在根目录下， 各个部分在`manifest.json`的指定目录下。

下面是当时的配置片段，省略了依赖导入。它依赖 Svelte 插件、静态复制插件和路径解析函数；不同版本的构建行为需要重新验证。

`vite.config.js`：

```js
export default defineConfig(({ mode }) => {
  const isProd = mode === 'production'
  return {
    root: isProd ? '' : 'popup',
    plugins: [
      // 把manifest.json复制到dist目录下
      viteStaticCopy({
        targets: [
          { src: 'manifest.json', dest: '' }
        ]
      }),
      // svelte官方插件： 构建popup部分
      svelte()
    ],
    build: {
      minify: false,
      rollupOptions: {
        // 让popup作为vite的构建入口
        input: {
          popup: resolve(__dirname, 'popup/index.html'),
        },
        // 输出配置
        output: {
          entryFileNames: '[name]/[name].js',
          chunkFileNames: '[name]/[name].js',
          assetFileNames: '[name]/[name].[ext]',
          // svelte作为独立chunk
          manualChunks: {
            svelte: ['svelte'],
          }
        }
      },
      modulePreload: {
        // 当时关闭了 modulepreload polyfill；复用时需重新核对浏览器目标
        polyfill: false
      }
    },
  }
})
```


## 构建后的结构

当时记录的产物目录如下。复用方案时，应该检查实际产物，而不是假定配置一定生成相同文件名：
```
./dist
├── background
│   ├── background.js
│   ├── insert.js
│   └── mockdate.js
├── content
│   └── content.js
├── imgs
│   └── icon.png
├── manifest.json
├── popup
│   ├── index.html
│   ├── popup.css
│   └── popup.js
├── svelte
│   └── svelte.js
└── vite.svg
```

下面保留当时的 `manifest.json`。其中 `<all_urls>` 的匹配范围较宽；如果需求只涉及指定站点，应缩小匹配规则，并按实际用到的能力核对权限。

```json
{
  "manifest_version": 3,
  "name": "SimulatedTime",
  "description": "Change the current time to simulation time!",
  "version": "1.0",
  "action": {
    "default_popup": "popup/index.html",
    "default_icon": "imgs/icon.png"
  },
  "permissions": ["scripting", "activeTab", "storage"],
  "host_permissions": ["<all_urls>"],
  "background": {
    "service_worker": "background/background.js"
  },
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["content/content.js"],
      "run_at": "document_start"
    }
  ]
}
```



## 构建成功之后，还要检查什么

下面是复用这个方案时的建议验证项，不是原项目已经执行过的测试结果：

1. **路径**：manifest 引用的 popup、脚本和图标在产物目录中都存在。
2. **弹窗**：popup 能正常打开，脚本和样式没有路径错误。
3. **状态**：关闭 popup、刷新目标页面后，设置是否按预期保存或恢复。
4. **执行环境**：在测试页面分别观察扩展环境与页面环境中的时间，确认修改范围。
5. **权限**：匹配站点与所需权限一致，未授权站点的行为符合预期。

参考：[Chrome 扩展权限声明](https://developer.chrome.com/docs/extensions/develop/concepts/declare-permissions)。

这份方案对我最有价值的部分，是把界面构建与扩展脚本分开组织。它的适用边界也很明确：复制静态脚本并不能替代对执行环境、通信和生命周期的设计。
