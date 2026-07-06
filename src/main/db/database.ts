import { Low } from 'lowdb'
import { JSONFile } from 'lowdb/node'
import { app } from 'electron'
import { join } from 'path'
import { existsSync, mkdirSync } from 'fs'

interface Favorite {
  id: number
  siteKey: string
  vodId: string
  vodName: string
  vodPic?: string
  vodRemarks?: string
  createdAt: string
}

interface History {
  id: number
  siteKey: string
  vodId: string
  vodName: string
  vodPic?: string
  episodeName?: string
  episodeUrl?: string
  playPosition: number
  playDuration: number
  updatedAt: string
}

interface Source {
  id: number
  name: string
  url: string
  isActive: boolean
  createdAt: string
}

interface Settings {
  [key: string]: string
}

interface Schema {
  favorites: Favorite[]
  history: History[]
  sources: Source[]
  settings: Settings
}

const DB_DIR = app.getPath('userData')
const DB_PATH = join(DB_DIR, 'mangobox.json')

let db: Low<Schema> | null = null

export async function initDatabase(): Promise<void> {
  try {
    // Ensure directory exists
    if (!existsSync(DB_DIR)) {
      mkdirSync(DB_DIR, { recursive: true })
    }

    const adapter = new JSONFile<Schema>(DB_PATH)
    db = new Low<Schema>(adapter, {
      favorites: [],
      history: [],
      sources: [],
      settings: {}
    })

    await db.read()
    console.log('Database initialized successfully')
  } catch (error) {
    console.error('Failed to initialize database:', error)
    // Create in-memory fallback with a no-op adapter
    const memoryAdapter = {
      read: async () => null,
      write: async () => {}
    }
    db = new Low<Schema>(memoryAdapter as any, {
      favorites: [],
      history: [],
      sources: [],
      settings: {}
    })
  }
}

function getDb(): Low<Schema> {
  if (!db) {
    throw new Error('Database not initialized')
  }
  return db
}

// Favorites
let idCounter = 0
function generateId(): number {
  return Date.now() * 1000 + (++idCounter % 1000)
}

export async function addFavorite(siteKey: string, vodId: string, vodName: string, vodPic?: string, vodRemarks?: string): Promise<void> {
  const db = getDb()
  const existing = db.data.favorites.find(f => f.siteKey === siteKey && f.vodId === vodId)

  if (existing) {
    existing.vodName = vodName
    existing.vodPic = vodPic
    existing.vodRemarks = vodRemarks
  } else {
    db.data.favorites.push({
      id: generateId(),
      siteKey,
      vodId,
      vodName,
      vodPic,
      vodRemarks,
      createdAt: new Date().toISOString()
    })
  }

  await db.write()
}

export async function removeFavorite(siteKey: string, vodId: string): Promise<void> {
  const db = getDb()
  db.data.favorites = db.data.favorites.filter(f => !(f.siteKey === siteKey && f.vodId === vodId))
  await db.write()
}

export function getFavorites(): Favorite[] {
  const db = getDb()
  return db.data.favorites.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
}

export function isFavorite(siteKey: string, vodId: string): boolean {
  const db = getDb()
  return db.data.favorites.some(f => f.siteKey === siteKey && f.vodId === vodId)
}

// History
export async function addHistory(siteKey: string, vodId: string, vodName: string, vodPic?: string, episodeName?: string, episodeUrl?: string): Promise<void> {
  const db = getDb()
  const existing = db.data.history.find(h => h.siteKey === siteKey && h.vodId === vodId)

  if (existing) {
    existing.vodName = vodName
    existing.vodPic = vodPic
    existing.episodeName = episodeName
    existing.episodeUrl = episodeUrl
    existing.updatedAt = new Date().toISOString()
  } else {
    db.data.history.push({
      id: generateId(),
      siteKey,
      vodId,
      vodName,
      vodPic,
      episodeName,
      episodeUrl,
      playPosition: 0,
      playDuration: 0,
      updatedAt: new Date().toISOString()
    })
  }

  await db.write()
}

export async function updatePlayProgress(siteKey: string, vodId: string, position: number, duration: number): Promise<void> {
  const db = getDb()
  const existing = db.data.history.find(h => h.siteKey === siteKey && h.vodId === vodId)

  if (existing) {
    existing.playPosition = position
    existing.playDuration = duration
    existing.updatedAt = new Date().toISOString()
    await db.write()
  }
}

export function getHistory(): History[] {
  const db = getDb()
  return db.data.history.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
}

export function getPlayProgress(siteKey: string, vodId: string): { position: number; duration: number } | null {
  const db = getDb()
  const existing = db.data.history.find(h => h.siteKey === siteKey && h.vodId === vodId)

  if (existing) {
    return {
      position: existing.playPosition,
      duration: existing.playDuration
    }
  }
  return null
}

// Sources
export async function addSource(name: string, url: string): Promise<void> {
  const db = getDb()
  const existing = db.data.sources.find(s => s.url === url)

  if (!existing) {
    db.data.sources.push({
      id: generateId(),
      name,
      url,
      isActive: false,
      createdAt: new Date().toISOString()
    })
    await db.write()
  }
}

export async function removeSource(url: string): Promise<void> {
  const db = getDb()
  db.data.sources = db.data.sources.filter(s => s.url !== url)
  await db.write()
}

export function getSources(): Source[] {
  const db = getDb()
  return db.data.sources.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
}

export async function setActiveSource(url: string): Promise<void> {
  const db = getDb()
  db.data.sources.forEach(s => {
    s.isActive = s.url === url
  })
  await db.write()
}

export function getActiveSource(): Source | null {
  const db = getDb()
  return db.data.sources.find(s => s.isActive) || null
}

// Settings
export function getSetting(key: string): string | null {
  const db = getDb()
  return db.data.settings[key] ?? null
}

export async function setSetting(key: string, value: string): Promise<void> {
  const db = getDb()
  db.data.settings[key] = value
  await db.write()
}
