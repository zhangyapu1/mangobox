import { runInNewContext } from 'vm'
import fetch from 'electron-fetch'

/**
 * DrpyEngine - Executes drpy2-style JavaScript spiders
 *
 * drpy2 is a framework for writing TVBox-compatible video scraping rules.
 * This engine provides the necessary runtime environment for drpy2 scripts.
 */

interface DrpyContext {
  fetch: typeof fetch
  log: (...args: any[]) => void
  pdfa: (html: string, selector: string) => string[]
  pdfh: (html: string, selector: string) => string
  pd: (html: string, selector: string, url: string) => string
  base64Encode: (str: string) => string
  base64Decode: (str: string) => string
  urlEncode: (str: string) => string
  urlDecode: (str: string) => string
  md5: (str: string) => string
  aesEncrypt: (data: string, key: string, iv?: string) => string
  aesDecrypt: (data: string, key: string, iv?: string) => string
  [key: string]: any
}

export class DrpyEngine {
  private scripts: Map<string, any> = new Map()
  private scriptCache: Map<string, string> = new Map()

  async loadScript(key: string, jsUrl: string): Promise<void> {
    try {
      let code: string

      // Check cache first
      if (this.scriptCache.has(jsUrl)) {
        code = this.scriptCache.get(jsUrl)!
      } else {
        if (jsUrl.startsWith('http')) {
          const response = await fetch(jsUrl)
          code = await response.text()
        } else {
          throw new Error('Local JS files not supported yet')
        }
        // Cache the script
        this.scriptCache.set(jsUrl, code)
      }

      // Create drpy2 runtime context
      const context = this.createContext()

      // Wrap the script code to extract the spider object
      const wrappedCode = `
        (function() {
          var spider = {};
          ${code}
          return spider;
        })()
      `

      // Execute in sandbox
      const spider = runInNewContext(wrappedCode, context, {
        timeout: 10000,
        displayErrors: true
      })

      if (spider && typeof spider === 'object') {
        this.scripts.set(key, spider)
      } else {
        throw new Error('Script did not return a spider object')
      }
    } catch (error) {
      console.error('Failed to load drpy script:', error)
      throw error
    }
  }

  private createContext(): DrpyContext {
    return {
      fetch: fetch as any,
      log: console.log,

      // HTML parsing helpers (simplified - in production, use cheerio or similar)
      pdfa: (html: string, selector: string) => {
        // Simple regex-based extraction (placeholder)
        const regex = new RegExp(selector, 'g')
        const matches = html.match(regex) || []
        return matches
      },

      pdfh: (html: string, selector: string) => {
        // Simple regex-based extraction (placeholder)
        const match = html.match(new RegExp(selector))
        return match ? match[1] || match[0] : ''
      },

      pd: (html: string, selector: string, url: string) => {
        // Extract and resolve URL
        const match = html.match(new RegExp(selector))
        if (!match) return ''
        const href = match[1] || match[0]
        if (href.startsWith('http')) return href
        if (href.startsWith('//')) return 'https:' + href
        if (href.startsWith('/')) {
          const urlObj = new URL(url)
          return urlObj.origin + href
        }
        return url + '/' + href
      },

      // Encoding helpers
      base64Encode: (str: string) => Buffer.from(str).toString('base64'),
      base64Decode: (str: string) => Buffer.from(str, 'base64').toString('utf-8'),
      urlEncode: (str: string) => encodeURIComponent(str),
      urlDecode: (str: string) => decodeURIComponent(str),

      // Crypto helpers (simplified)
      md5: (str: string) => {
        // In production, use crypto module
        return str // Placeholder
      },

      aesEncrypt: (data: string, key: string, iv?: string) => {
        // In production, use crypto module
        return data // Placeholder
      },

      aesDecrypt: (data: string, key: string, iv?: string) => {
        // In production, use crypto module
        return data // Placeholder
      }
    }
  }

  async call(key: string, method: string, params: any = {}): Promise<any> {
    const spider = this.scripts.get(key)
    if (!spider) {
      throw new Error(`Script ${key} not loaded`)
    }

    const func = spider[method]
    if (!func || typeof func !== 'function') {
      throw new Error(`Method ${method} not found in script ${key}`)
    }

    return await func(params)
  }

  async homeContent(key: string, filter: boolean = true): Promise<any> {
    return await this.call(key, 'homeContent', { filter })
  }

  async homeVideoContent(key: string): Promise<any> {
    return await this.call(key, 'homeVideoContent')
  }

  async categoryContent(key: string, tid: string, pg: number, filter: boolean = true, extend: any = {}): Promise<any> {
    return await this.call(key, 'categoryContent', { tid, pg: pg.toString(), filter, extend })
  }

  async detailContent(key: string, ids: string[]): Promise<any> {
    return await this.call(key, 'detailContent', { ids })
  }

  async playerContent(key: string, flag: string, id: string, vipFlags: string[] = []): Promise<any> {
    return await this.call(key, 'playerContent', { flag, id, vipFlags })
  }

  async searchContent(key: string, keyword: string, quick: boolean = false, pg: number = 1): Promise<any> {
    return await this.call(key, 'searchContent', { keyword, quick, pg: pg.toString() })
  }

  destroy(key: string): void {
    this.scripts.delete(key)
  }

  destroyAll(): void {
    this.scripts.clear()
    this.scriptCache.clear()
  }
}
