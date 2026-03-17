import { spawn, ChildProcess, execSync } from 'child_process'
import { writeFileSync, mkdirSync, existsSync } from 'fs'
import { join } from 'path'
import type { Project, TaskExecutionResult, ClaudeResult, RunnerEvent } from './types'
import { listTasks, moveTask } from './task-manager'

type EventCallback = (event: RunnerEvent) => void

let currentChild: ChildProcess | null = null
let isRunning = false
let shouldStop = false

export function getRunnerStatus(): { isRunning: boolean } {
  return { isRunning }
}

export function stopRunner(): void {
  shouldStop = true
  if (currentChild) {
    currentChild.kill('SIGTERM')
  }
}

export async function runAllTasks(project: Project, onEvent: EventCallback): Promise<TaskExecutionResult[]> {
  if (isRunning) throw new Error('Runner is already running')

  isRunning = true
  shouldStop = false
  const results: TaskExecutionResult[] = []

  try {
    checkGitClean(project.projectRoot)

    const tasks = listTasks(project.automationDir, 'pending')
    if (tasks.length === 0) {
      onEvent({ type: 'all-done', results: [] })
      return []
    }

    const originalBranch = execSync('git rev-parse --abbrev-ref HEAD', {
      cwd: project.projectRoot,
      encoding: 'utf-8'
    }).trim()

    for (const task of tasks) {
      if (shouldStop) break

      const taskName = task.id
      onEvent({ type: 'task-start', taskName })

      const startTime = Date.now()
      const branch = `ai/${taskName}`

      try {
        // 创建并切换到新分支
        try {
          execSync(`git checkout -b ${branch}`, { cwd: project.projectRoot, encoding: 'utf-8' })
        } catch {
          execSync(`git checkout ${branch}`, { cwd: project.projectRoot, encoding: 'utf-8' })
        }

        moveTask(project.automationDir, taskName, 'pending', 'running')

        const result = await executeClaudeTask(project, task.content, taskName, onEvent)

        const resultsDir = join(project.automationDir, 'results')
        if (!existsSync(resultsDir)) mkdirSync(resultsDir, { recursive: true })
        writeFileSync(
          join(resultsDir, `${taskName}.json`),
          JSON.stringify(result, null, 2),
          'utf-8'
        )

        execSync('git add -A', { cwd: project.projectRoot })
        execSync(`git commit -m "ai: ${taskName}" --allow-empty`, {
          cwd: project.projectRoot,
          encoding: 'utf-8'
        })

        moveTask(project.automationDir, taskName, 'running', 'done')

        const execResult: TaskExecutionResult = {
          taskName,
          success: true,
          branch,
          result,
          duration: Date.now() - startTime
        }
        results.push(execResult)
        onEvent({ type: 'task-done', taskName, result: execResult })

      } catch (err) {
        const error = err instanceof Error ? err.message : String(err)

        // 回滚未提交的更改
        try {
          execSync('git checkout -- .', { cwd: project.projectRoot })
          execSync('git clean -fd', { cwd: project.projectRoot })
        } catch { /* ignore cleanup errors */ }

        try {
          moveTask(project.automationDir, taskName, 'running', 'failed')
        } catch { /* may not be in running */ }

        const execResult: TaskExecutionResult = {
          taskName,
          success: false,
          branch,
          error,
          duration: Date.now() - startTime
        }
        results.push(execResult)
        onEvent({ type: 'task-failed', taskName, error })
      }

      // 执行完切换回原分支
      try {
        execSync(`git checkout ${originalBranch}`, {
          cwd: project.projectRoot,
          encoding: 'utf-8'
        })
      } catch { /* ignore */ }

      if (!shouldStop && tasks.indexOf(task) < tasks.length - 1) {
        await sleep(project.config.sleepBetweenTasksMs)
      }
    }

    onEvent({ type: 'all-done', results })
    return results

  } finally {
    isRunning = false
    shouldStop = false
    currentChild = null
  }
}

