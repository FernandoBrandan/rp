import { Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';

@Processor('payment-link')
export class PaymentLinkProcessor {
  constructor(
    private paymentService: PaymentService,
    @InjectQueue('payment-link') private paymentLinkQueue: Queue,
  ) {}

  @Process('generate-link')
  async handleLinkGeneration(job: Job<{ orderId: string }>) {
    const { orderId } = job.data;
    try {
      await this.paymentService.generateAndSaveLink(orderId);
    } catch (error) {
      throw error;
    }
  }

  // Método para encolar el trabajo
  async encolarPago(orderId: string) {
    await this.paymentLinkQueue.add(
      'generate-link',
      { orderId },
      {
        attempts: 5,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: true,
        removeOnFail: false,
      },
    );
  }
}
