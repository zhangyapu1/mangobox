import { Site, VodItem, VideoInfo, SpiderResult, SpiderDetailResult, SpiderPlayResult } from './types'

// This will be implemented to route to Python or JS spider execution
export class SpiderRouter {
  async execute(site: Site, method: string, params: any): Promise<any> {
    // Determine spider type based on api field
    if (site.api.startsWith('csp_')) {
      // csp_* - use JAR spider (not supported without Java)
      console.warn('JAR spider not supported:', site.api)
      return null
    }

    if (site.api.endsWith('.py')) {
      // Python spider
      return await this.executePythonSpider(site, method, params)
    }

    if (site.api.endsWith('.js')) {
      // JavaScript spider
      return await this.executeJsSpider(site, method, params)
    }

    console.warn('Unknown spider type:', site.api)
    return null
  }

  private async executePythonSpider(site: Site, method: string, params: any): Promise<any> {
    // TODO: Implement Python Bridge communication
    // This will send JSON-RPC to Python subprocess
    console.log('Execute Python spider:', site.api, method, params)
    return null
  }

  private async executeJsSpider(site: Site, method: string, params: any): Promise<any> {
    // TODO: Implement JS spider execution in Node VM
    console.log('Execute JS spider:', site.api, method, params)
    return null
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
}
