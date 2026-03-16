# AI 夜间自动化 — 技术方案文档

> 版本：v0.1 | 最后更新：2026-03-16

---

## 1. 方案概述

### 1.1 解决什么问题

开发团队日常有大量**低风险、重复性**的代码修改任务（补类型、批量重命名、统一代码风格等）。这些任务：

- 人工做耗时且枯燥
- 不需要复杂的业务判断
- 可以通过明确的指令描述

本方案利用 **Claude Code CLI 的 headless 模式**（`claude -p`），在**无人值守**的情况下自动执行这些任务，将开发者的时间释放给更有价值的工作。

### 1.2 核心理念

```
下班前写好任务 → 夜间 Claude 自动执行 → 早上看报告 review 代码
```

### 1.3 设计原则

| 原则 | 说明 |
|------|------|
| 安全第一 | 每个任务在独立 git 分支执行，不自动 push，人工 review 后才 merge |
| 最小权限 | 使用 `--allowedTools` 白名单而非 `--dangerously-skip-permissions` |
| 防失控 | `--max-turns` 限制轮次，`timeout` 限制时间，`--max-budget-usd` 限制花费 |
| 跨平台 | 全 Node.js 实现，Windows/Mac/Linux 通用 |
| 简单可靠 | 文件系统作为任务队列，无需数据库或消息队列 |

---

## 2. 系统架构

### 2.1 整体架构图

```
┌─────────────────────────────────────────────────────┐
│                    开发者                            │
│                                                     │
│  下班前:                        早上:                │
│  写任务 .md → tasks/pending/    查看 reports/        │
│                                 git diff review     │
│                                 满意 → git merge    │
└──────────┬──────────────────────────┬───────────────┘
           │                          ▲
           ▼                          │
┌──────────────────────────────────────────────────────┐
│                   调度层                              │
│                                                      │
│  cron.mjs (node-cron 定时器)                         │
│  ├── 01:00 触发 → runner.mjs                         │
│  └── 09:00 触发 → report.mjs                         │
│                                                      │
│  或手动执行: node runner.mjs                          │
└──────────┬───────────────────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────────────────┐
│                   执行层 (runner.mjs)                 │
│                                                      │
│  for each task in tasks/pending/:                    │
│    1. git checkout -b ai/<task-name>                 │
│    2. claude -p "<task-content>" --allowedTools ...  │
│    3. git add & commit (如果有变更)                   │
│    4. git checkout <原分支>                           │
│    5. 移动任务到 done/ 或 failed/                     │
└──────────┬───────────────────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────────────────┐
│                   存储层 (文件系统)                    │
│                                                      │
│  tasks/pending/   ← 待执行任务 (.md)                 │
│  tasks/running/   ← 执行中（过程状态）                │
│  tasks/done/      ← 已完成                           │
│  tasks/failed/    ← 失败                             │
│  results/         ← Claude JSON 原始输出              │
│  reports/         ← 每日汇总报告                      │
└──────────────────────────────────────────────────────┘
```

### 2.2 目录结构

```
ai-automation/
├── tasks/
│   ├── pending/          # 待执行任务（开发者放这里）
│   │   └── _template.md  # 任务模板（以 _ 开头，不会被执行）
│   ├── running/          # 执行中（runner 自动管理）
│   ├── done/             # 已完成（runner 自动管理）
│   └── failed/           # 失败（runner 自动管理）
├── results/              # Claude 执行的 JSON 原始输出
├── reports/              # 每日汇总报告（report.mjs 生成）
├── runner.mjs            # 核心 — 任务调度与执行
├── report.mjs            # 报告生成器
├── cron.mjs              # 定时调度器（替代系统 crontab）
├── package.json          # 依赖：node-cron
├── .gitignore            # 忽略 results/reports/done/failed 等运行时产物
├── TECHNICAL.md          # 本文档 — 技术方案
└── USAGE.md              # 使用手册
```

---

## 3. 核心模块详解

### 3.1 runner.mjs — 任务调度器

**职责**：读取待执行任务，逐个调用 Claude Code headless 模式执行，管理 git 分支和任务状态流转。

#### 3.1.1 配置项 (CONFIG)

```js
const CONFIG = {
  projectRoot:        path.resolve(__dirname, ".."),  // 项目根目录
  tasksDir:           path.join(__dirname, "tasks"),   // 任务目录
  resultsDir:         path.join(__dirname, "results"), // 结果目录
  maxTurns:           10,                              // Claude 最大对话轮次
  maxBudgetUsd:       5.0,                             // 每个任务最大花费
  allowedTools:       [...],                           // Claude 可用工具白名单
  taskTimeoutMs:      10 * 60 * 1000,                  // 单任务超时 10 分钟
  sleepBetweenTasksMs: 5 * 1000,                       // 任务间隔 5 秒
  retryDelayMs:       30 * 60 * 1000,                  // 失败后等 30 分钟
}
```

