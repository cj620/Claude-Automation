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
    console.log('[scheduler-ipc] add:', name, JSON.stringify(preset))
    const result = addSchedule(name, preset)
    console.log('[scheduler-ipc] add result:', result.id)
    return result
  })

  ipcMain.handle('scheduler:remove', (_e, id: string) => {
    removeSchedule(id)
  })

  ipcMain.handle('scheduler:toggle', (_e, id: string, enabled: boolean) => {
    return toggleSchedule(id, enabled)
  })
}
