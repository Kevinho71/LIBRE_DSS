import jwt from 'jsonwebtoken';
import { env } from './env';
import { UnauthorizedError } from '../errors/AppError';

export interface JwtUserPayload {
  usuarioId: string;
  empresaId: string;
  rol: string;
  email: string;
  userId?: string;
  idEmpresa?: string;
}

export function signJwt(payload: JwtUserPayload): string {
  const normalized = {
    ...payload,
    userId: payload.usuarioId,
    idEmpresa: payload.empresaId,
  };
  return jwt.sign(normalized, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
  });
}

export function verifyJwt(token: string): JwtUserPayload {
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as JwtUserPayload & jwt.JwtPayload;
    return {
      usuarioId: decoded.usuarioId || decoded.userId || '',
      empresaId: decoded.empresaId || decoded.idEmpresa || '',
      rol: decoded.rol,
      email: decoded.email,
    };
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new UnauthorizedError('TOKEN_EXPIRADO', 'La sesión ha expirado. Por favor, inicie sesión nuevamente.');
    }
    throw new UnauthorizedError('TOKEN_INVALIDO', 'El token de autenticación no es válido.');
  }
}
