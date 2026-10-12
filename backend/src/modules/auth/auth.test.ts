import { describe, it, expect, vi, beforeEach } from 'vitest';
import { authService } from './auth.service';
import { authRepository } from './auth.repository';
import { ConflictError, UnauthorizedError, NotFoundError } from '../../shared/errors/AppError';
import { hashPassword } from '../../shared/utils/password';
import { signJwt, verifyJwt } from '../../shared/utils/jwt';
import { requireAuth, extractAuthToken } from '../../shared/middleware/requireAuth';
import { LambdaEvent } from '../../shared/types/lambda';
import { handleError } from '../../shared/errors/errorHandler';
import { handler } from '../../index';

describe('Auth Service & Middleware Unit Tests', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('authService.register', () => {
    it('debe registrar exitosamente una nueva empresa y usuario administrador', async () => {
      vi.spyOn(authRepository, 'findUserByEmail').mockResolvedValue(null);
      vi.spyOn(authRepository, 'createEmpresaAndAdmin').mockResolvedValue({
        empresa: {
          id: 'empresa-uuid-1',
          nombre: 'Comercializadora Test SRL',
          nit: '12345678',
          plan: 'gratuito',
          createdAt: new Date('2026-01-01T00:00:00Z'),
          updatedAt: new Date('2026-01-01T00:00:00Z'),
        },
        usuario: {
          id: 'usuario-uuid-1',
          empresaId: 'empresa-uuid-1',
          nombre: 'Juan Perez',
          email: 'juan@test.com',
          passwordHash: 'hashed_password',
          rol: 'administrador',
          createdAt: new Date('2026-01-01T00:00:00Z'),
        },
      });

      const response = await authService.register({
        nombreEmpresa: 'Comercializadora Test SRL',
        nit: '12345678',
        plan: 'gratuito',
        nombreUsuario: 'Juan Perez',
        email: 'juan@test.com',
        password: 'Password123!',
      });

      expect(response).toBeDefined();
      expect(response.token).toBeTypeOf('string');
      expect(response.usuario.id).toBe('usuario-uuid-1');
      expect(response.usuario.rol).toBe('administrador');
      expect(response.empresa.id).toBe('empresa-uuid-1');
      expect(response.empresa.plan).toBe('gratuito');

      // Verificar que el token sea decodificable
      const decoded = verifyJwt(response.token);
      expect(decoded.usuarioId).toBe('usuario-uuid-1');
      expect(decoded.empresaId).toBe('empresa-uuid-1');
      expect(decoded.rol).toBe('administrador');
    });

    it('debe lanzar ConflictError si el correo ya está registrado', async () => {
      vi.spyOn(authRepository, 'findUserByEmail').mockResolvedValue({
        id: 'user-existente',
        empresaId: 'empresa-1',
        nombre: 'Usuario Existente',
        email: 'juan@test.com',
        passwordHash: 'hash',
        rol: 'operador',
        createdAt: new Date(),
      });

      await expect(
        authService.register({
          nombreEmpresa: 'Otra Empresa',
          nombreUsuario: 'Juan Perez',
          email: 'juan@test.com',
          password: 'Password123!',
          plan: 'gratuito',
        })
      ).rejects.toThrow(ConflictError);
    });
  });

  describe('authService.login', () => {
    it('debe iniciar sesión con credenciales correctas y emitir JWT', async () => {
      const plainPassword = 'Password123!';
      const passwordHash = await hashPassword(plainPassword);

      vi.spyOn(authRepository, 'findUserByEmail').mockResolvedValue({
        id: 'usuario-uuid-2',
        empresaId: 'empresa-uuid-2',
        nombre: 'Maria Gomez',
        email: 'maria@test.com',
        passwordHash,
        rol: 'administrador',
        createdAt: new Date('2026-01-01T00:00:00Z'),
      });

      vi.spyOn(authRepository, 'findEmpresaById').mockResolvedValue({
        id: 'empresa-uuid-2',
        nombre: 'Distribuidora Gomez',
        nit: '87654321',
        plan: 'gratuito',
        createdAt: new Date('2026-01-01T00:00:00Z'),
        updatedAt: new Date('2026-01-01T00:00:00Z'),
      });

      const response = await authService.login({
        email: 'maria@test.com',
        password: plainPassword,
      });

      expect(response.token).toBeTypeOf('string');
      expect(response.usuario.email).toBe('maria@test.com');
      expect(response.empresa.nombre).toBe('Distribuidora Gomez');

      const decoded = verifyJwt(response.token);
      expect(decoded.usuarioId).toBe('usuario-uuid-2');
      expect(decoded.empresaId).toBe('empresa-uuid-2');
    });

    it('debe fallar con UnauthorizedError si la contraseña no coincide', async () => {
      const passwordHash = await hashPassword('CorrectPassword123!');

      vi.spyOn(authRepository, 'findUserByEmail').mockResolvedValue({
        id: 'usuario-uuid-2',
        empresaId: 'empresa-uuid-2',
        nombre: 'Maria Gomez',
        email: 'maria@test.com',
        passwordHash,
        rol: 'administrador',
        createdAt: new Date(),
      });

      await expect(
        authService.login({
          email: 'maria@test.com',
          password: 'WrongPassword!',
        })
      ).rejects.toThrow(UnauthorizedError);
    });

    it('debe fallar con UnauthorizedError si el usuario no existe (mensaje neutral)', async () => {
      vi.spyOn(authRepository, 'findUserByEmail').mockResolvedValue(null);

      await expect(
        authService.login({
          email: 'inexistente@test.com',
          password: 'SomePassword123!',
        })
      ).rejects.toThrow(UnauthorizedError);
    });
  });

  describe('authService.getMe', () => {
    it('debe retornar los datos del perfil y empresa del usuario', async () => {
      vi.spyOn(authRepository, 'findUserById').mockResolvedValue({
        id: 'u-1',
        empresaId: 'e-1',
        nombre: 'Admin User',
        email: 'admin@test.com',
        passwordHash: 'hash',
        rol: 'administrador',
        createdAt: new Date('2026-01-01T00:00:00Z'),
      });

      vi.spyOn(authRepository, 'findEmpresaById').mockResolvedValue({
        id: 'e-1',
        nombre: 'Mi Empresa',
        nit: null,
        plan: 'gratuito',
        createdAt: new Date('2026-01-01T00:00:00Z'),
        updatedAt: new Date('2026-01-01T00:00:00Z'),
      });

      const me = await authService.getMe('u-1');
      expect(me.usuario.nombre).toBe('Admin User');
      expect(me.empresa.nombre).toBe('Mi Empresa');
    });

    it('debe lanzar NotFoundError si el usuario no existe', async () => {
      vi.spyOn(authRepository, 'findUserById').mockResolvedValue(null);
      await expect(authService.getMe('u-inexistente')).rejects.toThrow(NotFoundError);
    });
  });

  describe('requireAuth Middleware', () => {
    it('debe rechazar solicitudes sin header Authorization', () => {
      const event: LambdaEvent = {
        rawPath: '/api/v1/auth/me',
        headers: {},
      };

      expect(() => requireAuth(event)).toThrow(UnauthorizedError);
    });

    it('debe rechazar solicitudes con esquema distinto a Bearer', () => {
      const event: LambdaEvent = {
        rawPath: '/api/v1/auth/me',
        headers: {
          authorization: 'Basic abc123xyz',
        },
      };

      expect(() => requireAuth(event)).toThrow(UnauthorizedError);
    });

    it('debe rechazar solicitudes con token corrupto', () => {
      const event: LambdaEvent = {
        rawPath: '/api/v1/auth/me',
        headers: {
          authorization: 'Bearer token.corrupto.invalido',
        },
      };

      expect(() => requireAuth(event)).toThrow(UnauthorizedError);
    });

    it('debe aceptar token Bearer válido e inyectar el contexto de tenant', () => {
      const token = signJwt({
        usuarioId: 'u-valid',
        empresaId: 'e-valid',
        rol: 'administrador',
        email: 'admin@valid.com',
      });

      const event: LambdaEvent = {
        rawPath: '/api/v1/auth/me',
        headers: {
          authorization: `Bearer ${token}`,
        },
      };

      const user = requireAuth(event);
      expect(user.usuarioId).toBe('u-valid');
      expect(user.empresaId).toBe('e-valid');
      expect(user.rol).toBe('administrador');
    });
  });

  describe('Lambda Router & Error Handling', () => {
    it('debe responder 200 en GET /health', async () => {
      const event: LambdaEvent = {
        rawPath: '/health',
        headers: {},
        requestContext: { http: { method: 'GET', path: '/health', sourceIp: '127.0.0.1', userAgent: 'test' } },
      };

      const res = await handler(event);
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.status).toBe('healthy');
    });

    it('debe responder 204 en OPTIONS para preflight CORS', async () => {
      const event: LambdaEvent = {
        rawPath: '/api/v1/auth/login',
        headers: {},
        requestContext: { http: { method: 'OPTIONS', path: '/api/v1/auth/login', sourceIp: '127.0.0.1', userAgent: 'test' } },
      };

      const res = await handler(event);
      expect(res.statusCode).toBe(204);
      expect(res.headers?.['Access-Control-Allow-Origin']).toBe('*');
    });

    it('debe responder 422 si el body de registro no cumple con Zod Schema', async () => {
      const event: LambdaEvent = {
        rawPath: '/api/v1/auth/register',
        headers: { 'content-type': 'application/json' },
        requestContext: { http: { method: 'POST', path: '/api/v1/auth/register', sourceIp: '127.0.0.1', userAgent: 'test' } },
        body: JSON.stringify({
          nombreEmpresa: 'E', // muy corto (< 2)
          email: 'no-es-un-email',
          password: '123', // muy corto (< 8)
        }),
      };

      const res = await handler(event);
      expect(res.statusCode).toBe(422);
      const body = JSON.parse(res.body);
      expect(body.error).toBe('VALIDATION_ERROR');
      expect(body.details).toHaveProperty('email');
      expect(body.details).toHaveProperty('password');
    });

    it('debe responder 404 para rutas inexistentes', async () => {
      const event: LambdaEvent = {
        rawPath: '/ruta/inexistente',
        headers: {},
        requestContext: { http: { method: 'GET', path: '/ruta/inexistente', sourceIp: '127.0.0.1', userAgent: 'test' } },
      };

      const res = await handler(event);
      expect(res.statusCode).toBe(404);
      const body = JSON.parse(res.body);
      expect(body.error).toBe('RUTA_NO_ENCONTRADA');
    });
  });
});
