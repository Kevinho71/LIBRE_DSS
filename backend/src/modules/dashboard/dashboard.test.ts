import { describe, it, expect, vi, beforeEach } from 'vitest';
import crypto from 'crypto';
import { dashboardService } from './dashboard.service';
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

    const kpis = await dashboardService.obtenerKpis(empresaId);

    expect(kpis.limiteSku).toBeNull();
    expect(kpis.skusEnAlerta).toBe(0);
    expect(kpis.ahorroEstimadoProyectado).toBe(0);
  });
});
