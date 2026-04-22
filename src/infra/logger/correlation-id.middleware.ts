// src/infra/logger/correlation-id.middleware.ts
import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

export function correlationIdMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const incoming = req.headers['x-correlation-id'] as string;

  const uuid = randomUUID().replace(/-/g, '').substring(0, 16);

  const correlationId = incoming || uuid;

  (req as any).correlationId = correlationId;
  res.setHeader('x-correlation-id', correlationId);

  next();
}
