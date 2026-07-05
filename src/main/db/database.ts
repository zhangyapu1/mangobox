import initSqlJs, { Database } from 'sql.js'
import { app } from 'electron'
import { join } from 'path'
import { readFileSync, writeFileSync, existsSync } from 'fs'

let db: Database | null = null

const DB_PATH = join(app.getPath('userData'), 'mangobox.db')

export async function initDatabase(): Promise<void> {
  const SQL = await initSqlJs()

  if (existsSync(DB_PATH)) {
    const buffer = readFileSync(DB_PATH)
    db = new SQL.Database(buffer)
  } else {
    db = new SQL.Database()
  }

  // Create tables
  db.run(`
    CREATE TABLE IF NOT EXISTS favorites (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      site_key TEXT NOT NULL,
      vod_id TEXT NOT NULL,
      vod_name TEXT,
      vod_pic TEXT,
      vod_remarks TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(site_key, vod_id)
    )
  `)

  db.run(`
    CREATE TABLE IF NOT EXISTS history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      site_key TEXT NOT NULL,
      vod_id TEXT NOT NULL,
      vod_name TEXT,
      vod_pic TEXT,
      episode_name TEXT,
      episode_url TEXT,
      play_position REAL DEFAULT 0,
      play_duration REAL DEFAULT 0,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(site_key, vod_id)
    )
  `)

  db.run(`
    CREATE TABLE IF NOT EXISTS sources (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      url TEXT NOT NULL UNIQUE,
      is_active INTEGER DEFAULT 0,
      last_updated DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)

  db.run(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    )
  `)

  saveDatabase()
}

export function getDatabase(): Database {
  if (!db) {
    throw new Error('Database not initialized')
  }
  return db
}

export function saveDatabase(): void {
  if (!db) return
  const data = db.export()
  const buffer = Buffer.from(data)
  writeFileSync(DB_PATH, buffer)
}

// Favorites
export function addFavorite(siteKey: string, vodId: string, vodName: string, vodPic?: string, vodRemarks?: string): void {
  const db = getDatabase()
  db.run(
    'INSERT OR REPLACE INTO favorites (site_key, vod_id, vod_name, vod_pic, vod_remarks) VALUES (?, ?, ?, ?, ?)',
    [siteKey, vodId, vodName, vodPic, vodRemarks]
  )
  saveDatabase()
}

export function removeFavorite(siteKey: string, vodId: string): void {
  const db = getDatabase()
  db.run('DELETE FROM favorites WHERE site_key = ? AND vod_id = ?', [siteKey, vodId])
  saveDatabase()
}

export function getFavorites(): any[] {
  const db = getDatabase()
  const result = db.exec('SELECT * FROM favorites ORDER BY created_at DESC')
  return result[0]?.values || []
}

export function isFavorite(siteKey: string, vodId: string): boolean {
  const db = getDatabase()
  const result = db.exec('SELECT COUNT(*) FROM favorites WHERE site_key = ? AND vod_id = ?', [siteKey, vodId])
  return result[0]?.values[0][0] as number > 0
}

// History
export function addHistory(siteKey: string, vodId: string, vodName: string, vodPic?: string, episodeName?: string, episodeUrl?: string): void {
  const db = getDatabase()
  db.run(
    `INSERT OR REPLACE INTO history (site_key, vod_id, vod_name, vod_pic, episode_name, episode_url, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
    [siteKey, vodId, vodName, vodPic, episodeName, episodeUrl]
  )
  saveDatabase()
}

export function updatePlayProgress(siteKey: string, vodId: string, position: number, duration: number): void {
  const db = getDatabase()
  db.run(
    'UPDATE history SET play_position = ?, play_duration = ?, updated_at = CURRENT_TIMESTAMP WHERE site_key = ? AND vod_id = ?',
    [position, duration, siteKey, vodId]
  )
  saveDatabase()
}

export function getHistory(): any[] {
  const db = getDatabase()
  const result = db.exec('SELECT * FROM history ORDER BY updated_at DESC')
  return result[0]?.values || []
}

export function getPlayProgress(siteKey: string, vodId: string): { position: number; duration: number } | null {
  const db = getDatabase()
  const result = db.exec('SELECT play_position, play_duration FROM history WHERE site_key = ? AND vod_id = ?', [siteKey, vodId])
  if (result[0]?.values[0]) {
    return {
      position: result[0].values[0][0] as number,
      duration: result[0].values[0][1] as number
    }
  }
  return null
}

// Sources
export function addSource(name: string, url: string): void {
  const db = getDatabase()
  db.run('INSERT OR IGNORE INTO sources (name, url) VALUES (?, ?)', [name, url])
  saveDatabase()
}

export function removeSource(url: string): void {
  const db = getDatabase()
  db.run('DELETE FROM sources WHERE url = ?', [url])
  saveDatabase()
}

export function getSources(): any[] {
  const db = getDatabase()
  const result = db.exec('SELECT * FROM sources ORDER BY created_at DESC')
  return result[0]?.values || []
}

export function setActiveSource(url: string): void {
  const db = getDatabase()
  db.run('UPDATE sources SET is_active = 0')
  db.run('UPDATE sources SET is_active = 1 WHERE url = ?', [url])
  saveDatabase()
}

export function getActiveSource(): any | null {
  const db = getDatabase()
  const result = db.exec('SELECT * FROM sources WHERE is_active = 1 LIMIT 1')
  return result[0]?.values[0] || null
}

// Settings
export function getSetting(key: string): string | null {
  const db = getDatabase()
  const result = db.exec('SELECT value FROM settings WHERE key = ?', [key])
  return result[0]?.values[0]?.[0] as string || null
}

export function setSetting(key: string, value: string): void {
  const db = getDatabase()
  db.run('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [key, value])
  saveDatabase()
}
