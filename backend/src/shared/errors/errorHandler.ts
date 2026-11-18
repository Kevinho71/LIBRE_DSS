import { ZodError } from 'zod';
import { AppError } from './AppError';
import { logger } from '../utils/logger';
import { LambdaResponse, CORS_HEADERS } from '../types/lambda';

export function handleError(error: unknown): LambdaResponse {
  // 1. Error de validación Zod
  if (error instanceof ZodError) {
    const fieldErrors = error.flatten().fieldErrors;
    logger.warn('Fallo de validación en la solicitud', { errors: fieldErrors });
    return {
      statusCode: 422,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        error: 'VALIDATION_ERROR',
        message: 'Los datos enviados no cumplen con el formato requerido',
        details: fieldErrors,
      }),
    };
  }

  // 2. Errores de dominio conocidos (AppError)
  if (error instanceof AppError) {
    if (error.statusCode >= 500) {
      logger.error(error.message, { code: error.code, details: error.details });
    } else {
      logger.warn(error.message, { code: error.code, details: error.details });
    }

    return {
      statusCode: error.statusCode,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        error: error.code,
        message: error.message,
        ...(error.details !== undefined ? { details: error.details } : {}),
      }),
    };
  }

  // 3. Excepciones no controladas (500) - NUNCA fugar stack trace al cliente
  logger.error('Excepción no controlada en el backend', {
    unhandledError: error instanceof Error ? { message: error.message, stack: error.stack } : error,
  });

  return {
    statusCode: 500,
    headers: CORS_HEADERS,
    body: JSON.stringify({
      error: 'INTERNAL_SERVER_ERROR',
      message: 'Ocurrió un error interno en el servidor. Por favor, intente más tarde.',
    }),
  };
}
