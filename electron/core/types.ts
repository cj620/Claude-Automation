export interface ProjectsConfig {
  activeProject: string
  projects: Project[]
  schedules?: Schedule[]     // 已废弃，仅用于旧数据迁移
}

export interface Project {
  id: string
  name: string
  projectRoot: string
  automationDir: string
  config: RunnerConfig
  schedules: Schedule[]
}

export interface RunnerConfig {
  maxTurns: number
  maxBudgetUsd: number
  taskTimeoutMs: number
  sleepBetweenTasksMs: number
  retryDelayMs: number
  allowedTools: string[]
  executionMode: 'branch' | 'direct'  // 'branch': 创建分支修改, 'direct': 直接在当前分支修改
}

export type TaskStatus = 'pending' | 'running' | 'done' | 'failed'

export interface Task {
  id: string
  name: string
  status: TaskStatus
  content: string
  filePath: string
  createdAt: string
  updatedAt: string
}

export interface TaskDraft {
  title: string
  background: string
  goals: string[]
  constraints: string[]
  files: string[]
  verification: string[]
}

export interface ClaudeResult {
  session_id: string
  result: string
  usage: {
    total_cost: number
    turns: number
    input_tokens: number
    output_tokens: number
  }
}

export interface TaskExecutionResult {
  taskName: string
  success: boolean
  branch: string
  result?: ClaudeResult
  error?: string
  duration: number
}

export interface ReportSummary {
  date: string
  filePath: string
  taskCount: number
  successCount: number
  failCount: number
}

export interface ReportDetail extends ReportSummary {
  content: string
}

export type AIGenerateEvent =
  | { type: 'progress'; message: string }
  | { type: 'result'; tasks: TaskDraft[] }
  | { type: 'error'; error: string }

export type RunnerEvent =
  | { type: 'task-start'; taskName: string }
  | { type: 'task-log'; taskName: string; line: string }
  | { type: 'task-done'; taskName: string; result: TaskExecutionResult }
  | { type: 'task-failed'; taskName: string; error: string }
  | { type: 'all-done'; results: TaskExecutionResult[] }

export type SchedulePreset =
  | { type: 'daily'; hour: number; minute: number }
  | { type: 'interval'; hours: number }
  | { type: 'weekdays'; hour: number; minute: number }
  | { type: 'custom'; days: number[]; hour: number; minute: number }

export interface Schedule {
  id: string
  projectId: string
  name: string
  preset: SchedulePreset
  enabled: boolean
  createdAt: string
  lastRunAt?: string
  nextRunAt?: string
}

export type SchedulerEvent =
  | { type: 'triggered'; scheduleId: string; scheduleName: string; projectName: string }
  | { type: 'queued'; scheduleId: string; scheduleName: string; projectName: string }
  | { type: 'skipped'; scheduleId: string; reason: string }
