# AI 自动化桌面管理应用 — 设计文档

> 版本：v1.0 | 日期：2026-03-16

---

## 1. 概述

### 1.1 目标

为现有的 AI 夜间自动化系统（runner/report/cron）构建一个 Electron 桌面应用，提供可视化管理界面，替代命令行操作。

### 1.2 核心决策

| 决策 | 选择 | 理由 |
|------|------|------|
| 应用类型 | 桌面应用（非 Web） | 需要直接访问本地文件系统和 git |
| 技术栈 | Electron + React + TypeScript | 生态成熟，与现有 Node.js 后端无缝集成 |
| 架构 | 直接复用现有脚本逻辑（方案 A） | 开发最快，改造成本低 |
| 多项目 | 支持 | 一步到位，配置存 `~/.ai-automation/` |
| 构建工具 | electron-vite | 开发体验好，Electron + React 一站式 |

### 1.3 MVP 范围

**MVP（第一版）**：
- A. 项目管理（添加/切换/删除项目目录）
- B. 任务创建/编辑（可视化编辑器，替代手写 .md）
- C. 任务列表（pending/running/done/failed 状态看板）
- D. 一键执行任务（替代 `node runner.mjs`）
- E. 实时执行日志（任务运行时查看输出）
- F. 报告查看（渲染 Markdown 报告）

**二期**：
- G. Git 分支管理（查看 AI 分支、diff、一键 merge/删除）
- H. 定时任务配置（可视化配置 cron 时间）
- I. 配置管理（maxTurns、allowedTools 等参数的 GUI）
- J. 通知推送（飞书/Slack webhook）

---

## 2. 项目结构

```
ai-automation/
├── package.json                 # Electron + React 依赖
├── electron/                    # Electron 主进程
│   ├── main.ts                  # 入口，窗口管理
│   ├── preload.ts               # contextBridge 暴露 API
│   ├── ipc/                     # IPC 处理器（按功能分模块）
│   │   ├── projects.ts          # 项目管理 IPC
│   │   ├── tasks.ts             # 任务 CRUD IPC
│   │   ├── runner.ts            # 执行控制 IPC
│   │   └── reports.ts           # 报告查询 IPC
│   └── core/                    # 核心逻辑（从现有脚本改造）
│       ├── runner.ts            # runner.mjs → 异步化改造
│       ├── report.ts            # report.mjs → 模块化改造
│       ├── project-manager.ts   # 多项目管理（新增）
│       └── config.ts            # 配置管理
├── src/                         # React 渲染进程
│   ├── main.tsx                 # React 入口
│   ├── App.tsx                  # 路由 + 布局
│   ├── pages/
│   │   ├── Dashboard.tsx        # 首页概览
│   │   ├── Tasks.tsx            # 任务管理
│   │   ├── TaskEditor.tsx       # 任务编辑器
│   │   ├── Execution.tsx        # 执行控制 & 实时日志
│   │   └── Reports.tsx          # 报告查看
│   ├── components/              # 通用组件
│   └── hooks/                   # 自定义 hooks
├── tasks/                       # 兼容现有结构
├── results/
├── reports/
├── TECHNICAL.md
└── USAGE.md
```

---

## 3. 数据设计

### 3.1 多项目配置

存储位置：`~/.ai-automation/projects.json`

```typescript
interface ProjectsConfig {
  activeProject: string;  // 当前活跃项目 ID
  projects: Project[];
}

interface Project {
  id: string;                    // UUID
  name: string;                  // 显示名称
  projectRoot: string;           // 项目代码根目录
  automationDir: string;         // ai-automation 目录路径
  config: RunnerConfig;          // 每项目独立配置
}

interface RunnerConfig {
  maxTurns: number;              // 默认 10
  maxBudgetUsd: number;          // 默认 5.0
  taskTimeoutMs: number;         // 默认 600000 (10min)
  sleepBetweenTasksMs: number;   // 默认 5000
  retryDelayMs: number;          // 默认 1800000 (30min)
  allowedTools: string[];        // Claude 工具白名单
}
```

### 3.2 任务文件格式

保持与现有 `.md` 格式完全一致，不引入新格式。桌面应用的编辑器生成标准 Markdown 文件写入 `tasks/pending/`。

---

## 4. IPC 通信设计

