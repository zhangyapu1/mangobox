import fetch from 'electron-fetch'

/**
 * GitHubProxy - Auto-detects and switches between GitHub proxies
 * for better access in China
 */
export class GitHubProxy {
  private proxies: string[] = [
    'https://ghfast.top/',
    'https://gh-proxy.com/',
    'https://fastlink.cokey.xyz/',
    'https://ghproxy.net/',
    'https://ghproxy.cc/',
    ''  // Direct access (no proxy)
  ]

  private workingProxy: string | null = null
  private testUrl = 'https://raw.githubusercontent.com/FGBLH/GHK/main/README.md'

  async findWorkingProxy(): Promise<string> {
    // If we already have a working proxy, use it
    if (this.workingProxy !== null) {
      return this.workingProxy
    }

    // Test each proxy
    for (const proxy of this.proxies) {
      try {
        const url = proxy + this.testUrl
        const response = await fetch(url, {
          timeout: 5000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        })

        if (response.ok) {
          this.workingProxy = proxy
          console.log('Found working GitHub proxy:', proxy || 'direct')
          return proxy
        }
      } catch (error) {
        // Proxy not working, try next
        continue
      }
    }

    // No proxy found, use direct access
    this.workingProxy = ''
    console.warn('No GitHub proxy found, using direct access')
    return ''
  }

  async proxyUrl(url: string): Promise<string> {
    // Only proxy GitHub URLs
    if (!url.includes('githubusercontent.com') && !url.includes('github.com')) {
      return url
    }

    const proxy = await this.findWorkingProxy()
    return proxy + url
  }

  async fetchWithProxy(url: string): Promise<string> {
    const proxyUrl = await this.proxyUrl(url)
    const response = await fetch(proxyUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    })
    return await response.text()
  }

  resetProxy(): void {
    this.workingProxy = null
  }

  setProxy(proxy: string): void {
    this.workingProxy = proxy
  }

  getProxies(): string[] {
    return this.proxies
  }
}
