import { LambdaEvent } from '../types/lambda';
import { UnauthorizedError, ForbiddenError } from '../errors/AppError';
import { verifyJwt, JwtUserPayload } from '../utils/jwt';

export type AuthUser = JwtUserPayload;

export function extractAuthToken(event: LambdaEvent): string {
  const headers = event.headers || {};
  const authHeader = headers['authorization'] || headers['Authorization'];

  if (!authHeader || typeof authHeader !== 'string') {
    throw new UnauthorizedError('TOKEN_REQUERIDO', 'Token de autenticación no proporcionado en la cabecera Authorization');
  }

  const parts = authHeader.trim().split(' ');
  if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
    throw new UnauthorizedError('FORMATO_TOKEN_INVALIDO', 'El formato del token debe ser: Bearer <token>');
  }

  return parts[1];
}

export function requireAuth(event: LambdaEvent): AuthUser {
  const token = extractAuthToken(event);
  const user = verifyJwt(token);

  if (!user.empresaId) {
    throw new UnauthorizedError('TENANT_NO_IDENTIFICADO', 'El token no contiene un identificador de empresa válido');
  }

  return user;
}

export function extractTenantId(event: LambdaEvent): string {
  return requireAuth(event).empresaId;
}

export function requireAdmin(event: LambdaEvent): AuthUser {
  const user = requireAuth(event);
  if (user.rol !== 'administrador') {
    throw new ForbiddenError('ROL_INSUFICIENTE', 'Se requieren permisos de administrador para realizar esta acción');
  }
  return user;
}

export function optionalAuth(event: LambdaEvent): AuthUser | null {
  try {
    return requireAuth(event);
  } catch {
    return null;
  }
}