### 4.1 请求-响应型（invoke/handle）

```typescript
// 项目管理
window.api.projects.list()                    → Project[]
window.api.projects.add(projectRoot: string)  → Project
window.api.projects.remove(id: string)        → void
window.api.projects.setActive(id: string)     → void

// 任务管理
window.api.tasks.list(status?: TaskStatus)    → Task[]
window.api.tasks.create(task: TaskDraft)      → Task
window.api.tasks.update(id: string, content)  → Task
window.api.tasks.delete(id: string)           → void
window.api.tasks.retry(id: string)            → void

// 执行控制
window.api.runner.start()                     → void
window.api.runner.stop()                      → void

// 报告
window.api.reports.list()                     → ReportSummary[]
window.api.reports.get(date: string)          → ReportDetail
```

### 4.2 事件推送型（主进程 → 渲染进程）

```typescript
window.api.on('runner:task-start',   (taskName) => ...)
window.api.on('runner:task-log',     (taskName, line) => ...)
window.api.on('runner:task-done',    (taskName, result) => ...)
window.api.on('runner:task-failed',  (taskName, error) => ...)
window.api.on('runner:all-done',     (summary) => ...)
```

---

## 5. Runner 异步化改造

现有 `execSync` 改为 `spawn`，支持实时日志推送：

```typescript
// 改造前（阻塞）
const result = execSync(claudeCmd, { timeout });

// 改造后（异步 + 事件）
const child = spawn('claude', args, { shell: true });
child.stdout.on('data', (chunk) => {
  mainWindow.webContents.send('runner:task-log', taskName, chunk.toString());
});
const result = await new Promise((resolve, reject) => {
  child.on('close', (code) => code === 0 ? resolve(stdout) : reject(stderr));
});
```

其他改造：
- 任务循环从 `for` 同步循环改为 `async/await` 异步循环
- 支持中止执行（通过 `child.kill()` 终止子进程）
- 状态通过 IPC 事件实时推送给前端

---

## 6. UI 设计

### 6.1 整体布局

```
┌──────────────────────────────────────────────────────┐
│  项目选择下拉框 [my-web-app ▼]        [+ 添加项目]    │
├──────────┬───────────────────────────────────────────┤
│          │                                           │
│  概览    │          主内容区                           │
│  任务    │                                           │
│  执行    │                                           │
│  报告    │                                           │
│          │                                           │
├──────────┴───────────────────────────────────────────┤
│  状态栏: 当前项目路径 | 任务统计 | runner 状态         │
└──────────────────────────────────────────────────────┘
```

### 6.2 页面说明

**概览页**：四个统计卡片（pending/running/done/failed），最近任务列表，快捷操作按钮。

**任务页**：四列看板视图，任务卡片支持编辑/删除/重试操作。

**任务编辑器**：左侧结构化表单（标题、背景、目标、约束、文件、验证），右侧实时 Markdown 预览，支持模板选择。

**执行页**：控制栏（开始/停止/进度条），实时日志终端（暗色背景等宽字体），左侧任务状态列表可切换查看日志。

**报告页**：左侧日期列表，右侧 Markdown 渲染的报告内容。

### 6.3 UI 技术选型

| 选项 | 方案 |
|------|------|
| UI 组件库 | Ant Design 5 |
| Markdown 渲染 | react-markdown |
| 日志终端 | xterm.js 或 `<pre>` 滚动区 |
| 状态管理 | Zustand |
| 路由 | React Router v6 |

---

## 7. 错误处理

| 场景 | 处理方式 |
|------|----------|
| 项目路径不是 git 仓库 | 提示用户，拒绝添加 |
| 项目目录不存在/被删除 | 启动时检测，标记「不可用」 |
| git 工作区不干净 | 弹窗提示具体文件，阻止执行 |
| Claude CLI 未安装 | 启动时检测，引导安装 |
| 任务执行超时 | kill 子进程，标记 failed，UI 显示原因 |
| 额度耗尽 | 暂停执行，UI 通知用户 |
| 关闭窗口时有任务执行 | 弹确认框 |

---

## 8. 兼容性

- 桌面应用和 CLI 方式可以共存
- 用户仍可手动往 `tasks/pending/` 放 `.md` 文件
- 用户仍可命令行执行 `node runner.mjs`
- 底层文件格式和目录结构完全不变
