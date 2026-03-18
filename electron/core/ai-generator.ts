import { spawn, ChildProcess } from 'child_process'
import type { Project, TaskDraft, AIGenerateEvent } from './types'

type EventCallback = (event: AIGenerateEvent) => void

let currentChild: ChildProcess | null = null

const SYSTEM_PROMPT = `你是一个 AI 代码自动化系统的任务规划助手。

用户会描述他想要完成的工作。你需要：
1. 使用 Read, Glob, Grep 工具探索项目，理解项目结构和现有代码
2. 将用户的需求拆分为定义明确、可独立执行的子任务
3. 每个任务需要明确涉及的文件、目标、约束和验证方式

注意事项：
- 每个任务应该是独立可执行的，不依赖其他任务的执行结果
- 目标要具体、可衡量
- 涉及文件要准确，基于你对项目的实际探索
- 约束条件要合理，避免过度限制
- 验证方式要可操作

分析完成后，在回复最后输出一个 JSON code block：

\`\`\`json
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
\`\`\`

JSON 必须严格符合以上格式。每个任务应该可以独立执行。`

export function stopAIGenerator(): void {
  if (currentChild) {
    currentChild.kill('SIGTERM')
    currentChild = null
  }
}

export async function generateTaskDrafts(
  project: Project,
  userPrompt: string,
  onEvent: EventCallback
): Promise<void> {
  if (currentChild) {
    throw new Error('已有生成任务在运行')
  }

  const args = [
    '-p',
    '--verbose',
    '--output-format', 'stream-json',
    '--max-turns', '5',
    '--allowedTools', '"Read,Glob,Grep"'
  ]

  // Clean env: remove nesting detection vars
  const env = { ...process.env }
  delete env.CLAUDE_CODE_ENTRYPOINT
  delete env.CLAUDECODE

  // Ensure PATH includes npm global path (Windows)
  const npmGlobalPath = 'C:\\Program Files\\nodejs\\node_global'
  if (env.PATH && !env.PATH.includes(npmGlobalPath)) {
    env.PATH = npmGlobalPath + ';' + env.PATH
  }

  const fullPrompt = SYSTEM_PROMPT + '\n\n用户需求：' + userPrompt

  console.log('[ai-generator] spawning claude for task generation')
  console.log('[ai-generator] cwd:', project.projectRoot)

  return new Promise<void>((resolve, reject) => {
    const child = spawn('claude', args, {
      cwd: project.projectRoot,
      shell: true,
      env,
      timeout: 120000 // 2 minutes for generation
    })

    currentChild = child
    let buffer = ''
    let allText = ''
    let stderr = ''

    // Pipe prompt via stdin
    child.stdin?.write(fullPrompt)
    child.stdin?.end()

    child.stdout?.on('data', (chunk: Buffer) => {
      const raw = chunk.toString()
      buffer += raw
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''

      for (const line of lines) {
        if (!line.trim()) continue
        try {
          const event = JSON.parse(line)
          if (event.type === 'assistant') {
            const contents = event.message?.content ?? []
            for (const c of contents) {
              if (c.type === 'text' && c.text) {
                allText += c.text
                onEvent({ type: 'progress', message: c.text })
              } else if (c.type === 'tool_use') {
                onEvent({ type: 'progress', message: `[工具] ${c.name}: ${JSON.stringify(c.input).slice(0, 200)}` })
              }
            }
          } else if (event.type === 'result') {
            // Also collect result text
            if (event.result) {
              allText += event.result
            }
            onEvent({ type: 'progress', message: `[完成] cost=$${event.cost_usd ?? 0}, turns=${event.num_turns ?? 0}` })
          }
        } catch {
          onEvent({ type: 'progress', message: line })
        }
      }
    })

    child.stderr?.on('data', (chunk: Buffer) => {
      const text = chunk.toString().trim()
      if (text) {
        stderr += text + '\n'
      }
    })

    child.on('close', (code) => {
      currentChild = null

      // Process remaining buffer
      if (buffer.trim()) {
        try {
          const event = JSON.parse(buffer)
          if (event.type === 'result' && event.result) {
            allText += event.result
          }
        } catch { /* ignore */ }
      }

      if (code !== 0) {
        onEvent({ type: 'error', error: `Claude 退出，代码 ${code}: ${stderr}` })
        reject(new Error(`Claude exited with code ${code}`))
        return
      }

      // Extract JSON from the collected text
      const tasks = extractTasksFromText(allText)
      if (tasks) {
        onEvent({ type: 'result', tasks })
        resolve()
      } else {
        onEvent({ type: 'error', error: '无法从 AI 输出中解析任务数据，请尝试更具体的描述' })
        reject(new Error('Failed to parse tasks from AI output'))
      }
    })

    child.on('error', (err) => {
      currentChild = null
      onEvent({ type: 'error', error: err.message })
      reject(err)
    })
  })
}

function extractTasksFromText(text: string): TaskDraft[] | null {
  // Try to extract JSON code block
  const jsonMatch = text.match(/```json\s*\n([\s\S]*?)\n\s*```/)
  if (!jsonMatch) {
    // Fallback: try to find raw JSON object
    const rawMatch = text.match(/\{\s*"tasks"\s*:\s*\[[\s\S]*?\]\s*\}/)
    if (!rawMatch) return null
    try {
      const parsed = JSON.parse(rawMatch[0])
      return validateTasks(parsed.tasks)
    } catch {
      return null
    }
  }

  try {
    const parsed = JSON.parse(jsonMatch[1])
    return validateTasks(parsed.tasks)
  } catch {
    return null
  }
}

function validateTasks(tasks: unknown): TaskDraft[] | null {
  if (!Array.isArray(tasks) || tasks.length === 0) return null

  const validated: TaskDraft[] = []
  for (const t of tasks) {
    if (!t || typeof t !== 'object') continue
    const task = t as Record<string, unknown>
    if (typeof task.title !== 'string' || !task.title) continue

    validated.push({
      title: task.title,
      background: typeof task.background === 'string' ? task.background : '',
      goals: Array.isArray(task.goals) ? task.goals.filter((g): g is string => typeof g === 'string') : [],
      constraints: Array.isArray(task.constraints) ? task.constraints.filter((c): c is string => typeof c === 'string') : [],
      files: Array.isArray(task.files) ? task.files.filter((f): f is string => typeof f === 'string') : [],
      verification: Array.isArray(task.verification) ? task.verification.filter((v): v is string => typeof v === 'string') : [],
    })
  }

  return validated.length > 0 ? validated : null
}
