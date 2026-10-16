import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { client, apiClient, setToken, getToken, ApiError } from '@/api/client';

describe('API Client Unit Tests', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('debe almacenar y recuperar el token JWT en localStorage', () => {
    expect(getToken()).toBeNull();
    setToken('jwt-token-123');
    expect(getToken()).toBe('jwt-token-123');
    setToken(null);
    expect(getToken()).toBeNull();
  });

  it('debe inyectar el header Authorization Bearer cuando existe un token', async () => {
    setToken('test-token-xyz');

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ success: true }),
    });
    global.fetch = mockFetch;

    const res = await client.get('/test-endpoint');

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const calledUrl = mockFetch.mock.calls[0][0];
    const calledOptions = mockFetch.mock.calls[0][1];

    expect(calledUrl).toContain('/test-endpoint');
    expect(calledOptions.headers['Authorization']).toBe('Bearer test-token-xyz');
    expect(res).toEqual({ success: true });
  });

  it('debe inyectar X-Idempotency-Key cuando se especifica en las opciones', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ ok: true }),
    });
    global.fetch = mockFetch;

    await apiClient('/transacciones', {
      method: 'POST',
      body: { total: 100 },
      idempotencyKey: 'idemp-uuid-456',
    });

    const calledOptions = mockFetch.mock.calls[0][1];
    expect(calledOptions.headers['X-Idempotency-Key']).toBe('idemp-uuid-456');
  });

  it('debe serializar parámetros query en la URL', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => [],
    });
    global.fetch = mockFetch;

    await client.get('/productos', { params: { limite: 10, offset: 20, activo: true } });

    const calledUrl = mockFetch.mock.calls[0][0];
    expect(calledUrl).toContain('/productos?limite=10&offset=20&activo=true');
  });

  it('debe lanzar ApiError con código y detalles cuando el servidor responde error 422', async () => {
    const errorResponse = {
      error: 'VALIDATION_ERROR',
      message: 'Los datos enviados no son válidos',
      details: { email: ['El correo electrónico no es válido'] },
    };

    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 422,
      statusText: 'Unprocessable Entity',
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => errorResponse,
    });
    global.fetch = mockFetch;

    await expect(client.post('/auth/register', {})).rejects.toThrow(ApiError);

    try {
      await client.post('/auth/register', {});
    } catch (err: any) {
      expect(err).toBeInstanceOf(ApiError);
      expect(err.statusCode).toBe(422);
      expect(err.errorCode).toBe('VALIDATION_ERROR');
      expect(err.message).toBe('Los datos enviados no son válidos');
      expect(err.details).toEqual({ email: ['El correo electrónico no es válido'] });
    }
  });

  it('debe disparar evento libredss:unauthorized cuando el servidor responde 401', async () => {
    const unauthorizedListener = vi.fn();
    window.addEventListener('libredss:unauthorized', unauthorizedListener);

    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ error: 'UNAUTHORIZED', message: 'Token expirado' }),
    });
    global.fetch = mockFetch;

    await expect(client.get('/auth/me')).rejects.toThrow(ApiError);
    expect(unauthorizedListener).toHaveBeenCalledTimes(1);

    window.removeEventListener('libredss:unauthorized', unauthorizedListener);
  });
});
