# Claude Code 桌面管理应用 - 实施计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 构建 Electron + React 桌面应用，可视化管理 Claude Code 自动化任务系统（多项目支持）。

**Architecture:** Electron 主进程直接封装核心逻辑（runner/report/config），通过 IPC 暴露给 React 渲染进程。任务文件保持 .md 格式存储在文件系统，不引入数据库。多项目配置存 ~/.ai-automation/projects.json。

**Tech Stack:** Electron + electron-vite + React + TypeScript + Ant Design 5 + Zustand + React Router v6 + react-markdown

**Design Doc:** `docs/plans/2026-03-16-desktop-app-design.md`

**Reference Docs:** `TECHNICAL.md`（系统架构规格）, `USAGE.md`（用户手册，含任务模板和执行流程）

---

## Task 1: 项目脚手架搭建

**Files:**

- Create: `package.json`
- Create: `electron/main.ts`
- Create: `electron/preload.ts`
- Create: `src/main.tsx`
- Create: `src/App.tsx`
- Create: `electron.vite.config.ts`
- Create: `tsconfig.json`
- Create: `tsconfig.node.json`
- Create: `tsconfig.web.json`
- Create: `src/env.d.ts`
- Create: `.gitignore`

**Step 1: 用 electron-vite 初始化项目**

Run: `npm create @quick-start/electron@latest . -- --template react-ts`

如果交互式命令不可用，手动创建 package.json：

```json
{
  "name": "ai-automation",
  "version": "0.1.0",
  "main": "./out/main/index.js",
  "scripts": {
    "dev": "electron-vite dev",
    "build": "electron-vite build",
    "preview": "electron-vite preview",
    "typecheck:node": "tsc --noEmit -p tsconfig.node.json",
    "typecheck:web": "tsc --noEmit -p tsconfig.web.json",
    "typecheck": "npm run typecheck:node && npm run typecheck:web"
  },
  "dependencies": {
    "antd": "^5.22.0",
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "react-markdown": "^9.0.0",
    "react-router-dom": "^6.28.0",
    "uuid": "^10.0.0",
    "zustand": "^5.0.0"
  },
  "devDependencies": {
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "@types/uuid": "^10.0.0",
    "@vitejs/plugin-react": "^4.3.0",
    "electron": "^33.0.0",
    "electron-vite": "^2.3.0",
    "typescript": "^5.6.0"
  }
}
```

**Step 2: 创建 electron-vite 配置文件**

```typescript
// electron.vite.config.ts
import { resolve } from "path";
import { defineConfig, externalizeDepsPlugin } from "electron-vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
  },
  renderer: {
    resolve: {
      alias: {
        "@": resolve("src"),
      },
    },
    plugins: [react()],
  },
});
```

**Step 3: 创建 TypeScript 配置**

```json
// tsconfig.json
{
  "files": [],
  "references": [
    { "path": "./tsconfig.node.json" },
    { "path": "./tsconfig.web.json" }
  ]
}
```

```json
// tsconfig.node.json
{
  "compilerOptions": {
    "composite": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "target": "ESNext",
    "outDir": "./out",
    "rootDir": ".",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true
  },
  "include": ["electron/**/*.ts"]
}
```

```json
// tsconfig.web.json
{
  "compilerOptions": {
    "composite": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "target": "ESNext",
    "jsx": "react-jsx",
    "outDir": "./out",
    "rootDir": ".",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  },
  "include": ["src/**/*.ts", "src/**/*.tsx", "src/env.d.ts"]
}
```

**Step 4: 创建 Electron 主进程入口**

```typescript
// electron/main.ts
import { app, BrowserWindow, shell } from "electron";
import { join } from "path";
import { is } from "@electron-toolkit/utils";

let mainWindow: BrowserWindow | null = null;

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    show: false,
    webPreferences: {
      preload: join(__dirname, "../preload/index.js"),
      sandbox: false,
    },
  });

  mainWindow.on("ready-to-show", () => {
    mainWindow?.show();
  });

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url);
    return { action: "deny" };
  });

  if (is.dev && process.env["ELECTRON_RENDERER_URL"]) {
    mainWindow.loadURL(process.env["ELECTRON_RENDERER_URL"]);
  } else {
    mainWindow.loadFile(join(__dirname, "../renderer/index.html"));
  }
}

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
```

注意: `@electron-toolkit/utils` 需要在 Step 1 安装时加入 devDependencies，如果模板没自带则手动添加：`"@electron-toolkit/utils": "^3.0.0"`

**Step 5: 创建 preload 脚本（空壳）**

```typescript
// electron/preload.ts
import { contextBridge } from "electron";

contextBridge.exposeInMainWorld("api", {
  // 后续 Task 逐步添加
});
```

**Step 6: 创建 React 入口**

```typescript
// src/env.d.ts
/// <reference types="electron-vite/node" />

interface Window {
  api: typeof import("../electron/preload").default;
}
```

```tsx
// src/main.tsx
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
```

```tsx
// src/App.tsx
function App(): React.ReactElement {
  return <div style={{ padding: 24 }}>Claude Automation - Hello World</div>;
}

export default App;
```

创建 `src/index.html`（渲染进程入口 HTML）：

```html
<!-- src/index.html -->
<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <title>Claude Automation</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="./main.tsx"></script>
  </body>
</html>
```

**Step 7: 创建 .gitignore**

```
node_modules/
out/
dist/
.DS_Store
*.log
```

**Step 8: 安装依赖并验证启动**

Run: `npm install`

Run: `npm run dev`

Expected: Electron 窗口打开，显示 "Claude Automation - Hello World"

**Step 9: 提交**

```bash
git init
git add package.json electron/ src/ electron.vite.config.ts tsconfig*.json .gitignore
git commit -m "feat: scaffold Electron + React + TypeScript project with electron-vite"
```

---

## Task 2: 共享类型定义

**Files:**

- Create: `electron/core/types.ts`

**Step 1: 定义所有共享类型**

参考 `TECHNICAL.md` 行 119-129（CONFIG）、设计文档行 86-106（数据 Schema），以及 `TECHNICAL.md` 行 345-358（JSON 输出格式）。

```typescript
// electron/core/types.ts

export interface ProjectsConfig {
  activeProject: string;
  projects: Project[];
}

export interface Project {
  id: string;
  name: string;
  projectRoot: string;
  automationDir: string;
  config: RunnerConfig;
}

export interface RunnerConfig {
  maxTurns: number;
  maxBudgetUsd: number;
  taskTimeoutMs: number;
  sleepBetweenTasksMs: number;
  retryDelayMs: number;
  allowedTools: string[];
}

export type TaskStatus = "pending" | "running" | "done" | "failed";

export interface Task {
  id: string; // 文件名（不含扩展名）
  name: string; // 从 markdown # 标题提取
  status: TaskStatus;
  content: string; // 完整 markdown 内容
  filePath: string; // 绝对路径
  createdAt: string; // ISO 时间戳
  updatedAt: string;
}

export interface TaskDraft {
  title: string;
  background: string;
  goals: string[];
  constraints: string[];
  files: string[];
  verification: string[];
}

export interface ClaudeResult {
  session_id: string;
  result: string;
  usage: {
    total_cost: number;
    turns: number;
    input_tokens: number;
    output_tokens: number;
  };
}

export interface TaskExecutionResult {
  taskName: string;
  success: boolean;
  branch: string;
  result?: ClaudeResult;
  error?: string;
  duration: number;
}

export interface ReportSummary {
  date: string;
  filePath: string;
  taskCount: number;
  successCount: number;
  failCount: number;
}

export interface ReportDetail extends ReportSummary {
  content: string; // Markdown 内容
}

// IPC 事件类型
export type RunnerEvent =
  | { type: "task-start"; taskName: string }
  | { type: "task-log"; taskName: string; line: string }
  | { type: "task-done"; taskName: string; result: TaskExecutionResult }
  | { type: "task-failed"; taskName: string; error: string }
  | { type: "all-done"; results: TaskExecutionResult[] };
```

**Step 2: 提交**

```bash
git add electron/core/types.ts
git commit -m "feat: add shared TypeScript type definitions"
```

---

## Task 3: 配置管理模块

**Files:**

- Create: `electron/core/config.ts`

**Step 1: 实现配置管理**

