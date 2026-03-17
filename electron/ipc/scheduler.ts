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
