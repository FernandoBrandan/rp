// modules/04 payments/presentation/payments.controller.ts
import { Controller, Post, Body, Headers, HttpCode } from '@nestjs/common';
import { PaymentsService } from '../application/use-case/handleWebhook.use-case';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('webhook')
  @HttpCode(200)
  async handleWebhook(
    @Body() payload: any,
    @Headers() headers: Record<string, string>,
  ) {
    await this.paymentsService.handleWebhook(payload, headers);
    return { received: true };
  }
}
