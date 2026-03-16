import { ipcMain } from 'electron'
import { getActiveProject } from '../core/config'
import { listReports, getReport } from '../core/report'

export function registerReportsIpc(): void {
  function getAutomationDir(): string {
    const project = getActiveProject()
    if (!project) throw new Error('没有选择活跃项目')
    return project.automationDir
  }

  ipcMain.handle('reports:list', () => {
    return listReports(getAutomationDir())
  })

  ipcMain.handle('reports:get', (_event, date: string) => {
    return getReport(getAutomationDir(), date)
  })
}
