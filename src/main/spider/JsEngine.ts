import { runInNewContext } from 'vm'
import fetch from 'electron-fetch'

export class JsEngine {
  private scripts: Map<string, any> = new Map()
  private readonly CALL_TIMEOUT = 30000 // 30 seconds

  async loadScript(key: string, jsUrl: string): Promise<void> {
    try {
      let code: string

      if (jsUrl.startsWith('http')) {
        const response = await fetch(jsUrl)
        code = await response.text()
      } else {
        throw new Error('Local JS files not supported yet')
      }

      // Create a sandbox context (without setTimeout/setInterval to prevent leaks)
      const sandbox = {
        console,
        fetch,
        Buffer,
        URL,
        URLSearchParams,
        JSON,
        Math,
        Date,
        RegExp,
        Array,
        Object,
        String,
        Number,
        Boolean,
        Map,
        Set,
        Promise,
        module: { exports: {} },
        exports: {}
      }

      // Execute the script in sandbox
      runInNewContext(code, sandbox, { timeout: 5000 })

      // Get the exported Spider class
      const Spider = sandbox.module.exports.Spider || sandbox.exports.Spider || sandbox.Spider

      if (Spider && typeof Spider === 'function') {
        this.scripts.set(key, new Spider())
      } else if (typeof sandbox.module.exports === 'function') {
        this.scripts.set(key, new sandbox.module.exports())
      } else {
        this.scripts.set(key, sandbox.module.exports)
      }
    } catch (error) {
      console.error('Failed to load JS script:', error)
      throw error
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

    // Add timeout protection for remote code execution
    return Promise.race([
      func(params),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error(`Spider call timeout: ${method}`)), this.CALL_TIMEOUT)
      )
    ])
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
    const spider = this.scripts.get(key)
    if (spider && typeof spider.destroy === 'function') {
      spider.destroy()
    }
    this.scripts.delete(key)
  }

  destroyAll(): void {
    for (const [key, spider] of this.scripts) {
      if (typeof spider.destroy === 'function') {
        spider.destroy()
      }
    }
    this.scripts.clear()
  }
}
