import { create } from 'zustand'

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
  initEventListener: () => () => void
}

export const useRunnerStore = create<RunnerStore>((set) => ({
  isRunning: false,
  logs: [],
  currentTask: null,

  start: async () => {
    set({ isRunning: true, logs: [] })
    await window.api.runner.start()
  },

  stop: async () => {
    await window.api.runner.stop()
    set({ isRunning: false })
  },

  clearLogs: () => set({ logs: [] }),

  initEventListener: () => {
    const unsubscribe = window.api.on('runner:event', (event: unknown) => {
      const e = event as { type: string; taskName?: string; line?: string; error?: string }
      switch (e.type) {
        case 'task-start':
          set({ currentTask: e.taskName ?? null })
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
        case 'task-failed':
          break
        case 'all-done':
          set({ isRunning: false, currentTask: null })
          break
      }
    })
    return unsubscribe
  }
}))
