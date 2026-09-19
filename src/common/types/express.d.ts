// src/common/types/express.d.ts

declare global {
  namespace Express {
    interface Request {
      correlationId: string;
      user?: { sub: string; role: string };
    }
  }
}
