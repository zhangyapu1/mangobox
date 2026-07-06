import fetch from 'electron-fetch'
import {
  Site,
  CmsListResponse,
  CmsDetailResponse,
  VodItem,
  VodDetail,
  VideoInfo,
  PlaySource,
  Episode
} from './types'

export class CmsClient {
  private site: Site
  private baseUrl: string

  constructor(site: Site) {
    this.site = site
    this.baseUrl = site.api
  }

  async getCategories(): Promise<any[]> {
    try {
      const url = `${this.baseUrl}?ac=list`
      const response = await fetch(url)
      const data = await response.json() as CmsListResponse
      return data.class || []
    } catch (error) {
      console.error('Failed to get categories:', error)
      return []
    }
  }

  async getCategoryList(categoryId: string, page: number = 1): Promise<{ list: VodItem[]; page: number; pageCount: number }> {
    try {
      // Use ac=detail to get images in list response
      const url = `${this.baseUrl}?ac=detail&t=${categoryId}&pg=${page}`
      const response = await fetch(url)
      const data = await response.json() as CmsListResponse
      return {
        list: data.list || [],
        page: data.page || 1,
        pageCount: data.pagecount || 1
      }
    } catch (error) {
      console.error('Failed to get category list:', error)
      return { list: [], page: 1, pageCount: 1 }
    }
  }

  async getHomeContent(): Promise<{ categories: any[]; list: VodItem[] }> {
    try {
      // Make two calls: ac=list for categories, ac=detail for videos with images
      const [listResponse, detailResponse] = await Promise.all([
        fetch(`${this.baseUrl}?ac=list`),
        fetch(`${this.baseUrl}?ac=detail`)
      ])

      const listData = await listResponse.json() as CmsListResponse
      const detailData = await detailResponse.json() as CmsListResponse

      return {
        categories: listData.class || [],
        list: detailData.list || []
      }
    } catch (error) {
      console.error('Failed to get home content:', error)
      return { categories: [], list: [] }
    }
  }

  async getDetail(vodId: string): Promise<VideoInfo | null> {
    try {
      const url = `${this.baseUrl}?ac=detail&ids=${vodId}`
      const response = await fetch(url)
      const data = await response.json() as CmsDetailResponse

      if (!data.list || data.list.length === 0) {
        return null
      }

      const vod = data.list[0]
      return this.parseVodDetail(vod)
    } catch (error) {
      console.error('Failed to get detail:', error)
      return null
    }
  }

  async search(keyword: string, page: number = 1): Promise<{ list: VodItem[]; page: number; pageCount: number }> {
    try {
      // Use ac=detail to get images in search results
      const url = `${this.baseUrl}?ac=detail&wd=${encodeURIComponent(keyword)}&pg=${page}`
      const response = await fetch(url)
      const data = await response.json() as CmsListResponse
      return {
        list: data.list || [],
        page: data.page || 1,
        pageCount: data.pagecount || 1
      }
    } catch (error) {
      console.error('Failed to search:', error)
      return { list: [], page: 1, pageCount: 1 }
    }
  }

  private parseVodDetail(vod: VodDetail): VideoInfo {
    const playSources: PlaySource[] = []

    // Parse vod_play_from and vod_play_url
    const fromList = vod.vod_play_from.split('$$$')
    const urlList = vod.vod_play_url.split('$$$')

    fromList.forEach((from, index) => {
      const urlGroup = urlList[index] || ''
      const episodes: Episode[] = []

      urlGroup.split('#').forEach(ep => {
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
