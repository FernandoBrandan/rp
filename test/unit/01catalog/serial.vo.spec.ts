import { Serial } from '@catalog/domain/value-objects/serial.vo';

describe('Serial', () => {
  it('acepta un serial que empieza con PROD-', () => {
    const serial = new Serial('PROD-123456');

    expect(serial.getValue()).toBe('PROD-123456');
  });

  it('rechaza un serial que no empieza con PROD-', () => {
    expect(() => new Serial('XYZ-123')).toThrow('Invalid serial');
  });
});
