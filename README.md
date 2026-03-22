# Warp

AI-powered VS Code extension for code optimization, explanation, and test generation using Claude API.

---

Warp 是一款基于 Claude API 的 VS Code 智能编程助手。

## 核心亮点

**专为 Coding 小白设计** — 不懂开发也能写出专业级代码。Warp 将你的自然语言描述自动转换为优化后的专业提示词，让 AI 精准理解你的需求，生成高质量代码。

## 主要功能

- **智能提示词优化** — 自动将你的大白话转换为专业级 Prompt，让 AI 更懂你的需求
- **代码优化** — AI 驱动的代码重构与性能提升
- **代码解释** — 深度解析代码逻辑与设计意图，用通俗语言讲清楚
- **测试生成** — 自动生成单元测试代码
- **多模型支持** — 支持 Claude Sonnet、Opus、Haiku

## 使用体验

侧边栏原生交互，状态栏实时显示当前模型，支持选中代码自动识别与一键操作。

## 安装

```bash
npm install
npm run compile
```

## 使用方法

### 1. 设置 API Key

首次使用需设置 Anthropic API Key：

1. 打开侧边栏（点击左侧活动栏的 Warp 图标）
2. 在输入框中输入您的 API Key
3. 点击"保存 API Key"按钮

或使用命令：`Warp: 设置 API Key`

### 2. 使用功能

- **优化代码**：输入代码，点击"优化代码"
- **解释代码**：输入代码，点击"解释代码"
- **生成测试**：输入代码，点击"生成测试"
- **获取选中代码**：点击"获取选中代码"按钮自动获取编辑器中选中的代码
- **复制/插入结果**：处理完成后可复制到剪贴板或直接插入到编辑器

## 注意事项

- 需要有效的 Anthropic API Key
- 所有异步操作都有 Loading 状态提示
- 网络异常和 API Key 缺失有友好提示
