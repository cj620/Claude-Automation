import { ipcMain, dialog } from 'electron'
import { existsSync } from 'fs'
import { execSync } from 'child_process'
import { basename } from 'path'
import {
  loadProjectsConfig,
  addProject,
  removeProject,
  setActiveProject,
  getActiveProject
} from '../core/config'

export function registerProjectsIpc(): void {
  ipcMain.handle('projects:list', () => {
    return loadProjectsConfig().projects
  })

  ipcMain.handle('projects:getActive', () => {
    return getActiveProject()
  })

  ipcMain.handle('projects:add', async (_event, projectRoot: string) => {
    if (!existsSync(projectRoot)) {
      throw new Error(`路径不存在: ${projectRoot}`)
    }

    try {
      execSync('git rev-parse --is-inside-work-tree', {
        cwd: projectRoot,
        encoding: 'utf-8'
      })
    } catch {
      throw new Error(`不是 git 仓库: ${projectRoot}`)
    }

    const name = basename(projectRoot)
    return addProject(projectRoot, name)
  })

  ipcMain.handle('projects:remove', (_event, id: string) => {
    removeProject(id)
  })

  ipcMain.handle('projects:setActive', (_event, id: string) => {
    setActiveProject(id)
  })

  ipcMain.handle('projects:selectDir', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory'],
      title: '选择项目根目录'
    })
    if (result.canceled) return null
    return result.filePaths[0]
  })
}
