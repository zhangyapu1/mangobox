import fetch from 'electron-fetch'
import { TvBoxSource, Site, Live, Parse, VodItem, VideoInfo, LiveChannel } from './types'
import { CmsClient } from './CmsClient'
import { SpiderRouter } from './SpiderRouter'
import { GitHubProxy } from './GitHubProxy'

export class SourceManager {
  private currentSource: TvBoxSource | null = null
  private cmsClients: Map<string, CmsClient> = new Map()
  private spiderRouter: SpiderRouter
  private githubProxy: GitHubProxy
  private activeSite: Site | null = null

  constructor() {
    this.spiderRouter = new SpiderRouter()
    this.githubProxy = new GitHubProxy()
  }

  async loadSource(url: string): Promise<TvBoxSource> {
    try {
      // Use GitHub proxy if needed
      const fetchUrl = await this.githubProxy.proxyUrl(url)

      const response = await fetch(fetchUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      })
      const data = await response.json() as TvBoxSource

      // Validate source structure
      if (!data.sites || !Array.isArray(data.sites)) {
        throw new Error('Invalid source: missing sites array')
      }

      this.currentSource = data

      // Initialize CMS clients for Type 0/1 sites
      this.cmsClients.clear()
      data.sites.forEach(site => {
        if (site.type === 0 || site.type === 1) {
          this.cmsClients.set(site.key, new CmsClient(site))
        }
      })

      // Set first site as active if none selected
      if (!this.activeSite && data.sites.length > 0) {
        this.activeSite = data.sites[0]
      }

      return data
    } catch (error) {
      console.error('Failed to load source:', error)
      throw error
    }
  }

  getSource(): TvBoxSource | null {
    return this.currentSource
  }

  getSites(): Site[] {
    return this.currentSource?.sites || []
  }

  getLives(): Live[] {
    return this.currentSource?.lives || []
  }

  getParses(): Parse[] {
    return this.currentSource?.parses || []
  }

  getFlags(): string[] {
    return this.currentSource?.flags || []
  }

  setActiveSite(siteKey: string): void {
    const site = this.currentSource?.sites.find(s => s.key === siteKey)
    if (site) {
      this.activeSite = site
    }
  }

  getActiveSite(): Site | null {
    return this.activeSite
  }

  async getHomeContent(siteKey?: string): Promise<{ categories: any[]; list: VodItem[] }> {
    const site = siteKey
      ? this.currentSource?.sites.find(s => s.key === siteKey)
      : this.activeSite

    if (!site) {
      return { categories: [], list: [] }
    }

    if (site.type === 0 || site.type === 1) {
      const client = this.cmsClients.get(site.key)
      if (client) {
        return await client.getHomeContent()
      }
    }

    // Type 3 (Spider) - use SpiderRouter
    if (site.type === 3) {
      return await this.spiderRouter.getHomeContent(site)
    }

    return { categories: [], list: [] }
  }

  async getCategoryList(siteKey: string, categoryId: string, page: number = 1): Promise<{ list: VodItem[]; page: number; pageCount: number }> {
    const site = this.currentSource?.sites.find(s => s.key === siteKey)
    if (!site) {
      return { list: [], page: 1, pageCount: 1 }
    }

    if (site.type === 0 || site.type === 1) {
      const client = this.cmsClients.get(site.key)
      if (client) {
        return await client.getCategoryList(categoryId, page)
      }
    }

    if (site.type === 3) {
      return await this.spiderRouter.getCategoryList(site, categoryId, page)
    }

    return { list: [], page: 1, pageCount: 1 }
  }

  async getDetail(siteKey: string, vodId: string): Promise<VideoInfo | null> {
    const site = this.currentSource?.sites.find(s => s.key === siteKey)
    if (!site) {
      return null
    }

    if (site.type === 0 || site.type === 1) {
      const client = this.cmsClients.get(site.key)
      if (client) {
        return await client.getDetail(vodId)
      }
    }

    if (site.type === 3) {
      return await this.spiderRouter.getDetail(site, vodId)
    }

    return null
  }

  async search(siteKey: string, keyword: string, page: number = 1): Promise<{ list: VodItem[]; page: number; pageCount: number }> {
    const site = this.currentSource?.sites.find(s => s.key === siteKey)
    if (!site) {
      return { list: [], page: 1, pageCount: 1 }
    }

    if (site.type === 0 || site.type === 1) {
      const client = this.cmsClients.get(site.key)
      if (client) {
        return await client.search(keyword, page)
      }
    }

    if (site.type === 3) {
      return await this.spiderRouter.search(site, keyword, page)
    }

    return { list: [], page: 1, pageCount: 1 }
  }

  async getPlayerContent(siteKey: string, flag: string, id: string, vipFlags: string[]): Promise<any> {
    const site = this.currentSource?.sites.find(s => s.key === siteKey)
    if (!site) {
      return null
    }

    if (site.type === 3) {
      return await this.spiderRouter.getPlayerContent(site, flag, id, vipFlags)
    }

    return null
  }

  async parseLiveChannels(live: Live): Promise<LiveChannel[]> {
    try {
      // Use GitHub proxy if needed
      const url = await this.githubProxy.proxyUrl(live.url)

      const response = await fetch(url, {
        headers: {
          'User-Agent': live.ua || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      })
      const text = await response.text()

      // Parse M3U/M3U8 format
      if (live.url.endsWith('.m3u') || live.url.endsWith('.m3u8') || text.includes('#EXTINF')) {
        return this.parseM3U(text)
      }

      // Parse TXT format
      return this.parseTxt(text)
    } catch (error) {
      console.error('Failed to parse live channels:', error)
      return []
    }
  }

  private parseM3U(text: string): LiveChannel[] {
    const channels: LiveChannel[] = []
    const lines = text.split('\n')

    let currentChannel: Partial<LiveChannel> = {}

    for (const line of lines) {
      const trimmed = line.trim()

      if (trimmed.startsWith('#EXTINF:')) {
        // Parse channel info
        const nameMatch = trimmed.match(/,(.+)$/)
        const groupMatch = trimmed.match(/group-title="([^"]+)"/)
        const logoMatch = trimmed.match(/tvg-logo="([^"]+)"/)

        currentChannel = {
          name: nameMatch ? nameMatch[1] : 'Unknown',
          group: groupMatch ? groupMatch[1] : 'Default',
          logo: logoMatch ? logoMatch[1] : undefined
        }
      } else if (trimmed && !trimmed.startsWith('#') && currentChannel.name) {
        // This is the URL
        channels.push({
          ...currentChannel,
          url: trimmed
        } as LiveChannel)
        currentChannel = {}
      }
    }

    return channels
  }

  private parseTxt(text: string): LiveChannel[] {
    const channels: LiveChannel[] = []
    const lines = text.split('\n')

    let currentGroup = 'Default'

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed) continue

      // Check if this is a group header (ends with ,#genre#)
      if (trimmed.endsWith(',#genre#')) {
        currentGroup = trimmed.replace(',#genre#', '').trim()
        continue
      }

      // Parse channel line: "name,url"
      const parts = trimmed.split(',')
      if (parts.length >= 2) {
        channels.push({
          group: currentGroup,
          name: parts[0].trim(),
          url: parts[1].trim()
        })
      }
    }

    return channels
  }

  getGitHubProxy(): GitHubProxy {
    return this.githubProxy
  }
}
