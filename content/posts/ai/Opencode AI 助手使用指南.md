---
title: "OpenCode AI 助手使用指南"
date: 2026-01-26
categories: ["AI", "工具"]
draft: false
---

我的基础环境：
- Mac mini

## 安装步骤

1. 安装 [Ghostty](https://ghostty.org/docs/install/binary)：OpenCode 的配色在深色背景下更好看
2. 安装 [OpenCode](https://opencode.ai/docs/)
3. 在工作目录配置 `opencode.jsonc`，示例如下：

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "provider": {
    "bailian": {
      "name": "bailian",
      "options": {
        "baseURL": "https://dashscope.aliyuncs.com/compatible-mode/v1"
      },
      "models": {
        "qwen-flash": {},
        "deepseek-v3.2": {}
      }
    }
  },
  "autoupdate": true
}
```

4. 打开 Ghostty，输入 `opencode`，进入工具
5. 输入 `/connect`，选择上面配置的百炼入口和模型
6. 愉快玩耍
