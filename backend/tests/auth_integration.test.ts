import { describe, it, expect, afterAll } from 'vitest';
import { handler } from '../src/index';
import { db, withTenant } from '../src/db/client';
import { empresas, productos } from '../src/db/schema';
import { eq } from 'drizzle-orm';
import { LambdaEvent } from '../src/shared/types/lambda';

const isDatabaseConfigured = Boolean(
  process.env.DATABASE_URL &&
  (process.env.DATABASE_URL.startsWith('postgres://') || process.env.DATABASE_URL.startsWith('postgresql://'))
);

describe.runIf(isDatabaseConfigured)('Auth & Multi-Tenant E2E Integration Suite (Neon)', () => {
  const uniqueSuffix = Date.now().toString().slice(-6);
  const testEmail = `admin_e2e_${uniqueSuffix}@libredss.test`;
  const testPassword = 'PasswordSegura2026!';
  const testEmpresaNombre = `Empresa E2E Test ${uniqueSuffix}`;

  let createdEmpresaId: string;
  let createdUsuarioId: string;
  let authToken: string;

  it('debe registrar una nueva empresa y usuario administrador via POST /api/v1/auth/register', async () => {
    const event: LambdaEvent = {
      rawPath: '/api/v1/auth/register',
      headers: { 'content-type': 'application/json' },
      requestContext: { http: { method: 'POST', path: '/api/v1/auth/register', sourceIp: '127.0.0.1', userAgent: 'vitest' } },
      body: JSON.stringify({
        nombreEmpresa: testEmpresaNombre,
        nit: '99887766',
        plan: 'gratuito',
        nombreUsuario: 'Super Admin E2E',
        email: testEmail,
        password: testPassword,
      }),
    };

    const res = await handler(event);
    expect(res.statusCode).toBe(201);

    const body = JSON.parse(res.body);
    expect(body).toHaveProperty('token');
    expect(body.usuario).toBeDefined();
    expect(body.usuario.email).toBe(testEmail);
    expect(body.usuario.rol).toBe('administrador');
    expect(body.empresa).toBeDefined();
    expect(body.empresa.nombre).toBe(testEmpresaNombre);
    expect(body.empresa.plan).toBe('gratuito');

    createdEmpresaId = body.empresa.id;
    createdUsuarioId = body.usuario.id;
    authToken = body.token;
  });

  it('debe iniciar sesión exitosamente via POST /api/v1/auth/login', async () => {
    const event: LambdaEvent = {
      rawPath: '/api/v1/auth/login',
      headers: { 'content-type': 'application/json' },
      requestContext: { http: { method: 'POST', path: '/api/v1/auth/login', sourceIp: '127.0.0.1', userAgent: 'vitest' } },
      body: JSON.stringify({
        email: testEmail,
        password: testPassword,
      }),
    };

    const res = await handler(event);
    expect(res.statusCode).toBe(200);

    const body = JSON.parse(res.body);
    expect(body).toHaveProperty('token');
    expect(body.usuario.id).toBe(createdUsuarioId);
    expect(body.empresa.id).toBe(createdEmpresaId);

    // Actualizamos el token con el emitido por login
    authToken = body.token;
  });

  it('debe acceder a la ruta protegida GET /api/v1/auth/me usando el token Bearer', async () => {
    const event: LambdaEvent = {
      rawPath: '/api/v1/auth/me',
      headers: {
        authorization: `Bearer ${authToken}`,
      },
      requestContext: { http: { method: 'GET', path: '/api/v1/auth/me', sourceIp: '127.0.0.1', userAgent: 'vitest' } },
    };

    const res = await handler(event);
    expect(res.statusCode).toBe(200);

    const body = JSON.parse(res.body);
    expect(body.usuario.id).toBe(createdUsuarioId);
    expect(body.usuario.email).toBe(testEmail);
    expect(body.empresa.id).toBe(createdEmpresaId);
  });

  it('debe rechazar login con credenciales erróneas', async () => {
    const event: LambdaEvent = {
      rawPath: '/api/v1/auth/login',
      headers: { 'content-type': 'application/json' },
      requestContext: { http: { method: 'POST', path: '/api/v1/auth/login', sourceIp: '127.0.0.1', userAgent: 'vitest' } },
      body: JSON.stringify({
        email: testEmail,
        password: 'PasswordIncorrecto!',
      }),
    };

    const res = await handler(event);
    expect(res.statusCode).toBe(401);
    const body = JSON.parse(res.body);
    expect(body.error).toBe('CREDENCIALES_INVALIDAS');
  });

  it('debe permitir operaciones con RLS en Neon usando withTenant bajo la empresa registrada', async () => {
    const nuevoProducto = await withTenant(createdEmpresaId, async (tx) => {
      const [prod] = await tx
        .insert(productos)
        .values({
          empresaId: createdEmpresaId,
          sku: `SKU-E2E-${uniqueSuffix}`,
          nombre: 'Producto Tenant Registrado',
          costoUnitario: '50.00',
          precioVenta: '75.00',
          stockActual: '10',
        })
        .returning();
      return prod;
    });

    expect(nuevoProducto).toBeDefined();
    expect(nuevoProducto.sku).toBe(`SKU-E2E-${uniqueSuffix}`);

    // Consultar bajo el contexto del tenant
    const productosEnTenant = await withTenant(createdEmpresaId, async (tx) => {
      return tx.select().from(productos).where(eq(productos.id, nuevoProducto.id));
    });

    expect(productosEnTenant).toHaveLength(1);
    expect(productosEnTenant[0].nombre).toBe('Producto Tenant Registrado');
  });

  afterAll(async () => {
    if (createdEmpresaId) {
      // Al borrar la empresa, CASCADE elimina usuarios y productos asociados
      await db.delete(empresas).where(eq(empresas.id, createdEmpresaId));
    }
  });
});
