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

2024 年我写了一个修改目标页面时间的浏览器插件。需求不复杂：一个设置界面，加上页面脚本和扩展脚本的配合。当时想顺便试试 Svelte，就把 popup 交给 Svelte 和 Vite 构建，content script 和 background 仍用原生 JavaScript。

下面是当时的目录、配置和几个执行环境上的注意点。原工程没有记录依赖版本，构建片段未经当前版本验证，复用前需要重新核对。

## 为什么只给 popup 引入框架

popup 有界面，用 Svelte 写起来顺手；content script 和 background 逻辑不多，没必要再引入一套构建。这样 UI 和脚本资源各走各的，配置也简单。

Svelte 通过编译生成界面代码，构建方式与 React 这类运行时框架不同。要比较体积，得在功能、依赖和构建条件一致时测；这个插件没有留下可复核的数据，所以不谈排名。

参考：[Svelte 官方介绍](https://svelte.dev/docs/svelte/overview)。

## 先分清三个执行位置

| 部分 | 在这个方案中的职责 | 需要注意的边界 |
| --- | --- | --- |
| popup | 展示设置界面 | 不能依赖弹窗持续打开来维持任务 |
| content script | 在匹配页面中运行扩展脚本 | 默认运行于隔离环境，不能直接把自身变量当作页面变量 |
| background service worker | 处理扩展后台事件 | 有生命周期，不是始终运行的普通页面 |

“修改页面时间”的关键是改在哪个 JavaScript 环境。content script 默认运行在隔离环境，只替换这里的 `Date`，页面自己的脚本不一定看得到。真正实现时，要先确定页面环境和注入方式。

下面的内容只讲工程组织，不包含完整的注入和通信代码。

参考：[Content scripts](https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts)、[扩展 service worker 生命周期](https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/lifecycle)。

## 项目结构

popup 是独立的 Svelte 界面，交给 Vite 构建；`content.js`、`background.js` 和图片作为静态文件进入产物目录。这些脚本不做转译，需要自己确认目标浏览器支持所用语法。

```
├── README.md
├── dist --------------------- 构建后的文件， 用于作为插件发布
│   ├── background
│   ├── content
│   ├── imgs
│   ├── manifest.json
│   ├── popup
│   ├── svelte
│   └── vite.svg
├── jsconfig.json ------------ vscode配置文件
├── manifest.json ------------ 插件配置文件
├── package-lock.json
├── package.json
├── popup --------------------- 插件弹窗, 其中为本次svelte项目
│   ├── App.svelte
│   ├── app.css
│   ├── assets
│   ├── index.html
│   ├── lib
│   └── main.js
├── public -------------------- 静态资源
│   ├── background
│   ├── content
│   ├── imgs
│   └── vite.svg
├── svelte.config.js ---------- svelte配置文件
├── vite-env.d.ts ------------- vite配置文件
└── vite.config.js
```


## 构建配置

目标很简单：所有文件进 `dist`，`manifest.json` 留在根目录，各部分放在 manifest 指定的目录下。

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

产物目录如下。复用方案时，先检查实际产物，不要假定配置一定生成相同的文件名：

```
./dist
├── background
│   ├── background.js
│   ├── insert.js
│   └── mockdate.js
├── content
│   └── content.js
├── imgs
│   └── icon.png
├── manifest.json
├── popup
│   ├── index.html
│   ├── popup.css
│   └── popup.js
├── svelte
│   └── svelte.js
└── vite.svg
```

当时的 `manifest.json` 如下。`<all_urls>` 的匹配范围很宽；如果只针对特定站点，应该缩小 matches，再按实际用到的能力核对权限。

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



## 复用前检查

1. **路径**：manifest 引用的 popup、脚本和图标都在产物目录里。
2. **弹窗**：popup 能打开，脚本和样式没有路径错误。
3. **状态**：关闭 popup、刷新目标页面后，设置能按预期保存或恢复。
4. **执行环境**：在测试页面分别看扩展环境和页面环境中的时间，确认修改范围。
5. **权限**：匹配站点与所需权限一致，未授权站点的行为符合预期。

参考：[Chrome 扩展权限声明](https://developer.chrome.com/docs/extensions/develop/concepts/declare-permissions)。

这个方案对我最有用的地方，是把界面构建和扩展脚本分开。静态脚本复制过去容易，难的是想清楚执行环境、通信和 service worker 的生命周期。
