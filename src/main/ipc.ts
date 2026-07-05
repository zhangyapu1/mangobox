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
import { SourceManager } from './source/SourceManager'

const sourceManager = new SourceManager()

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

  // Source Manager
  ipcMain.handle('load-source', async (_, url: string) => {
    try {
      const source = await sourceManager.loadSource(url)
      return { success: true, source }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('get-source', () => {
    return sourceManager.getSource()
  })

  ipcMain.handle('get-sites', () => {
    return sourceManager.getSites()
  })

  ipcMain.handle('set-active-site', (_, siteKey: string) => {
    sourceManager.setActiveSite(siteKey)
  })

  ipcMain.handle('get-active-site', () => {
    return sourceManager.getActiveSite()
  })

  ipcMain.handle('get-home-content', async (_, siteKey?: string) => {
    return await sourceManager.getHomeContent(siteKey)
  })

  ipcMain.handle('get-category-list', async (_, siteKey: string, categoryId: string, page: number) => {
    return await sourceManager.getCategoryList(siteKey, categoryId, page)
  })

  ipcMain.handle('get-detail', async (_, siteKey: string, vodId: string) => {
    return await sourceManager.getDetail(siteKey, vodId)
  })

  ipcMain.handle('search', async (_, siteKey: string, keyword: string, page: number) => {
    return await sourceManager.search(siteKey, keyword, page)
  })

  ipcMain.handle('get-lives', () => {
    return sourceManager.getLives()
  })

  ipcMain.handle('parse-live-channels', async (_, liveIndex: number) => {
    const lives = sourceManager.getLives()
    if (liveIndex >= 0 && liveIndex < lives.length) {
      return await sourceManager.parseLiveChannels(lives[liveIndex])
    }
    return []
  })
}
