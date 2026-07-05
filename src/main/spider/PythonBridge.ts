import { spawn, ChildProcess } from 'child_process'
import { join } from 'path'
import { app } from 'electron'
import { existsSync } from 'fs'

interface RpcRequest {
  id: number
  method: string
  params: any
}

interface RpcResponse {
  id: number
  result?: any
  error?: string
}

export class PythonBridge {
  private process: ChildProcess | null = null
  private requestId = 0
  private pendingRequests: Map<number, { resolve: Function; reject: Function }> = new Map()
  private buffer = ''

  constructor() {
    this.init()
  }

  private init(): void {
    // Try to find Python executable
    const pythonPath = this.findPython()

    if (!pythonPath) {
      console.warn('Python not found. Spider execution will not be available.')
      return
    }

    // Spawn Python process with the executor script
    const executorPath = join(app.getAppPath(), 'resources', 'python', 'spider_executor.py')

    if (!existsSync(executorPath)) {
      console.warn('spider_executor.py not found')
      return
    }

    this.process = spawn(pythonPath, [executorPath], {
      stdio: ['pipe', 'pipe', 'pipe']
    })

    if (this.process.stdout) {
      this.process.stdout.on('data', (data: Buffer) => {
        this.handleOutput(data.toString())
      })
    }

    if (this.process.stderr) {
      this.process.stderr.on('data', (data: Buffer) => {
        console.error('Python stderr:', data.toString())
      })
    }

    this.process.on('exit', (code) => {
      console.log('Python process exited with code:', code)
      this.process = null
    })

    this.process.on('error', (err) => {
      console.error('Python process error:', err)
      this.process = null
    })
  }

  private findPython(): string | null {
    // Check for embedded Python first
    const embeddedPython = join(app.getAppPath(), 'resources', 'python', 'python.exe')
    if (existsSync(embeddedPython)) {
      return embeddedPython
    }

    // Check for system Python
    const paths = ['python', 'python3', 'py']
    for (const p of paths) {
      // In production, we would check if the command exists
      // For now, return 'python' and hope it's in PATH
      return p
    }

    return null
  }

  private handleOutput(data: string): void {
    this.buffer += data

    // Process complete lines
    const lines = this.buffer.split('\n')
    this.buffer = lines.pop() || '' // Keep incomplete line in buffer

    for (const line of lines) {
      if (!line.trim()) continue

      try {
        const response = JSON.parse(line) as RpcResponse
        const pending = this.pendingRequests.get(response.id)

        if (pending) {
          this.pendingRequests.delete(response.id)
          if (response.error) {
            pending.reject(new Error(response.error))
          } else {
            pending.resolve(response.result)
          }
        }
      } catch (e) {
        console.error('Failed to parse Python output:', line, e)
      }
    }
  }

  async call(method: string, params: any = {}): Promise<any> {
    if (!this.process) {
      throw new Error('Python process not running')
    }

    const id = ++this.requestId
    const request: RpcRequest = { id, method, params }

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject })

      // Send request to Python process
      this.process!.stdin!.write(JSON.stringify(request) + '\n')

      // Timeout after 30 seconds
      setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id)
          reject(new Error('Request timeout'))
        }
      }, 30000)
    })
  }

  async loadSpider(key: string, pyUrl: string): Promise<void> {
    await this.call('load_spider', { key, py_url: pyUrl })
  }

  async homeContent(key: string, filter: boolean = true): Promise<any> {
    return await this.call('homeContent', { key, filter })
  }

  async homeVideoContent(key: string): Promise<any> {
    return await this.call('homeVideoContent', { key })
  }

  async categoryContent(key: string, tid: string, pg: number, filter: boolean = true, extend: any = {}): Promise<any> {
    return await this.call('categoryContent', { key, tid, pg: pg.toString(), filter, extend })
  }

  async detailContent(key: string, ids: string[]): Promise<any> {
    return await this.call('detailContent', { key, ids })
  }

  async playerContent(key: string, flag: string, id: string, vipFlags: string[] = []): Promise<any> {
    return await this.call('playerContent', { key, flag, id, vipFlags })
  }

  async searchContent(key: string, keyword: string, quick: boolean = false, pg: number = 1): Promise<any> {
    return await this.call('searchContent', { key, keyword, quick, pg: pg.toString() })
  }

  async destroy(key: string): Promise<void> {
    await this.call('destroy', { key })
  }

  destroyAll(): void {
    if (this.process) {
      this.process.kill()
      this.process = null
    }
  }
}
