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

describe.runIf(isDatabaseConfigured)('Módulo Transaccional E2E (Sprint 2 / LIB-3 en Neon)', { timeout: 35000 }, () => {
  const uniqueSuffix = Date.now().toString().slice(-6);
  const adminEmail = `trx_admin_${uniqueSuffix}@libredss.test`;
  const adminPassword = 'PasswordTrx2026!';

  let empresaId: string;
  let authToken: string;
  let producto1Id: string;
  let producto2Id: string;
  let ventaCreditoId: string;
  let notaBatchId: string;

  it('debe registrar una empresa y autenticar para las pruebas transaccionales', async () => {
    const event: LambdaEvent = {
      rawPath: '/api/v1/auth/register',
      headers: { 'content-type': 'application/json' },
      requestContext: { http: { method: 'POST', path: '/api/v1/auth/register', sourceIp: '127.0.0.1', userAgent: 'vitest' } },
      body: JSON.stringify({
        nombreEmpresa: `Comercial Transaccional ${uniqueSuffix}`,
        plan: 'gratuito',
        nombreUsuario: 'Admin Transacciones',
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

  it('debe crear dos productos iniciales con stock y parámetros logísticos (CB-04)', async () => {
    // Producto 1: Tornillos (en cajas de 10 unidades, stock inicial 100)
    const event1: LambdaEvent = {
      rawPath: '/api/v1/productos',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${authToken}` },
      requestContext: { http: { method: 'POST', path: '/api/v1/productos', sourceIp: '127.0.0.1', userAgent: 'vitest' } },
      body: JSON.stringify({
        sku: `TRX-SKU1-${uniqueSuffix}`,
        nombre: `Tornillo Drywall 1/2 ${uniqueSuffix}`,
        unidadMedida: 'unidad',
        unidadCompra: 'caja',
        factorConversion: 10,
        costoUnitario: 10,
        precioVenta: 15,
        stockActual: 100,
      }),
    };
    const res1 = await handler(event1);
    expect(res1.statusCode).toBe(201);
    producto1Id = JSON.parse(res1.body).id;

    // Producto 2: Tarugos (stock inicial 50)
    const event2: LambdaEvent = {
      rawPath: '/api/v1/productos',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${authToken}` },
      requestContext: { http: { method: 'POST', path: '/api/v1/productos', sourceIp: '127.0.0.1', userAgent: 'vitest' } },
      body: JSON.stringify({
        sku: `TRX-SKU2-${uniqueSuffix}`,
        nombre: `Tarugo Plastico 6mm ${uniqueSuffix}`,
        unidadMedida: 'unidad',
        costoUnitario: 5,
        precioVenta: 8,
        stockActual: 50,
      }),
    };
    const res2 = await handler(event2);
    expect(res2.statusCode).toBe(201);
    producto2Id = JSON.parse(res2.body).id;
  });

  it('debe registrar una venta simple a crédito descontando stock de forma atómica (HU-11, CB-01, CB-07)', async () => {
    const idempKey = `idemp_venta_${uniqueSuffix}`;
    const event: LambdaEvent = {
      rawPath: '/api/v1/transacciones/venta',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${authToken}` },
      requestContext: { http: { method: 'POST', path: '/api/v1/transacciones/venta', sourceIp: '127.0.0.1', userAgent: 'vitest' } },
      body: JSON.stringify({
        productoId: producto1Id,
        cantidad: 10,
        estadoPago: 'credito_pendiente',
        llaveIdempotencia: idempKey,
        motivo: 'Venta fiada a maestro albañil',
      }),
    };

    const res = await handler(event);
    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);

    expect(body.nuevoStock).toBe(90);
    expect(body.transaccion.tipo).toBe('venta');
    expect(body.transaccion.estadoPago).toBe('credito_pendiente');
    expect(Number(body.transaccion.costoUnitarioHistorico)).toBe(10);
    expect(Number(body.transaccion.precioVentaHistorico)).toBe(15);
    ventaCreditoId = body.transaccion.id;
  });

  it('debe retornar la transacción previa sin descontar stock duplicado si se repite la llave de idempotencia (HU-11)', async () => {
    const idempKey = `idemp_venta_${uniqueSuffix}`;
    const event: LambdaEvent = {
      rawPath: '/api/v1/transacciones/venta',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${authToken}` },
      requestContext: { http: { method: 'POST', path: '/api/v1/transacciones/venta', sourceIp: '127.0.0.1', userAgent: 'vitest' } },
      body: JSON.stringify({
        productoId: producto1Id,
        cantidad: 10,
        estadoPago: 'credito_pendiente',
        llaveIdempotencia: idempKey,
      }),
    };

    const res = await handler(event);
    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);
    expect(body.idempotente).toBe(true);
    expect(body.transaccion.id).toBe(ventaCreditoId);

    // Verificar que el stock sigue en 90 y no bajó a 80
    const checkEvent: LambdaEvent = {
      rawPath: `/api/v1/productos/${producto1Id}`,
      headers: { authorization: `Bearer ${authToken}` },
      requestContext: { http: { method: 'GET', path: `/api/v1/productos/${producto1Id}`, sourceIp: '127.0.0.1', userAgent: 'vitest' } },
    };
    const checkRes = await handler(checkEvent);
    expect(JSON.parse(checkRes.body).stockActual).toBe(90);
  });

  it('debe rechazar la venta con 400 Bad Request si el stock disponible es insuficiente', async () => {
    const event: LambdaEvent = {
      rawPath: '/api/v1/transacciones/venta',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${authToken}` },
      requestContext: { http: { method: 'POST', path: '/api/v1/transacciones/venta', sourceIp: '127.0.0.1', userAgent: 'vitest' } },
      body: JSON.stringify({
        productoId: producto1Id,
        cantidad: 999,
      }),
    };

    const res = await handler(event);
    expect(res.statusCode).toBe(400);
    const body = JSON.parse(res.body);
    expect(body.error).toBe('STOCK_INSUFICIENTE');
  });

  it('debe registrar venta batch multilínea atómica compartiendo nota_id (CB-03)', async () => {
    const event: LambdaEvent = {
      rawPath: '/api/v1/transacciones/batch',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${authToken}` },
      requestContext: { http: { method: 'POST', path: '/api/v1/transacciones/batch', sourceIp: '127.0.0.1', userAgent: 'vitest' } },
      body: JSON.stringify({
        items: [
          { productoId: producto1Id, cantidad: 5 },
          { productoId: producto2Id, cantidad: 10 },
        ],
        estadoPago: 'contado',
        motivo: 'Ticket de mostrador #001',
      }),
    };

    const res = await handler(event);
    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);

    expect(body.notaId).toBeDefined();
    expect(body.transacciones.length).toBe(2);
    notaBatchId = body.notaId;

    // Verificar stock de ambos productos: prod1 90 - 5 = 85; prod2 50 - 10 = 40
    const checkProd1: LambdaEvent = {
      rawPath: `/api/v1/productos/${producto1Id}`,
      headers: { authorization: `Bearer ${authToken}` },
      requestContext: { http: { method: 'GET', path: `/api/v1/productos/${producto1Id}`, sourceIp: '127.0.0.1', userAgent: 'vitest' } },
    };
    expect(JSON.parse((await handler(checkProd1)).body).stockActual).toBe(85);

    const checkProd2: LambdaEvent = {
      rawPath: `/api/v1/productos/${producto2Id}`,
      headers: { authorization: `Bearer ${authToken}` },
      requestContext: { http: { method: 'GET', path: `/api/v1/productos/${producto2Id}`, sourceIp: '127.0.0.1', userAgent: 'vitest' } },
    };
    expect(JSON.parse((await handler(checkProd2)).body).stockActual).toBe(40);
  });

  it('en venta batch, si un producto no tiene stock, hace ROLLBACK total y no altera ninguno (CB-03)', async () => {
    const event: LambdaEvent = {
      rawPath: '/api/v1/transacciones/batch',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${authToken}` },
      requestContext: { http: { method: 'POST', path: '/api/v1/transacciones/batch', sourceIp: '127.0.0.1', userAgent: 'vitest' } },
      body: JSON.stringify({
        items: [
          { productoId: producto1Id, cantidad: 5 },
          { productoId: producto2Id, cantidad: 999 }, // Éste falla
        ],
      }),
    };

    const res = await handler(event);
    expect(res.statusCode).toBe(400);

    // Verificar que producto 1 NO fue descontado (se mantiene en 85)
    const checkProd1: LambdaEvent = {
      rawPath: `/api/v1/productos/${producto1Id}`,
      headers: { authorization: `Bearer ${authToken}` },
      requestContext: { http: { method: 'GET', path: `/api/v1/productos/${producto1Id}`, sourceIp: '127.0.0.1', userAgent: 'vitest' } },
    };
    expect(JSON.parse((await handler(checkProd1)).body).stockActual).toBe(85);
  });

  it('debe registrar ingreso de mercadería con conversión de unidades de compra (CB-04, HU-12)', async () => {
    // Ingresamos 3 cajas (factorConversion = 10 -> entran 30 unidades)
    const event: LambdaEvent = {
      rawPath: '/api/v1/transacciones/ingreso',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${authToken}` },
      requestContext: { http: { method: 'POST', path: '/api/v1/transacciones/ingreso', sourceIp: '127.0.0.1', userAgent: 'vitest' } },
      body: JSON.stringify({
        productoId: producto1Id,
        cantidad: 3,
        esUnidadCompra: true,
        costoUnitarioIngreso: 11,
        actualizarCostoReposicion: true, // Actualiza costo de reposición a 11
      }),
    };

    const res = await handler(event);
    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);
    // 85 + 30 = 115
    expect(body.nuevoStock).toBe(115);

    // Verificar costo reposición actualizado en producto
    const checkProd1: LambdaEvent = {
      rawPath: `/api/v1/productos/${producto1Id}`,
      headers: { authorization: `Bearer ${authToken}` },
      requestContext: { http: { method: 'GET', path: `/api/v1/productos/${producto1Id}`, sourceIp: '127.0.0.1', userAgent: 'vitest' } },
    };
    const prodData = JSON.parse((await handler(checkProd1)).body);
    expect(prodData.costoUnitario).toBe(11);
    expect(prodData.stockActual).toBe(115);
  });

  it('debe registrar un ajuste por conteo físico / arqueo generando merma (CB-06, HU-13)', async () => {
    // En sistema hay 115 unidades. El arqueo físico cuenta 110 (diferencia -5 merma).
    const event: LambdaEvent = {
      rawPath: '/api/v1/transacciones/ajuste',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${authToken}` },
      requestContext: { http: { method: 'POST', path: '/api/v1/transacciones/ajuste', sourceIp: '127.0.0.1', userAgent: 'vitest' } },
      body: JSON.stringify({
        productoId: producto1Id,
        conteoFisico: 110,
        motivo: 'Diferencia en arqueo físico mensual',
      }),
    };

    const res = await handler(event);
    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);

    expect(body.nuevoStock).toBe(110);
    expect(body.transaccion.tipo).toBe('merma');
    expect(Number(body.transaccion.cantidad)).toBe(5);
  });

  it('debe registrar devolución de cliente restituyendo stock sin contar como compra (CB-05)', async () => {
    // Cliente devuelve 2 unidades
    const event: LambdaEvent = {
      rawPath: '/api/v1/transacciones/devolucion',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${authToken}` },
      requestContext: { http: { method: 'POST', path: '/api/v1/transacciones/devolucion', sourceIp: '127.0.0.1', userAgent: 'vitest' } },
      body: JSON.stringify({
        productoId: producto1Id,
        tipo: 'devolucion_cliente',
        cantidad: 2,
        notaId: notaBatchId,
        motivo: 'Cliente devolvió material sobrante',
      }),
    };

    const res = await handler(event);
    expect(res.statusCode).toBe(201);
    // 110 + 2 = 112
    expect(JSON.parse(res.body).nuevoStock).toBe(112);
  });

  it('debe actualizar el estado de pago de venta a crédito a credito_pagado (CB-07)', async () => {
    const event: LambdaEvent = {
      rawPath: `/api/v1/transacciones/${ventaCreditoId}/pago`,
      headers: { 'content-type': 'application/json', authorization: `Bearer ${authToken}` },
      requestContext: { http: { method: 'PATCH', path: `/api/v1/transacciones/${ventaCreditoId}/pago`, sourceIp: '127.0.0.1', userAgent: 'vitest' } },
      body: JSON.stringify({
        estadoPago: 'credito_pagado',
      }),
    };

    const res = await handler(event);
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.estadoPago).toBe('credito_pagado');
  });

  it('debe listar transacciones con filtros paginados (HU-14)', async () => {
    const event: LambdaEvent = {
      rawPath: '/api/v1/transacciones',
      headers: { authorization: `Bearer ${authToken}` },
      queryStringParameters: {
        productoId: producto1Id,
        page: '1',
        limit: '10',
      },
      requestContext: { http: { method: 'GET', path: '/api/v1/transacciones', sourceIp: '127.0.0.1', userAgent: 'vitest' } },
    };

    const res = await handler(event);
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data.length).toBeGreaterThan(0);
    expect(body.paginacion.total).toBeGreaterThan(0);
    expect(body.data[0].producto).toBeDefined();
  });

  it('debe buscar productos para autocompletado ágil en el formulario de venta (HU-15)', async () => {
    const event: LambdaEvent = {
      rawPath: '/api/v1/productos/buscar',
      headers: { authorization: `Bearer ${authToken}` },
      queryStringParameters: {
        q: 'Tornillo',
        limit: '5',
      },
      requestContext: { http: { method: 'GET', path: '/api/v1/productos/buscar', sourceIp: '127.0.0.1', userAgent: 'vitest' } },
    };

    const res = await handler(event);
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.items.length).toBeGreaterThan(0);
    expect(body.items[0].nombre).toContain('Tornillo');
  });

  it('debe generar presigned URL para subida de fotografía de recibo (HU-35)', async () => {
    const event: LambdaEvent = {
      rawPath: '/api/v1/storage/presigned-url',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${authToken}` },
      requestContext: { http: { method: 'POST', path: '/api/v1/storage/presigned-url', sourceIp: '127.0.0.1', userAgent: 'vitest' } },
      body: JSON.stringify({
        filename: 'recibo_compra.jpg',
        contentType: 'image/jpeg',
      }),
    };

    const res = await handler(event);
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.uploadUrl).toBeDefined();
    expect(body.key).toContain(empresaId);
    expect(body.expiresInSeconds).toBe(300);
  });

  afterAll(async () => {
    if (empresaId) {
      // Limpieza de datos creados en el test E2E
      await db.delete(empresas).where(eq(empresas.id, empresaId));
    }
  });
});
