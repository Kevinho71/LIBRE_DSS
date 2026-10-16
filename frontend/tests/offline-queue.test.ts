import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ApiError } from '@/api/client';
import { resetDbConnection } from '@/offline/db';
import {
  encolarVenta,
  listarVentasPendientes,
  contarVentasPendientes,
  eliminarVentaPendiente,
} from '@/offline/salesQueue';
import { sincronizarVentasPendientes } from '@/offline/sync';

vi.mock('@/api/transacciones.api', () => ({
  transaccionesApi: {
    registrarVentaBatch: vi.fn(),
  },
}));

import { transaccionesApi } from '@/api/transacciones.api';

const mockBatch = vi.mocked(transaccionesApi.registrarVentaBatch);

function borrarBaseDeDatos(): Promise<void> {
  return new Promise((resolve) => {
    const req = indexedDB.deleteDatabase('libredss-offline');
    req.onsuccess = () => resolve();
    req.onerror = () => resolve();
    req.onblocked = () => resolve();
  });
}

function venta(overrides: Partial<Parameters<typeof encolarVenta>[0]> = {}) {
  return {
    id: `id-${Math.random().toString(36).slice(2)}`,
    notaId: `nota-${Math.random().toString(36).slice(2)}`,
    llaveIdempotencia: `llave-${Math.random().toString(36).slice(2)}`,
    items: [{ productoId: 'p1', cantidad: 2 }],
    estadoPago: 'contado' as const,
    fechaEvento: '2026-02-01',
    ...overrides,
  };
}

describe('cola offline de ventas (IndexedDB + idempotencia)', () => {
  beforeEach(async () => {
    await resetDbConnection();
    await borrarBaseDeDatos();
    mockBatch.mockReset();
  });

  it('encola, lista, cuenta y elimina ventas pendientes', async () => {
    await encolarVenta(venta());
    await encolarVenta(venta());

    expect(await contarVentasPendientes()).toBe(2);

    const pendientes = await listarVentasPendientes();
    expect(pendientes).toHaveLength(2);
    expect(pendientes[0].intentos).toBe(0);

    await eliminarVentaPendiente(pendientes[0].id);
    expect(await contarVentasPendientes()).toBe(1);
  });

  it('sincroniza y vacía la cola reutilizando la llave de idempotencia', async () => {
    const v = venta({ llaveIdempotencia: 'llave-estable' });
    await encolarVenta(v);
    mockBatch.mockResolvedValue({
      idempotente: false,
      notaId: v.notaId,
      transacciones: [],
      mensaje: 'ok',
    });

    const resultado = await sincronizarVentasPendientes();

    expect(resultado.sincronizadas).toBe(1);
    expect(resultado.pendientes).toBe(0);
    expect(await contarVentasPendientes()).toBe(0);
    expect(mockBatch).toHaveBeenCalledTimes(1);
    expect(mockBatch.mock.calls[0][0].llaveIdempotencia).toBe('llave-estable');
  });

  it('mantiene la venta y marca intento ante un fallo transitorio de red', async () => {
    await encolarVenta(venta());
    mockBatch.mockRejectedValue(new TypeError('Failed to fetch'));

    const resultado = await sincronizarVentasPendientes();

    expect(resultado.sincronizadas).toBe(0);
    expect(resultado.fallidas).toBe(0);
    const pendientes = await listarVentasPendientes();
    expect(pendientes).toHaveLength(1);
    expect(pendientes[0].intentos).toBe(1);
    expect(pendientes[0].fallido).toBeFalsy();
  });

  it('marca como fallida una venta rechazada por validación (4xx) sin reintentar en bucle', async () => {
    await encolarVenta(venta());
    mockBatch.mockRejectedValue(new ApiError(422, 'VALIDATION_ERROR', 'Datos inválidos'));

    const resultado = await sincronizarVentasPendientes();

    expect(resultado.fallidas).toBe(1);
    const pendientes = await listarVentasPendientes();
    expect(pendientes[0].fallido).toBe(true);
    expect(pendientes[0].ultimoError).toContain('VALIDATION_ERROR');
  });

  it('se detiene sin marcar fallidas cuando la sesión expira (401)', async () => {
    await encolarVenta(venta());
    mockBatch.mockRejectedValue(new ApiError(401, 'UNAUTHORIZED', 'Token expirado'));

    const resultado = await sincronizarVentasPendientes();

    expect(resultado.detenidaPorSesion).toBe(true);
    const pendientes = await listarVentasPendientes();
    expect(pendientes[0].fallido).toBeFalsy();
  });
});
