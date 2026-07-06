import { BrowserWindow, globalShortcut } from 'electron'

interface KeyBinding {
  key: string
  action: string
  description: string
}

/**
 * KeyboardManager - Manages keyboard shortcuts and remote control input
 */
export class KeyboardManager {
  private window: BrowserWindow
  private bindings: Map<string, KeyBinding> = new Map()
  private isEnabled: boolean = true

  constructor(window: BrowserWindow) {
    this.window = window
    this.setupDefaultBindings()
  }

  private setupDefaultBindings(): void {
    // Media controls
    this.addBinding('Space', 'togglePlay', 'Play/Pause')
    this.addBinding('ArrowLeft', 'seekBackward', 'Seek backward 10s')
    this.addBinding('ArrowRight', 'seekForward', 'Seek forward 10s')
    this.addBinding('ArrowUp', 'volumeUp', 'Volume up')
    this.addBinding('ArrowDown', 'volumeDown', 'Volume down')
    this.addBinding('KeyM', 'toggleMute', 'Toggle mute')

    // Navigation
    this.addBinding('Escape', 'exitFullscreen', 'Exit fullscreen')
    this.addBinding('KeyF', 'toggleFullscreen', 'Toggle fullscreen')
    this.addBinding('KeyL', 'toggleLive', 'Toggle live mode')
    this.addBinding('KeyS', 'focusSearch', 'Focus search')

    // Channel controls (for live TV)
    this.addBinding('PageUp', 'previousChannel', 'Previous channel')
    this.addBinding('PageDown', 'nextChannel', 'Next channel')

    // Number keys for channel selection
    for (let i = 0; i <= 9; i++) {
      this.addBinding(`Digit${i}`, `selectChannel:${i}`, `Select channel ${i}`)
    }
  }

  addBinding(key: string, action: string, description: string): void {
    this.bindings.set(key, { key, action, description })
  }

  removeBinding(key: string): void {
    this.bindings.delete(key)
  }

  enable(): void {
    this.isEnabled = true
    this.registerShortcuts()
  }

  disable(): void {
    this.isEnabled = false
    this.unregisterShortcuts()
  }

  toggle(): boolean {
    this.isEnabled = !this.isEnabled
    if (this.isEnabled) {
      this.registerShortcuts()
    } else {
      this.unregisterShortcuts()
    }
    return this.isEnabled
  }

  registerShortcuts(): void {
    if (!this.isEnabled) return

    // Unregister all first
    globalShortcut.unregisterAll()

    // Register each binding
    this.bindings.forEach((binding, key) => {
      try {
        globalShortcut.register(key, () => {
          this.handleAction(binding.action)
        })
      } catch (error) {
        console.error(`Failed to register shortcut ${key}:`, error)
      }
    })
  }

  unregisterShortcuts(): void {
    globalShortcut.unregisterAll()
  }

  private handleAction(action: string): void {
    // Send action to renderer process
    this.window.webContents.send('keyboard-action', action)
  }

  getBindings(): KeyBinding[] {
    return Array.from(this.bindings.values())
  }

  isEnabledState(): boolean {
    return this.isEnabled
  }

  destroy(): void {
    globalShortcut.unregisterAll()
  }
}