参考 `TECHNICAL.md` 行 119-129 的 CONFIG 对象和行 286-297 的 allowedTools。

```typescript
// electron/core/config.ts
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";
import { homedir } from "os";
import { v4 as uuidv4 } from "uuid";
import type { ProjectsConfig, Project, RunnerConfig } from "./types";

const CONFIG_DIR = join(homedir(), ".ai-automation");
const CONFIG_FILE = join(CONFIG_DIR, "projects.json");

export const DEFAULT_RUNNER_CONFIG: RunnerConfig = {
  maxTurns: 10,
  maxBudgetUsd: 5.0,
  taskTimeoutMs: 10 * 60 * 1000,
  sleepBetweenTasksMs: 5 * 1000,
  retryDelayMs: 30 * 60 * 1000,
  allowedTools: [
    "Read",
    "Edit",
    "Write",
    "Glob",
    "Grep",
    "Bash(git diff *)",
    "Bash(git add *)",
    "Bash(git status)",
    "Bash(npx tsc --noEmit *)",
  ],
};

export function loadProjectsConfig(): ProjectsConfig {
  if (!existsSync(CONFIG_FILE)) {
    return { activeProject: "", projects: [] };
  }
  const raw = readFileSync(CONFIG_FILE, "utf-8");
  return JSON.parse(raw) as ProjectsConfig;
}

export function saveProjectsConfig(config: ProjectsConfig): void {
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true });
  }
  writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), "utf-8");
}

export function getActiveProject(): Project | null {
  const config = loadProjectsConfig();
  if (!config.activeProject || config.projects.length === 0) return null;
  return config.projects.find((p) => p.id === config.activeProject) ?? null;
}

export function addProject(projectRoot: string, name: string): Project {
  const config = loadProjectsConfig();
  const project: Project = {
    id: uuidv4(),
    name,
    projectRoot,
    automationDir: join(projectRoot, "ai-automation"),
    config: { ...DEFAULT_RUNNER_CONFIG },
  };
  config.projects.push(project);
  if (!config.activeProject) {
    config.activeProject = project.id;
  }
  saveProjectsConfig(config);
  return project;
}

export function removeProject(id: string): void {
  const config = loadProjectsConfig();
  config.projects = config.projects.filter((p) => p.id !== id);
  if (config.activeProject === id) {
    config.activeProject = config.projects[0]?.id ?? "";
  }
  saveProjectsConfig(config);
}

export function setActiveProject(id: string): void {
  const config = loadProjectsConfig();
  if (!config.projects.find((p) => p.id === id)) {
    throw new Error(`Project ${id} not found`);
  }
  config.activeProject = id;
  saveProjectsConfig(config);
}
```

**Step 2: 验证编译**

Run: `npx tsc --noEmit -p tsconfig.node.json`

Expected: 无错误

**Step 3: 提交**

```bash
git add electron/core/config.ts
git commit -m "feat: add project config management module"
```

---

## Task 4: 任务管理模块

**Files:**

- Create: `electron/core/task-manager.ts`

**Step 1: 实现任务文件 CRUD**

参考 `USAGE.md` 行 124-146（任务模板）、`TECHNICAL.md` 行 232-264（任务状态机）。

任务通过文件系统管理：`tasks/pending/`、`tasks/running/`、`tasks/done/`、`tasks/failed/`。

```typescript
// electron/core/task-manager.ts
import {
  readFileSync,
  writeFileSync,
  readdirSync,
  renameSync,
  unlinkSync,
  existsSync,
  mkdirSync,
  statSync,
} from "fs";
import { join, basename, extname } from "path";
import type { Task, TaskDraft, TaskStatus } from "./types";

const STATUSES: TaskStatus[] = ["pending", "running", "done", "failed"];

function ensureTaskDirs(automationDir: string): void {
  for (const status of STATUSES) {
    const dir = join(automationDir, "tasks", status);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  }
}

function parseTaskName(content: string): string {
  const match = content.match(/^#\s+(?:任务：|Task:\s*)?(.+)$/m);
  return match ? match[1].trim() : "Untitled";
}

function readTaskFile(filePath: string, status: TaskStatus): Task {
  const content = readFileSync(filePath, "utf-8");
  const stat = statSync(filePath);
  const id = basename(filePath, extname(filePath));
  return {
    id,
    name: parseTaskName(content),
    status,
    content,
    filePath,
    createdAt: stat.birthtime.toISOString(),
    updatedAt: stat.mtime.toISOString(),
  };
}

export function listTasks(
  automationDir: string,
  statusFilter?: TaskStatus,
): Task[] {
  ensureTaskDirs(automationDir);
  const statuses = statusFilter ? [statusFilter] : STATUSES;
  const tasks: Task[] = [];

  for (const status of statuses) {
    const dir = join(automationDir, "tasks", status);
    if (!existsSync(dir)) continue;
    const files = readdirSync(dir).filter(
      (f) => f.endsWith(".md") && !f.startsWith("_"),
    );
    for (const file of files) {
      tasks.push(readTaskFile(join(dir, file), status));
    }
  }

  return tasks;
}

export function createTask(automationDir: string, draft: TaskDraft): Task {
  ensureTaskDirs(automationDir);
  const content = renderTaskMarkdown(draft);
  const fileName = slugify(draft.title) + ".md";
  const filePath = join(automationDir, "tasks", "pending", fileName);
  writeFileSync(filePath, content, "utf-8");
  return readTaskFile(filePath, "pending");
}

export function updateTask(
  automationDir: string,
  id: string,
  content: string,
): Task {
  // 查找任务在哪个状态目录
  for (const status of STATUSES) {
    const filePath = join(automationDir, "tasks", status, `${id}.md`);
    if (existsSync(filePath)) {
      writeFileSync(filePath, content, "utf-8");
      return readTaskFile(filePath, status);
    }
  }
  throw new Error(`Task ${id} not found`);
}

export function deleteTask(automationDir: string, id: string): void {
  for (const status of STATUSES) {
    const filePath = join(automationDir, "tasks", status, `${id}.md`);
    if (existsSync(filePath)) {
      unlinkSync(filePath);
      return;
    }
  }
  throw new Error(`Task ${id} not found`);
}

export function moveTask(
  automationDir: string,
  id: string,
  from: TaskStatus,
  to: TaskStatus,
): void {
  const srcPath = join(automationDir, "tasks", from, `${id}.md`);
  const destPath = join(automationDir, "tasks", to, `${id}.md`);
  ensureTaskDirs(automationDir);
  renameSync(srcPath, destPath);
}

export function retryTask(automationDir: string, id: string): Task {
  moveTask(automationDir, id, "failed", "pending");
  const filePath = join(automationDir, "tasks", "pending", `${id}.md`);
  return readTaskFile(filePath, "pending");
}

function renderTaskMarkdown(draft: TaskDraft): string {
  const lines: string[] = [];
  lines.push(`# 任务：${draft.title}`);
  lines.push("");
  lines.push("## 背景");
  lines.push(draft.background);
  lines.push("");
  lines.push("## 目标");
  for (const goal of draft.goals) {
    lines.push(`- [ ] ${goal}`);
  }
  lines.push("");
  lines.push("## 约束");
  for (const c of draft.constraints) {
    lines.push(`- ${c}`);
  }
  lines.push("");
  lines.push("## 涉及文件");
  for (const f of draft.files) {
    lines.push(`- ${f}`);
  }
  lines.push("");
  lines.push("## 验证方式");
  for (const v of draft.verification) {
    lines.push(`- ${v}`);
  }
  lines.push("");
  return lines.join("\n");
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\u4e00-\u9fff]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .substring(0, 60);
}
```

**Step 2: 验证编译**

Run: `npx tsc --noEmit -p tsconfig.node.json`

Expected: 无错误

**Step 3: 提交**

```bash
git add electron/core/task-manager.ts
git commit -m "feat: add task file CRUD manager"
```

---

## Task 5: Runner 核心模块（异步化）

**Files:**

- Create: `electron/core/runner.ts`

**Step 1: 实现异步 Runner**

参考 `TECHNICAL.md` 行 132-164（执行流程）、行 166-176（技术决策）、行 267-320（安全机制）。
参考设计文档行 154-176（异步化改造要点）。

核心改造点：

- `execSync` → `spawn` + Promise
- 通过回调函数推送事件（由 IPC 层绑定到 mainWindow）
- 支持中止执行

```typescript
// electron/core/runner.ts
import { spawn, ChildProcess } from "child_process";
import { execSync } from "child_process";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";
import type {
  Project,
  TaskExecutionResult,
  ClaudeResult,
  RunnerEvent,
} from "./types";
import { listTasks, moveTask } from "./task-manager";

