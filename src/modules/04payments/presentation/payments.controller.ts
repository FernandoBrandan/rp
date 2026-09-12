import { Body, Controller, Headers, HttpCode, Post } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiBadRequestResponse,
} from '@nestjs/swagger';

import {
  HandleWebhookUseCase,
  PaymentWebhookPayload,
} from '../application/use-cases/handle-webhook.use-case';

@ApiTags('payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly handleWebhookUC: HandleWebhookUseCase) {}

  @Post('webhook')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Webhook de notificaciones del proveedor de pago',
    description:
      'Recibe eventos del proveedor (approved / failed / pending). Solo los terminales disparan cambios de estado en la orden.',
  })
  @ApiOkResponse({ description: 'Webhook procesado' })
  @ApiBadRequestResponse({ description: 'Payload inválido' })
  async handleWebhook(
    @Body() payload: PaymentWebhookPayload,
    @Headers() headers: Record<string, string>,
  ) {
    await this.handleWebhookUC.execute(payload);
    return { received: true };
  }
}
