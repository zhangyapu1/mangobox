import { spawn, ChildProcess } from 'child_process'
import { createConnection, Socket } from 'net'
import { BrowserWindow, screen } from 'electron'
import { join } from 'path'
import { app } from 'electron'
import { existsSync } from 'fs'

interface MpvCommand {
  command: any[]
  request_id?: number
}

interface MpvEvent {
  event: string
  [key: string]: any
}

export class MpvController {
  private process: ChildProcess | null = null
  private socket: Socket | null = null
  private window: BrowserWindow
  private requestId = 0
  private pendingRequests: Map<number, { resolve: Function; reject: Function }> = new Map()
  private eventHandlers: Map<string, Function[]> = new Map()
  private pipeName = '\\\\.\\pipe\\mangobox-mpv'
  private isPlaying = false
  private currentTime = 0
  private duration = 0
  private volume = 80

  constructor(window: BrowserWindow) {
    this.window = window
  }

  async init(): Promise<void> {
    const mpvPath = this.findMpv()

    if (!mpvPath) {
      console.warn('mpv not found. Video playback will not be available.')
      return
    }

    console.log('Initializing mpv from:', mpvPath)

    // Spawn mpv as independent window
    this.process = spawn(mpvPath, [
      `--input-ipc-server=${this.pipeName}`,
      '--hwdec=auto',
      '--keep-open=yes',
      '--no-terminal',
      '--idle=yes',
      '--volume=80',
      '--title=MangoBox Player',
      '--ontop=yes',
      '--force-window=yes',
      '--geometry=800x450+100+100',
      '--border=yes',
      '--cursor-autohide=1000'
    ], {
      stdio: ['pipe', 'pipe', 'pipe'],
      detached: false
    })

    if (this.process.stdout) {
      this.process.stdout.on('data', (data: Buffer) => {
        // Ignore mpv stdout
      })
    }

    if (this.process.stderr) {
      this.process.stderr.on('data', (data: Buffer) => {
        // Ignore mpv stderr warnings
      })
    }

    this.process.on('exit', (code) => {
      console.log('mpv exited with code:', code)
      this.process = null
      this.socket = null
      this.isPlaying = false
    })

    this.process.on('error', (err) => {
      console.error('mpv process error:', err)
      this.process = null
    })

    // Wait for mpv to start and connect to IPC
    await this.waitForConnection()
  }

  private findMpv(): string | null {
    // Check for bundled mpv
    const bundledMpv = join(app.getAppPath(), 'resources', 'mpv', 'mpv.exe')
    if (existsSync(bundledMpv)) {
      return bundledMpv
    }

    // Check for system mpv in PATH
    return 'mpv'
  }

  private async waitForConnection(): Promise<void> {
    return new Promise((resolve, reject) => {
      const maxRetries = 30
      let retries = 0

      const tryConnect = () => {
        const sock = createConnection(this.pipeName)

        sock.on('connect', () => {
          console.log('Connected to mpv IPC')
          this.socket = sock
          this.setupSocket()
          resolve()
        })

        sock.on('error', (err) => {
          sock.destroy()
          retries++
          if (retries >= maxRetries) {
            reject(new Error('Failed to connect to mpv IPC'))
          } else {
            setTimeout(tryConnect, 300)
          }
        })
      }

      setTimeout(tryConnect, 500)
    })
  }

  private setupSocket(): void {
    if (!this.socket) return

    let buffer = ''

    this.socket.on('data', (data: Buffer) => {
      buffer += data.toString()

      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        if (!line.trim()) continue

        try {
          const message = JSON.parse(line)

          if (message.request_id !== undefined) {
            const pending = this.pendingRequests.get(message.request_id)
            if (pending) {
              this.pendingRequests.delete(message.request_id)
              if (message.error && message.error !== 'success') {
                pending.reject(new Error(message.error))
              } else {
                pending.resolve(message.data)
              }
            }
          } else if (message.event) {
            this.handleEvent(message)
          }
        } catch (e) {
          // Ignore parse errors
        }
      }
    })

    this.socket.on('close', () => {
      console.log('mpv IPC connection closed')
      this.socket = null
    })

