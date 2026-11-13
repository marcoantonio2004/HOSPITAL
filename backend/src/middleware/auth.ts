import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { JwtPayload, AuthRequest } from '../types';
export { AuthRequest };
import pool from '../config/database';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET && process.env.NODE_ENV === 'production') {
  throw new Error('JWT_SECRET is required in production');
}

export async function authenticate(req: AuthRequest, res: Response, next: NextFunction) {
  let token = req.cookies?.token;
  if (!token && req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }
  if (!token && typeof req.query?.token === 'string') {
    token = req.query.token;
  }

  if (!token) {
    return res.status(401).json({ success: false, error: 'No autenticado' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET || 'expediente_clinico_secret') as JwtPayload;
    
    // Check if user is active
    const userResult = await pool.query('SELECT activo FROM usuarios WHERE id_usuario = $1', [decoded.id_usuario]);
    if (userResult.rows.length === 0 || !userResult.rows[0].activo) {
      return res.status(401).json({ success: false, error: 'Usuario inactivo o eliminado' });
    }
    
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ success: false, error: 'Token inválido o expirado' });
  }
}

export function authorize(...roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'No autenticado' });
    }
    if (!roles.includes(req.user.rol_nombre)) {
      return res.status(403).json({ success: false, error: 'Sin permisos para esta acción' });
    }
    next();
  };
}
