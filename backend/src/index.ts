import { LambdaEvent, LambdaResponse, ok, noContent } from './shared/types/lambda';
import { NotFoundError } from './shared/errors/AppError';
import { handleError } from './shared/errors/errorHandler';
import { registerHandler, loginHandler, meHandler } from './modules/auth/auth.handler';

async function router(event: LambdaEvent): Promise<LambdaResponse> {
  const method = (event.requestContext?.http?.method || (event as any).httpMethod || 'GET').toUpperCase();
  const rawPath = (event.rawPath || (event as any).path || '/').toLowerCase();

  // 1. Preflight CORS
  if (method === 'OPTIONS') {
    return noContent();
  }

  // 2. Health check y raíz
  if (method === 'GET' && (rawPath === '/health' || rawPath === '/api/v1/health' || rawPath === '/')) {
    return ok({
      message: 'LIBREDSS API Base Online',
      service: 'LIBREDSS Backend API',
      status: 'healthy',
      version: '0.1.0',
      timestamp: new Date().toISOString(),
    });
  }

  // 3. Rutas de autenticación (soporta /auth/* y /api/v1/auth/*)
  if (method === 'POST' && (rawPath === '/auth/register' || rawPath === '/api/v1/auth/register')) {
    return registerHandler(event);
  }

  if (method === 'POST' && (rawPath === '/auth/login' || rawPath === '/api/v1/auth/login')) {
    return loginHandler(event);
  }

  if (method === 'GET' && (rawPath === '/auth/me' || rawPath === '/api/v1/auth/me')) {
    return meHandler(event);
  }

  throw new NotFoundError('RUTA_NO_ENCONTRADA', `La ruta '${method} ${rawPath}' no existe en el servidor`);
}

/**
 * Punto de entrada principal para AWS Lambda Function URL
 */
export async function handler(event: any = {}, context?: any): Promise<LambdaResponse> {
  try {
    return await router(event);
  } catch (error) {
    return handleError(error);
  }
}
