// modules/04 payments/presentation/payments.controller.ts
import { Controller, Post, Body, Headers, HttpCode } from '@nestjs/common';
import { HandleWebhookUseCase } from '../application/use-cases/handle-webhook.use-case';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly handleWebhookService: HandleWebhookUseCase) {}

  @Post('webhook')
  @HttpCode(200)
  async handleWebhook(
    @Body() payload: any,
    @Headers() headers: Record<string, string>,
  ) {
    await this.handleWebhookService.execute(payload, headers);
    return { received: true };
  }
}
