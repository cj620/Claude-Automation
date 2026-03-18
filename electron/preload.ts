import { contextBridge, ipcRenderer } from 'electron'

const api = {
  projects: {
    list: (): Promise<unknown[]> => ipcRenderer.invoke('projects:list'),
    getActive: (): Promise<unknown> => ipcRenderer.invoke('projects:getActive'),
    add: (projectRoot: string): Promise<unknown> => ipcRenderer.invoke('projects:add', projectRoot),
    remove: (id: string): Promise<void> => ipcRenderer.invoke('projects:remove', id),
    setActive: (id: string): Promise<void> => ipcRenderer.invoke('projects:setActive', id),
    selectDir: (): Promise<string | null> => ipcRenderer.invoke('projects:selectDir'),
    updateConfig: (id: string, config: unknown): Promise<unknown> => ipcRenderer.invoke('projects:updateConfig', id, config)
  },
  tasks: {
    list: (status?: string): Promise<unknown[]> => ipcRenderer.invoke('tasks:list', status),
    create: (draft: unknown): Promise<unknown> => ipcRenderer.invoke('tasks:create', draft),
    update: (id: string, content: string): Promise<unknown> => ipcRenderer.invoke('tasks:update', id, content),
    delete: (id: string): Promise<void> => ipcRenderer.invoke('tasks:delete', id),
    retry: (id: string): Promise<unknown> => ipcRenderer.invoke('tasks:retry', id),
    duplicate: (id: string): Promise<unknown> => ipcRenderer.invoke('tasks:duplicate', id)
  },
  runner: {
    start: (): Promise<void> => ipcRenderer.invoke('runner:start'),
    stop: (): Promise<void> => ipcRenderer.invoke('runner:stop'),
    status: (): Promise<{ isRunning: boolean }> => ipcRenderer.invoke('runner:status')
  },
  reports: {
    list: (): Promise<unknown[]> => ipcRenderer.invoke('reports:list'),
    get: (date: string): Promise<unknown> => ipcRenderer.invoke('reports:get', date)
  },
  scheduler: {
    list: (projectId: string): Promise<unknown[]> => ipcRenderer.invoke('scheduler:list', projectId),
    listAll: (): Promise<unknown[]> => ipcRenderer.invoke('scheduler:listAll'),
    add: (projectId: string, name: string, preset: unknown): Promise<unknown> => ipcRenderer.invoke('scheduler:add', projectId, name, preset),
    remove: (projectId: string, id: string): Promise<void> => ipcRenderer.invoke('scheduler:remove', projectId, id),
    toggle: (projectId: string, id: string, enabled: boolean): Promise<unknown> => ipcRenderer.invoke('scheduler:toggle', projectId, id, enabled),
  },
  ai: {
    generate: (prompt: string): Promise<void> => ipcRenderer.invoke('ai:generate', prompt),
    stop: (): Promise<void> => ipcRenderer.invoke('ai:stop'),
  },
  on: (channel: string, callback: (...args: unknown[]) => void): (() => void) => {
    const subscription = (_event: Electron.IpcRendererEvent, ...args: unknown[]): void => callback(...args)
    ipcRenderer.on(channel, subscription)
    return () => ipcRenderer.removeListener(channel, subscription)
  }
}

contextBridge.exposeInMainWorld('api', api)

export type ApiType = typeof api
