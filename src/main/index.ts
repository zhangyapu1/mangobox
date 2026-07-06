import { app, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { existsSync } from 'fs'
import { initDatabase } from './db/database'
import { setupIPC } from './ipc'

let mainWindow: BrowserWindow | null = null
let ipcSetup = false

function createWindow() {
  const preloadPath = join(__dirname, '../preload/index.js')

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 768,
    title: 'MangoBox',
    show: true,
    webPreferences: {
      preload: preloadPath,
      nodeIntegration: false,
      contextIsolation: true
    },
    backgroundColor: '#1a1a2e'
  })

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL)
  } else {
    mainWindow.loadFile(join(__dirname, '../dist/index.html'))
  }

  // Setup IPC handlers only once
  if (!ipcSetup && mainWindow) {
    setupIPC(mainWindow)
    ipcSetup = true
  }
}

// Single IPC handler for app version
ipcMain.handle('get-app-version', () => {
  return app.getVersion()
})

app.whenReady().then(async () => {
  // Initialize database
  await initDatabase()

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
