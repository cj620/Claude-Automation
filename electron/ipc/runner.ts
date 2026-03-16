import { ipcMain, BrowserWindow } from 'electron'
import { getActiveProject } from '../core/config'
import { runAllTasks, stopRunner, getRunnerStatus } from '../core/runner'
import type { RunnerEvent } from '../core/types'

export function registerRunnerIpc(getMainWindow: () => BrowserWindow | null): void {
  ipcMain.handle('runner:start', async () => {
    const project = getActiveProject()
    if (!project) throw new Error('没有选择活跃项目')

    const onEvent = (event: RunnerEvent): void => {
      const win = getMainWindow()
      if (win && !win.isDestroyed()) {
        win.webContents.send('runner:event', event)
      }
    }

    // Async - don't block IPC response
    runAllTasks(project, onEvent).catch((err) => {
      const win = getMainWindow()
      if (win && !win.isDestroyed()) {
        win.webContents.send('runner:event', {
          type: 'task-failed',
          taskName: 'runner',
          error: err.message
        })
      }
    })
  })

  ipcMain.handle('runner:stop', () => {
    stopRunner()
  })

  ipcMain.handle('runner:status', () => {
    return getRunnerStatus()
  })
}
