import { ValidationError } from '../errors/AppError';

export interface LambdaEvent {
  version?: string;
  routeKey?: string;
  rawPath: string;
  rawQueryString?: string;
  headers: Record<string, string | undefined>;
  queryStringParameters?: Record<string, string | undefined>;
  requestContext?: {
    http?: {
      method: string;
      path: string;
      protocol?: string;
      sourceIp?: string;
      userAgent?: string;
    };
    [key: string]: unknown;
  };
  body?: string | null;
  isBase64Encoded?: boolean;
  [key: string]: unknown;
}

export interface LambdaResponse {
  statusCode: number;
  headers?: Record<string, string>;
  body: string;
  isBase64Encoded?: boolean;
}

export const CORS_HEADERS: Record<string, string> = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Requested-With,X-Idempotency-Key',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,PATCH,OPTIONS',
};

export function ok<T>(data: T, extraHeaders: Record<string, string> = {}): LambdaResponse {
  return {
    statusCode: 200,
    headers: { ...CORS_HEADERS, ...extraHeaders },
    body: JSON.stringify(data),
  };
}

export function created<T>(data: T, extraHeaders: Record<string, string> = {}): LambdaResponse {
  return {
    statusCode: 201,
    headers: { ...CORS_HEADERS, ...extraHeaders },
    body: JSON.stringify(data),
  };
}

export function noContent(extraHeaders: Record<string, string> = {}): LambdaResponse {
  return {
    statusCode: 204,
    headers: { ...CORS_HEADERS, ...extraHeaders },
    body: '',
  };
}

export function parseBody<T = unknown>(body: string | null | undefined, isBase64Encoded = false): T {
  if (!body || body.trim() === '') {
    return {} as T;
  }
  const raw = isBase64Encoded ? Buffer.from(body, 'base64').toString('utf-8') : body;
  try {
    return JSON.parse(raw) as T;
  } catch {
    throw new ValidationError('INVALID_JSON_BODY', 'El cuerpo de la solicitud no es un JSON válido');
  }
}
