import { EventEmitter } from 'events'

interface DlnaDevice {
  name: string
  host: string
  port: number
  location: string
  manufacturer: string
  modelName: string
}

interface CastSession {
  device: DlnaDevice
  url: string
  title: string
  position: number
  duration: number
  isPlaying: boolean
}

/**
 * DlnaManager - Manages DLNA device discovery and casting
 */
export class DlnaManager extends EventEmitter {
  private devices: DlnaDevice[] = []
  private currentSession: CastSession | null = null
  private isScanning: boolean = false

  constructor() {
    super()
  }

  async startScan(): Promise<void> {
    if (this.isScanning) return

    this.isScanning = true
    this.devices = []

    try {
      // Use SSDP to discover DLNA devices
      const dlnacasts = require('dlnacasts')()

      dlnacasts.on('device', (device: any) => {
        const dlnaDevice: DlnaDevice = {
          name: device.name || 'Unknown Device',
          host: device.host,
          port: device.port,
          location: device.location,
          manufacturer: device.manufacturer || '',
          modelName: device.modelName || ''
        }

        // Avoid duplicates
        if (!this.devices.find(d => d.host === dlnaDevice.host)) {
          this.devices.push(dlnaDevice)
          this.emit('deviceFound', dlnaDevice)
        }
      })

      // Scan for 5 seconds
      await new Promise(resolve => setTimeout(resolve, 5000))

      this.isScanning = false
      this.emit('scanComplete', this.devices)
    } catch (error) {
      console.error('DLNA scan failed:', error)
      this.isScanning = false
      this.emit('scanError', error)
    }
  }

  stopScan(): void {
    this.isScanning = false
  }

  getDevices(): DlnaDevice[] {
    return [...this.devices]
  }

  async cast(device: DlnaDevice, url: string, title: string): Promise<void> {
    try {
      const dlnacasts = require('dlnacasts')()

      // Find the device
      const targetDevice = dlnacasts.devices.find((d: any) => d.host === device.host)

      if (!targetDevice) {
        throw new Error('Device not found')
      }

      // Start casting
      targetDevice.play(url, {
        title: title,
        type: 'video'
      })

      this.currentSession = {
        device,
        url,
        title,
        position: 0,
        duration: 0,
        isPlaying: true
      }

      this.emit('castStarted', this.currentSession)

      // Monitor playback
      targetDevice.on('status', (status: any) => {
        if (this.currentSession) {
          this.currentSession.position = status.position || 0
          this.currentSession.duration = status.duration || 0
          this.currentSession.isPlaying = status.isPlaying || false
          this.emit('statusUpdate', this.currentSession)
        }
      })
    } catch (error) {
      console.error('Cast failed:', error)
      this.emit('castError', error)
    }
  }

  async pause(): Promise<void> {
    if (!this.currentSession) return

    try {
      const dlnacasts = require('dlnacasts')()
      const device = dlnacasts.devices.find((d: any) => d.host === this.currentSession!.device.host)

      if (device) {
        device.pause()
        this.currentSession.isPlaying = false
        this.emit('paused')
      }
    } catch (error) {
      console.error('Pause failed:', error)
    }
  }

  async resume(): Promise<void> {
    if (!this.currentSession) return

    try {
      const dlnacasts = require('dlnacasts')()
      const device = dlnacasts.devices.find((d: any) => d.host === this.currentSession!.device.host)

      if (device) {
        device.play()
        this.currentSession.isPlaying = true
        this.emit('resumed')
      }
    } catch (error) {
      console.error('Resume failed:', error)
    }
  }

  async stop(): Promise<void> {
    if (!this.currentSession) return

    try {
      const dlnacasts = require('dlnacasts')()
      const device = dlnacasts.devices.find((d: any) => d.host === this.currentSession!.device.host)

      if (device) {
        device.stop()
        this.currentSession = null
        this.emit('stopped')
      }
    } catch (error) {
      console.error('Stop failed:', error)
    }
  }

  async seek(seconds: number): Promise<void> {
    if (!this.currentSession) return

    try {
      const dlnacasts = require('dlnacasts')()
      const device = dlnacasts.devices.find((d: any) => d.host === this.currentSession!.device.host)

      if (device) {
        device.seek(seconds)
        this.currentSession.position = seconds
        this.emit('seeked', seconds)
      }
    } catch (error) {
      console.error('Seek failed:', error)
    }
  }

  async setVolume(volume: number): Promise<void> {
    if (!this.currentSession) return

    try {
      const dlnacasts = require('dlnacasts')()
      const device = dlnacasts.devices.find((d: any) => d.host === this.currentSession!.device.host)

      if (device) {
        device.setVolume(volume / 100)
        this.emit('volumeChanged', volume)
      }
    } catch (error) {
      console.error('Set volume failed:', error)
    }
  }

  getCurrentSession(): CastSession | null {
    return this.currentSession
  }

  isCasting(): boolean {
    return this.currentSession !== null
  }

  getStats(): { isScanning: boolean; devices: number; isCasting: boolean } {
    return {
      isScanning: this.isScanning,
      devices: this.devices.length,
      isCasting: this.isCasting()
    }
  }
}
