<div align="center">
  <img src="public/logo.svg" alt="Claude Code UI" width="64" height="64">
  <h1>Claude Code UI — Summer Edition ☀️</h1>
  <p>基于 <a href="https://github.com/siteboon/claudecodeui">CloudCLI / Claude Code UI</a> 的社区魔改版，专注于增强 <b>Claude Code</b> 体验。<br>实时流式渲染、思考过程可视化、工具进度显示、成本追踪 — 将 VS Code 级别的渲染效果带到 Web UI。</p>
</div>

> **注意**：这是一个魔改版本（Summer Edition）。原始项目请访问 [siteboon/claudecodeui](https://github.com/siteboon/claudecodeui)。

<div align="right"><i><a href="./README.md">English</a> · <b>中文</b></i></div>

---

## Summer Edition 魔改了什么

本 fork 专注于改进 **Claude Code** 集成体验。上游项目支持 Claude Code、Cursor CLI、Codex 和 Gemini CLI — 我们保留了多 provider 支持，但将精力集中在让 Claude Code 体验达到最佳。

### 核心增强

| 特性 | 说明 |
|---|---|
| **实时流式渲染** | SDK 消息（`stream_event`、`assistant`、`tool_progress` 等）到达即渲染，不再缓冲 |
| **思考块可视化** | `<Thinking>` 块实时流式显示，并追踪思考时长（`thinkingDurationMs`） |
| **工具进度显示** | 运行中的工具显示实时进度条和状态文本 |
| **子代理容器** | 嵌套代理任务按 taskId 匹配，显示进度日志 |
| **限速横幅** | API 限速时显示倒计时横幅 |
| **成本信息栏** | 每次响应的费用、耗时和模型信息显示在输入区域 |
| **代理状态推送** | SDK 状态消息（读取文件、搜索代码...）通过 ClaudeStatus 实时展示 |
| **降低流延迟** | 刷新间隔从 100ms 降至 33ms，流式输出更流畅 |
| **安全加固** | 禁用 gray-matter 的 JS/JSON 引擎，防止前置内容代码执行 |

### 架构变更

- **后端**：SDK 消息经 `classifySDKMessage()` 分类打 `subType` 标签后再通过 WebSocket 转发
- **前端**：单体 `useChatRealtimeHandlers` 重构为路由入口 + 9 个模块化 handler 文件
- **类型**：`ChatMessage` 扩展 `isThinking`、`thinkingDurationMs`、`toolName`、`toolInput`、`progressPercentage`、`subagentId` 等字段
- **i18n**：所有新 UI 字符串已添加到 5 种语言（en、zh-CN、ko、ja、ru）

---

## 截图

<div align="center">

<table>
<tr>
<td align="center">
<h3>桌面视图</h3>
<img src="public/screenshots/desktop-main.png" alt="Desktop Interface" width="400">
<br>
<em>显示项目概览和聊天界面的主界面</em>
</td>
<td align="center">
<h3>移动端体验</h3>
<img src="public/screenshots/mobile-chat.png" alt="Mobile Interface" width="250">
<br>
<em>具有触摸导航的响应式移动设计</em>
</td>
</tr>
<tr>
<td align="center" colspan="2">
<h3>CLI 选择</h3>
<img src="public/screenshots/cli-selection.png" alt="CLI Selection" width="400">
<br>
<em>在 Claude Code、Cursor CLI 和 Codex 之间选择</em>
</td>
</tr>
</table>



</div>

## 功能特性

保留所有上游功能：

- **响应式设计** - 在桌面、平板和移动设备上无缝运行
- **交互式聊天界面** - 内置聊天界面，与 AI 代理无缝通信
- **集成 Shell 终端** - 通过内置 shell 功能直接访问 CLI
- **文件浏览器** - 交互式文件树，支持语法高亮和实时编辑
- **Git 浏览器** - 查看、暂存和提交您的更改
- **会话管理** - 恢复对话、管理多个会话并跟踪历史记录
- **TaskMaster AI 集成** *(可选)* - AI 驱动的任务规划和工作流自动化

**Summer Edition 新增：**

- **🔥 实时流式渲染** - SDK 消息到达即渲染（33ms 刷新间隔）
- **💭 思考过程流式显示** - 实时观看 Claude 思考，带时长追踪
- **🔧 工具进度显示** - 运行中的工具显示实时进度条
- **🤖 子代理容器** - 嵌套代理任务带进度日志
- **⏱️ 成本与耗时追踪** - 每次响应的费用、模型和耗时信息
- **🚦 限速处理** - 限速时显示可视化倒计时横幅
- **📡 代理状态推送** - SDK 实时状态文本（读取中、搜索中等）


## 快速开始

### 开发环境（从此 fork）

```bash
git clone https://github.com/FuHesummer/claudecodeui-summer.git
cd claudecodeui-summer
npm install
cp .env.example .env
npm run dev
```

打开 `http://localhost:3001` — 您现有的 Claude Code 会话会被自动发现。

### 同步上游

```bash
git remote add upstream https://github.com/siteboon/claudecodeui.git
git fetch upstream
# Cherry-pick 特定提交（由于无共同历史，merge 会冲突）
git cherry-pick <commit-hash>
```

### PM2 后台运行（生产环境）

```bash
npm install -g pm2
pm2 start ecosystem.config.cjs
pm2 startup && pm2 save  # 开机自启
```

> 本 fork 已包含 `ecosystem.config.cjs`，配置了 `WORKSPACES_ROOT` 环境变量。

## 安全与工具配置

**🔒 重要提示**: 所有 Claude Code 工具**默认禁用**。这可以防止潜在的有害操作自动运行。

### 启用工具

要使用 Claude Code 的完整功能,您需要手动启用工具:

1. **打开工具设置** - 点击侧边栏中的齿轮图标
2. **选择性启用** - 仅打开您需要的工具
3. **应用设置** - 您的偏好设置将保存在本地

<div align="center">

![工具设置模态框](public/screenshots/tools-modal.png)
*工具设置界面 - 仅启用您需要的内容*

</div>

**推荐方法**: 首先启用基本工具,然后根据需要添加更多。您可以随时调整这些设置。

## TaskMaster AI 集成 *(可选)*

Claude Code UI 支持 **[TaskMaster AI](https://github.com/eyaltoledano/claude-task-master)**(aka claude-task-master)集成,用于高级项目管理和 AI 驱动的任务规划。

它提供
- 从 PRD(产品需求文档)生成 AI 驱动的任务
- 智能任务分解和依赖管理
- 可视化任务板和进度跟踪

**设置与文档**: 访问 [TaskMaster AI GitHub 仓库](https://github.com/eyaltoledano/claude-task-master)获取安装说明、配置指南和使用示例。
安装后,您应该能够从设置中启用它


## 使用指南

### 核心功能

#### 项目管理
当可用时,它会自动发现 Claude Code、Cursor 或 Codex 会话并将它们分组到项目中
- **项目操作** - 重命名、删除和组织项目
- **智能导航** - 快速访问最近的项目和会话
- **MCP 支持** - 通过 UI 添加您自己的 MCP 服务器

#### 聊天界面
- **使用响应式聊天或 Claude Code/Cursor CLI/Codex CLI** - 您可以使用自适应聊天界面或使用 shell 按钮连接到您选择的 CLI
- **实时通信** - 通过 WebSocket 连接从您选择的 CLI(Claude Code/Cursor/Codex)流式传输响应
- **会话管理** - 恢复之前的对话或启动新会话
- **消息历史** - 带有时间戳和元数据的完整对话历史
- **多格式支持** - 文本、代码块和文件引用

#### 文件浏览器与编辑器
- **交互式文件树** - 使用展开/折叠导航浏览项目结构
- **实时文件编辑** - 直接在界面中读取、修改和保存文件
- **语法高亮** - 支持多种编程语言
- **文件操作** - 创建、重命名、删除文件和目录

#### Git 浏览器


#### TaskMaster AI 集成 *(可选)*
- **可视化任务板** - 用于管理开发任务的看板风格界面
- **PRD 解析器** - 创建产品需求文档并将其解析为结构化任务
- **进度跟踪** - 实时状态更新和完成跟踪

#### 会话管理
- **会话持久化** - 所有对话自动保存
- **会话组织** - 按项目和 timestamp 分组会话
- **会话操作** - 重命名、删除和导出对话历史
- **跨设备同步** - 从任何设备访问会话

### 移动应用
- **响应式设计** - 针对所有屏幕尺寸进行优化
- **触摸友好界面** - 滑动手势和触摸导航
- **移动导航** - 底部选项卡栏,方便拇指导航
- **自适应布局** - 可折叠侧边栏和智能内容优先级
- **添加到主屏幕快捷方式** - 添加快捷方式到主屏幕,应用程序将像 PWA 一样运行

## 架构

### 系统概览

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend       │    │  Agent     │
│   (React/Vite)  │◄──►│ (Express/WS)    │◄──►│  Integration    │
│                 │    │                 │    │                │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### 后端 (Node.js + Express)
- **Express 服务器** - 具有静态文件服务的 RESTful API
- **WebSocket 服务器** - 用于聊天和项目刷新的通信
- **Agent 集成 (Claude Code / Cursor CLI / Codex)** - 进程生成和管理
- **文件系统 API** - 为项目公开文件浏览器

### 前端 (React + Vite)
- **React 18** - 带有 hooks 的现代组件架构
- **CodeMirror** - 具有语法高亮的高级代码编辑器




### 贡献

我们欢迎贡献！有关提交规范、开发流程和发布流程的详细信息,请参阅 [Contributing Guide](CONTRIBUTING.md)。

## 故障排除

### 常见问题与解决方案


#### "未找到 Claude 项目"
**问题**: UI 显示没有项目或项目列表为空
**解决方案**:
- 确保已正确安装 [Claude Code](https://docs.anthropic.com/en/docs/claude-code)
- 至少在一个项目目录中运行 `claude` 命令以进行初始化
- 验证 `~/.claude/projects/` 目录存在并具有适当的权限

#### 文件浏览器问题
**问题**: 文件无法加载、权限错误、空目录
**解决方案**:
- 检查项目目录权限(在终端中使用 `ls -la`)
- 验证项目路径存在且可访问
- 查看服务器控制台日志以获取详细错误消息
- 确保您未尝试访问项目范围之外的系统目录


## 许可证

GNU General Public License v3.0 - 详见 [LICENSE](LICENSE) 文件。

本项目是开源的，在 GPL v3 许可下可自由使用、修改和分发。

## 致谢

### 上游项目
- **[CloudCLI / Claude Code UI](https://github.com/siteboon/claudecodeui)** - Siteboon 开发的原始项目，本 fork 基于此构建

### 构建工具
- **[Claude Code](https://docs.anthropic.com/en/docs/claude-code)** - Anthropic 的官方 CLI
- **[Cursor CLI](https://docs.cursor.com/en/cli/overview)** - Cursor 的官方 CLI
- **[Codex](https://developers.openai.com/codex)** - OpenAI Codex
- **[React](https://react.dev/)** - 用户界面库
- **[Vite](https://vitejs.dev/)** - 快速构建工具和开发服务器
- **[Tailwind CSS](https://tailwindcss.com/)** - 实用优先的 CSS 框架
- **[CodeMirror](https://codemirror.net/)** - 高级代码编辑器
- **[TaskMaster AI](https://github.com/eyaltoledano/claude-task-master)** *(可选)* - AI 驱动的项目管理和任务规划

## 社区与支持

- **上游项目**：[siteboon/claudecodeui](https://github.com/siteboon/claudecodeui) — 原始项目
- **本 Fork**：[FuHesummer/claudecodeui-summer](https://github.com/FuHesummer/claudecodeui-summer) — Summer Edition
- **上游文档**：[cloudcli.ai/docs](https://cloudcli.ai/docs) — 安装、配置、功能

---

<div align="center">
  <strong>Summer Edition ☀️ — 让 Claude Code UI 更好，一次流式渲染一个改进。</strong>
  <br><br>
  <sub>基于 <a href="https://github.com/siteboon/claudecodeui">CloudCLI</a> by <a href="https://siteboon.ai">Siteboon</a></sub>
</div>
