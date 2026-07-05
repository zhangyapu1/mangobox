// TVBox JSON Source Types

export interface TvBoxSource {
  spider: string
  sites: Site[]
  lives: Live[]
  parses: Parse[]
  flags: string[]
  logo?: string
  wallpaper?: string
  warningText?: string
  doh?: Doh[]
  ads?: string[]
  ijk?: IjkGroup[]
  rules?: Rule[]
}

export interface Site {
  key: string
  name: string
  type: number // 0=xml, 1=json, 3=spider, 4=jsapi
  api: string
  searchable?: number // 0 or 1
  quickSearch?: number // 0 or 1
  filterable?: number // 0 or 1
  changeable?: number // 0 or 1
  ext?: string
  jar?: string
  categories?: string[]
  header?: Record<string, string>
  homePage?: string
}

export interface Live {
  name: string
  type: number
  url: string
  ua?: string
  playerType?: number
  epg?: string
  logo?: string
}

export interface Parse {
  name: string
  type: number // 0=web, 1=json, 2=builtin, 3=aggregated, 4=super
  url: string
  ext?: {
    flag?: string[]
    header?: Record<string, string>
  }
}

export interface Doh {
  name: string
  url: string
  ips?: string[]
}

export interface IjkGroup {
  group: string
  options: IjkOption[]
}

export interface IjkOption {
  category: number
  name: string
  value: string
}

export interface Rule {
  name: string
  hosts: string[]
  regex?: string[]
  exclude?: string[]
  script?: string[]
}

// CMS API Types
export interface VodCategory {
  type_id: number
  type_name: string
}

export interface VodItem {
  vod_id: string | number
  vod_name: string
  vod_pic: string
  vod_remarks?: string
  vod_year?: string
  vod_area?: string
  type_name?: string
}

export interface VodDetail {
  vod_id: string | number
  vod_name: string
  vod_pic: string
  vod_actor?: string
  vod_director?: string
  vod_content?: string
  vod_play_from: string
  vod_play_url: string
  vod_remarks?: string
  vod_year?: string
  vod_area?: string
  type_name?: string
}

export interface CmsListResponse {
  code: number
  msg: string
  class: VodCategory[]
  list: VodItem[]
  page: number
  pagecount: number
  limit: string
  total: number
}

export interface CmsDetailResponse {
  code: number
  msg: string
  list: VodDetail[]
}

// Spider Types
export interface SpiderResult {
  class?: VodCategory[]
  filters?: Record<string, FilterItem[]>
  list?: VodItem[]
  page?: number
  pagecount?: number
  total?: number
}

export interface FilterItem {
  key: string
  name: string
  value: FilterValue[]
}

export interface FilterValue {
  n: string
  v: string
}

export interface SpiderDetailResult {
  list: VodDetail[]
}

export interface SpiderPlayResult {
  parse: number // 0=direct, 1=need parse
  url: string
  flag?: string
  header?: Record<string, string>
}

// Episode structure
export interface Episode {
  name: string
  url: string
}

export interface PlaySource {
  name: string
  episodes: Episode[]
}

export interface VideoInfo {
  id: string
  name: string
  pic: string
  remarks?: string
  year?: string
  area?: string
  type?: string
  actor?: string
  director?: string
  content?: string
  playSources: PlaySource[]
}

// Live channel
export interface LiveChannel {
  group: string
  name: string
  url: string
  logo?: string
}