type EventCallback = (event: RunnerEvent) => void;

let currentChild: ChildProcess | null = null;
let isRunning = false;
let shouldStop = false;

export function getRunnerStatus(): { isRunning: boolean } {
  return { isRunning };
}

export function stopRunner(): void {
  shouldStop = true;
  if (currentChild) {
    currentChild.kill("SIGTERM");
  }
}

export async function runAllTasks(
  project: Project,
  onEvent: EventCallback,
): Promise<TaskExecutionResult[]> {
  if (isRunning) throw new Error("Runner is already running");

  isRunning = true;
  shouldStop = false;
  const results: TaskExecutionResult[] = [];

  try {
    // 检查 git 工作区是否干净
    checkGitClean(project.projectRoot);

    // 获取 pending 任务
    const tasks = listTasks(project.automationDir, "pending");
    if (tasks.length === 0) {
      onEvent({ type: "all-done", results: [] });
      return [];
    }

    // 记录原始分支
    const originalBranch = execSync("git rev-parse --abbrev-ref HEAD", {
      cwd: project.projectRoot,
      encoding: "utf-8",
    }).trim();

    for (const task of tasks) {
      if (shouldStop) break;

      const taskName = task.id;
      onEvent({ type: "task-start", taskName });

      const startTime = Date.now();
      const branch = `ai/${taskName}`;

      try {
        // 创建并切换到任务分支
        execSync(`git checkout -b ${branch}`, {
          cwd: project.projectRoot,
          encoding: "utf-8",
        });

        // 移动任务到 running
        moveTask(project.automationDir, taskName, "pending", "running");

        // 执行 Claude
        const result = await executeClaudeTask(
          project,
          task.content,
          taskName,
          onEvent,
        );

        // 保存结果
        const resultsDir = join(project.automationDir, "results");
        if (!existsSync(resultsDir)) mkdirSync(resultsDir, { recursive: true });
        writeFileSync(
          join(resultsDir, `${taskName}.json`),
          JSON.stringify(result, null, 2),
          "utf-8",
        );

        // Git add + commit
        execSync("git add -A", { cwd: project.projectRoot });
        execSync(`git commit -m "ai: ${taskName}" --allow-empty`, {
          cwd: project.projectRoot,
          encoding: "utf-8",
        });

        // 移动任务到 done
        moveTask(project.automationDir, taskName, "running", "done");

        const execResult: TaskExecutionResult = {
          taskName,
          success: true,
          branch,
          result,
          duration: Date.now() - startTime,
        };
        results.push(execResult);
        onEvent({ type: "task-done", taskName, result: execResult });
      } catch (err) {
        const error = err instanceof Error ? err.message : String(err);

        // 回滚：git 恢复干净状态
        try {
          execSync("git checkout -- .", { cwd: project.projectRoot });
          execSync(`git clean -fd --exclude=ai-automation/`, {
            cwd: project.projectRoot,
          });
        } catch {
          /* ignore cleanup errors */
        }

        // 移动任务到 failed（如果还在 running）
        try {
          moveTask(project.automationDir, taskName, "running", "failed");
        } catch {
          /* 可能已经不在 running 了 */
        }

        const execResult: TaskExecutionResult = {
          taskName,
          success: false,
          branch,
          error,
          duration: Date.now() - startTime,
        };
        results.push(execResult);
        onEvent({ type: "task-failed", taskName, error });
      }

      // 切回原始分支
      try {
        execSync(`git checkout ${originalBranch}`, {
          cwd: project.projectRoot,
          encoding: "utf-8",
        });
      } catch {
        /* ignore */
      }

      // 任务间等待
      if (!shouldStop && tasks.indexOf(task) < tasks.length - 1) {
        await sleep(project.config.sleepBetweenTasksMs);
      }
    }

    onEvent({ type: "all-done", results });
    return results;
  } finally {
    isRunning = false;
    shouldStop = false;
    currentChild = null;
  }
}

async function executeClaudeTask(
  project: Project,
  taskContent: string,
  taskName: string,
  onEvent: EventCallback,
): Promise<ClaudeResult> {
  const { config } = project;
  const prompt = JSON.stringify(taskContent);

  const args = [
    "-p",
    prompt,
    "--output-format",
    "json",
    "--max-turns",
    String(config.maxTurns),
    "--allowedTools",
    ...config.allowedTools,
  ];

  return new Promise<ClaudeResult>((resolve, reject) => {
    const child = spawn("claude", args, {
      cwd: project.projectRoot,
      shell: true,
      env: {
        ...process.env,
        CLAUDE_CODE_ENTRYPOINT: undefined, // 避免嵌套检测
      },
      timeout: config.taskTimeoutMs,
    });

    currentChild = child;
    let stdout = "";
    let stderr = "";

    child.stdout?.on("data", (chunk: Buffer) => {
      const line = chunk.toString();
      stdout += line;
      onEvent({ type: "task-log", taskName, line });
    });

    child.stderr?.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });

    child.on("close", (code) => {
      currentChild = null;
      if (code === 0) {
        try {
          const result = JSON.parse(stdout) as ClaudeResult;
          resolve(result);
        } catch {
          resolve({
            session_id: "unknown",
            result: stdout,
            usage: {
              total_cost: 0,
              turns: 0,
              input_tokens: 0,
              output_tokens: 0,
            },
          });
        }
      } else {
        reject(
          new Error(`Claude exited with code ${code}: ${stderr || stdout}`),
        );
      }
    });

    child.on("error", (err) => {
      currentChild = null;
      reject(err);
    });
  });
}

