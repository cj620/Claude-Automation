# Scheduler Module Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a scheduled task execution feature with simple time presets (daily, interval, weekdays, custom) that auto-triggers `runAllTasks()` for the active project.

**Architecture:** Zero-dependency scheduler using native `setTimeout` with next-fire-time calculation. Schedules stored in `projects.json` at the top level. New `/schedules` sidebar page with Ant Design UI. Scheduler core runs in Electron main process, communicates via IPC.

**Tech Stack:** Electron 33 (powerMonitor, ipcMain), React 18, Ant Design 5 (Form, Select, TimePicker, Switch, List, Card), Zustand, TypeScript

---

### Task 1: Add Schedule Types

**Files:**
- Modify: `electron/core/types.ts:1-4` (extend `ProjectsConfig`)
- Modify: `electron/core/types.ts` (add new types at end)

**Step 1: Add types to `electron/core/types.ts`**

Add before the closing of the file (after `RunnerEvent` type):

```typescript
export type SchedulePreset =
  | { type: 'daily'; hour: number; minute: number }
  | { type: 'interval'; hours: number }
  | { type: 'weekdays'; hour: number; minute: number }
  | { type: 'custom'; days: number[]; hour: number; minute: number }

export interface Schedule {
  id: string
  name: string
  preset: SchedulePreset
  enabled: boolean
  createdAt: string
  lastRunAt?: string
  nextRunAt?: string
}
```

Then modify `ProjectsConfig` to add `schedules`:

```typescript
export interface ProjectsConfig {
  activeProject: string
  projects: Project[]
  schedules: Schedule[]
}
```

**Step 2: Run typecheck**

Run: `npx tsc --noEmit -p tsconfig.node.json`
Expected: May show errors in `config.ts` where `ProjectsConfig` is used without `schedules` — that's expected, we fix it in Task 2.

**Step 3: Commit**

```bash
git add electron/core/types.ts
git commit -m "feat(scheduler): add Schedule and SchedulePreset types"
```

---

### Task 2: Config Migration for Schedules

**Files:**
- Modify: `electron/core/config.ts:24-44` (`loadProjectsConfig` function)

**Step 1: Add schedules migration in `loadProjectsConfig()`**

In `electron/core/config.ts`, after line 29 (`const config = JSON.parse(raw) as ProjectsConfig`), add:

```typescript
// Migrate: add schedules array if missing (pre-scheduler configs)
if (!config.schedules) {
  config.schedules = []
}
```

Also update the empty default on line 26 to:

```typescript
return { activeProject: '', projects: [], schedules: [] }
```

**Step 2: Add schedule persistence helpers**

Add at the end of `config.ts`:

```typescript
export function loadSchedules(): Schedule[] {
  const config = loadProjectsConfig()
  return config.schedules
}

export function saveSchedules(schedules: Schedule[]): void {
  const config = loadProjectsConfig()
  config.schedules = schedules
  saveProjectsConfig(config)
}
```

Add `Schedule` to the import from `./types`.

**Step 3: Run typecheck**

Run: `npx tsc --noEmit -p tsconfig.node.json`
Expected: PASS (no more missing `schedules` errors)

**Step 4: Commit**

```bash
git add electron/core/config.ts
git commit -m "feat(scheduler): add schedules migration and persistence helpers"
```

---

### Task 3: Scheduler Core

**Files:**
- Create: `electron/core/scheduler.ts`

**Step 1: Create `electron/core/scheduler.ts`**

```typescript
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
  // Clear all existing timers and reschedule
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
```

**Step 2: Run typecheck**

Run: `npx tsc --noEmit -p tsconfig.node.json`
Expected: PASS

**Step 3: Commit**

```bash
git add electron/core/scheduler.ts
git commit -m "feat(scheduler): add scheduler core with setTimeout-based scheduling"
```

---

### Task 4: Scheduler IPC Handlers

**Files:**
- Create: `electron/ipc/scheduler.ts`

**Step 1: Create `electron/ipc/scheduler.ts`**

```typescript
import { ipcMain } from 'electron'
import type { SchedulePreset } from '../core/types'
import {
  listSchedules,
  addSchedule,
  removeSchedule,
  toggleSchedule
} from '../core/scheduler'

export function registerSchedulerIpc(): void {
  ipcMain.handle('scheduler:list', () => {
    return listSchedules()
  })

  ipcMain.handle('scheduler:add', (_e, name: string, preset: SchedulePreset) => {
    return addSchedule(name, preset)
  })

  ipcMain.handle('scheduler:remove', (_e, id: string) => {
    removeSchedule(id)
  })

  ipcMain.handle('scheduler:toggle', (_e, id: string, enabled: boolean) => {
    return toggleSchedule(id, enabled)
  })
}
```

