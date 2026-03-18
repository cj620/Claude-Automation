import { v4 as uuidv4 } from 'uuid'
import type { BrowserWindow } from 'electron'
import type { Schedule, SchedulePreset, RunnerEvent, Project } from './types'
import {
  loadAllSchedules,
  loadSchedulesByProject,
  saveProjectSchedules,
  findProjectById
} from './config'
import { runAllTasks } from './runner'

const timers = new Map<string, NodeJS.Timeout>()
let getMainWindow: () => BrowserWindow | null = () => null

// 执行队列：串行排队执行
interface QueueItem {
  schedule: Schedule
  project: Project
}
const executionQueue: QueueItem[] = []
let isProcessingQueue = false

function sendToRenderer(channel: string, data: unknown): void {
  const win = getMainWindow()
  if (win && !win.isDestroyed()) {
    win.webContents.send(channel, data)
  }
}

export function calculateNextFireTime(preset: SchedulePreset, from: Date = new Date()): Date {
  const next = new Date(from)

  switch (preset.type) {
    case 'daily': {
      next.setHours(preset.hour, preset.minute, 0, 0)
      if (next <= from) next.setDate(next.getDate() + 1)
      return next
    }
    case 'interval': {
      next.setTime(from.getTime() + preset.hours * 60 * 60 * 1000)
      return next
    }
    case 'weekdays': {
      next.setHours(preset.hour, preset.minute, 0, 0)
      if (next <= from) next.setDate(next.getDate() + 1)
      while (next.getDay() === 0 || next.getDay() === 6) {
        next.setDate(next.getDate() + 1)
      }
      return next
    }
    case 'custom': {
      next.setHours(preset.hour, preset.minute, 0, 0)
      if (next <= from) next.setDate(next.getDate() + 1)
      for (let i = 0; i < 7; i++) {
        if (preset.days.includes(next.getDay())) return next
        next.setDate(next.getDate() + 1)
      }
      return next
    }
  }
}

function updateScheduleField(
  schedule: Schedule,
  updates: Partial<Pick<Schedule, 'nextRunAt' | 'lastRunAt'>>
): void {
  const schedules = loadSchedulesByProject(schedule.projectId)
  const idx = schedules.findIndex(s => s.id === schedule.id)
  if (idx >= 0) {
    Object.assign(schedules[idx], updates)
    saveProjectSchedules(schedule.projectId, schedules)
  }
}

function reschedule(schedule: Schedule): void {
  const schedules = loadSchedulesByProject(schedule.projectId)
  const fresh = schedules.find(s => s.id === schedule.id)
  if (fresh?.enabled) scheduleTimer(fresh)
}

function scheduleTimer(schedule: Schedule): void {
  clearTimer(schedule.id)
  if (!schedule.enabled) return

  const nextFire = calculateNextFireTime(schedule.preset)
  const delay = nextFire.getTime() - Date.now()

  updateScheduleField(schedule, { nextRunAt: nextFire.toISOString() })

  const timer = setTimeout(() => {
    timers.delete(schedule.id)
    onScheduleTriggered(schedule)
  }, delay)

  timers.set(schedule.id, timer)
}

function clearTimer(id: string): void {
  const existing = timers.get(id)
  if (existing) {
    clearTimeout(existing)
    timers.delete(id)
  }
}

async function onScheduleTriggered(schedule: Schedule): Promise<void> {
  const project = findProjectById(schedule.projectId)
  if (!project) {
    sendToRenderer('scheduler:event', {
      type: 'skipped',
      scheduleId: schedule.id,
      reason: `项目 ${schedule.projectId} 不存在`
    })
    reschedule(schedule)
    return
  }

  executionQueue.push({ schedule, project })
  sendToRenderer('scheduler:event', {
    type: 'queued',
    scheduleId: schedule.id,
    scheduleName: schedule.name,
    projectName: project.name
  })

  if (!isProcessingQueue) processQueue()
}

async function processQueue(): Promise<void> {
  isProcessingQueue = true

  while (executionQueue.length > 0) {
    const item = executionQueue.shift()!

    updateScheduleField(item.schedule, { lastRunAt: new Date().toISOString() })

    sendToRenderer('scheduler:event', {
      type: 'triggered',
      scheduleId: item.schedule.id,
      scheduleName: item.schedule.name,
      projectName: item.project.name
    })

    const onEvent = (event: RunnerEvent): void => {
      sendToRenderer('runner:event', event)
    }

    try {
      await runAllTasks(item.project, onEvent)
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err)
      sendToRenderer('runner:event', {
        type: 'task-failed',
        taskName: 'scheduler',
        error
      })
    }

    reschedule(item.schedule)
  }

  isProcessingQueue = false
}

// --- Public API ---

export function startScheduler(windowGetter: () => BrowserWindow | null): void {
  getMainWindow = windowGetter
  const allSchedules = loadAllSchedules()
  for (const schedule of allSchedules) {
    if (schedule.enabled) {
      scheduleTimer(schedule)
    }
  }
}

export function recalculateAllTimers(): void {
  for (const [id] of timers) {
    clearTimer(id)
  }
  const allSchedules = loadAllSchedules()
  for (const schedule of allSchedules) {
    if (schedule.enabled) {
      scheduleTimer(schedule)
    }
  }
}

export function addSchedule(projectId: string, name: string, preset: SchedulePreset): Schedule {
  const schedule: Schedule = {
    id: uuidv4(),
    projectId,
    name,
    preset,
    enabled: true,
    createdAt: new Date().toISOString()
  }
  const schedules = loadSchedulesByProject(projectId)
  schedules.push(schedule)
  saveProjectSchedules(projectId, schedules)
  scheduleTimer(schedule)
  return schedule
}

export function removeSchedule(projectId: string, id: string): void {
  clearTimer(id)
  const schedules = loadSchedulesByProject(projectId).filter(s => s.id !== id)
  saveProjectSchedules(projectId, schedules)
}

export function toggleSchedule(projectId: string, id: string, enabled: boolean): Schedule | null {
  const schedules = loadSchedulesByProject(projectId)
  const schedule = schedules.find(s => s.id === id)
  if (!schedule) return null
  schedule.enabled = enabled
  if (!enabled) {
    clearTimer(id)
    schedule.nextRunAt = undefined
  }
  saveProjectSchedules(projectId, schedules)
  if (enabled) scheduleTimer(schedule)
  return schedule
}

export function listSchedulesByProject(projectId: string): Schedule[] {
  return loadSchedulesByProject(projectId)
}

export function listAllSchedules(): Schedule[] {
  return loadAllSchedules()
}

export function clearProjectTimers(projectId: string): void {
  const schedules = loadSchedulesByProject(projectId)
  for (const s of schedules) {
    clearTimer(s.id)
  }
}