function checkGitClean(projectRoot: string): void {
  const status = execSync(
    'git status --porcelain --ignore-submodules -- . ":(exclude)ai-automation/" ":(exclude).claude/"',
    { cwd: projectRoot, encoding: "utf-8" },
  ).trim();

  if (status) {
    throw new Error(`Git 工作区不干净，请先提交或暂存以下文件:\n${status}`);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
```

**Step 2: 验证编译**

Run: `npx tsc --noEmit -p tsconfig.node.json`

Expected: 无错误

**Step 3: 提交**

```bash
git add electron/core/runner.ts
git commit -m "feat: add async runner core with real-time event streaming"
```

---

## Task 6: 报告模块

**Files:**

- Create: `electron/core/report.ts`

**Step 1: 实现报告读取**

参考 `TECHNICAL.md` 行 216-228（报告生成）。

桌面应用的报告模块只需要**读取**已有报告文件，报告**生成**仍然由 runner 完成后或单独触发。

```typescript
// electron/core/report.ts
import { readdirSync, readFileSync, existsSync } from "fs";
import { join, basename, extname } from "path";
import type { ReportSummary, ReportDetail } from "./types";

export function listReports(automationDir: string): ReportSummary[] {
  const reportsDir = join(automationDir, "reports");
  if (!existsSync(reportsDir)) return [];

  const files = readdirSync(reportsDir)
    .filter((f) => f.endsWith(".md"))
    .sort()
    .reverse(); // 最新的在前面

  return files.map((file) => {
    const filePath = join(reportsDir, file);
    const content = readFileSync(filePath, "utf-8");
    const date = basename(file, extname(file)); // e.g. "2026-03-16"

    // 从内容中提取统计
    const taskCountMatch = content.match(/共\s*(\d+)\s*个任务/);
    const successMatch = content.match(/成功[：:]\s*(\d+)/);
    const failMatch = content.match(/失败[：:]\s*(\d+)/);

    return {
      date,
      filePath,
      taskCount: taskCountMatch ? parseInt(taskCountMatch[1]) : 0,
      successCount: successMatch ? parseInt(successMatch[1]) : 0,
      failCount: failMatch ? parseInt(failMatch[1]) : 0,
    };
  });
}

export function getReport(automationDir: string, date: string): ReportDetail {
  const filePath = join(automationDir, "reports", `${date}.md`);
  if (!existsSync(filePath)) {
    throw new Error(`Report for ${date} not found`);
  }

  const content = readFileSync(filePath, "utf-8");
  const summary = listReports(automationDir).find((r) => r.date === date);

  return {
    date,
    filePath,
    content,
    taskCount: summary?.taskCount ?? 0,
    successCount: summary?.successCount ?? 0,
    failCount: summary?.failCount ?? 0,
  };
}
```

**Step 2: 提交**

```bash
git add electron/core/report.ts
git commit -m "feat: add report reader module"
```

---

## Task 7: IPC 层 - 项目管理

**Files:**

- Create: `electron/ipc/projects.ts`
- Modify: `electron/main.ts`

**Step 1: 实现项目管理 IPC handlers**

```typescript
// electron/ipc/projects.ts
import { ipcMain, dialog } from "electron";
import { existsSync } from "fs";
import { execSync } from "child_process";
import { basename } from "path";
import {
  loadProjectsConfig,
  saveProjectsConfig,
  addProject,
  removeProject,
  setActiveProject,
  getActiveProject,
} from "../core/config";
import type { Project } from "../core/types";

export function registerProjectsIpc(): void {
  ipcMain.handle("projects:list", () => {
    return loadProjectsConfig().projects;
  });

  ipcMain.handle("projects:getActive", () => {
    return getActiveProject();
  });

  ipcMain.handle("projects:add", async (_event, projectRoot: string) => {
    // 验证路径存在
    if (!existsSync(projectRoot)) {
      throw new Error(`路径不存在: ${projectRoot}`);
    }

    // 验证是 git 仓库
    try {
      execSync("git rev-parse --is-inside-work-tree", {
        cwd: projectRoot,
        encoding: "utf-8",
      });
    } catch {
      throw new Error(`不是 git 仓库: ${projectRoot}`);
    }

    const name = basename(projectRoot);
    return addProject(projectRoot, name);
  });

  ipcMain.handle("projects:remove", (_event, id: string) => {
    removeProject(id);
  });

  ipcMain.handle("projects:setActive", (_event, id: string) => {
    setActiveProject(id);
  });

  ipcMain.handle("projects:selectDir", async () => {
    const result = await dialog.showOpenDialog({
      properties: ["openDirectory"],
      title: "选择项目根目录",
    });
    if (result.canceled) return null;
    return result.filePaths[0];
  });
}
```

**Step 2: 在 main.ts 注册 IPC**

在 `electron/main.ts` 的 `app.whenReady()` 中添加：

```typescript
import { registerProjectsIpc } from "./ipc/projects";

app.whenReady().then(() => {
  registerProjectsIpc();
  createWindow();
  // ...
});
```

**Step 3: 提交**

```bash
git add electron/ipc/projects.ts electron/main.ts
git commit -m "feat: add project management IPC handlers"
```

---

## Task 8: IPC 层 - 任务管理

**Files:**

- Create: `electron/ipc/tasks.ts`
- Modify: `electron/main.ts`

**Step 1: 实现任务管理 IPC handlers**

```typescript
// electron/ipc/tasks.ts
import { ipcMain } from "electron";
import { getActiveProject } from "../core/config";
import {
  listTasks,
  createTask,
  updateTask,
  deleteTask,
  retryTask,
} from "../core/task-manager";
import type { TaskDraft, TaskStatus } from "../core/types";

export function registerTasksIpc(): void {
  function getAutomationDir(): string {
    const project = getActiveProject();
    if (!project) throw new Error("没有选择活跃项目");
    return project.automationDir;
  }

  ipcMain.handle("tasks:list", (_event, status?: TaskStatus) => {
    return listTasks(getAutomationDir(), status);
  });

  ipcMain.handle("tasks:create", (_event, draft: TaskDraft) => {
    return createTask(getAutomationDir(), draft);
  });

  ipcMain.handle("tasks:update", (_event, id: string, content: string) => {
    return updateTask(getAutomationDir(), id, content);
  });

  ipcMain.handle("tasks:delete", (_event, id: string) => {
    deleteTask(getAutomationDir(), id);
  });

  ipcMain.handle("tasks:retry", (_event, id: string) => {
    return retryTask(getAutomationDir(), id);
  });
}
```

**Step 2: 在 main.ts 注册**

```typescript
import { registerTasksIpc } from "./ipc/tasks";

app.whenReady().then(() => {
  registerProjectsIpc();
  registerTasksIpc();
  createWindow();
  // ...
});
```

**Step 3: 提交**

```bash
git add electron/ipc/tasks.ts electron/main.ts
git commit -m "feat: add task CRUD IPC handlers"
```

---

## Task 9: IPC 层 - Runner 执行控制

**Files:**

- Create: `electron/ipc/runner.ts`
- Modify: `electron/main.ts`

**Step 1: 实现 Runner IPC handlers（含事件推送）**

```typescript
// electron/ipc/runner.ts
import { ipcMain, BrowserWindow } from "electron";
import { getActiveProject } from "../core/config";
import { runAllTasks, stopRunner, getRunnerStatus } from "../core/runner";
import type { RunnerEvent } from "../core/types";

export function registerRunnerIpc(
  getMainWindow: () => BrowserWindow | null,
): void {
  ipcMain.handle("runner:start", async () => {
    const project = getActiveProject();
    if (!project) throw new Error("没有选择活跃项目");

    const onEvent = (event: RunnerEvent): void => {
      const win = getMainWindow();
      if (win && !win.isDestroyed()) {
        win.webContents.send("runner:event", event);
      }
    };

    // 异步启动，不阻塞 IPC 响应
    runAllTasks(project, onEvent).catch((err) => {
      const win = getMainWindow();
      if (win && !win.isDestroyed()) {
        win.webContents.send("runner:event", {
          type: "task-failed",
          taskName: "runner",
          error: err.message,
        });
      }
    });
  });

  ipcMain.handle("runner:stop", () => {
    stopRunner();
  });

  ipcMain.handle("runner:status", () => {
    return getRunnerStatus();
  });
}
```

**Step 2: 在 main.ts 注册，传入 getMainWindow**

```typescript
import { registerRunnerIpc } from "./ipc/runner";

app.whenReady().then(() => {
  registerProjectsIpc();
  registerTasksIpc();
  createWindow();
  registerRunnerIpc(() => mainWindow);
  // ...
});
```

**Step 3: 提交**

```bash
git add electron/ipc/runner.ts electron/main.ts
git commit -m "feat: add runner execution IPC with real-time event streaming"
```

---

## Task 10: IPC 层 - 报告查询

**Files:**

- Create: `electron/ipc/reports.ts`
- Modify: `electron/main.ts`

**Step 1: 实现报告 IPC handlers**

```typescript
// electron/ipc/reports.ts
import { ipcMain } from "electron";
import { getActiveProject } from "../core/config";
import { listReports, getReport } from "../core/report";

export function registerReportsIpc(): void {
  function getAutomationDir(): string {
    const project = getActiveProject();
    if (!project) throw new Error("没有选择活跃项目");
    return project.automationDir;
  }

  ipcMain.handle("reports:list", () => {
    return listReports(getAutomationDir());
  });

  ipcMain.handle("reports:get", (_event, date: string) => {
    return getReport(getAutomationDir(), date);
  });
}
```

**Step 2: 在 main.ts 注册**

```typescript
import { registerReportsIpc } from "./ipc/reports";

app.whenReady().then(() => {
  registerProjectsIpc();
  registerTasksIpc();
  registerReportsIpc();
  createWindow();
  registerRunnerIpc(() => mainWindow);
  // ...
});
```

**Step 3: 提交**

```bash
git add electron/ipc/reports.ts electron/main.ts
git commit -m "feat: add report query IPC handlers"
```

---

## Task 11: Preload 完整 API 暴露

**Files:**

- Modify: `electron/preload.ts`

**Step 1: 完善 preload 桥接所有 IPC**

```typescript
// electron/preload.ts
import { contextBridge, ipcRenderer } from "electron";

const api = {
  projects: {
    list: () => ipcRenderer.invoke("projects:list"),
    getActive: () => ipcRenderer.invoke("projects:getActive"),
    add: (projectRoot: string) =>
      ipcRenderer.invoke("projects:add", projectRoot),
    remove: (id: string) => ipcRenderer.invoke("projects:remove", id),
    setActive: (id: string) => ipcRenderer.invoke("projects:setActive", id),
    selectDir: () => ipcRenderer.invoke("projects:selectDir"),
  },
  tasks: {
    list: (status?: string) => ipcRenderer.invoke("tasks:list", status),
    create: (draft: unknown) => ipcRenderer.invoke("tasks:create", draft),
    update: (id: string, content: string) =>
      ipcRenderer.invoke("tasks:update", id, content),
    delete: (id: string) => ipcRenderer.invoke("tasks:delete", id),
    retry: (id: string) => ipcRenderer.invoke("tasks:retry", id),
  },
  runner: {
    start: () => ipcRenderer.invoke("runner:start"),
    stop: () => ipcRenderer.invoke("runner:stop"),
    status: () => ipcRenderer.invoke("runner:status"),
  },
  reports: {
    list: () => ipcRenderer.invoke("reports:list"),
    get: (date: string) => ipcRenderer.invoke("reports:get", date),
  },
  on: (channel: string, callback: (...args: unknown[]) => void) => {
    const subscription = (
      _event: Electron.IpcRendererEvent,
      ...args: unknown[]
    ) => callback(...args);
    ipcRenderer.on(channel, subscription);
    return () => ipcRenderer.removeListener(channel, subscription);
  },
};

contextBridge.exposeInMainWorld("api", api);

export type ApiType = typeof api;
```

**Step 2: 更新渲染进程类型声明**

```typescript
// src/env.d.ts
/// <reference types="electron-vite/node" />

import type { ApiType } from "../electron/preload";

declare global {
  interface Window {
    api: ApiType;
  }
}
```

**Step 3: 提交**

```bash
git add electron/preload.ts src/env.d.ts
git commit -m "feat: expose complete IPC API via preload bridge"
```

---

## Task 12: Zustand 状态管理

**Files:**

- Create: `src/stores/project-store.ts`
- Create: `src/stores/task-store.ts`
- Create: `src/stores/runner-store.ts`

**Step 1: 项目 Store**

```typescript
// src/stores/project-store.ts
import { create } from "zustand";

interface Project {
  id: string;
  name: string;
  projectRoot: string;
  automationDir: string;
}

interface ProjectStore {
  projects: Project[];
  activeProject: Project | null;
  loading: boolean;
  fetchProjects: () => Promise<void>;
  fetchActiveProject: () => Promise<void>;
  addProject: () => Promise<void>;
  removeProject: (id: string) => Promise<void>;
  setActive: (id: string) => Promise<void>;
}

export const useProjectStore = create<ProjectStore>((set) => ({
  projects: [],
  activeProject: null,
  loading: false,

  fetchProjects: async () => {
    set({ loading: true });
    const projects = await window.api.projects.list();
    set({ projects, loading: false });
  },

  fetchActiveProject: async () => {
    const activeProject = await window.api.projects.getActive();
    set({ activeProject });
  },

  addProject: async () => {
    const dir = await window.api.projects.selectDir();
    if (!dir) return;
    await window.api.projects.add(dir);
    const projects = await window.api.projects.list();
    const activeProject = await window.api.projects.getActive();
    set({ projects, activeProject });
  },

  removeProject: async (id: string) => {
    await window.api.projects.remove(id);
    const projects = await window.api.projects.list();
    const activeProject = await window.api.projects.getActive();
    set({ projects, activeProject });
  },

  setActive: async (id: string) => {
    await window.api.projects.setActive(id);
    const activeProject = await window.api.projects.getActive();
    set({ activeProject });
  },
}));
```

**Step 2: 任务 Store**

```typescript
// src/stores/task-store.ts
import { create } from "zustand";

interface Task {
  id: string;
  name: string;
  status: "pending" | "running" | "done" | "failed";
  content: string;
  filePath: string;
  createdAt: string;
  updatedAt: string;
}

interface TaskStore {
  tasks: Task[];
  loading: boolean;
  fetchTasks: (status?: string) => Promise<void>;
  createTask: (draft: unknown) => Promise<void>;
  updateTask: (id: string, content: string) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  retryTask: (id: string) => Promise<void>;
}

export const useTaskStore = create<TaskStore>((set) => ({
  tasks: [],
  loading: false,

  fetchTasks: async (status?: string) => {
    set({ loading: true });
    const tasks = await window.api.tasks.list(status);
    set({ tasks, loading: false });
  },

  createTask: async (draft) => {
    await window.api.tasks.create(draft);
    const tasks = await window.api.tasks.list();
    set({ tasks });
  },

  updateTask: async (id, content) => {
    await window.api.tasks.update(id, content);
    const tasks = await window.api.tasks.list();
    set({ tasks });
  },

  deleteTask: async (id) => {
    await window.api.tasks.delete(id);
    const tasks = await window.api.tasks.list();
    set({ tasks });
  },

  retryTask: async (id) => {
    await window.api.tasks.retry(id);
    const tasks = await window.api.tasks.list();
    set({ tasks });
  },
}));
```

**Step 3: Runner Store**

```typescript
// src/stores/runner-store.ts
import { create } from "zustand";

interface RunnerLog {
  taskName: string;
  line: string;
  timestamp: number;
}

interface RunnerStore {
  isRunning: boolean;
  logs: RunnerLog[];
  currentTask: string | null;
  start: () => Promise<void>;
  stop: () => Promise<void>;
  clearLogs: () => void;
  initEventListener: () => () => void;
}

export const useRunnerStore = create<RunnerStore>((set, get) => ({
  isRunning: false,
  logs: [],
  currentTask: null,

  start: async () => {
    set({ isRunning: true, logs: [] });
    await window.api.runner.start();
  },

  stop: async () => {
    await window.api.runner.stop();
    set({ isRunning: false });
  },

  clearLogs: () => set({ logs: [] }),

  initEventListener: () => {
    const unsubscribe = window.api.on("runner:event", (event: unknown) => {
      const e = event as {
        type: string;
        taskName?: string;
        line?: string;
        error?: string;
      };
      switch (e.type) {
        case "task-start":
          set({ currentTask: e.taskName ?? null });
          break;
        case "task-log":
          set((state) => ({
            logs: [
              ...state.logs,
              {
                taskName: e.taskName ?? "",
                line: e.line ?? "",
                timestamp: Date.now(),
              },
            ],
          }));
          break;
        case "task-done":
        case "task-failed":
          break;
        case "all-done":
          set({ isRunning: false, currentTask: null });
          break;
      }
    });
    return unsubscribe;
  },
}));
```

**Step 4: 提交**

```bash
git add src/stores/
git commit -m "feat: add Zustand stores for projects, tasks, and runner"
```

---

## Task 13: 应用布局与路由

**Files:**

- Modify: `src/App.tsx`
- Create: `src/components/AppLayout.tsx`

**Step 1: 创建主布局组件**

参考设计文档行 179-196（布局图）。

```tsx
// src/components/AppLayout.tsx
import { Layout, Menu, Select, Button, Space, Typography } from "antd";
import {
  DashboardOutlined,
  UnorderedListOutlined,
  PlayCircleOutlined,
  FileTextOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { useProjectStore } from "@/stores/project-store";

const { Header, Sider, Content, Footer } = Layout;

const menuItems = [
  { key: "/", icon: <DashboardOutlined />, label: "概览" },
  { key: "/tasks", icon: <UnorderedListOutlined />, label: "任务" },
  { key: "/execution", icon: <PlayCircleOutlined />, label: "执行" },
  { key: "/reports", icon: <FileTextOutlined />, label: "报告" },
];

export default function AppLayout(): React.ReactElement {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    projects,
    activeProject,
    fetchProjects,
    fetchActiveProject,
    addProject,
    setActive,
  } = useProjectStore();

  useEffect(() => {
    fetchProjects();
    fetchActiveProject();
  }, []);

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 24px",
        }}
      >
        <Space>
          <Typography.Text
            strong
            style={{ color: "#fff", fontSize: 16, marginRight: 16 }}
          >
            Claude Automation
          </Typography.Text>
          <Select
            value={activeProject?.id}
            onChange={(id) => setActive(id)}
            style={{ width: 200 }}
            placeholder="选择项目"
            options={projects.map((p) => ({ label: p.name, value: p.id }))}
          />
          <Button icon={<PlusOutlined />} onClick={addProject} size="small">
            添加项目
          </Button>
        </Space>
      </Header>
      <Layout>
        <Sider width={160} theme="light">
          <Menu
            mode="inline"
            selectedKeys={[location.pathname]}
            items={menuItems}
            onClick={({ key }) => navigate(key)}
            style={{ height: "100%" }}
          />
        </Sider>
        <Content style={{ padding: 24, overflow: "auto" }}>
          <Outlet />
        </Content>
      </Layout>
      <Footer
        style={{
          textAlign: "center",
          padding: "8px 24px",
          fontSize: 12,
          color: "#999",
        }}
      >
        {activeProject?.projectRoot ?? "未选择项目"} | Claude Automation Desktop
      </Footer>
    </Layout>
  );
}
```

**Step 2: 配置路由**

```tsx
// src/App.tsx
import { HashRouter, Routes, Route } from "react-router-dom";
import { ConfigProvider, theme } from "antd";
import zhCN from "antd/locale/zh_CN";
import AppLayout from "@/components/AppLayout";
import Dashboard from "@/pages/Dashboard";
import Tasks from "@/pages/Tasks";
import TaskEditor from "@/pages/TaskEditor";
import Execution from "@/pages/Execution";
import Reports from "@/pages/Reports";

