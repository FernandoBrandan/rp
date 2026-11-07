import { Email } from '@user/domain/value-objects/email.vo';

describe('Email', () => {
  it('normaliza a lowercase', () => {
    expect(new Email('Foo@Bar.com').getValue()).toBe('foo@bar.com');
  });

  it('hace trim', () => {
    expect(new Email('  foo@bar.com  ').getValue()).toBe('foo@bar.com');
  });

  it('rechaza emails inválidos', () => {
    expect(() => new Email('no-arroba')).toThrow('Invalid email');
    expect(() => new Email('a@b')).toThrow('Invalid email');
    expect(() => new Email('')).toThrow('Invalid email');
  });

  it('equals compara por valor', () => {
    const a = new Email('foo@bar.com');
    const b = new Email('FOO@bar.com');
    expect(a.equals(b)).toBe(true);
  });
});
