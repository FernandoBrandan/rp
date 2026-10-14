import { Inject, Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { EventEmitter2 } from '@nestjs/event-emitter'
import { EventNames, OrderPaidEvent, OrderPaymentFailedEvent } from '@common/events'
import { Logger } from '@infra/logger/logger.interface'
import { LOGGER } from '@infra/tokens'
import {
  PaymentOrderSnapshot,
  PaymentProviderPort,
} from '../../application/ports/payment-provider.port'

type FakeOutcome = 'approved' | 'failed' | 'pending' | 'flaky' | 'timeout'

@Injectable()
export class FakePaymentProvider implements PaymentProviderPort {
  private readonly outcome: FakeOutcome
  private readonly delayMs: number
  private readonly generationDelayMs: number
  private readonly timeoutRate: number
  private readonly failureRate: number

  constructor(
    private readonly eventEmitter: EventEmitter2,

    private readonly config: ConfigService,

    @Inject(LOGGER)
    private readonly logger: Logger,
  ) {
    this.outcome = this.config.get<FakeOutcome>('FAKE_PAYMENT_OUTCOME', 'approved')
    this.delayMs = Number(this.config.get<string>('FAKE_PAYMENT_DELAY_MS', '3000'))
    this.generationDelayMs = Number(
      this.config.get<string>('FAKE_PAYMENT_GENERATION_DELAY_MS', '0'),
    )
    this.timeoutRate = Number(this.config.get<string>('FAKE_PAYMENT_TIMEOUT_RATE', '0'))
    this.failureRate = Number(this.config.get<string>('FAKE_PAYMENT_FAILURE_RATE', '0'))
  }

  async generatePaymentLink(order: PaymentOrderSnapshot): Promise<{ url: string }> {
    const roll = Math.random()
    const effectiveOutcome = this.resolveOutcome(roll)

    // En modo flaky, "timeout" significa: dormir más que el timeout del caller
    if (effectiveOutcome === 'timeout') {
      const sleep = this.generationDelayMs || 30_000
      this.logger.warn('FakePaymentProvider: simulating timeout', {
        event: 'fake_payment_simulating_timeout',
        orderId: order.id,
        sleepMs: sleep,
      })
      await new Promise((resolve) => setTimeout(resolve, sleep).unref())
      // Si llegamos acá, el caller ya cortó. Igual devolvemos algo.
      return { url: `http://fake-payment.local/pay/${order.id}` }
    }

    if (effectiveOutcome === 'failed') {
      this.logger.warn('FakePaymentProvider: simulating immediate failure', {
        event: 'fake_payment_simulating_failure',
        orderId: order.id,
      })
      throw new Error('Simulated provider failure')
    }

    // approved | pending → comportamiento normal
    if (this.generationDelayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, this.generationDelayMs).unref())
    }

    const url = `http://fake-payment.local/pay/${order.id}`
    this.logger.info('FakePaymentProvider: link generated', {
      orderId: order.id,
      url,
      outcome: effectiveOutcome,
      delayMs: this.delayMs,
    })

    this.scheduleOutcome(order.id, effectiveOutcome)

    return { url }
  }

  private resolveOutcome(_roll: number): 'approved' | 'failed' | 'pending' | 'timeout' {
    if (this.outcome === 'flaky') {
      const r = Math.random()
      if (r < this.timeoutRate) return 'timeout'
      if (r < this.timeoutRate + this.failureRate) return 'failed'
      return 'approved'
    }
    if (this.outcome === 'timeout') return 'timeout'
    return this.outcome
  }

  private scheduleOutcome(orderId: string, outcome: 'approved' | 'failed' | 'pending' | 'timeout') {
    if (outcome === 'pending' || outcome === 'timeout') return

    setTimeout(() => {
      if (outcome === 'approved') {
        this.eventEmitter.emit(EventNames.ORDER_PAID, new OrderPaidEvent(orderId))
        return
      }
      this.eventEmitter.emit(
        EventNames.ORDER_PAYMENT_FAILED,
        new OrderPaymentFailedEvent(orderId, 'fake_provider_failed'),
      )
    }, this.delayMs).unref()
  }
}
