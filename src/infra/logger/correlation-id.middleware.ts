import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import { correlationStorage } from './logger';

export function correlationIdMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const incoming = req.headers['x-correlation-id'] as string | undefined;
  const generated = randomUUID().replace(/-/g, '').substring(0, 16);
  const correlationId = incoming || generated;

  (req as any).correlationId = correlationId;
  res.setHeader('x-correlation-id', correlationId);

  correlationStorage.run({ correlationId }, () => next());
}
