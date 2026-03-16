# AI 夜间自动化 — 使用手册

> 版本：v0.1 | 最后更新：2026-03-16

---

## 目录

1. [前置条件](#1-前置条件)
2. [安装部署](#2-安装部署)
3. [编写任务](#3-编写任务)
4. [执行任务](#4-执行任务)
5. [查看报告](#5-查看报告)
6. [Review 与合并](#6-review-与合并)
7. [定时运行](#7-定时运行)
8. [配置调整](#8-配置调整)
9. [任务示例库](#9-任务示例库)
10. [故障排除](#10-故障排除)

---

## 1. 前置条件

### 1.1 必须安装

| 工具 | 最低版本 | 安装方式 |
|------|----------|----------|
| Node.js | 18+ | https://nodejs.org |
| Git | 2.x | https://git-scm.com |
| Claude Code CLI | 最新 | `npm install -g @anthropic-ai/claude-code` |
| pnpm | 8+ | `npm install -g pnpm` |

### 1.2 必须有

- Claude Code 有效订阅（Pro / Teams / Enterprise）
- 项目是一个 git 仓库
- git 工作区在执行任务前需要是干净的（无未提交的变更）

---

## 2. 安装部署

### 2.1 初始安装

```bash
# 进入项目根目录
cd your-project

# 创建 ai-automation 目录（如果还没有）
mkdir -p ai-automation

# 将 ai-automation 文件复制到项目中（如果是从其他项目迁移）
# 确保包含：runner.mjs, report.mjs, cron.mjs, package.json, tasks/pending/_template.md

# 安装依赖
cd ai-automation
pnpm install
```

### 2.2 添加到 .gitignore

在项目根目录的 `.gitignore` 中添加：

```
ai-automation/
```

这样 ai-automation 的运行时产物（results、reports、done/failed 任务）不会被 git 跟踪。

### 2.3 验证安装

```bash
cd ai-automation

# 验证 Claude CLI 可用
claude --version

# 验证 runner 可以启动（dry-run 模式不会执行任何任务）
node runner.mjs --dry-run

# 验证报告生成器可以启动
node report.mjs
```

---

## 3. 编写任务

### 3.1 创建任务文件

任务文件是普通的 Markdown 文件，放在 `tasks/pending/` 目录下。

```bash
# 从模板创建
cp tasks/pending/_template.md tasks/pending/001_my_task.md

# 编辑任务内容
code tasks/pending/001_my_task.md   # 或用任何编辑器
```

### 3.2 命名规则

```
<序号>_<简述>.md
```

| 规则 | 说明 |
|------|------|
| 以数字序号开头 | 控制执行顺序（按文件名排序执行） |
| 下划线分隔 | 可读性好 |
| `.md` 后缀 | 必须，runner 只识别 `.md` 文件 |
| 不以 `_` 开头 | 以 `_` 开头的文件会被忽略（如 `_template.md`） |

**示例**：

```
001_add_types_to_utils.md
002_rename_getUserInfo.md
003_update_api_pattern.md
```

### 3.3 任务模板

```markdown
# 任务：[动词] [具体目标]

## 背景
[为什么要做这个改动，上下文是什么]

## 目标
- [ ] 具体目标 1
- [ ] 具体目标 2

## 约束
- 不要修改 public API
- 不要删除现有的导出
- 保持向后兼容

## 涉及文件
- src/components/xxx.vue（主要修改）
- src/utils/xxx.ts（可能需要调整）

## 验证方式
- 确保 TypeScript 编译通过: npx tsc --noEmit
- 确保现有导出不变
```

### 3.4 编写高质量任务的要点

#### 标题要具体

```
# 不好：重构组件
# 好：  为 src/utils/format/index.ts 中的所有导出函数补充 TypeScript 类型注解
```

#### 目标要可检验

```
# 不好：
- [ ] 改善代码质量

# 好：
- [ ] 所有函数参数都有类型注解
- [ ] 所有函数返回值都有类型注解
- [ ] 不使用 any 类型
```

#### 必须列出涉及文件

Claude 需要知道改哪些文件。不列文件路径 = Claude 需要自己搜索 = 浪费轮次 = 可能改错地方。

```
## 涉及文件
- src/utils/format/index.ts（主要修改）
- src/utils/format/types.ts（新增类型定义，如果需要）
```

#### 约束条件很重要

明确告诉 Claude 什么不能做，防止意外修改。

```
## 约束
- 仅添加类型注解，不修改任何运行时逻辑
- 不删除、不重命名任何现有导出
- 不引入新的第三方依赖
- 保持现有函数签名不变（参数顺序、默认值等）
```

#### 提供验证方式

让 Claude 执行完后自检。

```
## 验证方式
- npx tsc --noEmit 编译通过
- 确保 git diff 中没有非类型注解的改动
```

---

## 4. 执行任务

### 4.1 预览模式（推荐先跑一次）

```bash
cd ai-automation
node runner.mjs --dry-run
```

输出示例：

```
[2026/3/16 18:00:00] ═══════════════════════════════════════════
[2026/3/16 18:00:00]   AI 夜间自动化 Runner v0.1
[2026/3/16 18:00:00]   项目: D:\web\my-project
[2026/3/16 18:00:00]   模式: DRY RUN
[2026/3/16 18:00:00] ═══════════════════════════════════════════
[2026/3/16 18:00:00] 📬 发现 3 个待执行任务: 001_add_types.md, 002_rename.md, 003_docs.md
[2026/3/16 18:00:00] 📋 任务: 001_add_types.md
[2026/3/16 18:00:00]   [dry-run] 跳过执行
...
```

### 4.2 正式执行

```bash
node runner.mjs
```

**前提条件**：
- git 工作区必须干净（`ai-automation/` 和 `.claude/` 目录除外）
- 如果有未提交的变更，runner 会拒绝执行并提示

输出示例：

```
[2026/3/16 01:00:00] ═══════════════════════════════════════════
[2026/3/16 01:00:00]   AI 夜间自动化 Runner v0.1
[2026/3/16 01:00:00]   项目: D:\web\my-project
[2026/3/16 01:00:00]   模式: 执行
[2026/3/16 01:00:00] ═══════════════════════════════════════════
[2026/3/16 01:00:00] 📬 发现 2 个待执行任务: 001_add_types.md, 002_rename.md
[2026/3/16 01:00:00] 📋 任务: 001_add_types.md
[2026/3/16 01:00:00]   🌿 创建分支: ai/001_add_types
[2026/3/16 01:00:00]   🤖 执行 Claude (max-turns: 10, timeout: 600s)
[2026/3/16 01:02:30]   ✅ 执行成功 (session: abc-123)
[2026/3/16 01:02:30]   📝 检测到变更，提交到分支 ai/001_add_types
[2026/3/16 01:02:35] 📋 任务: 002_rename.md
[2026/3/16 01:02:35]   🌿 创建分支: ai/002_rename
[2026/3/16 01:02:35]   🤖 执行 Claude (max-turns: 10, timeout: 600s)
[2026/3/16 01:04:10]   ✅ 执行成功 (session: def-456)
[2026/3/16 01:04:10]   📝 检测到变更，提交到分支 ai/002_rename
[2026/3/16 01:04:10] ═══════════════════════════════════════════
[2026/3/16 01:04:10]   完成: 2  失败: 0  总计: 2
[2026/3/16 01:04:10] ═══════════════════════════════════════════
```

### 4.3 执行过程中发生了什么

```
1. 检查 git 工作区          → 有未提交变更则退出
2. 读取 tasks/pending/      → 按文件名排序
3. 对每个任务:
   a. 创建 git 分支         → ai/<task-name>
   b. 移动任务文件           → pending → running
   c. 调用 Claude           → claude -p "..." --allowedTools ...
   d. 保存 JSON 结果        → results/<task-name>_<timestamp>.json
   e. 如果有代码变更         → git add + commit
   f. 移动任务文件           → running → done (成功) / failed (失败)
   g. 切回原始分支           → git checkout master
   h. 等待 5 秒             → 避免 API 限流
4. 输出汇总
```

---

## 5. 查看报告

### 5.1 生成报告

```bash
node report.mjs
```

报告会同时输出到终端和保存到 `reports/report_YYYY-MM-DD.md`。

### 5.2 报告内容

报告包含以下部分：

| 部分 | 内容 |
|------|------|
| 概要 | 完成/失败/待执行任务数量，AI 分支数量 |
| 完成的任务 | 每个任务的 session ID、轮次、花费 |
| 失败的任务 | 失败任务列表 |
| Git 分支变更 | 每个 AI 分支的 diff 统计（修改了几个文件、多少行） |
| 待执行的任务 | 还在 pending 中的任务 |

---

## 6. Review 与合并

### 6.1 查看 AI 创建的分支

```bash
git branch | grep ai/
```

输出：

```
  ai/001_add_types
  ai/002_rename_vars
  ai/003_update_docs
```

### 6.2 查看变更概要

```bash
# 看改了哪些文件、多少行
git diff master..ai/001_add_types --stat
```

输出：

```
 src/utils/format/index.ts | 15 ++++++++++++---
 1 file changed, 12 insertions(+), 3 deletions(-)
```

### 6.3 查看详细 diff

```bash
# 看具体改了什么
git diff master..ai/001_add_types
```

### 6.4 合并满意的分支

```bash
# 切到主分支
git checkout master

# 合并
git merge ai/001_add_types
```

### 6.5 删除不满意的分支

```bash
git branch -D ai/003_update_docs
```

### 6.6 批量清理已合并的分支

```bash
# 删除所有已合并到 master 的 AI 分支
git branch --merged master | grep ai/ | xargs git branch -d
```

---

## 7. 定时运行

### 7.1 使用 cron.mjs

```bash
node cron.mjs
```

保持终端运行即可：
- **01:00** — 自动执行 `runner.mjs`
- **09:00** — 自动生成报告

按 `Ctrl+C` 退出。

### 7.2 使用 pm2 后台运行（推荐）

```bash
# 安装 pm2
npm install -g pm2

# 启动
pm2 start cron.mjs --name ai-cron

# 查看状态
pm2 status

# 查看日志
pm2 logs ai-cron

# 设置开机自启（Windows 需要额外配置，见下方）
pm2 save
pm2 startup
```

### 7.3 使用 Windows 任务计划程序

如果不想用 pm2，可以用 Windows 自带的任务计划程序：

1. 打开"任务计划程序"（搜索 `taskschd.msc`）
2. 点击"创建基本任务"
3. 名称：`AI Automation Runner`
4. 触发器：每天，时间 00:50
5. 操作：启动程序
   - 程序：`node`
   - 参数：`runner.mjs`
   - 起始位置：`D:\web\your-project\ai-automation`
6. 完成

再创建一个报告任务：
- 名称：`AI Automation Report`
- 时间：09:00
- 参数：`report.mjs`

---

## 8. 配置调整

所有配置在 `runner.mjs` 顶部的 `CONFIG` 对象中。

### 8.1 调整 Claude 权限

默认的 `allowedTools` 白名单比较保守。根据任务需要可以添加更多工具。

```js
allowedTools: [
  // --- 默认 ---
  "Read",
  "Edit",
  "Write",
  "Glob",
  "Grep",
  "Bash(git diff *)",
  "Bash(git add *)",
  "Bash(git status)",
  "Bash(npx tsc --noEmit *)",

  // --- 按需添加 ---
  "Bash(npm run test *)",        // 运行测试
  "Bash(npx eslint *)",          // Lint 检查
  "Bash(npx prettier *)",        // 格式化
  "Bash(npm run build *)",       // 构建验证
],
```

**安全提示**：不要添加以下工具，除非你确切知道自己在做什么：
- `Bash(rm *)` — 可能删除文件
- `Bash(git push *)` — 可能推送到远程
- `Bash(npm install *)` — 可能修改依赖

### 8.2 调整执行参数

```js
// 增大复杂任务的轮次限制
maxTurns: 20,                    // 默认 10

// 提高预算上限
maxBudgetUsd: 10.0,              // 默认 5.0

// 增加超时时间（适合大文件处理）
taskTimeoutMs: 20 * 60 * 1000,   // 20 分钟，默认 10 分钟

// 缩短失败等待时间
retryDelayMs: 10 * 60 * 1000,    // 10 分钟，默认 30 分钟
```

### 8.3 修改定时任务时间

编辑 `cron.mjs` 中的 cron 表达式：

```js
// 改为每天 23:00 执行
cron.schedule("0 23 * * *", () => { ... })

// 改为每天 8:00 生成报告
cron.schedule("0 8 * * *", () => { ... })

// 仅工作日执行（周一到周五）
cron.schedule("0 1 * * 1-5", () => { ... })
```

Cron 表达式格式：`分 时 日 月 周`

---

## 9. 任务示例库

### 9.1 补充 TypeScript 类型

```markdown
# 任务：为 src/utils/format/index.ts 补充类型注解

## 背景
该模块的函数缺少 TypeScript 类型注解，影响开发体验和类型安全。

## 目标
- [ ] 为所有导出函数的参数添加类型注解
- [ ] 为所有导出函数的返回值添加类型注解
- [ ] 不使用 any 类型，使用具体类型

## 约束
- 仅添加类型注解，不修改任何运行时逻辑
- 不删除任何现有导出
- 不引入新的第三方依赖

## 涉及文件
- src/utils/format/index.ts

## 验证方式
- npx tsc --noEmit 编译通过
```

### 9.2 批量重命名函数

```markdown
# 任务：将 getUserInfo 重命名为 fetchUserProfile

## 背景
函数命名不够语义化，getUserInfo 实际是发起 API 请求获取用户资料，
应该用 fetch 前缀更准确地表达其行为。

## 目标
- [ ] 将 getUserInfo 函数重命名为 fetchUserProfile
- [ ] 更新所有导入和调用处
- [ ] 更新相关类型定义（如有）

## 约束
- 仅做重命名，不修改函数内部逻辑
- 不修改 API 路径
- 保持导出方式不变

## 涉及文件
- src/service/apis/user.ts（函数定义）
- src/views/user/profile.vue（调用处）
- src/views/user/settings.vue（调用处）
- src/store/modules/user.ts（调用处）

## 验证方式
- npx tsc --noEmit 编译通过
- 搜索项目中不再有 getUserInfo 的引用
```

### 9.3 统一 API 调用模式

```markdown
# 任务：将 src/service/apis/product.ts 中的 API 迁移到 resData 模式

## 背景
项目正在将 API 调用从旧的 request.ts 模式迁移到新的 resData.ts 模式。
product.ts 中仍在使用旧模式。

## 目标
- [ ] 将所有 import { post, get } from '@/service/request' 改为 import { post, get } from '@/service/instance/resData'
- [ ] 调整函数签名匹配 resData 模式（返回 BaseApi<T>）
- [ ] 为每个 API 函数添加 Params 和 Result 类型

## 约束
- 不修改 API 路径
- 不修改请求参数结构
- 保持所有导出名称不变

## 涉及文件
- src/service/apis/product.ts

## 验证方式
- npx tsc --noEmit 编译通过
- 确保所有函数仍然被正确导出
```

### 9.4 添加注释文档

```markdown
# 任务：为 src/utils/dom/ 下的工具函数添加 JSDoc 注释

## 背景
DOM 工具函数缺少文档，新成员难以理解用法。

## 目标
- [ ] 为每个导出函数添加 JSDoc 注释
- [ ] 注释包含：@description, @param, @returns, @example
- [ ] 示例代码要可运行

## 约束
- 仅添加注释，不修改任何代码逻辑
- 不修改函数签名
- 注释用中文

## 涉及文件
- src/utils/dom/index.ts
- src/utils/dom/focus.ts
- src/utils/dom/ellipsis.ts

## 验证方式
- npx tsc --noEmit 编译通过
```

### 9.5 提取常量

```markdown
# 任务：将 src/views/publish/amazon/constants/ 中的魔法数字提取为命名常量

## 背景
代码中有多处硬编码的数字和字符串，可读性差，修改困难。

## 目标
- [ ] 找出所有魔法数字和硬编码字符串
- [ ] 提取为有意义名称的常量
- [ ] 将常量集中到 constants 文件中

## 约束
- 不修改业务逻辑
- 常量命名用 UPPER_SNAKE_CASE
- 保持运行时行为完全一致

## 涉及文件
- src/views/publish/amazon/constants/index.ts
- src/views/publish/amazon/detail/components/（搜索硬编码值）

## 验证方式
- npx tsc --noEmit 编译通过
- 搜索确认不再有裸露的魔法数字
```

---

## 10. 故障排除

### 10.1 "工作区有未提交的变更"

```
❗ 工作区有未提交的变更，请先处理:
M  src/views/xxx.vue
```

**原因**：Runner 要求 git 工作区干净，防止任务执行过程中与你的改动冲突。

**解决**：
```bash
# 方法 1：提交你的改动
git add . && git commit -m "wip: save progress"

# 方法 2：暂存你的改动
git stash
node runner.mjs
git stash pop
```

### 10.2 "spawnSync claude ENOENT"

```
❌ 执行失败: spawnSync claude ENOENT
```

**原因**：系统找不到 `claude` 命令。

**解决**：
```bash
# 确认 Claude CLI 已安装
claude --version

# 如果没安装
npm install -g @anthropic-ai/claude-code

# 如果已安装但找不到，检查 PATH
where claude        # Windows
which claude        # Mac/Linux
```

### 10.3 "Claude Code cannot be launched inside another Claude Code session"

```
Error: Claude Code cannot be launched inside another Claude Code session.
```

**原因**：在 Claude Code 的终端里运行 runner，触发了嵌套会话检测。

**解决**：Runner 已自动处理（清除 `CLAUDECODE` 环境变量）。如果仍然出现，手动执行：
```bash
# Windows PowerShell
$env:CLAUDECODE = ""; node runner.mjs

# Mac/Linux
unset CLAUDECODE && node runner.mjs
```

### 10.4 任务执行超时

```
❌ 执行失败: Command failed: ... ETIMEDOUT
```

**原因**：任务太复杂，超过了 10 分钟的默认超时。

**解决**：在 `runner.mjs` 中增大超时时间：
```js
taskTimeoutMs: 20 * 60 * 1000,  // 改为 20 分钟
```

或者拆分任务为更小的子任务。

### 10.5 额度耗尽

```
❌ 执行失败: Rate limit exceeded
```

**原因**：Claude Code 使用额度已用完。

**解决**：Runner 会自动等待 30 分钟后继续。你也可以：
- 减少 `maxTurns`（如改为 5）降低单任务消耗
- 减少同时排队的任务数量
- 把重要任务排在前面

### 10.6 如何重新执行失败的任务

```bash
# 查看失败任务
ls tasks/failed/

# 移回 pending 重新执行
mv tasks/failed/001_add_types.md tasks/pending/

# 可选：先编辑任务描述改进 prompt
code tasks/pending/001_add_types.md

# 重新执行
node runner.mjs
```

### 10.7 AI 分支冲突

如果两个任务修改了同一个文件，merge 时可能出现冲突。

**解决**：
```bash
# 先 merge 第一个
git merge ai/001_add_types

# merge 第二个时如果冲突
git merge ai/002_rename
# 手动解决冲突
git add .
git commit
```

**预防**：编写任务时尽量让每个任务修改不同的文件。

### 10.8 runner 的脚本文件莫名消失

**原因**：`ai-automation/` 目录在 `.gitignore` 中，git 不跟踪这些文件。某些 git 操作（如 `git clean -fd`、`git stash`）可能会删除未跟踪的文件。

**已修复**：Runner 的失败回滚使用 `git clean -fd --exclude=ai-automation/` 来保护自身文件。

**预防**：备份 `runner.mjs`、`report.mjs`、`cron.mjs` 等核心文件到安全位置。
