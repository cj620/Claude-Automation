import { create } from 'zustand'

interface Task {
  id: string
  name: string
  status: 'pending' | 'running' | 'done' | 'failed'
  content: string
  filePath: string
  createdAt: string
  updatedAt: string
}

interface TaskStore {
  tasks: Task[]
  loading: boolean
  fetchTasks: (status?: string) => Promise<void>
  createTask: (draft: unknown) => Promise<void>
  updateTask: (id: string, content: string) => Promise<void>
  deleteTask: (id: string) => Promise<void>
  retryTask: (id: string) => Promise<void>
}

export const useTaskStore = create<TaskStore>((set) => ({
  tasks: [],
  loading: false,

  fetchTasks: async (status?: string) => {
    set({ loading: true })
    const tasks = await window.api.tasks.list(status) as Task[]
    set({ tasks, loading: false })
  },

  createTask: async (draft) => {
    await window.api.tasks.create(draft)
    const tasks = await window.api.tasks.list() as Task[]
    set({ tasks })
  },

  updateTask: async (id, content) => {
    await window.api.tasks.update(id, content)
    const tasks = await window.api.tasks.list() as Task[]
    set({ tasks })
  },

  deleteTask: async (id) => {
    await window.api.tasks.delete(id)
    const tasks = await window.api.tasks.list() as Task[]
    set({ tasks })
  },

  retryTask: async (id) => {
    await window.api.tasks.retry(id)
    const tasks = await window.api.tasks.list() as Task[]
    set({ tasks })
  }
}))
