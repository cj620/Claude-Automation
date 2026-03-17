import { readFileSync, writeFileSync, readdirSync, renameSync, unlinkSync, existsSync, mkdirSync, statSync } from 'fs'
import { join, basename, extname } from 'path'
import type { Task, TaskDraft, TaskStatus } from './types'

const STATUSES: TaskStatus[] = ['pending', 'running', 'done', 'failed']

function ensureTaskDirs(automationDir: string): void {
  for (const status of STATUSES) {
    const dir = join(automationDir, 'tasks', status)
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  }
}

function parseTaskName(content: string): string {
  const match = content.match(/^#\s+(?:任务：|Task:\s*)?(.+)$/m)
  return match ? match[1].trim() : 'Untitled'
}

function readTaskFile(filePath: string, status: TaskStatus): Task {
  const content = readFileSync(filePath, 'utf-8')
  const stat = statSync(filePath)
  const id = basename(filePath, extname(filePath))
  return {
    id,
    name: parseTaskName(content),
    status,
    content,
    filePath,
    createdAt: stat.birthtime.toISOString(),
    updatedAt: stat.mtime.toISOString()
  }
}

export function listTasks(automationDir: string, statusFilter?: TaskStatus): Task[] {
  ensureTaskDirs(automationDir)
  const statuses = statusFilter ? [statusFilter] : STATUSES
  const tasks: Task[] = []

  for (const status of statuses) {
    const dir = join(automationDir, 'tasks', status)
    if (!existsSync(dir)) continue
    const files = readdirSync(dir).filter(f => f.endsWith('.md') && !f.startsWith('_'))
    for (const file of files) {
      tasks.push(readTaskFile(join(dir, file), status))
    }
  }

  return tasks
}

export function createTask(automationDir: string, draft: TaskDraft): Task {
  ensureTaskDirs(automationDir)
  const content = renderTaskMarkdown(draft)
  const fileName = slugify(draft.title) + '.md'
  const filePath = join(automationDir, 'tasks', 'pending', fileName)
  writeFileSync(filePath, content, 'utf-8')
  return readTaskFile(filePath, 'pending')
}

export function updateTask(automationDir: string, id: string, content: string): Task {
  for (const status of STATUSES) {
    const filePath = join(automationDir, 'tasks', status, `${id}.md`)
    if (existsSync(filePath)) {
      writeFileSync(filePath, content, 'utf-8')
      return readTaskFile(filePath, status)
    }
  }
  throw new Error(`Task ${id} not found`)
}

export function deleteTask(automationDir: string, id: string): void {
  for (const status of STATUSES) {
    const filePath = join(automationDir, 'tasks', status, `${id}.md`)
    if (existsSync(filePath)) {
      unlinkSync(filePath)
      return
    }
  }
  throw new Error(`Task ${id} not found`)
}

export function moveTask(automationDir: string, id: string, from: TaskStatus, to: TaskStatus): void {
  const srcPath = join(automationDir, 'tasks', from, `${id}.md`)
  const destPath = join(automationDir, 'tasks', to, `${id}.md`)
  ensureTaskDirs(automationDir)
  renameSync(srcPath, destPath)
}

export function retryTask(automationDir: string, id: string): Task {
  moveTask(automationDir, id, 'failed', 'pending')
  const filePath = join(automationDir, 'tasks', 'pending', `${id}.md`)
  return readTaskFile(filePath, 'pending')
}

// 复制已完成的任务，生成新任务
export function duplicateTask(automationDir: string, id: string): Task {
  // 读取原任务内容
  const srcPath = join(automationDir, 'tasks', 'done', `${id}.md`)
  if (!existsSync(srcPath)) {
    throw new Error(`Task ${id} not found in done status`)
  }
  const content = readFileSync(srcPath, 'utf-8')

  // 生成新的文件名和任务名
  const timestamp = Date.now()
  const newId = `${id}-${timestamp}`
  const newFileName = `${newId}.md`
  const destPath = join(automationDir, 'tasks', 'pending', newFileName)

  // 在内容中修改任务名称，添加"（副本）"标记
  const newContent = content.replace(/^#\s+(?:任务：|Task:\s*)(.+)$/m, '# 任务：$1（副本）')

  writeFileSync(destPath, newContent, 'utf-8')
  return readTaskFile(destPath, 'pending')
}

function renderTaskMarkdown(draft: TaskDraft): string {
  const lines: string[] = []
  lines.push(`# 任务：${draft.title}`)
  lines.push('')
  lines.push('## 背景')
  lines.push(draft.background)
  lines.push('')
  lines.push('## 目标')
  for (const goal of draft.goals) {
    lines.push(`- [ ] ${goal}`)
  }
  lines.push('')
  lines.push('## 约束')
  for (const c of draft.constraints) {
    lines.push(`- ${c}`)
  }
  lines.push('')
  lines.push('## 涉及文件')
  for (const f of draft.files) {
    lines.push(`- ${f}`)
  }
  lines.push('')
  lines.push('## 验证方式')
  for (const v of draft.verification) {
    lines.push(`- ${v}`)
  }
  lines.push('')
  return lines.join('\n')
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\u4e00-\u9fff]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 60)
}