export default function App(): React.ReactElement {
  return (
    <ConfigProvider locale={zhCN} theme={{ algorithm: theme.defaultAlgorithm }}>
      <HashRouter>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/tasks" element={<Tasks />} />
            <Route path="/tasks/new" element={<TaskEditor />} />
            <Route path="/tasks/:id/edit" element={<TaskEditor />} />
            <Route path="/execution" element={<Execution />} />
            <Route path="/reports" element={<Reports />} />
          </Route>
        </Routes>
      </HashRouter>
    </ConfigProvider>
  );
}
```

**Step 3: 创建页面占位文件**

为每个页面创建最小占位组件（下面的 Task 分别实现各页面）：

```tsx
// src/pages/Dashboard.tsx
export default function Dashboard() {
  return <div>Dashboard - TODO</div>;
}
```

```tsx
// src/pages/Tasks.tsx
export default function Tasks() {
  return <div>Tasks - TODO</div>;
}
```

```tsx
// src/pages/TaskEditor.tsx
export default function TaskEditor() {
  return <div>TaskEditor - TODO</div>;
}
```

```tsx
// src/pages/Execution.tsx
export default function Execution() {
  return <div>Execution - TODO</div>;
}
```

```tsx
// src/pages/Reports.tsx
export default function Reports() {
  return <div>Reports - TODO</div>;
}
```

**Step 4: 验证启动**

Run: `npm run dev`

Expected: 窗口启动，左侧导航栏可切换页面，顶部有项目选择下拉框

**Step 5: 提交**

```bash
git add src/
git commit -m "feat: add app layout with sidebar navigation and routing"
```

---

## Task 14: 概览页 (Dashboard)

**Files:**

- Modify: `src/pages/Dashboard.tsx`

**Step 1: 实现概览页**

参考设计：四个统计卡片、最近任务列表、快捷操作按钮。

```tsx
// src/pages/Dashboard.tsx
import { useEffect } from "react";
import {
  Card,
  Col,
  Row,
  Statistic,
  List,
  Tag,
  Button,
  Space,
  Empty,
} from "antd";
import {
  ClockCircleOutlined,
  SyncOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  PlusOutlined,
  PlayCircleOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { useTaskStore } from "@/stores/task-store";
import { useRunnerStore } from "@/stores/runner-store";

const STATUS_CONFIG = {
  pending: {
    color: "default",
    icon: <ClockCircleOutlined />,
    label: "Pending",
  },
  running: {
    color: "processing",
    icon: <SyncOutlined spin />,
    label: "Running",
  },
  done: { color: "success", icon: <CheckCircleOutlined />, label: "Done" },
  failed: { color: "error", icon: <CloseCircleOutlined />, label: "Failed" },
} as const;

export default function Dashboard(): React.ReactElement {
  const navigate = useNavigate();
  const { tasks, fetchTasks } = useTaskStore();
  const { start, isRunning } = useRunnerStore();

  useEffect(() => {
    fetchTasks();
  }, []);

  const counts = {
    pending: tasks.filter((t) => t.status === "pending").length,
    running: tasks.filter((t) => t.status === "running").length,
    done: tasks.filter((t) => t.status === "done").length,
    failed: tasks.filter((t) => t.status === "failed").length,
  };

  const recentTasks = [...tasks]
    .sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    )
    .slice(0, 5);

  return (
    <div>
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="Pending"
              value={counts.pending}
              prefix={<ClockCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Running"
              value={counts.running}
              prefix={<SyncOutlined />}
              valueStyle={{ color: "#1890ff" }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Done"
              value={counts.done}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: "#52c41a" }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Failed"
              value={counts.failed}
              prefix={<CloseCircleOutlined />}
              valueStyle={{ color: "#ff4d4f" }}
            />
          </Card>
        </Col>
      </Row>

      <Space style={{ marginBottom: 16 }}>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => navigate("/tasks/new")}
        >
          新建任务
        </Button>
        <Button
          icon={<PlayCircleOutlined />}
          onClick={start}
          disabled={isRunning || counts.pending === 0}
          loading={isRunning}
        >
          {isRunning ? "执行中..." : "开始执行"}
        </Button>
      </Space>

      <Card title="最近任务">
        {recentTasks.length === 0 ? (
          <Empty description="暂无任务" />
        ) : (
          <List
            dataSource={recentTasks}
            renderItem={(task) => (
              <List.Item>
                <List.Item.Meta title={task.name} description={task.id} />
                <Tag color={STATUS_CONFIG[task.status].color}>
                  {STATUS_CONFIG[task.status].label}
                </Tag>
              </List.Item>
            )}
          />
        )}
      </Card>
    </div>
  );
}
```

**Step 2: 提交**

```bash
git add src/pages/Dashboard.tsx
git commit -m "feat: implement Dashboard page with stats cards and recent tasks"
```

---

## Task 15: 任务列表页 (Tasks) - 看板视图

**Files:**

- Modify: `src/pages/Tasks.tsx`

**Step 1: 实现四列看板**

```tsx
// src/pages/Tasks.tsx
import { useEffect } from "react";
import {
  Card,
  Col,
  Row,
  Tag,
  Button,
  Space,
  Popconfirm,
  Empty,
  Typography,
} from "antd";
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { useTaskStore } from "@/stores/task-store";

