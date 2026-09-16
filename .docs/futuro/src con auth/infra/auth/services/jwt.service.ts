import jwt from 'jsonwebtoken';

export class JwtService {
  constructor(private secret: string) {}

  sign(payload: object): string {
    return jwt.sign(payload, this.secret, { expiresIn: '1h' });
  }

  verify(token: string): any {
    return jwt.verify(token, this.secret);
  }
}
