import { create } from 'zustand'
import { message } from 'antd'

interface TaskDraft {
  title: string
  background: string
  goals: string[]
  constraints: string[]
  files: string[]
  verification: string[]
}

interface AIGeneratorStore {
  isGenerating: boolean
  progressLogs: string[]
  generatedTasks: TaskDraft[]
  error: string | null
  generate: (prompt: string) => Promise<void>
  stop: () => Promise<void>
  clear: () => void
}

export const useAIGeneratorStore = create<AIGeneratorStore>((set) => {
  // Initialize event listener at store creation
  window.api.on('ai:generate-event', (event: unknown) => {
    const e = event as { type: string; message?: string; tasks?: TaskDraft[]; error?: string }
    switch (e.type) {
      case 'progress':
        set(state => ({
          progressLogs: [...state.progressLogs, e.message ?? '']
        }))
        break
      case 'result':
        set({
          isGenerating: false,
          generatedTasks: e.tasks ?? []
        })
        break
      case 'error':
        set({
          isGenerating: false,
          error: e.error ?? '未知错误'
        })
        message.error(e.error ?? '生成失败')
        break
    }
  })

  return {
    isGenerating: false,
    progressLogs: [],
    generatedTasks: [],
    error: null,

    generate: async (prompt: string) => {
      set({ isGenerating: true, progressLogs: [], generatedTasks: [], error: null })
      try {
        await window.api.ai.generate(prompt)
      } catch (err) {
        const error = err instanceof Error ? err.message : String(err)
        set({ isGenerating: false, error })
        message.error(`生成失败: ${error}`)
      }
    },

    stop: async () => {
      await window.api.ai.stop()
      set({ isGenerating: false })
    },

    clear: () => set({ progressLogs: [], generatedTasks: [], error: null })
  }
})
