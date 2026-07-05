import fetch from 'electron-fetch'
import { TvBoxSource, Site, Live, Parse, VodItem, VideoInfo, LiveChannel } from './types'
import { CmsClient } from './CmsClient'

export class SourceManager {
  private currentSource: TvBoxSource | null = null
  private cmsClients: Map<string, CmsClient> = new Map()
  private activeSite: Site | null = null

  async loadSource(url: string): Promise<TvBoxSource> {
    try {
      const response = await fetch(url)
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

    // Type 3 (Spider) - will be handled by SpiderRouter
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

    return { list: [], page: 1, pageCount: 1 }
  }

  async parseLiveChannels(live: Live): Promise<LiveChannel[]> {
    try {
      const response = await fetch(live.url)
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
}
