import { create } from 'zustand'

interface Project {
  id: string
  name: string
  projectRoot: string
  automationDir: string
}

interface ProjectStore {
  projects: Project[]
  activeProject: Project | null
  loading: boolean
  fetchProjects: () => Promise<void>
  fetchActiveProject: () => Promise<void>
  addProject: () => Promise<void>
  removeProject: (id: string) => Promise<void>
  setActive: (id: string) => Promise<void>
}

export const useProjectStore = create<ProjectStore>((set) => ({
  projects: [],
  activeProject: null,
  loading: false,

  fetchProjects: async () => {
    set({ loading: true })
    const projects = await window.api.projects.list() as Project[]
    set({ projects, loading: false })
  },

  fetchActiveProject: async () => {
    const activeProject = await window.api.projects.getActive() as Project | null
    set({ activeProject })
  },

  addProject: async () => {
    const dir = await window.api.projects.selectDir()
    if (!dir) return
    await window.api.projects.add(dir)
    const projects = await window.api.projects.list() as Project[]
    const activeProject = await window.api.projects.getActive() as Project | null
    set({ projects, activeProject })
  },

  removeProject: async (id: string) => {
    await window.api.projects.remove(id)
    const projects = await window.api.projects.list() as Project[]
    const activeProject = await window.api.projects.getActive() as Project | null
    set({ projects, activeProject })
  },

  setActive: async (id: string) => {
    await window.api.projects.setActive(id)
    const activeProject = await window.api.projects.getActive() as Project | null
    set({ activeProject })
  }
}))
