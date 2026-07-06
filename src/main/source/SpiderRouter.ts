import { Site, VodItem, VideoInfo, SpiderResult, SpiderDetailResult, SpiderPlayResult } from './types'
import { PythonBridge } from '../spider/PythonBridge'
import { JsEngine } from '../spider/JsEngine'
import { DrpyEngine } from '../spider/DrpyEngine'

export class SpiderRouter {
  private pythonBridge: PythonBridge
  private jsEngine: JsEngine
  private drpyEngine: DrpyEngine
  private loadedSpiders: Map<string, { type: 'python' | 'js' | 'drpy', loaded: boolean }> = new Map()

  constructor() {
    this.pythonBridge = new PythonBridge()
    this.jsEngine = new JsEngine()
    this.drpyEngine = new DrpyEngine()
  }

  async execute(site: Site, method: string, params: any): Promise<any> {
    try {
      // Load spider if not already loaded
      if (!this.loadedSpiders.has(site.key)) {
        await this.loadSpider(site)
      }

      const spiderInfo = this.loadedSpiders.get(site.key)
      if (!spiderInfo || !spiderInfo.loaded) {
        console.warn('Spider not loaded:', site.key)
        return null
      }

      // Route to appropriate engine
      switch (spiderInfo.type) {
        case 'python':
          return await this.executePythonSpider(site, method, params)
        case 'js':
          return await this.executeJsSpider(site, method, params)
        case 'drpy':
          return await this.executeDrpySpider(site, method, params)
        default:
          console.warn('Unknown spider type:', spiderInfo.type)
          return null
      }
    } catch (error) {
      console.error('Spider execution failed:', error)
      return null
    }
  }

  private async loadSpider(site: Site): Promise<void> {
    try {
      if (site.api.startsWith('csp_')) {
        // csp_* - use JAR spider (not supported without Java)
        console.warn('JAR spider not supported:', site.api)
        this.loadedSpiders.set(site.key, { type: 'js', loaded: false })
        return
      }

      if (site.api.endsWith('.py')) {
        // Python spider
        await this.pythonBridge.loadSpider(site.key, site.api)
        this.loadedSpiders.set(site.key, { type: 'python', loaded: true })
        return
      }

      if (site.api.endsWith('.js')) {
        // Check if it's a drpy2 script
        if (site.api.includes('drpy') || site.ext?.includes('drpy')) {
          const loaded = await this.drpyEngine.loadScript(site.key, site.api)
          this.loadedSpiders.set(site.key, { type: 'drpy', loaded })
        } else {
          // Regular JS spider
          const loaded = await this.jsEngine.loadScript(site.key, site.api)
          this.loadedSpiders.set(site.key, { type: 'js', loaded })
        }
        return
      }

      console.warn('Unknown spider API:', site.api)
      this.loadedSpiders.set(site.key, { type: 'js', loaded: false })
    } catch (error) {
      console.error('Failed to load spider:', error)
      this.loadedSpiders.set(site.key, { type: 'js', loaded: false })
    }
  }

  private async executePythonSpider(site: Site, method: string, params: any): Promise<any> {
    return await this.pythonBridge.call(method, { key: site.key, ...params })
  }

  private async executeJsSpider(site: Site, method: string, params: any): Promise<any> {
    return await this.jsEngine.call(site.key, method, params)
  }

  private async executeDrpySpider(site: Site, method: string, params: any): Promise<any> {
    return await this.drpyEngine.call(site.key, method, params)
  }

  async getHomeContent(site: Site): Promise<{ categories: any[]; list: VodItem[] }> {
    const result = await this.execute(site, 'homeContent', { filter: true })
    if (!result) return { categories: [], list: [] }

    return {
      categories: result.class || [],
      list: result.list || []
    }
  }

  async getCategoryList(site: Site, categoryId: string, page: number = 1, filters?: Record<string, string>): Promise<{ list: VodItem[]; page: number; pageCount: number }> {
    const result = await this.execute(site, 'categoryContent', {
      tid: categoryId,
      pg: page.toString(),
      filter: true,
      extend: filters || {}
    })

    if (!result) return { list: [], page: 1, pageCount: 1 }

    return {
      list: result.list || [],
      page: result.page || 1,
      pageCount: result.pagecount || 1
    }
  }

  async getDetail(site: Site, vodId: string): Promise<VideoInfo | null> {
    const result = await this.execute(site, 'detailContent', { ids: [vodId] })
    if (!result || !result.list || result.list.length === 0) return null

    const vod = result.list[0]
    return this.parseVodDetail(vod)
  }

  async search(site: Site, keyword: string, page: number = 1): Promise<{ list: VodItem[]; page: number; pageCount: number }> {
    const result = await this.execute(site, 'searchContent', {
      key: keyword,
      quick: false,
      pg: page.toString()
    })

    if (!result) return { list: [], page: 1, pageCount: 1 }

    return {
      list: result.list || [],
      page: result.page || 1,
      pageCount: result.pagecount || 1
    }
  }

  async getPlayerContent(site: Site, flag: string, id: string, vipFlags: string[]): Promise<SpiderPlayResult | null> {
    const result = await this.execute(site, 'playerContent', {
      flag,
      id,
      vipFlags
    })

    return result || null
  }

  private parseVodDetail(vod: any): VideoInfo {
    const playSources: any[] = []

    if (vod.vod_play_from && vod.vod_play_url) {
      const fromList = vod.vod_play_from.split('$$$')
      const urlList = vod.vod_play_url.split('$$$')

      fromList.forEach((from: string, index: number) => {
        const urlGroup = urlList[index] || ''
        const episodes: any[] = []

        urlGroup.split('#').forEach((ep: string) => {
          const parts = ep.split('$')
          if (parts.length >= 2) {
            episodes.push({
              name: parts[0],
              url: parts[1]
            })
          }
        })

        playSources.push({
          name: from,
          episodes
        })
      })
    }

    return {
      id: String(vod.vod_id),
      name: vod.vod_name,
      pic: vod.vod_pic,
      remarks: vod.vod_remarks,
      year: vod.vod_year,
      area: vod.vod_area,
      type: vod.type_name,
      actor: vod.vod_actor,
      director: vod.vod_director,
      content: vod.vod_content,
      playSources
    }
  }

  destroy(): void {
    this.pythonBridge.destroyAll()
    this.jsEngine.destroyAll()
    this.drpyEngine.destroyAll()
    this.loadedSpiders.clear()
  }
}