**Step 2: Run typecheck**

Run: `npx tsc --noEmit -p tsconfig.node.json`
Expected: PASS

**Step 3: Commit**

```bash
git add electron/ipc/scheduler.ts
git commit -m "feat(scheduler): add IPC handlers for scheduler CRUD"
```

---

### Task 5: Extend Preload API

**Files:**
- Modify: `electron/preload.ts:3-35` (add `scheduler` namespace to `api` object)

**Step 1: Add `scheduler` namespace in `electron/preload.ts`**

Add after the `reports` namespace (before the `on` method):

```typescript
scheduler: {
  list: (): Promise<unknown[]> => ipcRenderer.invoke('scheduler:list'),
  add: (name: string, preset: unknown): Promise<unknown> => ipcRenderer.invoke('scheduler:add', name, preset),
  remove: (id: string): Promise<void> => ipcRenderer.invoke('scheduler:remove', id),
  toggle: (id: string, enabled: boolean): Promise<unknown> => ipcRenderer.invoke('scheduler:toggle', id, enabled),
},
```

**Step 2: Run typecheck**

Run: `npx tsc --noEmit -p tsconfig.node.json`
Expected: PASS

**Step 3: Commit**

```bash
git add electron/preload.ts
git commit -m "feat(scheduler): expose scheduler API in preload bridge"
```

---

### Task 6: Register in Main Process

**Files:**
- Modify: `electron/main.ts:1-9` (add imports)
- Modify: `electron/main.ts:61-77` (register IPC and start scheduler)

**Step 1: Add imports at top of `electron/main.ts`**

Add to the existing imports:

```typescript
import { powerMonitor } from 'electron'  // add to existing electron import
import { registerSchedulerIpc } from './ipc/scheduler'
import { startScheduler, recalculateAllTimers } from './core/scheduler'
```

**Step 2: Register scheduler in `app.whenReady()` block**

After `registerRunnerIpc(() => mainWindow)` (line 76), add:

```typescript
registerSchedulerIpc()
startScheduler(() => mainWindow)

powerMonitor.on('resume', () => {
  recalculateAllTimers()
})
```

**Step 3: Run typecheck**

Run: `npx tsc --noEmit -p tsconfig.node.json`
Expected: PASS

**Step 4: Commit**

```bash
git add electron/main.ts
git commit -m "feat(scheduler): wire up scheduler in main process with powerMonitor"
```

---

### Task 7: Zustand Store

**Files:**
- Create: `src/stores/scheduler-store.ts`

**Step 1: Create `src/stores/scheduler-store.ts`**

```typescript
import { create } from 'zustand'

interface SchedulePreset {
  type: 'daily' | 'interval' | 'weekdays' | 'custom'
  hour?: number
  minute?: number
  hours?: number
  days?: number[]
}

interface Schedule {
  id: string
  name: string
  preset: SchedulePreset
  enabled: boolean
  createdAt: string
  lastRunAt?: string
  nextRunAt?: string
}

interface SchedulerStore {
  schedules: Schedule[]
  loading: boolean
  fetchSchedules: () => Promise<void>
  addSchedule: (name: string, preset: SchedulePreset) => Promise<void>
  removeSchedule: (id: string) => Promise<void>
  toggleSchedule: (id: string, enabled: boolean) => Promise<void>
}

export const useSchedulerStore = create<SchedulerStore>((set) => ({
  schedules: [],
  loading: false,

  fetchSchedules: async () => {
    set({ loading: true })
    const schedules = await window.api.scheduler.list() as Schedule[]
    set({ schedules, loading: false })
  },

  addSchedule: async (name, preset) => {
    await window.api.scheduler.add(name, preset)
    const schedules = await window.api.scheduler.list() as Schedule[]
    set({ schedules })
  },

  removeSchedule: async (id) => {
    await window.api.scheduler.remove(id)
    const schedules = await window.api.scheduler.list() as Schedule[]
    set({ schedules })
  },

  toggleSchedule: async (id, enabled) => {
    await window.api.scheduler.toggle(id, enabled)
    const schedules = await window.api.scheduler.list() as Schedule[]
    set({ schedules })
  }
}))
```

**Step 2: Run typecheck**

Run: `npx tsc --noEmit -p tsconfig.web.json`
Expected: PASS

**Step 3: Commit**

```bash
git add src/stores/scheduler-store.ts
git commit -m "feat(scheduler): add Zustand store for scheduler state"
```

---

### Task 8: Add Route and Sidebar Entry

**Files:**
- Modify: `src/ai/layouts/AppShell.tsx:1-24` (add menu item and import)
- Modify: `src/App.tsx:1-28` (add route)