    // Observe properties
    this.observeProperty('time-pos')
    this.observeProperty('duration')
    this.observeProperty('pause')
    this.observeProperty('volume')
    this.observeProperty('eof-reached')
  }

  private handleEvent(event: MpvEvent): void {
    switch (event.event) {
      case 'property-change':
        if (event.name === 'time-pos' && event.data !== undefined && event.data !== null) {
          this.currentTime = Number(event.data) || 0
          this.emit('timeupdate', this.currentTime)
        } else if (event.name === 'duration' && event.data !== undefined && event.data !== null) {
          this.duration = Number(event.data) || 0
          this.emit('durationchange', this.duration)
        } else if (event.name === 'pause' && event.data !== undefined) {
          this.isPlaying = !event.data
          this.emit(this.isPlaying ? 'play' : 'pause')
        } else if (event.name === 'volume' && event.data !== undefined && event.data !== null) {
          this.volume = Number(event.data) || 0
          this.emit('volumechange', this.volume)
        }
        break

      case 'end-file':
        this.isPlaying = false
        this.emit('ended')
        break

      case 'file-loaded':
        console.log('mpv file loaded')
        this.emit('loaded')
        break

      case 'idle':
        this.isPlaying = false
        break
    }
  }

  private async sendCommand(command: MpvCommand): Promise<any> {
    if (!this.socket) {
      throw new Error('mpv not connected')
    }

    const id = ++this.requestId
    command.request_id = id

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject })

      this.socket!.write(JSON.stringify(command) + '\n')

      setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id)
          reject(new Error('Command timeout'))
        }
      }, 5000)
    })
  }

  private observeProperty(name: string): void {
    this.sendCommand({
      command: ['observe_property', 1, name]
    }).catch((err) => {
      console.warn(`Failed to observe ${name}:`, err.message)
    })
  }

  on(event: string, handler: Function): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, [])
    }
    this.eventHandlers.get(event)!.push(handler)
  }

  private emit(event: string, data?: any): void {
    const handlers = this.eventHandlers.get(event) || []
    handlers.forEach(handler => handler(data))
  }

  async play(url: string): Promise<void> {
    console.log('mpv playing:', url)
    await this.sendCommand({
      command: ['loadfile', url]
    })
    this.isPlaying = true
  }

  async pause(): Promise<void> {
    await this.sendCommand({
      command: ['set_property', 'pause', true]
    })
  }

  async resume(): Promise<void> {
    await this.sendCommand({
      command: ['set_property', 'pause', false]
    })
  }

  async togglePause(): Promise<void> {
    await this.sendCommand({
      command: ['cycle', 'pause']
    })
  }

  async seek(seconds: number): Promise<void> {
    await this.sendCommand({
      command: ['seek', seconds, 'absolute']
    })
  }

  async seekRelative(seconds: number): Promise<void> {
    await this.sendCommand({
      command: ['seek', seconds, 'relative']
    })
  }

  async setVolume(volume: number): Promise<void> {
    await this.sendCommand({
      command: ['set_property', 'volume', volume]
    })
  }

  async stop(): Promise<void> {
    await this.sendCommand({
      command: ['stop']
    })
    this.isPlaying = false
    this.currentTime = 0
    this.duration = 0
  }

  async setFullscreen(fullscreen: boolean): Promise<void> {
    await this.sendCommand({
      command: ['set_property', 'fullscreen', fullscreen]
    })
  }

  async toggleFullscreen(): Promise<void> {
    await this.sendCommand({
      command: ['cycle', 'fullscreen']
    })
  }

  getIsPlaying(): boolean {
    return this.isPlaying
  }

  getCurrentTime(): number {
    return this.currentTime
  }

  getDuration(): number {
    return this.duration
  }

  getVolume(): number {
    return this.volume
  }

  destroy(): void {
    // Reject all pending requests
    for (const [id, pending] of this.pendingRequests) {
      pending.reject(new Error('MpvController destroyed'))
    }
    this.pendingRequests.clear()

    if (this.socket) {
      this.socket.destroy()
      this.socket = null
    }
    if (this.process) {
      this.process.kill()
      this.process = null
    }
  }
}