async function executeClaudeTask(
  project: Project,
  taskContent: string,
  taskName: string,
  onEvent: EventCallback
): Promise<ClaudeResult> {
  const { config } = project

  // Build args — prompt will be piped via stdin to avoid shell quoting issues
  const args = [
    '-p',
    '--verbose',
    '--output-format', 'stream-json',
    '--max-turns', String(config.maxTurns),
    '--allowedTools', `"${config.allowedTools.join(',')}"`
  ]

  // Clean env: remove nesting detection vars
  const env = { ...process.env }
  delete env.CLAUDE_CODE_ENTRYPOINT
  delete env.CLAUDECODE

  // 确保 PATH 包含 npm 全局模块路径 (Windows)
  const npmGlobalPath = 'C:\\Program Files\\nodejs\\node_global'
  if (env.PATH && !env.PATH.includes(npmGlobalPath)) {
    env.PATH = npmGlobalPath + ';' + env.PATH
  }

  console.log('[runner] spawning claude with args:', args.join(' '))
  console.log('[runner] cwd:', project.projectRoot)
  console.log('[runner] prompt length:', taskContent.length)

  return new Promise<ClaudeResult>((resolve, reject) => {
    const child = spawn('claude', args, {
      cwd: project.projectRoot,
      shell: true,
      env,
      timeout: config.taskTimeoutMs
    })

    currentChild = child
    let stderr = ''
    let buffer = ''
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let finalResult: any = null

    // Pipe prompt via stdin (avoids Windows cmd.exe quoting hell)
    child.stdin?.write(taskContent)
    child.stdin?.end()

    child.stdout?.on('data', (chunk: Buffer) => {
      const raw = chunk.toString()
      console.log('[runner] stdout chunk:', raw.slice(0, 200))
      buffer += raw
      const lines = buffer.split('\n')
      // Keep the last incomplete line in buffer
      buffer = lines.pop() ?? ''

      for (const line of lines) {
        if (!line.trim()) continue
        try {
          const event = JSON.parse(line)
          if (event.type === 'assistant') {
            const contents = event.message?.content ?? []
            for (const c of contents) {
              if (c.type === 'text' && c.text) {
                onEvent({ type: 'task-log', taskName, line: c.text })
              } else if (c.type === 'tool_use') {
                onEvent({ type: 'task-log', taskName, line: `[tool] ${c.name}: ${JSON.stringify(c.input).slice(0, 200)}` })
              }
            }
          } else if (event.type === 'result') {
            finalResult = event
            onEvent({ type: 'task-log', taskName, line: `[result] cost=$${event.cost_usd ?? 0}, turns=${event.num_turns ?? 0}` })
          }
        } catch {
          // Non-JSON line, emit as-is
          onEvent({ type: 'task-log', taskName, line })
        }
      }
    })

    child.stderr?.on('data', (chunk: Buffer) => {
      const text = chunk.toString().trim()
      if (text) {
        console.log('[runner] stderr:', text.slice(0, 200))
        stderr += text + '\n'
        onEvent({ type: 'task-log', taskName, line: `[stderr] ${text}` })
      }
    })

    child.on('close', (code) => {
      console.log('[runner] process closed with code:', code)
      currentChild = null
      // Process any remaining buffer
      if (buffer.trim()) {
        try {
          const event = JSON.parse(buffer)
          if (event.type === 'result') finalResult = event
        } catch { /* ignore */ }
      }

      if (code === 0 && finalResult) {
        resolve({
          session_id: finalResult.session_id ?? 'unknown',
          result: finalResult.result ?? '',
          usage: {
            total_cost: finalResult.cost_usd ?? 0,
            turns: finalResult.num_turns ?? 0,
            input_tokens: finalResult.usage?.input_tokens ?? 0,
            output_tokens: finalResult.usage?.output_tokens ?? 0
          }
        })
      } else if (code === 0) {
        resolve({
          session_id: 'unknown',
          result: 'completed (no result event)',
          usage: { total_cost: 0, turns: 0, input_tokens: 0, output_tokens: 0 }
        })
      } else {
        reject(new Error(`Claude exited with code ${code}: ${stderr}`))
      }
    })

    child.on('error', (err) => {
      console.log('[runner] spawn error:', err.message)
      currentChild = null
      reject(err)
    })
  })
}

function checkGitClean(projectRoot: string): void {
  const status = execSync(
    'git status --porcelain --ignore-submodules -- . ":(exclude).claude/"',
    { cwd: projectRoot, encoding: 'utf-8' }
  ).trim()

  if (status) {
    throw new Error(`Git 工作区不干净，请先提交或暂存以下文件:\n${status}`)
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}
