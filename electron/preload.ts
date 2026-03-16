import { contextBridge } from 'electron'

contextBridge.exposeInMainWorld('api', {
  // Will be populated in later tasks
})
