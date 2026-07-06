import { ipcMain, BrowserWindow } from 'electron'
import { join } from 'path'
import { readFileSync, existsSync } from 'fs'
import { app } from 'electron'
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
import { MpvController } from './player/MpvController'
import { ParseManager } from './player/ParseManager'
import { AdBlocker } from './source/AdBlocker'
import { DnsOverHttps } from './network/DnsOverHttps'
import { DlnaManager } from './cast/DlnaManager'
import { KeyboardManager } from './input/KeyboardManager'

let sourceManager: SourceManager | null = null
let mpvController: MpvController | null = null
let parseManager: ParseManager | null = null
let adBlocker: AdBlocker | null = null
let dnsOverHttps: DnsOverHttps | null = null
let dlnaManager: DlnaManager | null = null
let keyboardManager: KeyboardManager | null = null

export function setupIPC(window: BrowserWindow): void {
  sourceManager = new SourceManager()
  parseManager = new ParseManager(window)
  adBlocker = new AdBlocker()
  dnsOverHttps = new DnsOverHttps()
  dlnaManager = new DlnaManager()
  keyboardManager = new KeyboardManager(window)

  // Enable ad blocker
  adBlocker.applyRules()

  // Register keyboard shortcuts
  keyboardManager.registerShortcuts()

  // Favorites
  ipcMain.handle('add-favorite', async (_, siteKey: string, vodId: string, vodName: string, vodPic?: string, vodRemarks?: string) => {
    await addFavorite(siteKey, vodId, vodName, vodPic, vodRemarks)
  })

  ipcMain.handle('remove-favorite', async (_, siteKey: string, vodId: string) => {
    await removeFavorite(siteKey, vodId)
  })

  ipcMain.handle('get-favorites', () => {
    return getFavorites()
  })

  ipcMain.handle('is-favorite', (_, siteKey: string, vodId: string) => {
    return isFavorite(siteKey, vodId)
  })

  // History
  ipcMain.handle('add-history', async (_, siteKey: string, vodId: string, vodName: string, vodPic?: string, episodeName?: string, episodeUrl?: string) => {
    await addHistory(siteKey, vodId, vodName, vodPic, episodeName, episodeUrl)
  })

  ipcMain.handle('get-history', () => {
    return getHistory()
  })

  ipcMain.handle('update-play-progress', async (_, siteKey: string, vodId: string, position: number, duration: number) => {
    await updatePlayProgress(siteKey, vodId, position, duration)
  })

  ipcMain.handle('get-play-progress', (_, siteKey: string, vodId: string) => {
    return getPlayProgress(siteKey, vodId)
  })

  // Sources
  ipcMain.handle('add-source', async (_, name: string, url: string) => {
    await addSource(name, url)
  })

  ipcMain.handle('remove-source', async (_, url: string) => {
    await removeSource(url)
  })

  ipcMain.handle('get-sources', () => {
    return getSources()
  })

  ipcMain.handle('set-active-source', async (_, url: string) => {
    await setActiveSource(url)
  })

  ipcMain.handle('get-active-source', () => {
    return getActiveSource()
  })

  // Settings
  ipcMain.handle('get-setting', (_, key: string) => {
    return getSetting(key)
  })

  ipcMain.handle('set-setting', async (_, key: string, value: string) => {
    await setSetting(key, value)
  })

  // Source Manager
  ipcMain.handle('load-source', async (_, url: string) => {
    try {
      const source = await sourceManager!.loadSource(url)

      // Update parse manager with new parses and flags
      if (parseManager) {
        parseManager.setParses(source.parses || [])
        parseManager.setFlags(source.flags || [])
      }

      // Update ad blocker with source ads
      if (adBlocker && source.ads) {
        adBlocker.setBlockedDomains(source.ads)
      }

      // Update DNS settings
      if (dnsOverHttps && source.doh && source.doh.length > 0) {
        dnsOverHttps.setServer(source.doh[0].name)
      }

      return { success: true, source }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  // Load built-in source
  ipcMain.handle('load-builtin-source', async () => {
    try {
      const sourcePath = join(app.getAppPath(), 'resources', 'sources', 'default.json')
      console.log('Loading built-in source from:', sourcePath)
      console.log('File exists:', existsSync(sourcePath))

      if (!existsSync(sourcePath)) {
        console.error('Built-in source file not found at:', sourcePath)
        return { success: false, error: 'Built-in source not found' }
      }

      const content = readFileSync(sourcePath, 'utf-8')
      const sourceData = JSON.parse(content)
      console.log('Source loaded, sites count:', sourceData.sites?.length)

      // Load the source data directly
      const source = await sourceManager!.loadSourceData(sourceData)
      console.log('Source initialized, active site:', sourceManager!.getActiveSite()?.name)

      // Update parse manager
      if (parseManager) {
        parseManager.setParses(source.parses || [])
        parseManager.setFlags(source.flags || [])
      }

      // Update ad blocker
      if (adBlocker && source.ads) {
        adBlocker.setBlockedDomains(source.ads)
      }

      // Update DNS settings
      if (dnsOverHttps && source.doh && source.doh.length > 0) {
        dnsOverHttps.setServer(source.doh[0].name)
      }

      return { success: true, source }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('get-source', () => {
    return sourceManager!.getSource()
  })

  ipcMain.handle('get-sites', () => {
    return sourceManager!.getSites()
  })

  ipcMain.handle('set-active-site', (_, siteKey: string) => {
    sourceManager!.setActiveSite(siteKey)
  })

  ipcMain.handle('get-active-site', () => {
    const site = sourceManager!.getActiveSite()
    console.log('Getting active site:', site)
    return site
  })

  ipcMain.handle('get-home-content', async (_, siteKey?: string) => {
    const result = await sourceManager!.getHomeContent(siteKey)
    console.log('Home content result:', { categories: result.categories?.length, list: result.list?.length })
    return result
  })

  ipcMain.handle('get-category-list', async (_, siteKey: string, categoryId: string, page: number) => {
    return await sourceManager!.getCategoryList(siteKey, categoryId, page)
  })

  ipcMain.handle('get-detail', async (_, siteKey: string, vodId: string) => {
    return await sourceManager!.getDetail(siteKey, vodId)
  })

  ipcMain.handle('search', async (_, siteKey: string, keyword: string, page: number) => {
    return await sourceManager!.search(siteKey, keyword, page)
  })

  ipcMain.handle('get-lives', () => {
    return sourceManager!.getLives()
  })

  ipcMain.handle('parse-live-channels', async (_, liveIndex: number) => {
    const lives = sourceManager!.getLives()
    if (liveIndex >= 0 && liveIndex < lives.length) {
      return await sourceManager!.parseLiveChannels(lives[liveIndex])
    }
    return []
  })

  // Player
  ipcMain.handle('init-player', async () => {
    try {
      if (!mpvController) {
        mpvController = new MpvController(window)
        await mpvController.init()
      }
      return { success: true }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('play-video', async (_, url: string) => {
    try {
      // Auto-initialize player if not already done
      if (!mpvController) {
        console.log('Auto-initializing mpv player...')
        mpvController = new MpvController(window)
        await mpvController.init()
      }

      // Parse URL if needed
      let finalUrl = url
      if (parseManager && parseManager.needsParsing(url)) {
        console.log('Parsing URL:', url)
        finalUrl = await parseManager.parseUrl(url)
        console.log('Parsed URL:', finalUrl)
      }

      console.log('Playing video:', finalUrl)
      await mpvController.play(finalUrl)
      return { success: true }
    } catch (error: any) {
      console.error('Play video failed:', error)
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('pause-video', async () => {
    if (!mpvController) return
    await mpvController.pause()
  })

  ipcMain.handle('resume-video', async () => {
    if (!mpvController) return
    await mpvController.resume()
  })

  ipcMain.handle('toggle-pause', async () => {
    if (!mpvController) return
    await mpvController.togglePause()
  })

  ipcMain.handle('seek-video', async (_, seconds: number) => {
    if (!mpvController) return
    await mpvController.seek(seconds)
  })

  ipcMain.handle('seek-relative', async (_, seconds: number) => {
    if (!mpvController) return
    await mpvController.seekRelative(seconds)
  })

  ipcMain.handle('set-volume', async (_, volume: number) => {
    if (!mpvController) return
    await mpvController.setVolume(volume)
  })

  ipcMain.handle('stop-video', async () => {
    if (!mpvController) return
    await mpvController.stop()
  })

  ipcMain.handle('toggle-fullscreen', async () => {
    if (!mpvController) return
    await mpvController.toggleFullscreen()
  })

  ipcMain.handle('get-player-state', () => {
    if (!mpvController) return null
    return {
      isPlaying: mpvController.getIsPlaying(),
      currentTime: mpvController.getCurrentTime(),
      duration: mpvController.getDuration(),
      volume: mpvController.getVolume()
    }
  })

  ipcMain.handle('get-parses', () => {
    return parseManager?.getParseNames() || []
  })

  // Ad Blocker
  ipcMain.handle('toggle-ad-blocker', () => {
    if (!adBlocker) return false
    return adBlocker.toggle()
  })

  ipcMain.handle('is-ad-blocker-enabled', () => {
    if (!adBlocker) return false
    return adBlocker.isAdEnabled()
  })

  ipcMain.handle('get-ad-blocker-stats', () => {
    if (!adBlocker) return null
    return adBlocker.getStats()
  })

  ipcMain.handle('set-blocked-domains', (_, domains: string[]) => {
    if (!adBlocker) return
    adBlocker.setBlockedDomains(domains)
  })

  // DNS-over-HTTPS
  ipcMain.handle('set-doh-server', (_, serverName: string) => {
    if (!dnsOverHttps) return
    dnsOverHttps.setServer(serverName)
  })

  ipcMain.handle('get-doh-servers', () => {
    if (!dnsOverHttps) return []
    return dnsOverHttps.getServers()
  })

  ipcMain.handle('get-doh-stats', () => {
    if (!dnsOverHttps) return null
    return dnsOverHttps.getStats()
  })

  ipcMain.handle('resolve-dns', async (_, hostname: string) => {
    if (!dnsOverHttps) return null
    return await dnsOverHttps.resolve(hostname)
  })

  // DLNA
  ipcMain.handle('start-dlna-scan', async () => {
    if (!dlnaManager) return []
    await dlnaManager.startScan()
    return dlnaManager.getDevices()
  })

  ipcMain.handle('get-dlna-devices', () => {
    if (!dlnaManager) return []
    return dlnaManager.getDevices()
  })

  ipcMain.handle('cast-to-device', async (_, deviceIndex: number, url: string, title: string) => {
    if (!dlnaManager) return { success: false, error: 'DLNA not initialized' }

    const devices = dlnaManager.getDevices()
    if (deviceIndex < 0 || deviceIndex >= devices.length) {
      return { success: false, error: 'Invalid device index' }
    }

    try {
      await dlnaManager.cast(devices[deviceIndex], url, title)
      return { success: true }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('stop-casting', async () => {
    if (!dlnaManager) return
    await dlnaManager.stop()
  })

  ipcMain.handle('is-casting', () => {
    if (!dlnaManager) return false
    return dlnaManager.isCasting()
  })

  ipcMain.handle('get-cast-session', () => {
    if (!dlnaManager) return null
    return dlnaManager.getCurrentSession()
  })

  // Keyboard shortcuts
  ipcMain.handle('get-keyboard-bindings', () => {
    if (!keyboardManager) return []
    return keyboardManager.getBindings()
  })

  ipcMain.handle('toggle-keyboard-shortcuts', () => {
    if (!keyboardManager) return false
    return keyboardManager.toggle()
  })

  ipcMain.handle('is-keyboard-enabled', () => {
    if (!keyboardManager) return false
    return keyboardManager.isEnabledState()
  })

  // Cleanup
  ipcMain.handle('cleanup', () => {
    if (mpvController) {
      mpvController.destroy()
      mpvController = null
    }
    if (parseManager) {
      parseManager.destroy()
      parseManager = null
    }
    if (adBlocker) {
      adBlocker.disable()
      adBlocker = null
    }
    if (dlnaManager) {
      dlnaManager.stopScan()
      dlnaManager = null
    }
    if (keyboardManager) {
      keyboardManager.destroy()
      keyboardManager = null
    }
  })
}
