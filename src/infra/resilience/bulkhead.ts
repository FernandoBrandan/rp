// src/infra/resilience/bulkhead.ts

export interface BulkheadOptions {
  /** Ejecuciones simultáneas máximas. Default: 10 */
  maxConcurrent?: number
  /** Máximo de llamadas en cola esperando slot. Default: 20 */
  maxQueue?: number
  /** Tiempo máximo esperando slot antes de rechazar. Default: 5000ms */
  queueTimeoutMs?: number
  /** Nombre para logs y métricas */
  name?: string
  /** Callback cuando se rechaza por saturación */
  onRejected?: (reason: 'QUEUE_FULL' | 'QUEUE_TIMEOUT', queueSize: number) => void
  /** Callback cuando una ejecución empieza/termina (útil para métricas) */
  onExec?: (active: number, queued: number) => void
}

export class BulkheadFullError extends Error {
  constructor(
    public readonly bulkheadName: string,
    public readonly reason: 'QUEUE_FULL' | 'QUEUE_TIMEOUT',
    public readonly queueSize: number,
  ) {
    super(`Bulkhead "${bulkheadName}" is full (${reason}, queue=${queueSize})`)
    this.name = 'BulkheadFullError'
  }
}

interface Waiter {
  resolve: (release: () => void) => void
  reject: (err: unknown) => void
  timer: NodeJS.Timeout
  signal?: AbortSignal
}

export class Bulkhead {
  private active = 0
  private readonly queue: Waiter[] = []

  private readonly maxConcurrent: number
  private readonly maxQueue: number
  private readonly queueTimeoutMs: number
  private readonly name: string
  private readonly onRejected?: BulkheadOptions['onRejected']
  private readonly onExec?: BulkheadOptions['onExec']

  constructor(options: BulkheadOptions = {}) {
    this.maxConcurrent = options.maxConcurrent ?? 10
    this.maxQueue = options.maxQueue ?? 20
    this.queueTimeoutMs = options.queueTimeoutMs ?? 5000
    this.name = options.name ?? 'unnamed'
    this.onRejected = options.onRejected
    this.onExec = options.onExec

    if (this.maxConcurrent < 1) throw new Error('maxConcurrent must be >= 1')
    if (this.maxQueue < 0) throw new Error('maxQueue must be >= 0')
    if (this.queueTimeoutMs < 1) throw new Error('queueTimeoutMs must be >= 1')
  }

  async exec<T>(fn: () => Promise<T>, signal?: AbortSignal): Promise<T> {
    const release = await this.acquire(signal)

    this.onExec?.(this.active, this.queue.length)

    try {
      return await fn()
    } finally {
      release()
      this.onExec?.(this.active, this.queue.length)
    }
  }

  getMetrics(): {
    active: number
    queued: number
    capacity: number
    queueCapacity: number
  } {
    return {
      active: this.active,
      queued: this.queue.length,
      capacity: this.maxConcurrent,
      queueCapacity: this.maxQueue,
    }
  }

  private acquire(signal?: AbortSignal): Promise<() => void> {
    // Camino rápido: hay slot libre Y no hay cola esperando
    if (this.active < this.maxConcurrent && this.queue.length === 0) {
      this.active++
      return Promise.resolve(this.makeRelease())
    }

    // No hay slot → intentar encolar
    if (this.queue.length >= this.maxQueue) {
      this.onRejected?.('QUEUE_FULL', this.queue.length)
      return Promise.reject(new BulkheadFullError(this.name, 'QUEUE_FULL', this.queue.length))
    }

    return new Promise<() => void>((resolve, reject) => {
      const waiter: Waiter = {
        resolve,
        reject,
        signal,
        timer: setTimeout(() => {
          this.removeFromQueue(waiter)
          this.onRejected?.('QUEUE_TIMEOUT', this.queue.length)
          reject(new BulkheadFullError(this.name, 'QUEUE_TIMEOUT', this.queue.length))
        }, this.queueTimeoutMs),
      }
      waiter.timer.unref?.()

      if (signal) {
        if (signal.aborted) {
          clearTimeout(waiter.timer)
          reject(signal.reason ?? new Error('Aborted'))
          return
        }
        signal.addEventListener(
          'abort',
          () => {
            this.removeFromQueue(waiter)
            clearTimeout(waiter.timer)
            reject(signal.reason ?? new Error('Aborted'))
          },
          { once: true },
        )
      }

      this.queue.push(waiter)
    })
  }

  private makeRelease(): () => void {
    let released = false
    return () => {
      if (released) return
      released = true
      this.active--

      // Si hay alguien esperando, promovemos al siguiente
      const next = this.queue.shift()
      if (next) {
        clearTimeout(next.timer)
        this.active++
        next.resolve(this.makeRelease())
      }
    }
  }

  private removeFromQueue(waiter: Waiter): void {
    const idx = this.queue.indexOf(waiter)
    if (idx !== -1) this.queue.splice(idx, 1)
  }
}
