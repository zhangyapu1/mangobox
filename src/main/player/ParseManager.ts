import fetch from 'electron-fetch'
import { BrowserWindow } from 'electron'
import { Parse } from '../source/types'
import { WebViewParser } from './WebViewParser'

export class ParseManager {
  private parses: Parse[] = []
  private flags: string[] = []
  private webViewParser: WebViewParser | null = null

  constructor(window?: BrowserWindow) {
    if (window) {
      this.webViewParser = new WebViewParser(window)
    }
  }

  setParses(parses: Parse[]): void {
    this.parses = parses
  }

  setFlags(flags: string[]): void {
    this.flags = flags
  }

  needsParsing(url: string): boolean {
    return this.flags.some(flag => url.includes(flag))
  }

  async parseUrl(url: string, parseIndex?: number): Promise<string> {
    // If no parsing needed, return direct URL
    if (!this.needsParsing(url)) {
      return url
    }

    // Try specified parse or first available
    const parse = parseIndex !== undefined ? this.parses[parseIndex] : this.parses[0]

    if (!parse) {
      console.warn('No parse service available')
      return url
    }

    try {
      switch (parse.type) {
        case 0: // Web parse (needs WebView)
          return await this.webParse(parse, url)
        case 1: // JSON API parse
          return await this.jsonParse(parse, url)
        case 4: // Super parse (race multiple)
          return await this.superParse(url)
        default:
          console.warn('Unsupported parse type:', parse.type)
          return url
      }
    } catch (error) {
      console.error('Parse failed:', error)
      return url
    }
  }

  private async webParse(parse: Parse, url: string): Promise<string> {
    // Use WebView parser if available
    if (this.webViewParser) {
      try {
        return await this.webViewParser.parseUrl(parse.url, url)
      } catch (error) {
        console.error('WebView parse failed, falling back to regex:', error)
      }
    }

    // Fallback: Try to extract from HTML
    const parseUrl = `${parse.url}${encodeURIComponent(url)}`

    try {
      const response = await fetch(parseUrl, {
        headers: parse.ext?.header || {}
      })
      const html = await response.text()

      // Extract video URL from HTML
      const urlMatch = html.match(/(?:url|src|file)\s*[:=]\s*["']([^"']+\.(?:m3u8|mp4|flv)[^"']*)["']/i)

      if (urlMatch) {
        return urlMatch[1]
      }

      // Try to find any URL that looks like a video
      const videoUrlMatch = html.match(/https?:\/\/[^\s"']+\.(?:m3u8|mp4|flv)[^\s"']*/i)
      if (videoUrlMatch) {
        return videoUrlMatch[0]
      }

      return url
    } catch (error) {
      console.error('Web parse failed:', error)
      return url
    }
  }

  private async jsonParse(parse: Parse, url: string): Promise<string> {
    const parseUrl = `${parse.url}${encodeURIComponent(url)}`

    try {
      const response = await fetch(parseUrl, {
        headers: parse.ext?.header || {}
      })
      const data = await response.json() as any

      // JSON parse returns { url: "..." }
      if (data.url) {
        return data.url
      }

      // Some parsers return { data: { url: "..." } }
      if (data.data?.url) {
        return data.data.url
      }

      return url
    } catch (error) {
      console.error('JSON parse failed:', error)
      return url
    }
  }

  private async superParse(url: string): Promise<string> {
    // Race multiple parse services
    const promises = this.parses
      .filter(p => p.type === 1) // Only use JSON API parses for race
      .map(p => this.jsonParse(p, url).catch(() => null))

    const result = await Promise.race(promises)
    return result || url
  }

  // Helper to get parse names for UI
  getParseNames(): string[] {
    return this.parses.map(p => p.name)
  }

  destroy(): void {
    if (this.webViewParser) {
      this.webViewParser.destroy()
    }
  }
}
