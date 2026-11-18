import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { transaccionesApi } from '@/api/transacciones.api';

function mockJsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: 'OK',
    headers: new Headers({ 'content-type': 'application/json' }),
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as unknown as Response;
}

describe('transaccionesApi (Kardex, ventas y movimientos)', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('listar envía los filtros como query params', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      mockJsonResponse({ data: [], paginacion: { total: 0, pagina: 1, limite: 20, totalPaginas: 1 } })
    );
    global.fetch = fetchMock;

    await transaccionesApi.listar({ page: 2, limit: 20, tipo: 'venta', desde: '2026-01-01' });

    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toContain('/transacciones?');
    expect(url).toContain('page=2');
    expect(url).toContain('tipo=venta');
    expect(url).toContain('desde=2026-01-01');
  });

  it('registrarVentaBatch hace POST y adjunta X-Idempotency-Key', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      mockJsonResponse({ idempotente: false, notaId: 'n1', transacciones: [], mensaje: 'ok' })
    );
    global.fetch = fetchMock;

    await transaccionesApi.registrarVentaBatch({
      items: [{ productoId: 'p1', cantidad: 2 }],
      llaveIdempotencia: 'llave-1',
      estadoPago: 'contado',
    });

    const [url, opts] = fetchMock.mock.calls[0];
    expect(url).toContain('/transacciones/batch');
    expect(opts.method).toBe('POST');
    expect(opts.headers['X-Idempotency-Key']).toBe('llave-1');
  });

  it('obtenerPorNota consulta la ruta de notas', async () => {
    const fetchMock = vi.fn().mockResolvedValue(mockJsonResponse({ notaId: 'n1', items: [], totalItems: 0 }));
    global.fetch = fetchMock;

    await transaccionesApi.obtenerPorNota('nota-abc');

    expect(fetchMock.mock.calls[0][0]).toContain('/transacciones/notas/nota-abc');
  });

  it('actualizarPago usa PATCH con el nuevo estado', async () => {
    const fetchMock = vi.fn().mockResolvedValue(mockJsonResponse({ id: 't1' }));
    global.fetch = fetchMock;

    await transaccionesApi.actualizarPago('t1', 'credito_pagado');

    const [url, opts] = fetchMock.mock.calls[0];
    expect(url).toContain('/transacciones/t1/pago');
    expect(opts.method).toBe('PATCH');
    expect(JSON.parse(opts.body as string)).toEqual({ estadoPago: 'credito_pagado' });
  });

  it('registrarIngreso hace POST a /transacciones/ingreso', async () => {
    const fetchMock = vi.fn().mockResolvedValue(mockJsonResponse({ idempotente: false, transaccion: {}, mensaje: 'ok' }));
    global.fetch = fetchMock;

    await transaccionesApi.registrarIngreso({ productoId: 'p1', cantidad: 5, esUnidadCompra: true });

    expect(fetchMock.mock.calls[0][0]).toContain('/transacciones/ingreso');
  });
});
