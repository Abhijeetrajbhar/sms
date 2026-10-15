import { randomUUID } from 'crypto';
import { NextFunction, Request, Response } from 'express';

export type RequestWithContext = Request & { requestId?: string };

export function requestContext(req: RequestWithContext, res: Response, next: NextFunction): void {
  const suppliedId = req.header('x-request-id')?.trim();
  const requestId = suppliedId && /^[A-Za-z0-9_-]{8,128}$/.test(suppliedId)
    ? suppliedId
    : randomUUID();

  req.requestId = requestId;
  res.setHeader('X-Request-Id', requestId);
  next();
}
