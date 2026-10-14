// src/infra/resilience/with-retry.ts
import { TimeoutError } from './timeout'

export interface RetryOptions {
  /** Total de intentos (incluyendo el primero). Default: 3 */
  attempts?: number
  /** Backoff base. Default: 1000ms */
  baseMs?: number
  /** Tope del backoff. Default: 8000ms */
  maxMs?: number
  /** Jitter (equal jitter: [exp/2, exp]). Default: true */
  jitter?: boolean
  /** Predicado: ¿este error merece un retry? */
  shouldRetry?: (err: unknown) => boolean
  /** Callback invocado antes de cada espera */
  onRetry?: (attempt: number, err: unknown, delayMs: number) => void
  /** Cancelación cooperativa */
  signal?: AbortSignal
}

export class RetryExhaustedError extends Error {
  constructor(
    public readonly attempts: number,
    public readonly lastError: unknown,
  ) {
    super(
      `Retry exhausted after ${attempts} attempts: ${
        lastError instanceof Error ? lastError.message : String(lastError)
      }`,
    )
    this.name = 'RetryExhaustedError'
    ;(this as Error & { cause?: unknown }).cause = lastError
  }
}

const RETRYABLE_PATTERNS = ['econnreset', 'etimedout', 'econnrefused', 'socket hang up']

/**
 * Default conservador: solo retrya lo que reconoce como transitorio.
 * NO retrya errores de negocio (validación, conflicto, etc.) porque
 * un retry sobre una operación no-idempotente puede duplicar efectos.
 */
export function defaultShouldRetry(err: unknown): boolean {
  if (err instanceof TimeoutError) return true

  if (err instanceof Error) {
    const msg = err.message.toLowerCase()
    return RETRYABLE_PATTERNS.some((p) => msg.includes(p))
  }

  return false
}

export async function withRetry<T>(fn: () => Promise<T>, options: RetryOptions = {}): Promise<T> {
  const {
    attempts = 3,
    baseMs = 1000,
    maxMs = 8000,
    jitter = true,
    shouldRetry = defaultShouldRetry,
    onRetry,
    signal,
  } = options

  if (attempts < 1) {
    throw new Error('withRetry: attempts must be >= 1')
  }

  let lastErr: unknown

  for (let attempt = 1; attempt <= attempts; attempt++) {
    if (signal?.aborted) {
      throw signal.reason ?? new Error('Aborted')
    }

    try {
      return await fn()
    } catch (err) {
      lastErr = err

      const isLast = attempt === attempts
      const retryable = shouldRetry(err)

      if (isLast || !retryable) {
        break
      }

      const delayMs = computeBackoff(attempt, baseMs, maxMs, jitter)
      onRetry?.(attempt, err, delayMs)

      await sleep(delayMs, signal)
    }
  }

  throw new RetryExhaustedError(attempts, lastErr)
}

function computeBackoff(attempt: number, baseMs: number, maxMs: number, jitter: boolean): number {
  // attempt=1 → baseMs, attempt=2 → 2*baseMs, ...
  const exp = Math.min(baseMs * 2 ** (attempt - 1), maxMs)
  if (!jitter) return exp

  // Equal jitter: [exp/2, exp). Evita el "0ms" del full jitter,
  // y reparte la carga para no sincronizar retries entre instancias.
  const half = exp / 2
  return Math.floor(half + Math.random() * half)
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(signal.reason ?? new Error('Aborted'))
      return
    }

    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort)
      resolve()
    }, ms)
    timer.unref?.()

    const onAbort = () => {
      clearTimeout(timer)
      reject(signal?.reason ?? new Error('Aborted'))
    }
    signal?.addEventListener('abort', onAbort, { once: true })
  })
}
