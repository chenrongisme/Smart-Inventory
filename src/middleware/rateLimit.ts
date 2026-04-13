import { Request, Response, NextFunction } from 'express';

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_ATTEMPTS = 10;

export function checkRateLimit(ip: string, action: string): { allowed: boolean; remaining: number; retryAfterMs?: number; resetAt: number } {
  const key = `${ip}:${action}`;
  const now = Date.now();
  const entry = rateLimitMap.get(key);
  const resetAt = now + RATE_WINDOW_MS;

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt });
    return { allowed: true, remaining: MAX_ATTEMPTS - 1, resetAt };
  }

  if (entry.count >= MAX_ATTEMPTS) {
    return { allowed: false, remaining: 0, retryAfterMs: entry.resetAt - now, resetAt: entry.resetAt };
  }

  entry.count++;
  return { allowed: true, remaining: MAX_ATTEMPTS - entry.count, resetAt: entry.resetAt };
}

export function rateLimitMiddleware(action: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip || (req as any).socket?.remoteAddress || 'unknown';
    const result = checkRateLimit(ip, action);

    res.setHeader('X-RateLimit-Remaining', result.remaining);
    res.setHeader('X-RateLimit-Reset', Math.ceil((result.resetAt || Date.now()) / 1000));

    if (!result.allowed) {
      res.setHeader('Retry-After', Math.ceil((result.retryAfterMs || 0) / 1000));
      return res.status(429).json({ error: '操作过于频繁，请在15分钟后重试' });
    }

    next();
  };
}

// Cleanup old entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitMap.entries()) {
    if (now > entry.resetAt) rateLimitMap.delete(key);
  }
}, 5 * 60 * 1000);
