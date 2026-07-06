import { spawn, ChildProcess } from 'child_process'
import { createConnection, Socket } from 'net'
import { BrowserWindow } from 'electron'
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

    // Get window handle for embedding
    const hwnd = this.window.getNativeWindowHandle().readInt32LE()

    // Spawn mpv process
    this.process = spawn(mpvPath, [
      `--wid=${hwnd}`,
      `--input-ipc-server=${this.pipeName}`,
      '--hwdec=auto',
      '--keep-open=yes',
      '--no-terminal',
      '--idle=yes',
      '--volume=80'
    ], {
      stdio: ['pipe', 'pipe', 'pipe']
    })

    if (this.process.stdout) {
      this.process.stdout.on('data', (data: Buffer) => {
        console.log('mpv stdout:', data.toString())
      })
    }

    if (this.process.stderr) {
      this.process.stderr.on('data', (data: Buffer) => {
        console.error('mpv stderr:', data.toString())
      })
    }

    this.process.on('exit', (code) => {
      console.log('mpv exited with code:', code)
      this.process = null
      this.socket = null
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

    // Check for system mpv
    return 'mpv'
  }

  private async waitForConnection(): Promise<void> {
    return new Promise((resolve, reject) => {
      const maxRetries = 20
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
          sock.destroy() // Close the failed socket to prevent FD leak
          retries++
          if (retries >= maxRetries) {
            reject(new Error('Failed to connect to mpv IPC'))
          } else {
            setTimeout(tryConnect, 500)
          }
        })
      }

      setTimeout(tryConnect, 1000)
    })
  }

  private setupSocket(): void {
    if (!this.socket) return

    let buffer = ''

    this.socket.on('data', (data: Buffer) => {
      buffer += data.toString()

      // Process complete JSON messages
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        if (!line.trim()) continue

        try {
          const message = JSON.parse(line)

          if (message.request_id !== undefined) {
            // Response to a command
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
            // Event from mpv
            this.handleEvent(message)
          }
        } catch (e) {
          console.error('Failed to parse mpv message:', line, e)
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
    const handlers = this.eventHandlers.get(event.event) || []

    switch (event.event) {
      case 'property-change':
        if (event.name === 'time-pos' && event.data !== undefined) {
          this.currentTime = event.data
          this.emit('timeupdate', this.currentTime)
        } else if (event.name === 'duration' && event.data !== undefined) {
          this.duration = event.data
          this.emit('durationchange', this.duration)
        } else if (event.name === 'pause') {
          this.isPlaying = !event.data
          this.emit(this.isPlaying ? 'play' : 'pause')
        } else if (event.name === 'volume' && event.data !== undefined) {
          this.volume = event.data
          this.emit('volumechange', this.volume)
        }
        break

      case 'end-file':
        this.isPlaying = false
        this.emit('ended')
        break

      case 'file-loaded':
        this.emit('loaded')
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

      // Timeout after 5 seconds
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

  async getSubtitles(): Promise<any[]> {
    try {
      const trackList = await this.sendCommand({
        command: ['get_property', 'track-list']
      })
      return trackList.filter((t: any) => t.type === 'sub')
    } catch {
      return []
    }
  }

  async setSubtitle(index: number): Promise<void> {
    await this.sendCommand({
      command: ['set_property', 'sub', index]
    })
  }

  async getAudioTracks(): Promise<any[]> {
    try {
      const trackList = await this.sendCommand({
        command: ['get_property', 'track-list']
      })
      return trackList.filter((t: any) => t.type === 'audio')
    } catch {
      return []
    }
  }

  async setAudioTrack(index: number): Promise<void> {
    await this.sendCommand({
      command: ['set_property', 'audio', index]
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
