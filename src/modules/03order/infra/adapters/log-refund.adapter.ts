import { Inject, Injectable } from '@nestjs/common'
import { Logger } from '@infra/logger/logger.interface'
import { LOGGER } from '@infra/tokens'
import { RefundInput, RefundPort, RefundResult } from '@order/application/ports/refund.port'

@Injectable()
export class LogRefundAdapter implements RefundPort {
  constructor(
    @Inject(LOGGER)
    private readonly logger: Logger,
  ) {}

  async refund(input: RefundInput): Promise<RefundResult> {
    const refundId = `REFUND-STUB-${input.orderId}-${Date.now()}`

    this.logger.info('Refund stub executed (MVP — no real refund)', {
      event: 'refund_stub',
      orderId: input.orderId,
      amount: input.amount,
      reason: input.reason,
      refundId,
    })

    return { refundId }
  }
}
