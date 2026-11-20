---
title: "jsconfig.json 是什么"
date: 2024-07-17T08:45:19+08:00
categories: ["前端", "工具"]
draft: false
---

`jsconfig.json` 是 VS Code 读取的 JavaScript 项目配置，用来告诉编辑器如何理解项目结构。它的字段与 `tsconfig.json` 基本一致，只是面向 JavaScript，不需要引入 TypeScript。

## 常见用途

- `compilerOptions.baseUrl`：设置非相对路径导入的基准目录。
- `compilerOptions.paths`：配置路径别名，例如用 `@/` 指向 `src/`。
- `compilerOptions.checkJs`：让编辑器对 `.js` 文件做类型检查。
- `include` / `exclude`：限定参与语言服务的文件范围。

## 示例

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    },
    "checkJs": false
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

需要注意：`jsconfig.json` 影响的是编辑器和语言服务，不会改变打包工具的模块解析。路径别名要在 Vite、Webpack 等构建配置里另行设置，两边保持一致。

## 和 tsconfig.json 的关系

项目使用 TypeScript 时用 `tsconfig.json`；纯 JavaScript 项目想获得同样的路径提示和类型检查能力时，用 `jsconfig.json`。按项目需要选一种即可。
