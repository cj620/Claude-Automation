import { v4 as uuidv4 } from 'uuid'
import type { BrowserWindow } from 'electron'
import type { Schedule, SchedulePreset, RunnerEvent } from './types'
import { loadSchedules, saveSchedules, getActiveProject } from './config'
import { runAllTasks, getRunnerStatus } from './runner'

const timers = new Map<string, NodeJS.Timeout>()
let getMainWindow: () => BrowserWindow | null = () => null

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
      // Skip weekends: 0=Sunday, 6=Saturday
      while (next.getDay() === 0 || next.getDay() === 6) {
        next.setDate(next.getDate() + 1)
      }
      return next
    }
    case 'custom': {
      next.setHours(preset.hour, preset.minute, 0, 0)
      if (next <= from) next.setDate(next.getDate() + 1)
      // Find next matching day
      for (let i = 0; i < 7; i++) {
        if (preset.days.includes(next.getDay())) return next
        next.setDate(next.getDate() + 1)
      }
      return next
    }
  }
}

function scheduleTimer(schedule: Schedule): void {
  clearTimer(schedule.id)
  if (!schedule.enabled) return

  const nextFire = calculateNextFireTime(schedule.preset)
  const delay = nextFire.getTime() - Date.now()

  // Update nextRunAt in config
  const schedules = loadSchedules()
  const idx = schedules.findIndex(s => s.id === schedule.id)
  if (idx >= 0) {
    schedules[idx].nextRunAt = nextFire.toISOString()
    saveSchedules(schedules)
  }

  const timer = setTimeout(async () => {
    timers.delete(schedule.id)

    const { isRunning } = getRunnerStatus()
    if (isRunning) {
      sendToRenderer('scheduler:event', {
        type: 'skipped',
        scheduleId: schedule.id,
        reason: '任务正在执行中，跳过本次定时'
      })
      // Reschedule
      const fresh = loadSchedules().find(s => s.id === schedule.id)
      if (fresh?.enabled) scheduleTimer(fresh)
      return
    }

    const project = getActiveProject()
    if (!project) {
      sendToRenderer('scheduler:event', {
        type: 'skipped',
        scheduleId: schedule.id,
        reason: '没有活跃项目'
      })
      const fresh = loadSchedules().find(s => s.id === schedule.id)
      if (fresh?.enabled) scheduleTimer(fresh)
      return
    }

    // Update lastRunAt
    const allSchedules = loadSchedules()
    const sIdx = allSchedules.findIndex(s => s.id === schedule.id)
    if (sIdx >= 0) {
      allSchedules[sIdx].lastRunAt = new Date().toISOString()
      saveSchedules(allSchedules)
    }

    sendToRenderer('scheduler:event', {
      type: 'triggered',
      scheduleId: schedule.id,
      scheduleName: schedule.name
    })

    const onEvent = (event: RunnerEvent): void => {
      sendToRenderer('runner:event', event)
    }

    try {
      await runAllTasks(project, onEvent)
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err)
      sendToRenderer('runner:event', {
        type: 'task-failed',
        taskName: 'scheduler',
        error
      })
    }

    // Reschedule
    const fresh = loadSchedules().find(s => s.id === schedule.id)
    if (fresh?.enabled) scheduleTimer(fresh)
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

export function startScheduler(windowGetter: () => BrowserWindow | null): void {
  getMainWindow = windowGetter
  const schedules = loadSchedules()
  for (const schedule of schedules) {
    if (schedule.enabled) {
      scheduleTimer(schedule)
    }
  }
}

export function recalculateAllTimers(): void {
  for (const [id] of timers) {
    clearTimer(id)
  }
  const schedules = loadSchedules()
  for (const schedule of schedules) {
    if (schedule.enabled) {
      scheduleTimer(schedule)
    }
  }
}

export function addSchedule(name: string, preset: SchedulePreset): Schedule {
  const schedule: Schedule = {
    id: uuidv4(),
    name,
    preset,
    enabled: true,
    createdAt: new Date().toISOString()
  }
  const schedules = loadSchedules()
  schedules.push(schedule)
  saveSchedules(schedules)
  scheduleTimer(schedule)
  return schedule
}

export function removeSchedule(id: string): void {
  clearTimer(id)
  const schedules = loadSchedules().filter(s => s.id !== id)
  saveSchedules(schedules)
}

export function toggleSchedule(id: string, enabled: boolean): Schedule | null {
  const schedules = loadSchedules()
  const schedule = schedules.find(s => s.id === id)
  if (!schedule) return null
  schedule.enabled = enabled
  if (!enabled) {
    clearTimer(id)
    schedule.nextRunAt = undefined
  }
  saveSchedules(schedules)
  if (enabled) scheduleTimer(schedule)
  return schedule
}

export function listSchedules(): Schedule[] {
  return loadSchedules()
}
