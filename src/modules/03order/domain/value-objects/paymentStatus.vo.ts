// rp/src/modules/03order/domain/value-objects/paymentStatus.vo.ts

export enum PaymentStatus {
  PENDING = 'PENDING',
  GENERATING = 'GENERATING',
  READY = 'READY',
  FAILED = 'FAILED',
}
