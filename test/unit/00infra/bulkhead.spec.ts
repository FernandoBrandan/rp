// test/unit/00infra/bulkhead.spec.ts
import { Bulkhead, BulkheadFullError } from '@infra/resilience'

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms))

describe('Bulkhead', () => {
  describe('camino feliz', () => {
    it('ejecuta dentro del límite sin encolar', async () => {
      const bh = new Bulkhead({ maxConcurrent: 3, maxQueue: 10 })

      const result = await bh.exec(async () => 'ok')

      expect(result).toBe('ok')
      expect(bh.getMetrics().active).toBe(0)
      expect(bh.getMetrics().queued).toBe(0)
    })

    it('permite maxConcurrent ejecuciones simultáneas', async () => {
      const bh = new Bulkhead({ maxConcurrent: 2, maxQueue: 10 })

      let concurrent = 0
      let maxSeen = 0
      const task = () =>
        bh.exec(async () => {
          concurrent++
          maxSeen = Math.max(maxSeen, concurrent)
          await delay(50)
          concurrent--
        })

      await Promise.all([task(), task(), task(), task()])

      expect(maxSeen).toBe(2)
    })

    it('libera el slot aunque la fn tire error', async () => {
      const bh = new Bulkhead({ maxConcurrent: 1, maxQueue: 0 })

      await expect(
        bh.exec(async () => {
          throw new Error('boom')
        }),
      ).rejects.toThrow('boom')
      expect(bh.getMetrics().active).toBe(0)

      // El siguiente debe poder entrar
      const result = await bh.exec(async () => 'ok')
      expect(result).toBe('ok')
    })
  })

  describe('saturación', () => {
    it('rechaza con QUEUE_FULL si la cola está llena (maxQueue=0)', async () => {
      const bh = new Bulkhead({ maxConcurrent: 1, maxQueue: 0 })

      const blocker = bh.exec(() => delay(100))

      await expect(bh.exec(async () => 'never')).rejects.toBeInstanceOf(BulkheadFullError)
      await blocker
    })

    it('encola si hay maxQueue > 0', async () => {
      const bh = new Bulkhead({ maxConcurrent: 1, maxQueue: 5 })

      const blocker = bh.exec(() => delay(50))
      const queued = bh.exec(async () => 'ok')

      expect(bh.getMetrics().queued).toBe(1)
      expect(await queued).toBe('ok')
      await blocker
    })

    it('rechaza con QUEUE_TIMEOUT si espera demasiado', async () => {
      jest.useFakeTimers()
      const bh = new Bulkhead({
        maxConcurrent: 1,
        maxQueue: 5,
        queueTimeoutMs: 100,
      })

      const blocker = bh.exec(() => new Promise((r) => setTimeout(r, 10_000)))

      const pending = bh.exec(async () => 'never')
      const caught = pending.catch((e) => e)

      jest.advanceTimersByTime(150)

      const err = await caught
      expect(err).toBeInstanceOf(BulkheadFullError)
      expect((err as BulkheadFullError).reason).toBe('QUEUE_TIMEOUT')

      jest.useRealTimers()
      // Limpieza: no esperamos al blocker, lo dejamos morir con el proceso de test
      void blocker.catch(() => undefined)
    })

    it('promueve al primero de la cola cuando se libera un slot (FIFO)', async () => {
      const bh = new Bulkhead({ maxConcurrent: 1, maxQueue: 5 })

      const order: string[] = []

      const blocker = bh.exec(async () => {
        await delay(50)
        order.push('blocker')
      })

      const q1 = bh.exec(async () => {
        order.push('q1')
      })
      const q2 = bh.exec(async () => {
        order.push('q2')
      })

      await Promise.all([blocker, q1, q2])

      expect(order).toEqual(['blocker', 'q1', 'q2'])
    })
  })

  describe('callbacks', () => {
    it('onRejected con QUEUE_FULL', async () => {
      const onRejected = jest.fn()
      const bh = new Bulkhead({ maxConcurrent: 1, maxQueue: 0, onRejected })

      const blocker = bh.exec(() => delay(50))
      await expect(bh.exec(async () => 'x')).rejects.toBeInstanceOf(BulkheadFullError)

      expect(onRejected).toHaveBeenCalledWith('QUEUE_FULL', 0)
      await blocker
    })

    it('onExec reporta active/queued', async () => {
      const onExec = jest.fn()
      const bh = new Bulkhead({ maxConcurrent: 2, maxQueue: 5, onExec })

      await bh.exec(async () => 'ok')

      expect(onExec).toHaveBeenCalled()
    })
  })

  describe('AbortSignal', () => {
    it('rechaza si ya estaba abortado al encolar', async () => {
      const bh = new Bulkhead({ maxConcurrent: 1, maxQueue: 5 })

      const blocker = bh.exec(() => delay(50))

      const controller = new AbortController()
      controller.abort(new Error('cancelled'))

      await expect(bh.exec(async () => 'x', controller.signal)).rejects.toThrow('cancelled')

      await blocker
    })
  })

  describe('validación', () => {
    it('rechaza maxConcurrent < 1', () => {
      expect(() => new Bulkhead({ maxConcurrent: 0 })).toThrow()
    })
    it('rechaza maxQueue < 0', () => {
      expect(() => new Bulkhead({ maxQueue: -1 })).toThrow()
    })
    it('rechaza queueTimeoutMs < 1', () => {
      expect(() => new Bulkhead({ queueTimeoutMs: 0 })).toThrow()
    })
  })
})
