import { describe, it, expect, afterAll } from 'vitest';
import { handler } from '../src/index';
import { db } from '../src/db/client';
import { empresas } from '../src/db/schema';
import { eq } from 'drizzle-orm';
import { LambdaEvent } from '../src/shared/types/lambda';

const isDatabaseConfigured = Boolean(
  process.env.DATABASE_URL &&
  (process.env.DATABASE_URL.startsWith('postgres://') || process.env.DATABASE_URL.startsWith('postgresql://'))
);

describe.runIf(isDatabaseConfigured)('Catálogo, Proveedores y Límites Freemium E2E (Neon)', { timeout: 30000 }, () => {
  const uniqueSuffix = Date.now().toString().slice(-6);
  const adminEmail = `cat_admin_${uniqueSuffix}@libredss.test`;
  const adminPassword = 'PasswordCat2026!';

  let empresaId: string;
  let authToken: string;
  let sampleProductoId: string;
  let sampleProveedorId: string;

  it('debe registrar una empresa en plan gratuito para las pruebas de catálogo', async () => {
    const event: LambdaEvent = {
      rawPath: '/api/v1/auth/register',
      headers: { 'content-type': 'application/json' },
      requestContext: { http: { method: 'POST', path: '/api/v1/auth/register', sourceIp: '127.0.0.1', userAgent: 'vitest' } },
      body: JSON.stringify({
        nombreEmpresa: `Ferretería Freemium ${uniqueSuffix}`,
        plan: 'gratuito',
        nombreUsuario: 'Admin Catálogo',
        email: adminEmail,
        password: adminPassword,
      }),
    };

    const res = await handler(event);
    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);

    empresaId = body.empresa.id;
    authToken = body.token;
  });

  it('debe permitir crear 15 productos con parámetros logísticos y factor de conversión (CB-04, HU-06)', async () => {
    for (let i = 1; i <= 15; i++) {
      const event: LambdaEvent = {
        rawPath: '/api/v1/productos',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${authToken}`,
        },
        requestContext: { http: { method: 'POST', path: '/api/v1/productos', sourceIp: '127.0.0.1', userAgent: 'vitest' } },
        body: JSON.stringify({
          sku: `SKU-${uniqueSuffix}-${i}`,
          nombre: `Producto Catálogo ${i}`,
          unidadMedida: 'unidad',
          unidadCompra: 'caja',
          factorConversion: 50,
          costoUnitario: 10 + i,
          precioVenta: 20 + i,
          costoPedido: 50.00,
          tasaMantenimientoAnual: 0.20,
          stockActual: 10 * i,
          stockMinimoManual: 5,
        }),
      };

      const res = await handler(event);
      expect(res.statusCode).toBe(201);
      const prod = JSON.parse(res.body);
      expect(prod.factorConversion).toBe(50);
      if (i === 1) {
        sampleProductoId = prod.id;
      }
    }
  }, 30000);

  it('debe rechazar con 403 Forbidden al intentar registrar el producto número 16 (HU-33 Límite Freemium)', async () => {
    const event: LambdaEvent = {
      rawPath: '/api/v1/productos',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${authToken}`,
      },
      requestContext: { http: { method: 'POST', path: '/api/v1/productos', sourceIp: '127.0.0.1', userAgent: 'vitest' } },
      body: JSON.stringify({
        sku: `SKU-${uniqueSuffix}-16`,
        nombre: 'Producto 16 Excedido',
        costoUnitario: 15,
        precioVenta: 30,
      }),
    };

    const res = await handler(event);
    expect(res.statusCode).toBe(403);
    const body = JSON.parse(res.body);
    expect(body.error).toBe('LIMITE_SKUS_ALCANZADO');
    expect(body.message).toContain('máximo de 15 productos');
  });

  it('debe actualizar los precios y parámetros de un producto via PUT /api/v1/productos/:id (CB-01, HU-07)', async () => {
    const event: LambdaEvent = {
      rawPath: `/api/v1/productos/${sampleProductoId}`,
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${authToken}`,
      },
      requestContext: { http: { method: 'PUT', path: `/api/v1/productos/${sampleProductoId}`, sourceIp: '127.0.0.1', userAgent: 'vitest' } },
      body: JSON.stringify({
        nombre: 'Producto 1 Actualizado (Nuevo Costo)',
        costoUnitario: 14.50, // Costo de reposición actualizado (CB-01)
        precioVenta: 25.00,
      }),
    };

    const res = await handler(event);
    expect(res.statusCode).toBe(200);
    const prod = JSON.parse(res.body);
    expect(prod.nombre).toBe('Producto 1 Actualizado (Nuevo Costo)');
    expect(prod.costoUnitario).toBe(14.50);
  });

  it('debe desactivar un producto mediante borrado lógico via DELETE /api/v1/productos/:id (HU-07)', async () => {
    const event: LambdaEvent = {
      rawPath: `/api/v1/productos/${sampleProductoId}`,
      headers: {
        authorization: `Bearer ${authToken}`,
      },
      requestContext: { http: { method: 'DELETE', path: `/api/v1/productos/${sampleProductoId}`, sourceIp: '127.0.0.1', userAgent: 'vitest' } },
    };

    const res = await handler(event);
    expect(res.statusCode).toBe(204);
  });

  it('al desactivar un producto, ahora sí debe permitir crear uno nuevo al quedar 14 activos (HU-33)', async () => {
    const event: LambdaEvent = {
      rawPath: '/api/v1/productos',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${authToken}`,
      },
      requestContext: { http: { method: 'POST', path: '/api/v1/productos', sourceIp: '127.0.0.1', userAgent: 'vitest' } },
      body: JSON.stringify({
        sku: `SKU-${uniqueSuffix}-REEMPLAZO`,
        nombre: 'Producto Reemplazo Tras Borrado',
        costoUnitario: 30,
        precioVenta: 45,
      }),
    };

    const res = await handler(event);
    expect(res.statusCode).toBe(201);
    const prod = JSON.parse(res.body);
    expect(prod.nombre).toBe('Producto Reemplazo Tras Borrado');
    sampleProductoId = prod.id;
  });

  it('debe registrar un proveedor via POST /api/v1/proveedores (HU-08)', async () => {
    const event: LambdaEvent = {
      rawPath: '/api/v1/proveedores',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${authToken}`,
      },
      requestContext: { http: { method: 'POST', path: '/api/v1/proveedores', sourceIp: '127.0.0.1', userAgent: 'vitest' } },
      body: JSON.stringify({
        nombre: `Distribuidora Santa Cruz ${uniqueSuffix}`,
        contacto: 'Juan Representante',
        telefono: '3-3456789',
      }),
    };

    const res = await handler(event);
    expect(res.statusCode).toBe(201);
    const prov = JSON.parse(res.body);
    expect(prov.nombre).toContain('Distribuidora Santa Cruz');
    sampleProveedorId = prov.id;
  });

  it('debe asociar el proveedor al producto con parámetros logísticos (CB-02, HU-08)', async () => {
    const event: LambdaEvent = {
      rawPath: `/api/v1/productos/${sampleProductoId}/proveedores`,
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${authToken}`,
      },
      requestContext: { http: { method: 'POST', path: `/api/v1/productos/${sampleProductoId}/proveedores`, sourceIp: '127.0.0.1', userAgent: 'vitest' } },
      body: JSON.stringify({
        proveedorId: sampleProveedorId,
        codigoProveedor: 'ART-DSC-001',
        costoCompra: 28.00,
        leadTimeDias: 4,
        costoPedido: 50.00,
        loteMinimo: 20,
        esPrincipal: true,
      }),
    };

    const res = await handler(event);
    expect(res.statusCode).toBe(201);
    const vinculo = JSON.parse(res.body);
    expect(vinculo.codigoProveedor).toBe('ART-DSC-001');
    expect(vinculo.leadTimeDias).toBe(4);
    expect(vinculo.esPrincipal).toBe(true);
  });

  it('debe listar los productos con paginación y búsqueda via GET /api/v1/productos (HU-09)', async () => {
    const event: LambdaEvent = {
      rawPath: '/api/v1/productos',
      headers: {
        authorization: `Bearer ${authToken}`,
      },
      queryStringParameters: {
        page: '1',
        limit: '10',
        buscar: 'Catálogo',
      },
      requestContext: { http: { method: 'GET', path: '/api/v1/productos', sourceIp: '127.0.0.1', userAgent: 'vitest' } },
    };

    const res = await handler(event);
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data).toBeInstanceOf(Array);
    expect(body.data.length).toBeGreaterThan(0);
    expect(body.paginacion.pagina).toBe(1);
    expect(body.paginacion.limite).toBe(10);
    expect(body.data[0]).toHaveProperty('estadoAlerta');
  });

  afterAll(async () => {
    if (empresaId) {
      await db.delete(empresas).where(eq(empresas.id, empresaId));
    }
  });
});
