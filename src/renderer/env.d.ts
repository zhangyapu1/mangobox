/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}

interface ElectronAPI {
  // App
  getAppVersion: () => Promise<string>
  onWindowAction: (callback: (action: string) => void) => () => void

  // Favorites
  addFavorite: (siteKey: string, vodId: string, vodName: string, vodPic?: string, vodRemarks?: string) => Promise<void>
  removeFavorite: (siteKey: string, vodId: string) => Promise<void>
  getFavorites: () => Promise<any[]>
  isFavorite: (siteKey: string, vodId: string) => Promise<boolean>

  // History
  addHistory: (siteKey: string, vodId: string, vodName: string, vodPic?: string, episodeName?: string, episodeUrl?: string) => Promise<void>
  getHistory: () => Promise<any[]>
  updatePlayProgress: (siteKey: string, vodId: string, position: number, duration: number) => Promise<void>
  getPlayProgress: (siteKey: string, vodId: string) => Promise<{ position: number; duration: number } | null>

  // Sources
  addSource: (name: string, url: string) => Promise<void>
  removeSource: (url: string) => Promise<void>
  getSources: () => Promise<any[]>
  setActiveSource: (url: string) => Promise<void>
  getActiveSource: () => Promise<any | null>

  // Settings
  getSetting: (key: string) => Promise<string | null>
  setSetting: (key: string, value: string) => Promise<void>

  // Source Manager
  loadSource: (url: string) => Promise<{ success: boolean; source?: any; error?: string }>
  getSource: () => Promise<any | null>
  getSites: () => Promise<any[]>
  setActiveSite: (siteKey: string) => Promise<void>
  getActiveSite: () => Promise<any | null>
  getHomeContent: (siteKey?: string) => Promise<{ categories: any[]; list: any[] }>
  getCategoryList: (siteKey: string, categoryId: string, page: number) => Promise<{ list: any[]; page: number; pageCount: number }>
  getDetail: (siteKey: string, vodId: string) => Promise<any | null>
  search: (siteKey: string, keyword: string, page: number) => Promise<{ list: any[]; page: number; pageCount: number }>
  getLives: () => Promise<any[]>
  parseLiveChannels: (liveIndex: number) => Promise<any[]>

  // Player
  initPlayer: () => Promise<{ success: boolean; error?: string }>
  playVideo: (url: string) => Promise<{ success: boolean; error?: string }>
  pauseVideo: () => Promise<void>
  resumeVideo: () => Promise<void>
  togglePause: () => Promise<void>
  seekVideo: (seconds: number) => Promise<void>
  seekRelative: (seconds: number) => Promise<void>
  setVolume: (volume: number) => Promise<void>
  stopVideo: () => Promise<void>
  toggleFullscreen: () => Promise<void>
  getPlayerState: () => Promise<{ isPlaying: boolean; currentTime: number; duration: number; volume: number } | null>
  getParses: () => Promise<string[]>

  // Ad Blocker
  toggleAdBlocker: () => Promise<boolean>
  isAdBlockerEnabled: () => Promise<boolean>
  getAdBlockerStats: () => Promise<{ enabled: boolean; blockedDomains: number } | null>
  setBlockedDomains: (domains: string[]) => Promise<void>

  // DNS-over-HTTPS
  setDohServer: (serverName: string) => Promise<void>
  getDohServers: () => Promise<any[]>
  getDohStats: () => Promise<{ server: string; cacheSize: number } | null>
  resolveDns: (hostname: string) => Promise<string | null>

  // DLNA
  startDlnaScan: () => Promise<any[]>
  getDlnaDevices: () => Promise<any[]>
  castToDevice: (deviceIndex: number, url: string, title: string) => Promise<{ success: boolean; error?: string }>
  stopCasting: () => Promise<void>
  isCasting: () => Promise<boolean>
  getCastSession: () => Promise<any | null>

  // Keyboard shortcuts
  getKeyboardBindings: () => Promise<any[]>
  toggleKeyboardShortcuts: () => Promise<boolean>
  isKeyboardEnabled: () => Promise<boolean>
  onKeyboardAction: (callback: (action: string) => void) => () => void

  // Cleanup
  cleanup: () => Promise<void>
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
