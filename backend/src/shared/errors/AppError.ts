export abstract class AppError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode: number,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = this.constructor.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class NotFoundError extends AppError {
  constructor(code = 'NOT_FOUND', message = 'Recurso no encontrado', details?: unknown) {
    super(code, message, 404, details);
  }
}

export class ConflictError extends AppError {
  constructor(code = 'CONFLICT', message = 'Conflicto con el estado actual del recurso', details?: unknown) {
    super(code, message, 409, details);
  }
}

export class ValidationError extends AppError {
  constructor(code = 'VALIDATION_ERROR', message = 'Datos de entrada inválidos', details?: unknown) {
    super(code, message, 422, details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(code = 'UNAUTHORIZED', message = 'No autorizado', details?: unknown) {
    super(code, message, 401, details);
  }
}

export class ForbiddenError extends AppError {
  constructor(code = 'FORBIDDEN', message = 'Permisos insuficientes para realizar esta acción', details?: unknown) {
    super(code, message, 403, details);
  }
}
