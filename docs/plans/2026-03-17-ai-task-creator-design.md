# AI 辅助任务创建 - 设计文档

## 问题

手动创建任务时容易出现描述不准确、任务拆分不合理等问题。需要利用 Claude Code CLI 的代码理解能力，自动生成高质量的任务定义。

## 方案：专用页面 + 三步向导

### 用户流程

1. **输入** — 用户在文本框中用自然语言描述需求（如"给登录页加验证码功能"）
2. **生成中** — Claude Code 分析项目代码，流式展示分析进度
3. **预览** — 生成的任务以可编辑卡片形式展示，用户勾选后批量创建

### 架构

```
用户输入 → ai-generator-store.generate()
         → window.api.ai.generate(prompt)
         → ipcMain 'ai:generate'
         → ai-generator.ts: spawn claude -p (只读工具)
         → stream-json 事件 → webContents.send('ai:generate-event')
         → ai-generator-store 接收事件更新 UI
         → 用户预览/编辑 → task-store.createTask() 批量创建
```

### 新增文件

| 文件 | 职责 |
|------|------|
| `electron/core/ai-generator.ts` | 调用 Claude CLI 生成任务，解析 JSON 输出 |
| `electron/ipc/ai-generator.ts` | IPC handler，转发流式事件 |
| `src/stores/ai-generator-store.ts` | Zustand store，管理生成状态/进度/结果 |
| `src/pages/AITaskCreator.tsx` | 三步向导页面 |

### 修改文件

| 文件 | 修改内容 |
|------|----------|
| `electron/core/types.ts` | 添加 `AIGenerateEvent` 类型 |
| `electron/preload.ts` | 添加 `ai.generate()` / `ai.stop()` |
| `electron/main.ts` | 注册 AI generator IPC |
| `src/App.tsx` | 添加 `/tasks/ai-create` 路由 |
| `src/ai/layouts/AppShell.tsx` | 侧边栏添加入口 |

### Claude CLI 调用策略

- **参数**: `claude -p --verbose --output-format stream-json --max-turns 5 --allowedTools "Read,Glob,Grep"`
- **只读工具**: 生成阶段只允许读取代码，不允许修改
- **Prompt**: 指导 Claude 先探索项目结构，然后输出一个 JSON code block 包含 `TaskDraft[]`
- **解析**: 用正则 `` ```json\n([\s\S]*?)\n``` `` 从输出中提取 JSON

### System Prompt 模板

```
你是一个 AI 代码自动化系统的任务规划助手。

用户会描述他想要完成的工作。你需要：
1. 使用 Read, Glob, Grep 工具探索项目，理解项目结构和现有代码
2. 将用户的需求拆分为定义明确、可独立执行的子任务
3. 每个任务需要明确涉及的文件、目标、约束和验证方式

分析完成后，在回复最后输出一个 JSON code block：

```json
{
  "tasks": [
    {
      "title": "简洁的任务名称",
      "background": "任务背景和动机",
      "goals": ["每个是一个具体的可交付目标"],
      "constraints": ["每个是一个约束条件"],
      "files": ["每个是一个相关文件路径"],
      "verification": ["每个是一个验证步骤"]
    }
  ]
}
```

用户需求：{userPrompt}
```

### 关键设计决策

- **独立模块**: 不复用 runner.ts，因为 runner 有 git 分支/提交等执行逻辑
- **只读工具**: 生成阶段只探索代码，不修改
- **stream-json**: 既能流式展示进度，又能提取结构化结果
- **JSON in markdown**: 比纯 JSON 输出更可靠，Claude 可以先推理再输出结构化数据
