import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET!;

export interface AuthRequest extends Request {
  user?: { id: number; username: string; role: string };
  file?: any; // Multer file upload
}

export function authenticate(req: AuthRequest, res: Response, next: NextFunction) {
  const token = (req as any).cookies?.token || req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  if (req.user?.role !== 'admin' && req.user?.role !== 'superadmin') {
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
}

export function requireSuperAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  if (req.user?.role !== 'superadmin') {
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
}