const COLUMNS = [
  { status: "pending" as const, title: "Pending", color: "#d9d9d9" },
  { status: "running" as const, title: "Running", color: "#1890ff" },
  { status: "done" as const, title: "Done", color: "#52c41a" },
  { status: "failed" as const, title: "Failed", color: "#ff4d4f" },
];

export default function Tasks(): React.ReactElement {
  const navigate = useNavigate();
  const { tasks, fetchTasks, deleteTask, retryTask } = useTaskStore();

  useEffect(() => {
    fetchTasks();
  }, []);

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => navigate("/tasks/new")}
        >
          新建任务
        </Button>
      </Space>

      <Row gutter={16}>
        {COLUMNS.map((col) => {
          const columnTasks = tasks.filter((t) => t.status === col.status);
          return (
            <Col span={6} key={col.status}>
              <Card
                title={
                  <Space>
                    <div
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background: col.color,
                      }}
                    />
                    {col.title}
                    <Tag>{columnTasks.length}</Tag>
                  </Space>
                }
                bodyStyle={{
                  padding: 8,
                  maxHeight: "calc(100vh - 280px)",
                  overflow: "auto",
                }}
              >
                {columnTasks.length === 0 ? (
                  <Empty
                    description="无任务"
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                  />
                ) : (
                  columnTasks.map((task) => (
                    <Card
                      key={task.id}
                      size="small"
                      style={{ marginBottom: 8 }}
                      actions={[
                        col.status === "pending" && (
                          <EditOutlined
                            key="edit"
                            onClick={() => navigate(`/tasks/${task.id}/edit`)}
                          />
                        ),
                        col.status === "failed" && (
                          <ReloadOutlined
                            key="retry"
                            onClick={() => retryTask(task.id)}
                          />
                        ),
                        col.status !== "running" && (
                          <Popconfirm
                            key="delete"
                            title="确认删除此任务？"
                            onConfirm={() => deleteTask(task.id)}
                          >
                            <DeleteOutlined />
                          </Popconfirm>
                        ),
                      ].filter(Boolean)}
                    >
                      <Typography.Text strong ellipsis>
                        {task.name}
                      </Typography.Text>
                      <br />
                      <Typography.Text
                        type="secondary"
                        style={{ fontSize: 12 }}
                      >
                        {task.id}
                      </Typography.Text>
                    </Card>
                  ))
                )}
              </Card>
            </Col>
          );
        })}
      </Row>
    </div>
  );
}
```

**Step 2: 提交**

```bash
git add src/pages/Tasks.tsx
git commit -m "feat: implement Tasks kanban board with CRUD actions"
```

---

## Task 16: 任务编辑器页 (TaskEditor)

**Files:**

- Modify: `src/pages/TaskEditor.tsx`

**Step 1: 实现结构化表单 + Markdown 预览**

参考 `USAGE.md` 行 124-146 的任务模板格式。

```tsx
// src/pages/TaskEditor.tsx
import { useState, useMemo, useEffect } from "react";
import { Form, Input, Button, Space, Card, Row, Col, message } from "antd";
import { SaveOutlined, PlayCircleOutlined } from "@ant-design/icons";
import { useNavigate, useParams } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import { useTaskStore } from "@/stores/task-store";
import { useRunnerStore } from "@/stores/runner-store";

