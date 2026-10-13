import { describe, it, expect, vi, beforeEach } from 'vitest';
import crypto from 'crypto';
import { dashboardService } from '../src/modules/dashboard/dashboard.service';
import { dashboardRepository, DatosProductoReporte } from '../src/modules/dashboard/dashboard.repository';
import { obtenerReporteCostosHandler } from '../src/modules/dashboard/dashboard.handler';
import { NotFoundError, ValidationError } from '../src/shared/errors/AppError';
import * as authMiddleware from '../src/shared/middleware/requireAuth';

describe('Reporte Comparativo de Costos (LIB-46 / HU-27)', () => {
  const empresaId = crypto.randomUUID();
  const productoId = crypto.randomUUID();

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  const productoMock: DatosProductoReporte = {
    id: productoId,
    sku: 'SKU-001',
    nombre: 'Cemento Viacha 50kg',
    stockActual: 30,
    costoUnitario: 50,
    precioVenta: 70,
    costoPedido: 40,
    tasaMantenimientoAnual: 0.2,
    leadTimeDias: 3,
    ropCalculado: 25,
    eoqCalculado: 50,
    stockSeguridadCalculado: 10,
    demandaPromedioDiaria: 5,
    categoriaAbc: 'A',
  };

  it('genera reporte comparativo empírica vs DSS calculando ahorro y estructura esperada', async () => {
    vi.spyOn(dashboardRepository, 'obtenerDatosReporteCostos').mockResolvedValue([productoMock]);
    vi.spyOn(dashboardRepository, 'obtenerVentasPorDia').mockResolvedValue([
      { productoId, fechaEvento: new Date().toISOString().slice(0, 10), cantidadNeta: 10 },
    ]);

    const reporte = await dashboardService.generarReporteCostos(empresaId, { dias: 30 });

    expect(reporte.totalProductos).toBe(1);
    expect(reporte.diasAnalizados).toBe(30);
    expect(reporte.politicaEmpirica).toBeDefined();
    expect(reporte.politicaDss).toBeDefined();
    expect(reporte.politicaEmpirica.nombre).toBe('empirica');
    expect(reporte.politicaDss.nombre).toBe('dss');
    expect(typeof reporte.ahorroTotal).toBe('number');
    expect(typeof reporte.ahorroPorcentual).toBe('number');
    expect(reporte.conclusion).toContain('política');
    expect(reporte.productos).toHaveLength(1);
    expect(reporte.productos[0].sku).toBe('SKU-001');
    expect(reporte.productos[0].politicaDss.costoTotal).toBeGreaterThanOrEqual(0);
  });

  it('lanza NotFoundError si el productoId solicitado no existe en la empresa', async () => {
    vi.spyOn(dashboardRepository, 'existeProducto').mockResolvedValue(false);

    await expect(
      dashboardService.generarReporteCostos(empresaId, { productoId, dias: 30 })
    ).rejects.toThrow(NotFoundError);
  });

  it('lanza ValidationError si el producto existe pero no tiene parámetros vigentes calculados', async () => {
    vi.spyOn(dashboardRepository, 'existeProducto').mockResolvedValue(true);
    vi.spyOn(dashboardRepository, 'obtenerDatosReporteCostos').mockResolvedValue([]);

    await expect(
      dashboardService.generarReporteCostos(empresaId, { productoId, dias: 30 })
    ).rejects.toThrow(ValidationError);
  });

  it('devuelve reporte con totalProductos 0 cuando no hay productos vigentes a nivel empresa', async () => {
    vi.spyOn(dashboardRepository, 'obtenerDatosReporteCostos').mockResolvedValue([]);

    const reporte = await dashboardService.generarReporteCostos(empresaId, { dias: 30 });

    expect(reporte.totalProductos).toBe(0);
    expect(reporte.ahorroTotal).toBe(0);
    expect(reporte.productos).toHaveLength(0);
  });

  it('handler obtenerReporteCostosHandler responde con 200 y JSON estructurado', async () => {
    vi.spyOn(authMiddleware, 'extractTenantId').mockReturnValue(empresaId);
    vi.spyOn(dashboardRepository, 'obtenerDatosReporteCostos').mockResolvedValue([productoMock]);
    vi.spyOn(dashboardRepository, 'obtenerVentasPorDia').mockResolvedValue([]);

    const event = {
      requestContext: { http: { method: 'GET' } },
      rawPath: '/dashboard/reporte-costos',
      queryStringParameters: { dias: '15' },
    } as any;

    const response = await obtenerReporteCostosHandler(event);

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.totalProductos).toBe(1);
    expect(body.diasAnalizados).toBe(15);
  });
});
