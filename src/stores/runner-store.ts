import { create } from 'zustand'
import { message } from 'antd'

interface RunnerLog {
  taskName: string
  line: string
  timestamp: number
}

interface RunnerStore {
  isRunning: boolean
  logs: RunnerLog[]
  currentTask: string | null
  start: () => Promise<void>
  stop: () => Promise<void>
  clearLogs: () => void
}

export const useRunnerStore = create<RunnerStore>((set) => {
  // Initialize event listener immediately at store creation
  window.api.on('runner:event', (event: unknown) => {
    const e = event as { type: string; taskName?: string; line?: string; error?: string }
    switch (e.type) {
      case 'task-start':
        set({ currentTask: e.taskName ?? null })
        set(state => ({
          logs: [...state.logs, {
            taskName: e.taskName ?? '',
            line: `>>> 开始执行任务: ${e.taskName}`,
            timestamp: Date.now()
          }]
        }))
        break
      case 'task-log':
        set(state => ({
          logs: [...state.logs, {
            taskName: e.taskName ?? '',
            line: e.line ?? '',
            timestamp: Date.now()
          }]
        }))
        break
      case 'task-done':
        set(state => ({
          logs: [...state.logs, {
            taskName: e.taskName ?? '',
            line: `>>> 任务完成: ${e.taskName}`,
            timestamp: Date.now()
          }]
        }))
        break
      case 'task-failed':
        set(state => ({
          logs: [...state.logs, {
            taskName: e.taskName ?? '',
            line: `>>> 任务失败: ${e.taskName}\n错误: ${e.error ?? '未知错误'}`,
            timestamp: Date.now()
          }]
        }))
        message.error(`任务失败: ${e.taskName} - ${e.error ?? '未知错误'}`)
        break
      case 'all-done':
        set({ isRunning: false, currentTask: null })
        set(state => ({
          logs: [...state.logs, {
            taskName: 'runner',
            line: '>>> 所有任务执行完毕',
            timestamp: Date.now()
          }]
        }))
        break
    }
  })

  return {
    isRunning: false,
    logs: [],
    currentTask: null,

    start: async () => {
      set({ isRunning: true, logs: [] })
      try {
        await window.api.runner.start()
      } catch (err) {
        const error = err instanceof Error ? err.message : String(err)
        set({
          isRunning: false,
          logs: [{
            taskName: 'runner',
            line: `>>> 启动失败: ${error}`,
            timestamp: Date.now()
          }]
        })
        message.error(`执行启动失败: ${error}`)
      }
    },

    stop: async () => {
      await window.api.runner.stop()
      set({ isRunning: false })
    },

    clearLogs: () => set({ logs: [] })
  }
})
