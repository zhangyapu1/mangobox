import { BrowserWindow, BrowserView } from 'electron'

/**
 * WebViewParser - Uses BrowserView to parse video URLs
 * This is used for Type 0 parse services that require WebView
 */
export class WebViewParser {
  private view: BrowserView | null = null
  private parentWindow: BrowserWindow

  constructor(window: BrowserWindow) {
    this.parentWindow = window
  }

  async parseUrl(parseUrl: string, videoUrl: string): Promise<string> {
    return new Promise((resolve, reject) => {
      try {
        // Create a hidden BrowserView
        this.view = new BrowserView({
          webPreferences: {
            nodeIntegration: false,
            contextIsolation: true
          }
        })

        // Set the view bounds (off-screen)
        this.parentWindow.setBrowserView(this.view)
        this.view.setBounds({ x: 0, y: 0, width: 0, height: 0 })

        // Track intercepted URLs
        const interceptedUrls: string[] = []
        let resolved = false

        // Listen for web requests to find video URL
        this.view.webContents.session.webRequest.onBeforeRequest(
          { urls: ['*://*/*.m3u8*', '*://*/*.mp4*', '*://*/*.flv*', '*://*/*.ts'] },
          (details, callback) => {
            interceptedUrls.push(details.url)

            // Check if this looks like a video URL
            if (this.isVideoUrl(details.url) && !resolved) {
              resolved = true
              this.cleanup()
              resolve(details.url)
            }

            callback({})
          }
        )

        // Load the parse URL with video URL appended
        const fullUrl = parseUrl + encodeURIComponent(videoUrl)
        this.view.webContents.loadURL(fullUrl)

        // Timeout after 15 seconds
        setTimeout(() => {
          if (!resolved) {
            this.cleanup()
            // Try to find video URL from intercepted URLs
            const videoUrl = interceptedUrls.find(url => this.isVideoUrl(url))
            if (videoUrl) {
              resolve(videoUrl)
            } else {
              reject(new Error('WebView parse timeout'))
            }
          }
        }, 15000)

        // Handle page load errors
        this.view.webContents.on('did-fail-load', (_, errorCode, errorDescription) => {
          if (!resolved) {
            resolved = true
            this.cleanup()
            reject(new Error(`Failed to load: ${errorDescription}`))
          }
        })
      } catch (error) {
        this.cleanup()
        reject(error)
      }
    })
  }

  private isVideoUrl(url: string): boolean {
    const videoExtensions = ['.m3u8', '.mp4', '.flv', '.ts', '.mkv', '.avi']
    const videoDomains = ['youtube.com', 'youtu.be', 'vimeo.com', 'dailymotion.com']

    // Check file extension
    if (videoExtensions.some(ext => url.toLowerCase().includes(ext))) {
      return true
    }

    // Check domain
    if (videoDomains.some(domain => url.includes(domain))) {
      return true
    }

    // Check for streaming patterns
    if (url.includes('manifest') || url.includes('playlist') || url.includes('stream')) {
      return true
    }

    return false
  }

  private cleanup(): void {
    if (this.view) {
      this.parentWindow.removeBrowserView(this.view)
      this.view.webContents.close()
      this.view = null
    }
  }

  destroy(): void {
    this.cleanup()
  }
}
