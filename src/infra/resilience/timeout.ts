// To implement paymentModule
// src/infra/resilience/with-timeout.ts

export class TimeoutError extends Error {
  constructor(
    public readonly label: string,
    public readonly timeoutMs: number,
  ) {
    super(`Timeout after ${timeoutMs}ms: ${label}`)
    this.name = 'TimeoutError'
  }
}

/**
 * Corta una promesa si tarda más de `timeoutMs`.
 * No cancela la promesa original, pero:
 *   - Rechaza con `TimeoutError` para que el caller pueda reaccionar.
 *   - Limpia el timer.
 *   - Evita `UnhandledPromiseRejection` si la original falla después.
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  label = 'operation',
): Promise<T> {
  if (timeoutMs <= 0) throw new Error(`withTimeout: timeoutMs must be > 0 (got ${timeoutMs})`)

  let timer: NodeJS.Timeout | undefined

  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(new TimeoutError(label, timeoutMs))
    }, timeoutMs)
    timer.unref?.()
  })

  try {
    return await Promise.race([promise, timeoutPromise])
  } finally {
    if (timer) clearTimeout(timer)
    // La promise original sigue viva después del timeout.
    // Le colgamos un catch no-op para que no explote como unhandled.
    promise.catch(() => undefined)
  }
}
