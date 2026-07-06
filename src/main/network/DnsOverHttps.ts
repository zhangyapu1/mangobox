import fetch from 'electron-fetch'

interface DohServer {
  name: string
  url: string
  ips?: string[]
}

interface DnsResponse {
  Status: number
  Answer?: Array<{
    name: string
    type: number
    TTL: number
    data: string
  }>
}

/**
 * DnsOverHttps - DNS-over-HTTPS resolver
 * Supports Google, Cloudflare, AdGuard, and other DoH providers
 */
export class DnsOverHttps {
  private servers: DohServer[] = [
    {
      name: 'Google',
      url: 'https://dns.google/dns-query',
      ips: ['8.8.8.8', '8.8.4.4']
    },
    {
      name: 'Cloudflare',
      url: 'https://cloudflare-dns.com/dns-query',
      ips: ['1.1.1.1', '1.0.0.1']
    },
    {
      name: 'AdGuard',
      url: 'https://dns.adguard.com/dns-query',
      ips: ['94.140.14.14', '94.140.15.15']
    },
    {
      name: 'Quad9',
      url: 'https://dns.quad9.net:5053/dns-query',
      ips: ['9.9.9.9', '149.112.112.112']
    }
  ]

  private activeServer: DohServer
  private cache: Map<string, { ip: string; expiry: number }> = new Map()

  constructor() {
    this.activeServer = this.servers[0] // Default to Google
  }

  setServer(serverName: string): void {
    const server = this.servers.find(s => s.name === serverName)
    if (server) {
      this.activeServer = server
      this.cache.clear()
    }
  }

  setCustomServer(url: string, name: string = 'Custom'): void {
    this.activeServer = { name, url }
    this.cache.clear()
  }

  getServers(): DohServer[] {
    return this.servers
  }

  getActiveServer(): DohServer {
    return this.activeServer
  }

  async resolve(hostname: string): Promise<string | null> {
    // Check cache first
    const cached = this.cache.get(hostname)
    if (cached && cached.expiry > Date.now()) {
      return cached.ip
    }

    try {
      const response = await this.queryDns(hostname)

      if (response && response.Answer && response.Answer.length > 0) {
        // Find A record (type 1)
        const aRecord = response.Answer.find(r => r.type === 1)
        if (aRecord) {
          // Cache the result
          this.cache.set(hostname, {
            ip: aRecord.data,
            expiry: Date.now() + (aRecord.TTL * 1000)
          })
          return aRecord.data
        }
      }

      return null
    } catch (error) {
      console.error('DNS resolution failed:', error)
      return null
    }
  }

  private async queryDns(hostname: string): Promise<DnsResponse | null> {
    const url = `${this.activeServer.url}?name=${encodeURIComponent(hostname)}&type=A`

    try {
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/dns-json'
        },
        timeout: 5000
      })

      if (response.ok) {
        return await response.json() as DnsResponse
      }

      return null
    } catch (error) {
      console.error('DoH query failed:', error)
      return null
    }
  }

  async resolveMultiple(hostnames: string[]): Promise<Map<string, string | null>> {
    const results = new Map<string, string | null>()

    // Resolve in parallel
    const promises = hostnames.map(async hostname => {
      const ip = await this.resolve(hostname)
      results.set(hostname, ip)
    })

    await Promise.all(promises)
    return results
  }

  clearCache(): void {
    this.cache.clear()
  }

  getCacheSize(): number {
    return this.cache.size
  }

  getStats(): { server: string; cacheSize: number; cacheHits: number } {
    return {
      server: this.activeServer.name,
      cacheSize: this.cache.size,
      cacheHits: 0 // Would need to track this
    }
  }
}
