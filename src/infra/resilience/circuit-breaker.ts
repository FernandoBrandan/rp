// src/infra/resilience/circuit-breaker.ts
import { defaultShouldRetry } from './retry'

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN'

export interface CircuitBreakerOptions {
  /** Fallos consecutivos antes de abrir. Default: 5 */
  threshold?: number
  /** Tiempo en OPEN antes de probar HALF_OPEN. Default: 30000ms */
  resetMs?: number
  /** Éxitos en HALF_OPEN requeridos para cerrar. Default: 1 */
  halfOpenAttempts?: number
  /** ¿Este error cuenta para abrir el breaker? Default: defaultShouldRetry */
  shouldCount?: (err: unknown) => boolean
  /** Identificador para logs y métricas */
  name?: string
  /** Callback en cada transición de estado */
  onStateChange?: (from: CircuitState, to: CircuitState, reason: string) => void
  /** Callback cuando se rechaza una request por OPEN o HALF_OPEN ocupado */
  onRejected?: (reason: 'OPEN' | 'HALF_OPEN_BUSY', ageMs: number) => void
}

export class CircuitOpenError extends Error {
  constructor(
    public readonly circuitName: string,
    public readonly openedAgoMs: number,
    public readonly reason: 'OPEN' | 'HALF_OPEN_BUSY',
  ) {
    super(`Circuit "${circuitName}" is ${reason} (opened ${openedAgoMs}ms ago)`)
    this.name = 'CircuitOpenError'
  }
}

export class CircuitBreaker {
  private state: CircuitState = 'CLOSED'
  private consecutiveFailures = 0
  private openedAt?: number
  private halfOpenInFlight = false
  private halfOpenSuccesses = 0

  private readonly threshold: number
  private readonly resetMs: number
  private readonly halfOpenAttempts: number
  private readonly shouldCount: (err: unknown) => boolean
  private readonly name: string
  private readonly onStateChange?: CircuitBreakerOptions['onStateChange']
  private readonly onRejected?: CircuitBreakerOptions['onRejected']

  constructor(options: CircuitBreakerOptions = {}) {
    this.threshold = options.threshold ?? 5
    this.resetMs = options.resetMs ?? 30_000
    this.halfOpenAttempts = options.halfOpenAttempts ?? 1
    this.shouldCount = options.shouldCount ?? defaultShouldRetry
    this.name = options.name ?? 'unnamed'
    this.onStateChange = options.onStateChange
    this.onRejected = options.onRejected

    if (this.threshold < 1) throw new Error('threshold must be >= 1')
    if (this.resetMs < 1) throw new Error('resetMs must be >= 1')
    if (this.halfOpenAttempts < 1) throw new Error('halfOpenAttempts must be >= 1')
  }

  async exec<T>(fn: () => Promise<T>): Promise<T> {
    this.checkState()

    if (this.state === 'HALF_OPEN') {
      if (this.halfOpenInFlight) {
        this.onRejected?.('HALF_OPEN_BUSY', 0)
        throw new CircuitOpenError(this.name, 0, 'HALF_OPEN_BUSY')
      }
      this.halfOpenInFlight = true
    }

    try {
      const result = await fn()
      this.onSuccess()
      return result
    } catch (err) {
      this.onFailure(err)
      throw err
    } finally {
      if (this.state === 'HALF_OPEN') {
        this.halfOpenInFlight = false
      }
    }
  }

  getState(): CircuitState {
    return this.state
  }

  getMetrics(): {
    state: CircuitState
    consecutiveFailures: number
    openedAt?: number
    openedAgoMs?: number
  } {
    return {
      state: this.state,
      consecutiveFailures: this.consecutiveFailures,
      openedAt: this.openedAt,
      openedAgoMs: this.openedAt ? Date.now() - this.openedAt : undefined,
    }
  }

  /** Solo para tests y kill-switch administrativo */
  reset(): void {
    const from = this.state
    this.state = 'CLOSED'
    this.consecutiveFailures = 0
    this.openedAt = undefined
    this.halfOpenInFlight = false
    this.halfOpenSuccesses = 0
    if (from !== 'CLOSED') {
      this.onStateChange?.(from, 'CLOSED', 'manual_reset')
    }
  }

  private checkState(): void {
    if (this.state !== 'OPEN') return

    const age = Date.now() - (this.openedAt ?? Date.now())
    if (age < this.resetMs) {
      this.onRejected?.('OPEN', age)
      throw new CircuitOpenError(this.name, age, 'OPEN')
    }

    // Reset time elapsed → probe con HALF_OPEN
    this.transitionTo('HALF_OPEN', 'reset_timeout_elapsed')
  }

  private onSuccess(): void {
    if (this.state === 'HALF_OPEN') {
      this.halfOpenSuccesses++
      if (this.halfOpenSuccesses >= this.halfOpenAttempts) {
        this.consecutiveFailures = 0
        this.halfOpenSuccesses = 0
        this.openedAt = undefined
        this.transitionTo('CLOSED', 'half_open_success')
      }
      return
    }
    this.consecutiveFailures = 0
  }

  private onFailure(err: unknown): void {
    if (!this.shouldCount(err)) return

    if (this.state === 'HALF_OPEN') {
      this.halfOpenSuccesses = 0
      this.openedAt = Date.now()
      this.transitionTo('OPEN', 'half_open_failure')
      return
    }

    this.consecutiveFailures++
    if (this.consecutiveFailures >= this.threshold) {
      this.openedAt = Date.now()
      this.transitionTo('OPEN', `threshold_reached:${this.consecutiveFailures}`)
    }
  }

  private transitionTo(next: CircuitState, reason: string): void {
    if (this.state === next) return
    const from = this.state
    this.state = next
    this.onStateChange?.(from, next, reason)
  }
}
