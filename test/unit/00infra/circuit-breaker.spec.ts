// test/unit/infra/resilience/circuit-breaker.spec.ts
import { CircuitBreaker, CircuitOpenError } from '@infra/resilience'
import { TimeoutError } from '@infra/resilience'

const OK = async () => 'ok'
const failWithTimeout = async () => {
  throw new TimeoutError('op', 100)
}

describe('CircuitBreaker', () => {
  describe('CLOSED (camino feliz)', () => {
    it('arranca CLOSED', () => {
      const cb = new CircuitBreaker({ threshold: 3, resetMs: 1000 })
      expect(cb.getState()).toBe('CLOSED')
    })

    it('devuelve el valor si la fn tiene éxito', async () => {
      const cb = new CircuitBreaker({ threshold: 3, resetMs: 1000 })
      expect(await cb.exec(OK)).toBe('ok')
      expect(cb.getState()).toBe('CLOSED')
    })

    it('no cuenta errores no-countables', async () => {
      const cb = new CircuitBreaker({
        threshold: 2,
        resetMs: 1000,
        shouldCount: () => false,
      })
      for (let i = 0; i < 10; i++) {
        await expect(
          cb.exec(async () => {
            throw new Error('x')
          }),
        ).rejects.toThrow()
      }
      expect(cb.getState()).toBe('CLOSED')
    })
  })

  describe('apertura', () => {
    it('abre después de N fallos consecutivos', async () => {
      const cb = new CircuitBreaker({ threshold: 3, resetMs: 60_000 })
      for (let i = 0; i < 3; i++) {
        await expect(cb.exec(failWithTimeout)).rejects.toBeInstanceOf(TimeoutError)
      }
      expect(cb.getState()).toBe('OPEN')
    })

    it('rechaza inmediatamente con CircuitOpenError si está OPEN', async () => {
      const cb = new CircuitBreaker({ threshold: 2, resetMs: 60_000 })
      await expect(cb.exec(failWithTimeout)).rejects.toThrow()
      await expect(cb.exec(failWithTimeout)).rejects.toThrow()

      const fn = jest.fn().mockResolvedValue('never')
      await expect(cb.exec(fn)).rejects.toBeInstanceOf(CircuitOpenError)
      expect(fn).not.toHaveBeenCalled()
    })

    it('un éxito resetea consecutiveFailures', async () => {
      const cb = new CircuitBreaker({ threshold: 3, resetMs: 60_000 })
      await expect(cb.exec(failWithTimeout)).rejects.toThrow()
      await expect(cb.exec(failWithTimeout)).rejects.toThrow()
      await cb.exec(OK) // success
      await expect(cb.exec(failWithTimeout)).rejects.toThrow()
      await expect(cb.exec(failWithTimeout)).rejects.toThrow()
      // Solo 2 desde el éxito → sigue CLOSED
      expect(cb.getState()).toBe('CLOSED')
    })
  })

  describe('HALF_OPEN', () => {
    beforeEach(() => jest.useFakeTimers())
    afterEach(() => jest.useRealTimers())

    it('pasa a HALF_OPEN tras resetMs', async () => {
      const cb = new CircuitBreaker({ threshold: 2, resetMs: 1000 })
      await expect(cb.exec(failWithTimeout)).rejects.toThrow()
      await expect(cb.exec(failWithTimeout)).rejects.toThrow()
      expect(cb.getState()).toBe('OPEN')

      jest.advanceTimersByTime(1100)

      // La próxima llamada dispara la transición
      await cb.exec(OK)
      expect(cb.getState()).toBe('CLOSED')
    })

    it('vuelve a OPEN si el probe falla', async () => {
      const cb = new CircuitBreaker({ threshold: 2, resetMs: 1000 })
      await expect(cb.exec(failWithTimeout)).rejects.toThrow()
      await expect(cb.exec(failWithTimeout)).rejects.toThrow()

      jest.advanceTimersByTime(1100)

      await expect(cb.exec(failWithTimeout)).rejects.toThrow()
      expect(cb.getState()).toBe('OPEN')
    })

    it('solo UNA request en HALF_OPEN a la vez', async () => {
      const cb = new CircuitBreaker({ threshold: 2, resetMs: 1000 })
      await expect(cb.exec(failWithTimeout)).rejects.toThrow()
      await expect(cb.exec(failWithTimeout)).rejects.toThrow()

      jest.advanceTimersByTime(1100)

      // Probe lento que no resuelve hasta que lo digamos
      let resolveProbe: (v: string) => void
      const slowProbe = new Promise<string>((r) => {
        resolveProbe = r
      })
      const probe = cb.exec(() => slowProbe)

      // Segundo request llega mientras el probe está en vuelo
      await expect(cb.exec(OK)).rejects.toBeInstanceOf(CircuitOpenError)

      resolveProbe!('ok')
      expect(await probe).toBe('ok')
      expect(cb.getState()).toBe('CLOSED')
    })

    it('requiere N éxitos consecutivos si halfOpenAttempts > 1', async () => {
      const cb = new CircuitBreaker({
        threshold: 2,
        resetMs: 1000,
        halfOpenAttempts: 2,
      })
      await expect(cb.exec(failWithTimeout)).rejects.toThrow()
      await expect(cb.exec(failWithTimeout)).rejects.toThrow()

      jest.advanceTimersByTime(1100)
      await cb.exec(OK)
      expect(cb.getState()).toBe('HALF_OPEN') // falta 1 más

      await cb.exec(OK)
      expect(cb.getState()).toBe('CLOSED')
    })
  })

  describe('callbacks', () => {
    it('onStateChange se llama en cada transición', async () => {
      const cb = new CircuitBreaker({
        threshold: 1,
        resetMs: 60_000,
        onStateChange: jest.fn(),
      })
      const spy = cb['onStateChange'] as jest.Mock

      await expect(cb.exec(failWithTimeout)).rejects.toThrow()

      expect(spy).toHaveBeenCalledWith('CLOSED', 'OPEN', 'threshold_reached:1')
    })

    it('onRejected se llama cuando rechaza por OPEN', async () => {
      const cb = new CircuitBreaker({
        threshold: 1,
        resetMs: 60_000,
        onRejected: jest.fn(),
      })
      await expect(cb.exec(failWithTimeout)).rejects.toThrow()

      const spy = cb['onRejected'] as jest.Mock
      await expect(cb.exec(OK)).rejects.toBeInstanceOf(CircuitOpenError)

      expect(spy).toHaveBeenCalledWith('OPEN', expect.any(Number))
    })

    it('reset() cierra el breaker manualmente', async () => {
      const cb = new CircuitBreaker({ threshold: 1, resetMs: 60_000 })
      await expect(cb.exec(failWithTimeout)).rejects.toThrow()
      expect(cb.getState()).toBe('OPEN')

      cb.reset()
      expect(cb.getState()).toBe('CLOSED')
    })
  })

  describe('validación', () => {
    it('rechaza threshold < 1', () => {
      expect(() => new CircuitBreaker({ threshold: 0 })).toThrow()
    })
    it('rechaza resetMs < 1', () => {
      expect(() => new CircuitBreaker({ threshold: 1, resetMs: 0 })).toThrow()
    })
    it('rechaza halfOpenAttempts < 1', () => {
      expect(() => new CircuitBreaker({ halfOpenAttempts: 0 })).toThrow()
    })
  })
})
