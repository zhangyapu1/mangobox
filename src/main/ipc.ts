import { ipcMain } from 'electron'
import {
  addFavorite,
  removeFavorite,
  getFavorites,
  isFavorite,
  addHistory,
  getHistory,
  updatePlayProgress,
  getPlayProgress,
  addSource,
  removeSource,
  getSources,
  setActiveSource,
  getActiveSource,
  getSetting,
  setSetting
} from './db/database'

export function setupIPC(): void {
  // Favorites
  ipcMain.handle('add-favorite', (_, siteKey: string, vodId: string, vodName: string, vodPic?: string, vodRemarks?: string) => {
    addFavorite(siteKey, vodId, vodName, vodPic, vodRemarks)
  })

  ipcMain.handle('remove-favorite', (_, siteKey: string, vodId: string) => {
    removeFavorite(siteKey, vodId)
  })

  ipcMain.handle('get-favorites', () => {
    return getFavorites()
  })

  ipcMain.handle('is-favorite', (_, siteKey: string, vodId: string) => {
    return isFavorite(siteKey, vodId)
  })

  // History
  ipcMain.handle('add-history', (_, siteKey: string, vodId: string, vodName: string, vodPic?: string, episodeName?: string, episodeUrl?: string) => {
    addHistory(siteKey, vodId, vodName, vodPic, episodeName, episodeUrl)
  })

  ipcMain.handle('get-history', () => {
    return getHistory()
  })

  ipcMain.handle('update-play-progress', (_, siteKey: string, vodId: string, position: number, duration: number) => {
    updatePlayProgress(siteKey, vodId, position, duration)
  })

  ipcMain.handle('get-play-progress', (_, siteKey: string, vodId: string) => {
    return getPlayProgress(siteKey, vodId)
  })

  // Sources
  ipcMain.handle('add-source', (_, name: string, url: string) => {
    addSource(name, url)
  })

  ipcMain.handle('remove-source', (_, url: string) => {
    removeSource(url)
  })

  ipcMain.handle('get-sources', () => {
    return getSources()
  })

  ipcMain.handle('set-active-source', (_, url: string) => {
    setActiveSource(url)
  })

  ipcMain.handle('get-active-source', () => {
    return getActiveSource()
  })

  // Settings
  ipcMain.handle('get-setting', (_, key: string) => {
    return getSetting(key)
  })

  ipcMain.handle('set-setting', (_, key: string, value: string) => {
    setSetting(key, value)
  })
}