interface FormValues {
  title: string;
  background: string;
  goals: string; // 换行分割
  constraints: string;
  files: string;
  verification: string;
}

export default function TaskEditor(): React.ReactElement {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [form] = Form.useForm<FormValues>();
  const { tasks, fetchTasks, createTask, updateTask } = useTaskStore();
  const { start } = useRunnerStore();
  const [formValues, setFormValues] = useState<FormValues>({
    title: "",
    background: "",
    goals: "",
    constraints: "",
    files: "",
    verification: "",
  });

  const isEdit = !!id;

  useEffect(() => {
    if (isEdit) {
      fetchTasks().then(() => {
        const task = tasks.find((t) => t.id === id);
        if (task) {
          // 从 markdown 内容反向解析到表单（简单方式）
          form.setFieldsValue({
            title: task.name,
            background: "",
            goals: "",
            constraints: "",
            files: "",
            verification: "",
          });
        }
      });
    }
  }, [id]);

  const markdownPreview = useMemo(() => {
    const v = formValues;
    const lines: string[] = [];
    lines.push(`# 任务：${v.title || "(标题)"}`);
    lines.push("");
    lines.push("## 背景");
    lines.push(v.background || "(待填写)");
    lines.push("");
    lines.push("## 目标");
    for (const g of (v.goals || "").split("\n").filter(Boolean)) {
      lines.push(`- [ ] ${g}`);
    }
    lines.push("");
    lines.push("## 约束");
    for (const c of (v.constraints || "").split("\n").filter(Boolean)) {
      lines.push(`- ${c}`);
    }
    lines.push("");
    lines.push("## 涉及文件");
    for (const f of (v.files || "").split("\n").filter(Boolean)) {
      lines.push(`- ${f}`);
    }
    lines.push("");
    lines.push("## 验证方式");
    for (const v2 of (v.verification || "").split("\n").filter(Boolean)) {
      lines.push(`- ${v2}`);
    }
    return lines.join("\n");
  }, [formValues]);

  const handleSave = async () => {
    const values = await form.validateFields();
    const draft = {
      title: values.title,
      background: values.background,
      goals: values.goals.split("\n").filter(Boolean),
      constraints: values.constraints.split("\n").filter(Boolean),
      files: values.files.split("\n").filter(Boolean),
      verification: values.verification.split("\n").filter(Boolean),
    };

    if (isEdit) {
      await updateTask(id!, markdownPreview);
    } else {
      await createTask(draft);
    }
    message.success("保存成功");
    navigate("/tasks");
  };

  const handleSaveAndRun = async () => {
    await handleSave();
    await start();
    navigate("/execution");
  };

  return (
    <Row gutter={16}>
      <Col span={12}>
        <Card title={isEdit ? "编辑任务" : "新建任务"}>
          <Form
            form={form}
            layout="vertical"
            onValuesChange={(_, all) => setFormValues(all)}
          >
            <Form.Item
              name="title"
              label="标题"
              rules={[{ required: true, message: "请输入任务标题" }]}
            >
              <Input placeholder="例如：补全用户模块的单元测试" />
            </Form.Item>
            <Form.Item name="background" label="背景">
              <Input.TextArea rows={3} placeholder="描述任务的背景和上下文" />
            </Form.Item>
            <Form.Item
              name="goals"
              label="目标（每行一条）"
              rules={[{ required: true, message: "请输入至少一个目标" }]}
            >
              <Input.TextArea
                rows={4}
                placeholder="为 UserService 添加单元测试&#10;覆盖率达到 80%"
              />
            </Form.Item>
            <Form.Item name="constraints" label="约束（每行一条）">
              <Input.TextArea
                rows={3}
                placeholder="不修改现有接口&#10;使用 Jest 测试框架"
              />
            </Form.Item>
            <Form.Item name="files" label="涉及文件（每行一条）">
              <Input.TextArea
                rows={3}
                placeholder="src/services/user.ts&#10;tests/services/user.test.ts"
              />
            </Form.Item>
            <Form.Item name="verification" label="验证方式（每行一条）">
              <Input.TextArea
                rows={3}
                placeholder="npm test 全部通过&#10;npx tsc --noEmit 无报错"
              />
            </Form.Item>
            <Form.Item>
              <Space>
                <Button
                  type="primary"
                  icon={<SaveOutlined />}
                  onClick={handleSave}
                >
                  保存
                </Button>
                <Button
                  icon={<PlayCircleOutlined />}
                  onClick={handleSaveAndRun}
                >
                  保存并执行
                </Button>
                <Button onClick={() => navigate("/tasks")}>取消</Button>
              </Space>
            </Form.Item>
          </Form>
        </Card>
      </Col>
      <Col span={12}>
        <Card
          title="Markdown 预览"
          bodyStyle={{ maxHeight: "calc(100vh - 200px)", overflow: "auto" }}
        >
          <ReactMarkdown>{markdownPreview}</ReactMarkdown>
        </Card>
      </Col>
    </Row>
  );
}
```

**Step 2: 提交**

```bash
git add src/pages/TaskEditor.tsx
git commit -m "feat: implement TaskEditor with structured form and markdown preview"
```

---

## Task 17: 执行页 (Execution)

**Files:**

- Modify: `src/pages/Execution.tsx`

**Step 1: 实现执行控制 + 实时日志**

```tsx
// src/pages/Execution.tsx
import { useEffect, useRef, useState } from "react";
import { Button, Space, Card, List, Tag, Typography, Progress } from "antd";
import {
  PlayCircleOutlined,
  StopOutlined,
  ClearOutlined,
} from "@ant-design/icons";
import { useRunnerStore } from "@/stores/runner-store";
import { useTaskStore } from "@/stores/task-store";