**Step 1: Add sidebar menu item in `src/ai/layouts/AppShell.tsx`**

Add `ClockCircleOutlined` to the icon imports (line 7 area):

```typescript
import {
  DashboardOutlined,
  UnorderedListOutlined,
  PlayCircleOutlined,
  FileTextOutlined,
  ClockCircleOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
} from '@ant-design/icons'
```

Add to `menuItems` array (after the execution entry, before reports):

```typescript
{ key: '/schedules', icon: <ClockCircleOutlined />, label: '定时' },
```

**Step 2: Add route in `src/App.tsx`**

Add import:

```typescript
import Schedules from './pages/Schedules'
```

Add route inside the `<Route element={<AppShell />}>` block, after the execution route:

```typescript
<Route path="/schedules" element={<Schedules />} />
```

**Step 3: Run typecheck** (will fail — Schedules page doesn't exist yet, that's expected)

**Step 4: Commit**

```bash
git add src/ai/layouts/AppShell.tsx src/App.tsx
git commit -m "feat(scheduler): add /schedules route and sidebar menu entry"
```

---

### Task 9: Schedules Page

**Files:**
- Create: `src/pages/Schedules.tsx`

**Step 1: Create `src/pages/Schedules.tsx`**

```typescript
import { useEffect, useState } from 'react'
import { Button, Switch, Select, TimePicker, InputNumber, Checkbox, Card, List, Popconfirm, Space, Typography } from 'antd'
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { useSchedulerStore } from '../stores/scheduler-store'
import { useProjectStore } from '../stores/project-store'
import { PageHeader, EmptyState } from '../ai/components'

const PRESET_OPTIONS = [
  { value: 'daily', label: '每天' },
  { value: 'interval', label: '每隔 N 小时' },
  { value: 'weekdays', label: '工作日' },
  { value: 'custom', label: '自定义' },
]

const DAY_OPTIONS = [
  { label: '周日', value: 0 },
  { label: '周一', value: 1 },
  { label: '周二', value: 2 },
  { label: '周三', value: 3 },
  { label: '周四', value: 4 },
  { label: '周五', value: 5 },
  { label: '周六', value: 6 },
]

function describePreset(preset: { type: string; hour?: number; minute?: number; hours?: number; days?: number[] }): string {
  const pad = (n: number): string => String(n).padStart(2, '0')
  switch (preset.type) {
    case 'daily':
      return `每天 ${pad(preset.hour ?? 0)}:${pad(preset.minute ?? 0)}`
    case 'interval':
      return `每隔 ${preset.hours ?? 1} 小时`
    case 'weekdays':
      return `工作日 ${pad(preset.hour ?? 0)}:${pad(preset.minute ?? 0)}`
    case 'custom': {
      const dayNames = ['日', '一', '二', '三', '四', '五', '六']
      const days = (preset.days ?? []).map(d => `周${dayNames[d]}`).join('、')
      return `${days} ${pad(preset.hour ?? 0)}:${pad(preset.minute ?? 0)}`
    }
    default:
      return '未知'
  }
}

function formatTime(iso?: string): string {
  if (!iso) return '-'
  const d = new Date(iso)
  return `${d.toLocaleDateString('zh-CN')} ${d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}`
}

export default function Schedules(): React.ReactElement {
  const { schedules, loading, fetchSchedules, addSchedule, removeSchedule, toggleSchedule } = useSchedulerStore()
  const { activeProject } = useProjectStore()
  const [showForm, setShowForm] = useState(false)
  const [presetType, setPresetType] = useState<string>('daily')
  const [time, setTime] = useState<dayjs.Dayjs>(dayjs().hour(9).minute(0))
  const [intervalHours, setIntervalHours] = useState(4)
  const [selectedDays, setSelectedDays] = useState<number[]>([1, 2, 3, 4, 5])

  useEffect(() => {
    fetchSchedules()
  }, [activeProject])

  const handleAdd = async (): Promise<void> => {
    let preset: unknown
    let name: string

    switch (presetType) {
      case 'daily':
        preset = { type: 'daily', hour: time.hour(), minute: time.minute() }
        name = `每天 ${time.format('HH:mm')}`
        break
      case 'interval':
        preset = { type: 'interval', hours: intervalHours }
        name = `每隔 ${intervalHours} 小时`
        break
      case 'weekdays':
        preset = { type: 'weekdays', hour: time.hour(), minute: time.minute() }
        name = `工作日 ${time.format('HH:mm')}`
        break
      case 'custom':
        preset = { type: 'custom', days: selectedDays, hour: time.hour(), minute: time.minute() }
        name = `自定义 ${time.format('HH:mm')}`
        break
      default:
        return
    }

    await addSchedule(name, preset as never)
    setShowForm(false)
  }

  const enabledCount = schedules.filter(s => s.enabled).length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0, height: '100%' }}>
      <PageHeader
        title="定时任务"
        subtitle={enabledCount > 0 ? `${enabledCount} 个定时计划运行中` : undefined}
        actions={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setShowForm(!showForm)}
          >
            添加定时
          </Button>
        }
      />

      {showForm && (
        <Card size="small" style={{ marginBottom: 16 }}>
          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            <Space wrap>
              <Select
                value={presetType}
                onChange={setPresetType}
                options={PRESET_OPTIONS}
                style={{ width: 140 }}
              />

              {presetType !== 'interval' && (
                <TimePicker
                  value={time}
                  onChange={(v) => v && setTime(v)}
                  format="HH:mm"
                  minuteStep={5}
                  allowClear={false}
                />
              )}

              {presetType === 'interval' && (
                <Space>
                  <InputNumber
                    min={1}
                    max={24}
                    value={intervalHours}
                    onChange={(v) => v && setIntervalHours(v)}
                    addonAfter="小时"
                    style={{ width: 140 }}
                  />
                </Space>
              )}
            </Space>

            {presetType === 'custom' && (
              <Checkbox.Group
                options={DAY_OPTIONS}
                value={selectedDays}
                onChange={(v) => setSelectedDays(v as number[])}
              />
            )}

            <Space>
              <Button type="primary" size="small" onClick={handleAdd}>
                确认添加
              </Button>
              <Button size="small" onClick={() => setShowForm(false)}>
                取消
              </Button>
            </Space>
          </Space>
        </Card>
      )}

      <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
        {schedules.length === 0 ? (
          <EmptyState
            type="no-tasks"
            description="暂无定时计划"
            action={
              !showForm ? (
                <Button type="primary" icon={<PlusOutlined />} onClick={() => setShowForm(true)}>
                  添加定时
                </Button>
              ) : undefined
            }
          />
        ) : (
          <List
            loading={loading}
            dataSource={schedules}
            renderItem={(schedule) => (
              <List.Item
                actions={[
                  <Switch
                    key="toggle"
                    checked={schedule.enabled}
                    onChange={(checked) => toggleSchedule(schedule.id, checked)}
                    size="small"
                  />,
                  <Popconfirm
                    key="delete"
                    title="确定删除此定时计划？"
                    onConfirm={() => removeSchedule(schedule.id)}
                  >
                    <Button type="text" danger icon={<DeleteOutlined />} size="small" />
                  </Popconfirm>
                ]}
              >
                <List.Item.Meta
                  title={
                    <span style={{ opacity: schedule.enabled ? 1 : 0.5 }}>
                      {schedule.name}
                    </span>
                  }
                  description={
                    <Space direction="vertical" size={0}>
                      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                        {describePreset(schedule.preset as never)}
                      </Typography.Text>
                      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                        下次: {formatTime(schedule.nextRunAt)} | 上次: {formatTime(schedule.lastRunAt)}
                      </Typography.Text>
                    </Space>
                  }
                />
              </List.Item>
            )}
          />
        )}
      </div>
    </div>
  )
}
```