#### 3.1.2 执行流程

```
main()
  │
  ├─ 检查 git 工作区是否干净（排除 ai-automation/ 和 .claude/）
  │   └─ 不干净 → 退出，提示用户先处理
  │
  ├─ 读取 tasks/pending/ 下的 .md 文件（排除 _ 开头的模板）
  │   └─ 无任务 → 退出
  │
  └─ 逐个执行 runTask(taskFile)
      │
      ├─ 1. 记录当前分支（originalBranch）
      ├─ 2. 创建/切换到 ai/<task-name> 分支
      ├─ 3. 移动任务文件：pending → running
      ├─ 4. 构建 claude CLI 命令
      │     claude -p "<任务内容>"
      │       --output-format json
      │       --max-turns 10
      │       --allowedTools "Read","Edit",...
      ├─ 5. execSync 执行（带 timeout、env 清理）
      ├─ 6. 保存 JSON 结果到 results/
      ├─ 7. 检查 git status，有变更则 add + commit
      ├─ 8. 移动任务：running → done
      │
      ├─ [失败时]
      │   ├─ git checkout . (还原修改)
      │   ├─ git clean -fd --exclude=ai-automation/ (清理新文件)
      │   └─ 移动任务：running → failed
      │
      └─ [finally] git checkout <originalBranch>
```

#### 3.1.3 关键技术决策

| 决策 | 原因 |
|------|------|
| 用 `execSync` 而非 `spawn` | 任务串行执行，逻辑简单，便于状态管理 |
| 用 `shell: true` | Windows 上 `claude` 实际是 `claude.cmd`，需要 shell 才能找到 |
| 清除 `CLAUDECODE` 环境变量 | 避免 Claude Code 的嵌套会话检测拒绝执行 |
| `git clean --exclude=ai-automation/` | 防止失败回滚时删除 runner 自身的文件 |
| `JSON.stringify(taskContent)` 传递 prompt | 正确处理多行文本中的换行符和特殊字符 |
| 排除 `ai-automation/` 和 `.claude/` 的 git status 检查 | 这些目录的变更不影响项目代码，不应阻塞执行 |

### 3.2 report.mjs — 报告生成器

**职责**：汇总任务执行情况和 git 分支变更，生成结构化的 Markdown 报告。

#### 3.2.1 报告内容

```markdown
# AI 夜间自动化报告

**日期**: 2026/3/16

## 概要
| 状态 | 数量 |
|------|------|
| 完成 | 3    |
| 失败 | 1    |

## 完成的任务
### 001_add_types
- Session: `abc123`
- Turns: 5
- Cost: $0.12

## 失败的任务
- 004_complex_refactor

## Git 分支变更
### ai/001_add_types
  2 files changed, 15 insertions(+), 3 deletions(-)
```

#### 3.2.2 数据来源

| 数据 | 来源 |
|------|------|
| 完成/失败任务列表 | `tasks/done/` 和 `tasks/failed/` 目录 |
| 执行统计（session、cost、turns） | `results/` 下的 JSON 文件 |
| 代码变更统计 | `git diff master...<branch> --stat` |

### 3.3 cron.mjs — 定时调度器

**职责**：替代系统级 crontab（Windows 不支持），用 `node-cron` 实现跨平台定时。

| 时间 | 动作 |
|------|------|
| 每天 01:00 | 执行 `node runner.mjs` |
| 每天 09:00 | 执行 `node report.mjs` |

长期运行，推荐用 `pm2` 管理：
```bash
pm2 start cron.mjs --name ai-cron
```

---

## 4. 任务状态机

```
          写入文件
            │
            ▼
    ┌──────────────┐
    │   pending    │  ← 开发者放入任务
    └──────┬───────┘
           │ runner 开始执行
           ▼
    ┌──────────────┐
    │   running    │  ← runner 执行中
    └──────┬───────┘
           │
     ┌─────┴─────┐
     │           │
     ▼           ▼
┌────────┐  ┌────────┐
│  done  │  │ failed │
└────────┘  └────────┘
     │           │
     │           └─ 开发者手动移回 pending 可重试
     │
     └─ 开发者 review 后 merge 或 discard
```

**状态流转规则**：
- `pending → running`：runner 开始处理该任务时
- `running → done`：Claude 执行成功（不论是否有代码变更）
- `running → failed`：Claude 执行报错或超时
- `failed → pending`：开发者手动移回，可选修改任务描述后重试

---

## 5. 安全机制

### 5.1 Git 分支隔离

每个任务在独立的 `ai/<task-name>` 分支执行。即使 Claude 产出了有问题的代码，也不会影响 master 分支。

