import { ipcMain } from 'electron'
import type { SchedulePreset } from '../core/types'
import {
  listSchedulesByProject,
  listAllSchedules,
  addSchedule,
  removeSchedule,
  toggleSchedule
} from '../core/scheduler'

export function registerSchedulerIpc(): void {
  ipcMain.handle('scheduler:list', (_e, projectId: string) => {
    return listSchedulesByProject(projectId)
  })

  ipcMain.handle('scheduler:listAll', () => {
    return listAllSchedules()
  })

  ipcMain.handle('scheduler:add', (_e, projectId: string, name: string, preset: SchedulePreset) => {
    console.log('[scheduler-ipc] add:', projectId, name, JSON.stringify(preset))
    const result = addSchedule(projectId, name, preset)
    console.log('[scheduler-ipc] add result:', result.id)
    return result
  })

  ipcMain.handle('scheduler:remove', (_e, projectId: string, id: string) => {
    removeSchedule(projectId, id)
  })

  ipcMain.handle('scheduler:toggle', (_e, projectId: string, id: string, enabled: boolean) => {
    return toggleSchedule(projectId, id, enabled)
  })
}
