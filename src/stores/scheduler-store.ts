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
  projectId: string
  name: string
  preset: SchedulePreset
  enabled: boolean
  createdAt: string
  lastRunAt?: string
  nextRunAt?: string
}

interface SchedulerStore {
  schedules: Schedule[]
  allSchedules: Schedule[]
  loading: boolean
  fetchSchedules: (projectId: string) => Promise<void>
  fetchAllSchedules: () => Promise<void>
  addSchedule: (projectId: string, name: string, preset: SchedulePreset) => Promise<void>
  removeSchedule: (projectId: string, id: string) => Promise<void>
  toggleSchedule: (projectId: string, id: string, enabled: boolean) => Promise<void>
}

export const useSchedulerStore = create<SchedulerStore>((set) => ({
  schedules: [],
  allSchedules: [],
  loading: false,

  fetchSchedules: async (projectId) => {
    set({ loading: true })
    try {
      const schedules = await window.api.scheduler.list(projectId) as Schedule[]
      set({ schedules, loading: false })
    } catch (err) {
      console.error('[scheduler-store] fetchSchedules failed:', err)
      set({ loading: false })
    }
  },

  fetchAllSchedules: async () => {
    try {
      const allSchedules = await window.api.scheduler.listAll() as Schedule[]
      set({ allSchedules })
    } catch (err) {
      console.error('[scheduler-store] fetchAllSchedules failed:', err)
    }
  },

  addSchedule: async (projectId, name, preset) => {
    try {
      await window.api.scheduler.add(projectId, name, preset)
      const schedules = await window.api.scheduler.list(projectId) as Schedule[]
      const allSchedules = await window.api.scheduler.listAll() as Schedule[]
      set({ schedules, allSchedules })
    } catch (err) {
      console.error('[scheduler-store] addSchedule failed:', err)
      throw err
    }
  },

  removeSchedule: async (projectId, id) => {
    try {
      await window.api.scheduler.remove(projectId, id)
      const schedules = await window.api.scheduler.list(projectId) as Schedule[]
      const allSchedules = await window.api.scheduler.listAll() as Schedule[]
      set({ schedules, allSchedules })
    } catch (err) {
      console.error('[scheduler-store] removeSchedule failed:', err)
      throw err
    }
  },

  toggleSchedule: async (projectId, id, enabled) => {
    try {
      await window.api.scheduler.toggle(projectId, id, enabled)
      const schedules = await window.api.scheduler.list(projectId) as Schedule[]
      const allSchedules = await window.api.scheduler.listAll() as Schedule[]
      set({ schedules, allSchedules })
    } catch (err) {
      console.error('[scheduler-store] toggleSchedule failed:', err)
      throw err
    }
  }
}))
