import { ipcMain } from 'electron'
import { getActiveProject } from '../core/config'
import { listTasks, createTask, updateTask, deleteTask, retryTask, duplicateTask } from '../core/task-manager'
import type { TaskDraft, TaskStatus } from '../core/types'

export function registerTasksIpc(): void {
  function getAutomationDir(): string {
    const project = getActiveProject()
    if (!project) throw new Error('没有选择活跃项目')
    return project.automationDir
  }

  ipcMain.handle('tasks:list', (_event, status?: TaskStatus) => {
    return listTasks(getAutomationDir(), status)
  })

  ipcMain.handle('tasks:create', (_event, draft: TaskDraft) => {
    return createTask(getAutomationDir(), draft)
  })

  ipcMain.handle('tasks:update', (_event, id: string, content: string) => {
    return updateTask(getAutomationDir(), id, content)
  })

  ipcMain.handle('tasks:delete', (_event, id: string) => {
    deleteTask(getAutomationDir(), id)
  })

  ipcMain.handle('tasks:retry', (_event, id: string) => {
    return retryTask(getAutomationDir(), id)
  })

  ipcMain.handle('tasks:duplicate', (_event, id: string) => {
    return duplicateTask(getAutomationDir(), id)
  })
}
