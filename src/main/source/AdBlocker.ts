import { session } from 'electron'

/**
 * AdBlocker - Blocks ads based on TVBox ads configuration
 */
export class AdBlocker {
  private blockedDomains: Set<string> = new Set()
  private isEnabled: boolean = true

  constructor() {
    this.setupDefaultRules()
  }

  private setupDefaultRules(): void {
    // Common ad domains
    const defaultAds = [
      'googleads.g.doubleclick.net',
      'pagead2.googlesyndication.com',
      'adservice.google.com',
      'www.googleadservices.com',
      'static.criteo.net',
      'bidder.criteo.com',
      'cdn.taboola.com',
      'cdn.revjet.com',
      'cdn.adsafeprotected.com',
      'securepubads.g.doubleclick.net',
      'ad.doubleclick.net',
      'm.moatads.com',
      'px.moatads.com',
      'z.moatads.com',
      'pagead2.googlesyndication.com',
      'tpc.googlesyndication.com',
      'googletagservices.com',
      'ads.youtube.com',
      'www.youtube.com/api/stats/ads',
      's.youtube.com',
      'www.youtube.com/pagead',
    ]

    defaultAds.forEach(domain => this.blockedDomains.add(domain))
  }

  setBlockedDomains(domains: string[]): void {
    this.blockedDomains.clear()
    domains.forEach(domain => this.blockedDomains.add(domain))
    this.setupDefaultRules() // Keep defaults
  }

  addBlockedDomain(domain: string): void {
    this.blockedDomains.add(domain)
  }

  removeBlockedDomain(domain: string): void {
    this.blockedDomains.delete(domain)
  }

  enable(): void {
    this.isEnabled = true
    this.applyRules()
  }

  disable(): void {
    this.isEnabled = false
    this.removeRules()
  }

  toggle(): boolean {
    this.isEnabled = !this.isEnabled
    if (this.isEnabled) {
      this.applyRules()
    } else {
      this.removeRules()
    }
    return this.isEnabled
  }

  isAdEnabled(): boolean {
    return this.isEnabled
  }

  applyRules(): void {
    if (!this.isEnabled) return

    // Apply ad blocking rules to default session
    const filter = {
      urls: Array.from(this.blockedDomains).map(domain => `*://*.${domain}/*`)
    }

    session.defaultSession.webRequest.onBeforeRequest(filter, (details, callback) => {
      callback({ cancel: true })
    })
  }

  removeRules(): void {
    session.defaultSession.webRequest.onBeforeRequest(null)
  }

  isBlocked(url: string): boolean {
    if (!this.isEnabled) return false

    try {
      const urlObj = new URL(url)
      const domain = urlObj.hostname

      return Array.from(this.blockedDomains).some(blocked =>
        domain === blocked || domain.endsWith('.' + blocked)
      )
    } catch {
      return false
    }
  }

  getBlockedDomains(): string[] {
    return Array.from(this.blockedDomains)
  }

  getStats(): { enabled: boolean; blockedDomains: number } {
    return {
      enabled: this.isEnabled,
      blockedDomains: this.blockedDomains.size
    }
  }
}
