import { Money } from './money.vo';

describe('Money', () => {
  describe('constructor', () => {
    it('acepta montos positivos', () => {
      expect(new Money(100).getValue()).toBe(100);
    });

    it('acepta cero', () => {
      expect(new Money(0).getValue()).toBe(0);
    });

    it('rechaza montos negativos', () => {
      expect(() => new Money(-1)).toThrow('Amount cannot be negative');
    });
  });

  describe('add', () => {
    it('suma dos montos', () => {
      expect(new Money(100).add(new Money(50)).getValue()).toBe(150);
    });
  });

  describe('multiply', () => {
    it('multiplica por cantidad', () => {
      expect(new Money(100).multiply(3).getValue()).toBe(300);
    });

    it('multiplica por 0', () => {
      expect(new Money(100).multiply(0).getValue()).toBe(0);
    });
  });
});
