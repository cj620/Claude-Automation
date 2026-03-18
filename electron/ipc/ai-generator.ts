import { ipcMain, BrowserWindow } from 'electron'
import { getActiveProject } from '../core/config'
import { generateTaskDrafts, stopAIGenerator } from '../core/ai-generator'
import type { AIGenerateEvent } from '../core/types'

export function registerAIGeneratorIpc(getMainWindow: () => BrowserWindow | null): void {
  ipcMain.handle('ai:generate', async (_event, prompt: string) => {
    const project = getActiveProject()
    if (!project) throw new Error('没有选择活跃项目')

    const onEvent = (event: AIGenerateEvent): void => {
      const win = getMainWindow()
      if (win && !win.isDestroyed()) {
        win.webContents.send('ai:generate-event', event)
      }
    }

    // Async - don't block IPC response
    generateTaskDrafts(project, prompt, onEvent).catch((err) => {
      const win = getMainWindow()
      if (win && !win.isDestroyed()) {
        win.webContents.send('ai:generate-event', {
          type: 'error',
          error: err.message
        })
      }
    })
  })

  ipcMain.handle('ai:stop', () => {
    stopAIGenerator()
  })
}