export default function Execution(): React.ReactElement {
  const {
    isRunning,
    logs,
    currentTask,
    start,
    stop,
    clearLogs,
    initEventListener,
  } = useRunnerStore();
  const { tasks, fetchTasks } = useTaskStore();
  const logEndRef = useRef<HTMLDivElement>(null);
  const [selectedTask, setSelectedTask] = useState<string | null>(null);

  useEffect(() => {
    fetchTasks();
    const unsubscribe = initEventListener();
    return unsubscribe;
  }, []);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  const pendingCount = tasks.filter((t) => t.status === "pending").length;
  const doneCount = tasks.filter((t) => t.status === "done").length;
  const totalCount = tasks.length;

  const filteredLogs = selectedTask
    ? logs.filter((l) => l.taskName === selectedTask)
    : logs;

  const taskNames = [...new Set(logs.map((l) => l.taskName))];

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Button
          type="primary"
          icon={<PlayCircleOutlined />}
          onClick={start}
          disabled={isRunning || pendingCount === 0}
        >
          开始执行
        </Button>
        <Button
          danger
          icon={<StopOutlined />}
          onClick={stop}
          disabled={!isRunning}
        >
          停止
        </Button>
        <Button icon={<ClearOutlined />} onClick={clearLogs}>
          清除日志
        </Button>
        {isRunning && currentTask && (
          <Typography.Text type="secondary">
            正在执行: {currentTask}
          </Typography.Text>
        )}
      </Space>

      {totalCount > 0 && (
        <Progress
          percent={Math.round((doneCount / totalCount) * 100)}
          format={() => `${doneCount}/${totalCount}`}
          style={{ marginBottom: 16 }}
        />
      )}

      <div style={{ display: "flex", gap: 16 }}>
        {/* 左侧任务列表 */}
        <Card title="任务" style={{ width: 200, flexShrink: 0 }}>
          <List
            size="small"
            dataSource={taskNames}
            renderItem={(name) => (
              <List.Item
                onClick={() =>
                  setSelectedTask(selectedTask === name ? null : name)
                }
                style={{
                  cursor: "pointer",
                  background: selectedTask === name ? "#e6f7ff" : undefined,
                }}
              >
                <Typography.Text ellipsis>{name}</Typography.Text>
              </List.Item>
            )}
          />
        </Card>

        {/* 右侧日志终端 */}
        <Card
          title={selectedTask ? `日志: ${selectedTask}` : "全部日志"}
          style={{ flex: 1 }}
          bodyStyle={{
            background: "#1e1e1e",
            color: "#d4d4d4",
            fontFamily: "Consolas, Monaco, monospace",
            fontSize: 13,
            padding: 16,
            maxHeight: "calc(100vh - 320px)",
            overflow: "auto",
            whiteSpace: "pre-wrap",
            wordBreak: "break-all",
          }}
        >
          {filteredLogs.length === 0 ? (
            <Typography.Text style={{ color: "#666" }}>
              等待执行...
            </Typography.Text>
          ) : (
            filteredLogs.map((log, i) => <div key={i}>{log.line}</div>)
          )}
          <div ref={logEndRef} />
        </Card>
      </div>
    </div>
  );
}
```

**Step 2: 提交**

```bash
git add src/pages/Execution.tsx
git commit -m "feat: implement Execution page with real-time log viewer"
```

---

## Task 18: 报告页 (Reports)

**Files:**

- Modify: `src/pages/Reports.tsx`

**Step 1: 实现报告列表 + Markdown 渲染**

```tsx
// src/pages/Reports.tsx
import { useEffect, useState } from "react";
import { Card, List, Typography, Empty, Tag, Space, Spin } from "antd";
import { FileTextOutlined } from "@ant-design/icons";
import ReactMarkdown from "react-markdown";

interface ReportSummary {
  date: string;
  taskCount: number;
  successCount: number;
  failCount: number;
}

export default function Reports(): React.ReactElement {
  const [reports, setReports] = useState<ReportSummary[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [content, setContent] = useState<string>("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    window.api.reports.list().then((data: ReportSummary[]) => {
      setReports(data);
      if (data.length > 0) {
        setSelectedDate(data[0].date);
      }
    });
  }, []);

  useEffect(() => {
    if (!selectedDate) return;
    setLoading(true);
    window.api.reports.get(selectedDate).then((detail: { content: string }) => {
      setContent(detail.content);
      setLoading(false);
    });
  }, [selectedDate]);

  return (
    <div style={{ display: "flex", gap: 16 }}>
      <Card title="报告列表" style={{ width: 260, flexShrink: 0 }}>
        {reports.length === 0 ? (
          <Empty description="暂无报告" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        ) : (
          <List
            size="small"
            dataSource={reports}
            renderItem={(r) => (
              <List.Item
                onClick={() => setSelectedDate(r.date)}
                style={{
                  cursor: "pointer",
                  background: selectedDate === r.date ? "#e6f7ff" : undefined,
                }}
              >
                <List.Item.Meta
                  avatar={<FileTextOutlined />}
                  title={r.date}
                  description={
                    <Space size={4}>
                      <Tag color="green">{r.successCount} 成功</Tag>
                      <Tag color="red">{r.failCount} 失败</Tag>
                    </Space>
                  }
                />
              </List.Item>
            )}
          />
        )}
      </Card>

      <Card
        title={selectedDate ? `报告: ${selectedDate}` : "选择报告"}
        style={{ flex: 1 }}
        bodyStyle={{ maxHeight: "calc(100vh - 200px)", overflow: "auto" }}
      >
        {loading ? (
          <Spin />
        ) : content ? (
          <ReactMarkdown>{content}</ReactMarkdown>
        ) : (
          <Empty description="选择左侧报告查看" />
        )}
      </Card>
    </div>
  );
}
```

**Step 2: 提交**

```bash
git add src/pages/Reports.tsx
git commit -m "feat: implement Reports page with markdown rendering"
```

---

## Task 19: 窗口关闭确认 & 应用图标

**Files:**

- Modify: `electron/main.ts`

**Step 1: 添加关闭时确认逻辑**

在 `createWindow()` 中添加：

```typescript
mainWindow.on("close", (e) => {
  // 检查 runner 是否正在运行
  const { isRunning } = require("./core/runner").getRunnerStatus();
  if (isRunning) {
    const { dialog } = require("electron");
    const choice = dialog.showMessageBoxSync(mainWindow!, {
      type: "warning",
      buttons: ["取消", "强制关闭"],
      defaultId: 0,
      title: "确认关闭",
      message: "有任务正在执行，关闭将中止执行。确定要关闭吗？",
    });
    if (choice === 0) {
      e.preventDefault();
    } else {
      const { stopRunner } = require("./core/runner");
      stopRunner();
    }
  }
});
```

**Step 2: 添加 Claude CLI 检测**

在 `app.whenReady()` 开头添加：

```typescript
import { execSync } from "child_process";

// 检查 Claude CLI
try {
  execSync("claude --version", { encoding: "utf-8" });
} catch {
  dialog.showErrorBox(
    "Claude CLI 未安装",
    "请先安装 Claude Code CLI:\nnpm install -g @anthropic-ai/claude-code",
  );
}
```

**Step 3: 提交**

```bash
git add electron/main.ts
git commit -m "feat: add close confirmation and Claude CLI detection"
```

---

## Task 20: 端到端验证

**Step 1: 完整启动测试**

Run: `npm run dev`

**Step 2: 验证流程**

手动验证以下流程：

1. 应用启动，显示主界面
2. 点击「添加项目」，选择一个 git 项目目录
3. 项目下拉框出现新项目
4. 导航到「任务」页，看到空看板
5. 点击「新建任务」，填写表单，右侧预览实时更新
6. 保存任务，回到看板，Pending 列出现新任务
7. 导航到「执行」页，点击「开始执行」
8. 日志区域实时显示 Claude 输出
9. 执行完成后，任务移动到 Done 或 Failed 列
10. 导航到「报告」页，查看报告（如有）

**Step 3: 修复发现的问题**

根据测试结果修复 bug，每个 fix 单独提交。

**Step 4: 构建验证**

Run: `npm run build`

Expected: `out/` 目录生成 Electron 打包产物

**Step 5: TypeScript 类型检查**

Run: `npm run typecheck`

Expected: 无类型错误

**Step 6: 最终提交**

```bash
git add -A
git commit -m "fix: resolve issues found during end-to-end testing"
```

---

## 总结

| Task  | 内容             | 估计文件数 |
| ----- | ---------------- | ---------- |
| 1     | 项目脚手架       | 8          |
| 2     | 类型定义         | 1          |
| 3     | 配置管理         | 1          |
| 4     | 任务管理         | 1          |
| 5     | Runner 核心      | 1          |
| 6     | 报告模块         | 1          |
| 7-10  | IPC 层 (4个模块) | 4+1        |
| 11    | Preload API      | 1+1        |
| 12    | Zustand Stores   | 3          |
| 13    | 布局 + 路由      | 2+5占位    |
| 14-18 | 页面实现 (5个)   | 5          |
| 19    | 窗口行为         | 1          |
| 20    | 端到端验证       | 0          |

**共 20 个 Task，约 35 个文件，20 次 git commit。**
