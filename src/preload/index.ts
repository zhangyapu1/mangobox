import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  onWindowAction: (callback: (action: string) => void) => {
    ipcRenderer.on('window-action', (_, action) => callback(action))
  }
})