**Step 2: Run typecheck**

Run: `npx tsc --noEmit`
Expected: PASS

**Step 3: Run dev to verify UI**

Run: `npm run dev`
Expected: App opens, sidebar shows "定时" entry, clicking it shows the schedules page.

**Step 4: Commit**

```bash
git add src/pages/Schedules.tsx
git commit -m "feat(scheduler): add Schedules page with preset form and schedule list"
```

---

### Task 10: Integration Verification

**Step 1: Run full typecheck**

Run: `npm run typecheck`
Expected: PASS with no errors

**Step 2: Run dev and manually test**

Run: `npm run dev`

Manual test checklist:
- [ ] Sidebar shows "定时" menu item with clock icon
- [ ] Clicking "定时" navigates to `/schedules`
- [ ] Empty state shows "暂无定时计划" with add button
- [ ] Click "添加定时" shows form
- [ ] Select "每天" preset, pick time 09:00, click "确认添加" — schedule appears in list
- [ ] Select "每隔 N 小时" preset, set to 2, add — shows in list
- [ ] Toggle switch disables/enables schedule
- [ ] Delete button removes schedule with confirmation
- [ ] Close and reopen app — schedules persist
- [ ] Schedule descriptions display correctly (time, days)
- [ ] Next/last run times display

**Step 3: Run build**

Run: `npm run build`
Expected: PASS

**Step 4: Final commit**

```bash
git add -A
git commit -m "feat(scheduler): complete scheduler module with presets and sidebar page"
```
