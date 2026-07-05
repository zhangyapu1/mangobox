import { app, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { initDatabase } from './db/database'
import { setupIPC } from './ipc'

let mainWindow: BrowserWindow | null = null

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 768,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      nodeIntegration: false,
      contextIsolation: true
    },
    frame: false,
    titleBarStyle: 'hidden',
    backgroundColor: '#1a1a2e'
  })

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL)
  } else {
    mainWindow.loadFile(join(__dirname, '../dist/index.html'))
  }
}

app.whenReady().then(async () => {
  // Initialize database
  await initDatabase()

  // Setup IPC handlers
  setupIPC()

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

// IPC handlers
ipcMain.handle('get-app-version', () => {
  return app.getVersion()
})
