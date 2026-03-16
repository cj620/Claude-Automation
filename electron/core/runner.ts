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
        execSync(`git checkout -b ${branch}`, {
          cwd: project.projectRoot,
          encoding: 'utf-8'
        })

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
  const prompt = JSON.stringify(taskContent)

  const args = [
    '-p', prompt,
    '--output-format', 'json',
    '--max-turns', String(config.maxTurns),
    '--allowedTools', ...config.allowedTools
  ]

  return new Promise<ClaudeResult>((resolve, reject) => {
    const child = spawn('claude', args, {
      cwd: project.projectRoot,
      shell: true,
      env: {
        ...process.env,
        CLAUDE_CODE_ENTRYPOINT: undefined
      },
      timeout: config.taskTimeoutMs
    })

    currentChild = child
    let stdout = ''
    let stderr = ''

    child.stdout?.on('data', (chunk: Buffer) => {
      const line = chunk.toString()
      stdout += line
      onEvent({ type: 'task-log', taskName, line })
    })

    child.stderr?.on('data', (chunk: Buffer) => {
      stderr += chunk.toString()
    })

    child.on('close', (code) => {
      currentChild = null
      if (code === 0) {
        try {
          const result = JSON.parse(stdout) as ClaudeResult
          resolve(result)
        } catch {
          resolve({
            session_id: 'unknown',
            result: stdout,
            usage: { total_cost: 0, turns: 0, input_tokens: 0, output_tokens: 0 }
          })
        }
      } else {
        reject(new Error(`Claude exited with code ${code}: ${stderr || stdout}`))
      }
    })

    child.on('error', (err) => {
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
