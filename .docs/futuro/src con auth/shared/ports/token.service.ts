// token.service.ts
export interface TokenService {
  sign(payload: object): string;
}
