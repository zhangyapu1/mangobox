import { runInNewContext } from 'vm'
import { createHash, createCipheriv, createDecipheriv } from 'crypto'
import fetch from 'electron-fetch'

/**
 * DrpyEngine - Executes drpy2-style JavaScript spiders
 */
export class DrpyEngine {
  private scripts: Map<string, any> = new Map()
  private scriptCache: Map<string, string> = new Map()
  private readonly CALL_TIMEOUT = 30000

  async loadScript(key: string, jsUrl: string): Promise<boolean> {
    try {
      let code: string

      if (this.scriptCache.has(jsUrl)) {
        code = this.scriptCache.get(jsUrl)!
      } else {
        if (jsUrl.startsWith('http')) {
          const response = await fetch(jsUrl, {
            timeout: 15000,
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
          })
          code = await response.text()
        } else {
          console.warn('Local JS files not supported:', jsUrl)
          return false
        }
        this.scriptCache.set(jsUrl, code)
      }

      // Check for ES module syntax
      if (/^\s*import\s/m.test(code) && /\sfrom\s/m.test(code)) {
        console.warn(`Drpy spider ${key} uses ES modules (not supported), skipping`)
        return false
      }

      const context = this.createContext()

      const wrappedCode = `
        (function() {
          var spider = {};
          ${code}
          return spider;
        })()
      `

      const spider = runInNewContext(wrappedCode, context, {
        timeout: 10000,
        displayErrors: true
      })

      if (spider && typeof spider === 'object') {
        this.scripts.set(key, spider)
        return true
      } else {
        console.warn('Drpy script did not return a spider object:', key)
        return false
      }
    } catch (error) {
      console.warn(`Failed to load drpy script ${key}:`, (error as Error).message)
      return false
    }
  }

  private createContext() {
    return {
      fetch: fetch as any,
      log: console.log,

      // HTML parsing helpers using regex (basic implementation)
      pdfa: (html: string, selector: string) => {
        try {
          // Convert simple CSS selectors to regex patterns
          const pattern = this.cssSelectorToRegex(selector)
          const regex = new RegExp(pattern, 'g')
          const matches = html.match(regex) || []
          return matches
        } catch {
          return []
        }
      },

      pdfh: (html: string, selector: string) => {
        try {
          const pattern = this.cssSelectorToRegex(selector)
          const match = html.match(new RegExp(pattern))
          return match ? match[1] || match[0] : ''
        } catch {
          return ''
        }
      },

      pd: (html: string, selector: string, url: string) => {
        try {
          const pattern = this.cssSelectorToRegex(selector)
          const match = html.match(new RegExp(pattern))
          if (!match) return ''
          const href = match[1] || match[0]
          if (href.startsWith('http')) return href
          if (href.startsWith('//')) return 'https:' + href
          if (href.startsWith('/')) {
            const urlObj = new URL(url)
            return urlObj.origin + href
          }
          return url + '/' + href
        } catch {
          return ''
        }
      },

      // Encoding helpers
      base64Encode: (str: string) => Buffer.from(str).toString('base64'),
      base64Decode: (str: string) => Buffer.from(str, 'base64').toString('utf-8'),
      urlEncode: (str: string) => encodeURIComponent(str),
      urlDecode: (str: string) => decodeURIComponent(str),

      // Crypto helpers - fully implemented
      md5: (str: string) => {
        return createHash('md5').update(str).digest('hex')
      },

      aesEncrypt: (data: string, key: string, iv?: string) => {
        try {
          const keyBuffer = Buffer.from(key, 'utf-8').slice(0, 16)
          const ivBuffer = iv ? Buffer.from(iv, 'utf-8').slice(0, 16) : Buffer.alloc(16)
          const cipher = createCipheriv('aes-128-cbc', keyBuffer, ivBuffer)
          let encrypted = cipher.update(data, 'utf-8', 'base64')
          encrypted += cipher.final('base64')
          return encrypted
        } catch (e) {
          console.error('aesEncrypt failed:', e)
          return data
        }
      },

      aesDecrypt: (data: string, key: string, iv?: string) => {
        try {
          const keyBuffer = Buffer.from(key, 'utf-8').slice(0, 16)
          const ivBuffer = iv ? Buffer.from(iv, 'utf-8').slice(0, 16) : Buffer.alloc(16)
          const decipher = createDecipheriv('aes-128-cbc', keyBuffer, ivBuffer)
          let decrypted = decipher.update(data, 'base64', 'utf-8')
          decrypted += decipher.final('utf-8')
          return decrypted
        } catch (e) {
          console.error('aesDecrypt failed:', e)
          return data
        }
      }
    }
  }

  private cssSelectorToRegex(selector: string): string {
    // Basic CSS selector to regex conversion
    // Handles common patterns used in drpy2 scripts
    let pattern = selector
      .replace(/\./g, '\\.')  // Escape dots
      .replace(/#/g, '\\#')   // Escape hashes
      .replace(/\s+/g, '\\s+') // Convert spaces to whitespace patterns
      .replace(/"/g, '["\']')  // Handle quotes
      .replace(/'/g, '["\']')

    // If it looks like an attribute selector, extract the value
    if (selector.includes('[') && selector.includes(']')) {
      pattern = selector.replace(/\[([^\]]+)\]/g, (match, attr) => {
        // Convert [attr="value"] to capture group
        if (attr.includes('=')) {
          const [name, value] = attr.split('=').map((s: string) => s.trim().replace(/"/g, ''))
          return `\\[${name}\\s*=\\s*["']${value}["']\\]`
        }
        return `\\[${attr}\\]`
      })
    }

    return pattern
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

    return Promise.race([
      func(params),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error(`Drpy call timeout: ${method}`)), this.CALL_TIMEOUT)
      )
    ])
  }

  async homeContent(key: string, filter: boolean = true): Promise<any> {
    return await this.call(key, 'homeContent', { filter })
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
