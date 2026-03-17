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
