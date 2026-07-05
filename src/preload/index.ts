import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  // App
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  onWindowAction: (callback: (action: string) => void) => {
    ipcRenderer.on('window-action', (_, action) => callback(action))
  },

  // Favorites
  addFavorite: (siteKey: string, vodId: string, vodName: string, vodPic?: string, vodRemarks?: string) =>
    ipcRenderer.invoke('add-favorite', siteKey, vodId, vodName, vodPic, vodRemarks),
  removeFavorite: (siteKey: string, vodId: string) =>
    ipcRenderer.invoke('remove-favorite', siteKey, vodId),
  getFavorites: () => ipcRenderer.invoke('get-favorites'),
  isFavorite: (siteKey: string, vodId: string) =>
    ipcRenderer.invoke('is-favorite', siteKey, vodId),

  // History
  addHistory: (siteKey: string, vodId: string, vodName: string, vodPic?: string, episodeName?: string, episodeUrl?: string) =>
    ipcRenderer.invoke('add-history', siteKey, vodId, vodName, vodPic, episodeName, episodeUrl),
  getHistory: () => ipcRenderer.invoke('get-history'),
  updatePlayProgress: (siteKey: string, vodId: string, position: number, duration: number) =>
    ipcRenderer.invoke('update-play-progress', siteKey, vodId, position, duration),
  getPlayProgress: (siteKey: string, vodId: string) =>
    ipcRenderer.invoke('get-play-progress', siteKey, vodId),

  // Sources
  addSource: (name: string, url: string) =>
    ipcRenderer.invoke('add-source', name, url),
  removeSource: (url: string) =>
    ipcRenderer.invoke('remove-source', url),
  getSources: () => ipcRenderer.invoke('get-sources'),
  setActiveSource: (url: string) =>
    ipcRenderer.invoke('set-active-source', url),
  getActiveSource: () => ipcRenderer.invoke('get-active-source'),

  // Settings
  getSetting: (key: string) => ipcRenderer.invoke('get-setting', key),
  setSetting: (key: string, value: string) =>
    ipcRenderer.invoke('set-setting', key, value),

  // Source Manager
  loadSource: (url: string) => ipcRenderer.invoke('load-source', url),
  getSource: () => ipcRenderer.invoke('get-source'),
  getSites: () => ipcRenderer.invoke('get-sites'),
  setActiveSite: (siteKey: string) => ipcRenderer.invoke('set-active-site', siteKey),
  getActiveSite: () => ipcRenderer.invoke('get-active-site'),
  getHomeContent: (siteKey?: string) => ipcRenderer.invoke('get-home-content', siteKey),
  getCategoryList: (siteKey: string, categoryId: string, page: number) =>
    ipcRenderer.invoke('get-category-list', siteKey, categoryId, page),
  getDetail: (siteKey: string, vodId: string) =>
    ipcRenderer.invoke('get-detail', siteKey, vodId),
  search: (siteKey: string, keyword: string, page: number) =>
    ipcRenderer.invoke('search', siteKey, keyword, page),
  getLives: () => ipcRenderer.invoke('get-lives'),
  parseLiveChannels: (liveIndex: number) =>
    ipcRenderer.invoke('parse-live-channels', liveIndex),

  // Player
  initPlayer: () => ipcRenderer.invoke('init-player'),
  playVideo: (url: string) => ipcRenderer.invoke('play-video', url),
  pauseVideo: () => ipcRenderer.invoke('pause-video'),
  resumeVideo: () => ipcRenderer.invoke('resume-video'),
  togglePause: () => ipcRenderer.invoke('toggle-pause'),
  seekVideo: (seconds: number) => ipcRenderer.invoke('seek-video', seconds),
  seekRelative: (seconds: number) => ipcRenderer.invoke('seek-relative', seconds),
  setVolume: (volume: number) => ipcRenderer.invoke('set-volume', volume),
  stopVideo: () => ipcRenderer.invoke('stop-video'),
  toggleFullscreen: () => ipcRenderer.invoke('toggle-fullscreen'),
  getPlayerState: () => ipcRenderer.invoke('get-player-state'),
  getParses: () => ipcRenderer.invoke('get-parses')
})
