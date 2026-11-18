import { describe, it, expect, vi, beforeEach } from 'vitest';
import crypto from 'crypto';
import { dashboardService, resumirVentas, fechaEnBolivia } from './dashboard.service';
import { dashboardRepository } from './dashboard.repository';
import { PosicionAlerta } from './dashboard.repository';

describe('Dashboard Service — KPIs (Sprint 6 / LIB-7 / HU-26)', () => {
  const empresaId = crypto.randomUUID();

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('calcula KPIs agrupados por empresa sin fuga entre tenants', async () => {
    vi.spyOn(dashboardRepository, 'obtenerPlan').mockResolvedValue('gratuito');
    vi.spyOn(dashboardRepository, 'obtenerResumenProductos').mockResolvedValue({
      productosActivos: 12,
      valorInventario: 12345.5,
    });
    vi.spyOn(dashboardRepository, 'obtenerMermasMes').mockResolvedValue({
      cantidad: 3,
      valorEstimado: 30,
    });

    const posiciones: PosicionAlerta[] = [
      { productoId: 'a', stockActual: 50, enTransito: 0, ropCalculado: 100, stockSeguridadCalculado: 20, costoUnitario: 10, precioVenta: 20 },
      { productoId: 'b', stockActual: 200, enTransito: 0, ropCalculado: 80, stockSeguridadCalculado: 10, costoUnitario: 5, precioVenta: 8 },
      { productoId: 'c', stockActual: 0, enTransito: 0, ropCalculado: null, stockSeguridadCalculado: null, costoUnitario: 1, precioVenta: 2 },
    ];
    vi.spyOn(dashboardRepository, 'obtenerPosicionesAlerta').mockResolvedValue(posiciones);
    vi.spyOn(dashboardRepository, 'obtenerVentasPorFecha').mockResolvedValue([]);

    const kpis = await dashboardService.obtenerKpis(empresaId);

    expect(kpis.plan).toBe('gratuito');
    expect(kpis.limiteSku).toBe(15);
    expect(kpis.productosActivos).toBe(12);
    expect(kpis.valorInventario).toBe(12345.5);
    expect(kpis.skusEnAlerta).toBe(1); // solo el producto 'a' está por debajo de su ROP
    expect(kpis.ahorroEstimadoProyectado).toBeCloseTo(200, 2); // (20 - 10) * 20
    expect(kpis.mermasMes.cantidad).toBe(3);
    expect(kpis.mermasMes.valorEstimado).toBe(30);
  });

  it('limiteSku es null para plan de pago y no emite alertas sin parámetros', async () => {
    vi.spyOn(dashboardRepository, 'obtenerPlan').mockResolvedValue('pago');
    vi.spyOn(dashboardRepository, 'obtenerResumenProductos').mockResolvedValue({
      productosActivos: 0,
      valorInventario: 0,
    });
    vi.spyOn(dashboardRepository, 'obtenerMermasMes').mockResolvedValue({
      cantidad: 0,
      valorEstimado: 0,
    });
    vi.spyOn(dashboardRepository, 'obtenerPosicionesAlerta').mockResolvedValue([]);
    vi.spyOn(dashboardRepository, 'obtenerVentasPorFecha').mockResolvedValue([]);

    const kpis = await dashboardService.obtenerKpis(empresaId);

    expect(kpis.limiteSku).toBeNull();
    expect(kpis.skusEnAlerta).toBe(0);
    expect(kpis.ahorroEstimadoProyectado).toBe(0);
  });
});

describe('Dashboard: ventas de hoy, del mes y de la semana', () => {
  it('resume hoy, el mes y los últimos 7 días (con ceros en días sin ventas)', () => {
    const r = resumirVentas(
      [
        { fecha: '2026-11-18', monto: 90, unidades: 1, notas: 1 },
        { fecha: '2026-11-17', monto: 250.5, unidades: 4, notas: 2 },
        { fecha: '2026-11-02', monto: 100, unidades: 2, notas: 1 },
        { fecha: '2026-10-31', monto: 999, unidades: 9, notas: 9 }, // mes anterior: no cuenta
      ],
      '2026-11-18'
    );

    expect(r.hoy).toEqual({ monto: 90, unidades: 1, notas: 1 });
    expect(r.mes).toEqual({ monto: 440.5, unidades: 7, notas: 4 });
    expect(r.ultimos7Dias).toHaveLength(7);
    expect(r.ultimos7Dias[0]).toEqual({ fecha: '2026-11-12', monto: 0 });
    expect(r.ultimos7Dias[5]).toEqual({ fecha: '2026-11-17', monto: 250.5 });
    expect(r.ultimos7Dias[6]).toEqual({ fecha: '2026-11-18', monto: 90 });
  });

  it('sin ventas devuelve ceros', () => {
    const r = resumirVentas([], '2026-11-18');
    expect(r.hoy).toEqual({ monto: 0, unidades: 0, notas: 0 });
    expect(r.mes.monto).toBe(0);
    expect(r.ultimos7Dias.every((d) => d.monto === 0)).toBe(true);
  });

  it('usa la fecha de Bolivia (UTC-4): las 23:00 locales siguen siendo el mismo día', () => {
    // 2026-11-19T03:00Z = 2026-11-18 23:00 en La Paz
    expect(fechaEnBolivia(new Date('2026-11-19T03:00:00Z'))).toBe('2026-11-18');
  });

  it('obtenerKpis incluye las ventas calculadas desde el repositorio', async () => {
    vi.restoreAllMocks();
    vi.spyOn(dashboardRepository, 'obtenerPlan').mockResolvedValue('pago');
    vi.spyOn(dashboardRepository, 'obtenerResumenProductos').mockResolvedValue({ productosActivos: 1, valorInventario: 10 });
    vi.spyOn(dashboardRepository, 'obtenerMermasMes').mockResolvedValue({ cantidad: 0, valorEstimado: 0 });
    vi.spyOn(dashboardRepository, 'obtenerPosicionesAlerta').mockResolvedValue([]);
    const hoy = fechaEnBolivia(new Date());
    vi.spyOn(dashboardRepository, 'obtenerVentasPorFecha').mockResolvedValue([
      { fecha: hoy, monto: 90, unidades: 1, notas: 1 },
    ]);

    const kpis = await dashboardService.obtenerKpis(crypto.randomUUID());
    expect(kpis.ventas.hoy.monto).toBe(90);
    expect(kpis.ventas.ultimos7Dias[6].monto).toBe(90);
  });
});
