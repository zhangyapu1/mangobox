import fetch from 'electron-fetch'
import { GitHubProxy } from '../source/GitHubProxy'

interface EpgProgram {
  start: string
  end: string
  title: string
  desc?: string
}

interface EpgChannel {
  id: string
  name: string
  programs: EpgProgram[]
}

export class EpgManager {
  private githubProxy: GitHubProxy
  private epgCache: Map<string, EpgChannel[]> = new Map()
  private epgUrl: string = ''

  constructor(githubProxy: GitHubProxy) {
    this.githubProxy = githubProxy
  }

  setEpgUrl(url: string): void {
    this.epgUrl = url
    this.epgCache.clear()
  }

  async loadEpg(): Promise<void> {
    if (!this.epgUrl) {
      console.warn('No EPG URL configured')
      return
    }

    try {
      const url = await this.githubProxy.proxyUrl(this.epgUrl)
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      })
      const text = await response.text()

      // Parse XMLTV format
      const channels = this.parseXmltv(text)

      // Cache by channel name
      channels.forEach(channel => {
        this.epgCache.set(channel.name, [channel])
      })

      console.log(`Loaded EPG for ${channels.length} channels`)
    } catch (error) {
      console.error('Failed to load EPG:', error)
    }
  }

  private parseXmltv(xml: string): EpgChannel[] {
    const channels: EpgChannel[] = []

    // Simple XML parsing (in production, use a proper XML parser)
    const channelRegex = /<channel id="([^"]*)"[^>]*>[\s\S]*?<display-name[^>]*>([^<]*)<\/display-name>/g
    const programRegex = /<programme start="([^"]*)" stop="([^"]*)" channel="([^"]*)">[\s\S]*?<title[^>]*>([^<]*)<\/title>(?:[\s\S]*?<desc[^>]*>([^<]*)<\/desc>)?/g

    // Extract channels
    let match
    while ((match = channelRegex.exec(xml)) !== null) {
      channels.push({
        id: match[1],
        name: match[2].trim(),
        programs: []
      })
    }

    // Extract programs
    while ((match = programRegex.exec(xml)) !== null) {
      const channelId = match[3]
      const channel = channels.find(c => c.id === channelId)

      if (channel) {
        channel.programs.push({
          start: this.parseXmltvTime(match[1]),
          end: this.parseXmltvTime(match[2]),
          title: match[4].trim(),
          desc: match[5]?.trim()
        })
      }
    }

    return channels
  }

  private parseXmltvTime(timeStr: string): string {
    // Format: YYYYMMDDHHmmss +HHMM
    const match = timeStr.match(/(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/)
    if (match) {
      return `${match[1]}-${match[2]}-${match[3]}T${match[4]}:${match[5]}:${match[6]}`
    }
    return timeStr
  }

  getChannelEpg(channelName: string): EpgProgram[] {
    const now = new Date()

    // Try exact match first
    let epgData = this.epgCache.get(channelName)

    // Try fuzzy match if exact match fails
    if (!epgData) {
      for (const [name, data] of this.epgCache) {
        if (name.includes(channelName) || channelName.includes(name)) {
          epgData = data
          break
        }
      }
    }

    if (!epgData || epgData.length === 0) {
      return []
    }

    // Get programs for this channel
    const channel = epgData[0]
    return channel.programs
      .filter(program => {
        const end = new Date(program.end)
        return end > now
      })
      .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
      .slice(0, 10) // Return next 10 programs
  }

  getCurrentProgram(channelName: string): EpgProgram | null {
    const programs = this.getChannelEpg(channelName)
    const now = new Date()

    return programs.find(program => {
      const start = new Date(program.start)
      const end = new Date(program.end)
      return start <= now && end > now
    }) || null
  }

  getNextProgram(channelName: string): EpgProgram | null {
    const programs = this.getChannelEpg(channelName)
    const now = new Date()

    return programs.find(program => {
      const start = new Date(program.start)
      return start > now
    }) || null
  }

  clearCache(): void {
    this.epgCache.clear()
  }
}
