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
    try {
      const schedules = await window.api.scheduler.list() as Schedule[]
      set({ schedules, loading: false })
    } catch (err) {
      console.error('[scheduler-store] fetchSchedules failed:', err)
      set({ loading: false })
    }
  },

  addSchedule: async (name, preset) => {
    try {
      await window.api.scheduler.add(name, preset)
      const schedules = await window.api.scheduler.list() as Schedule[]
      set({ schedules })
    } catch (err) {
      console.error('[scheduler-store] addSchedule failed:', err)
      throw err
    }
  },

  removeSchedule: async (id) => {
    try {
      await window.api.scheduler.remove(id)
      const schedules = await window.api.scheduler.list() as Schedule[]
      set({ schedules })
    } catch (err) {
      console.error('[scheduler-store] removeSchedule failed:', err)
      throw err
    }
  },

  toggleSchedule: async (id, enabled) => {
    try {
      await window.api.scheduler.toggle(id, enabled)
      const schedules = await window.api.scheduler.list() as Schedule[]
      set({ schedules })
    } catch (err) {
      console.error('[scheduler-store] toggleSchedule failed:', err)
      throw err
    }
  }
}))