```
master ──────●──────●──────●──────── (始终干净)
              \      \      \
               \      \      └── ai/003_update_docs
                \      └── ai/002_rename_vars
                 └── ai/001_add_types
```

### 5.2 工具白名单

使用 `--allowedTools` 精确控制 Claude 可以使用的工具：

```js
allowedTools: [
  "Read",                        // 读文件
  "Edit",                        // 编辑文件
  "Write",                       // 写文件
  "Glob",                        // 搜索文件
  "Grep",                        // 搜索内容
  "Bash(git diff *)",            // 查看 diff
  "Bash(git add *)",             // 暂存文件
  "Bash(git status)",            // 查看状态
  "Bash(npx tsc --noEmit *)",    // TypeScript 编译检查
]
```

**未授权的操作**（Claude 无法执行）：
- `rm`、`del` — 不能删除文件
- `git push` — 不能推送到远程
- `git checkout` — 不能切换分支
- `npm install` — 不能安装依赖
- 任意 shell 命令 — 仅能执行白名单中的 Bash 模式

### 5.3 执行限制

| 限制 | 值 | 说明 |
|------|-----|------|
| `--max-turns` | 10 | 最多 10 轮 AI 对话，防止无限循环 |
| `timeout` | 10 分钟 | 单任务超时自动终止 |
| 不自动 push | — | 所有变更仅在本地分支，需人工 merge |

### 5.4 失败回滚

任务失败时自动：
1. `git checkout .` — 还原所有已修改文件
2. `git clean -fd --exclude=ai-automation/` — 删除新增文件（保护 runner 自身）
3. 切回原始分支

---

## 6. Claude Code CLI 集成

### 6.1 使用的 CLI 参数

```bash
claude -p "<prompt>"              # headless 模式，执行后退出
  --output-format json            # 结构化 JSON 输出
  --max-turns 10                  # 最大对话轮次
  --allowedTools "Read","Edit"... # 工具白名单
```

### 6.2 Windows 兼容性处理

| 问题 | 解决方案 |
|------|----------|
| `claude` 是 `.cmd` 文件，`execFileSync` 找不到 | 使用 `execSync` + `shell: true` |
| Claude Code 嵌套会话检测 | 清除 `CLAUDECODE` 环境变量 |
| 没有 `crontab` 命令 | 使用 `node-cron` 包替代 |
| `2>nul` 在 Git Bash 中创建文件 | 避免使用此重定向语法 |

### 6.3 JSON 输出格式

Claude `--output-format json` 返回结构：

```json
{
  "session_id": "abc-123-def",
  "result": "执行结果文本...",
  "usage": {
    "total_cost": 0.12,
    "turns": 5,
    "input_tokens": 3000,
    "output_tokens": 1500
  }
}
```

---

## 7. 依赖关系

```
ai-automation
└── node-cron@3.x    # 跨平台定时任务（仅 cron.mjs 使用）
```

**系统依赖**：
- Node.js >= 18（ES Module 支持）
- Git（分支管理）
- Claude Code CLI（`npm install -g @anthropic-ai/claude-code`）
- Claude Code 订阅（Pro / Teams / Enterprise）

---

## 8. 已知限制与踩坑记录

### 8.1 不能在 Claude Code 会话内执行 runner

Claude Code 设置了 `CLAUDECODE` 环境变量来检测嵌套会话。runner 已通过在子进程中清除该变量来绕过，但如果在 Claude Code 终端里手动运行 `node runner.mjs`，仍需注意这一点。

### 8.2 git stash 会丢失 ai-automation 文件

`ai-automation/` 在 `.gitignore` 中被忽略，所以 `git stash` 不会保存其内容。如果 stash 前后 `.gitignore` 发生变化，可能导致文件丢失。

**预防措施**：runner 启动前检查工作区时已排除 `ai-automation/` 目录，避免要求用户 stash。

### 8.3 git clean 会删除 runner 自身

失败回滚时的 `git clean -fd` 会删除所有未跟踪文件，包括 `ai-automation/` 下的脚本。

**已修复**：使用 `git clean -fd --exclude=ai-automation/`。

### 8.4 额度限制

Claude Code 有使用额度上限。夜间批量执行多个任务可能耗尽额度。runner 在任务失败后等待 30 分钟再继续（`retryDelayMs`），给额度恢复留出时间。

---

## 9. 升级路线

| 版本 | 内容 | 状态 |
|------|------|------|
| **v0.1** | 文件队列 + runner + 报告 + git 分支隔离 | 当前版本 |
| v0.2 | 飞书 / Slack webhook 推送报告 | 规划中 |
| v0.3 | Claude 自动分析代码生成任务 | 规划中 |
| v0.4 | 失败任务自动改写 prompt 重试 | 规划中 |
| v0.5 | Web 面板查看任务状态和报告 | 远期 |
| v0.6 | 多项目支持（配置化 projectRoot） | 远期 |
