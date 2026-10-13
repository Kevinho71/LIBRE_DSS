import { describe, it, expect, afterAll } from 'vitest';
import { db } from '../src/db/client';
import { empresas, productos, proveedores, productoProveedores, transacciones, parametrosCalculo } from '../src/db/schema';
import { eq, and } from 'drizzle-orm';
import { dssService } from '../src/modules/dss/dss.service';

const isDatabaseConfigured = Boolean(
  process.env.DATABASE_URL &&
  (process.env.DATABASE_URL.startsWith('postgres://') || process.env.DATABASE_URL.startsWith('postgresql://'))
);

describe.runIf(isDatabaseConfigured)('Motor EOQ/ROP y Alertas — Integración (Sprint 4 / LIB-5 en Neon)', { timeout: 30000 }, () => {
  let empresaId: string;
  let productoId: string;

  it('prepara empresa, producto, proveedor principal y demanda de venta', async () => {
    const [emp] = await db
      .insert(empresas)
      .values({ nombre: 'Empresa EOQ/ROP Integración', plan: 'gratuito' })
      .returning();
    empresaId = emp.id;

    const [prod] = await db
      .insert(productos)
      .values({
        empresaId,
        nombre: 'Fierro Corrugado 1/2',
        sku: 'PROD-001',
        costoUnitario: '65',
        precioVenta: '100',
        costoPedido: '50', // será ignorado a favor del proveedor principal
        tasaMantenimientoAnual: '0.2000',
        stockActual: '0',
      })
      .returning();
    productoId = prod.id;

    const [prov] = await db
      .insert(proveedores)
      .values({ empresaId, nombre: 'Distribuidora Principal' })
      .returning();

    await db.insert(productoProveedores).values({
      empresaId,
      productoId,
      proveedorId: prov.id,
      leadTimeDias: 3,
      costoPedido: '150',
      loteMinimo: '1',
      esPrincipal: true,
    });

    // Demanda: 20 ventas en una única fecha => ventana de 1 día, d = 20 unidades/día.
    const fecha = '2026-01-10';
    await db.insert(transacciones).values(
      Array.from({ length: 20 }, () => ({
        empresaId,
        productoId,
        tipo: 'venta' as const,
        cantidad: '1',
        costoUnitarioHistorico: '65',
        precioVentaHistorico: '100',
        estadoPago: 'contado' as const,
        fechaEvento: fecha,
      }))
    );
  });

  it('recalcula ABC + EOQ/ROP y persiste los parámetros cuantitativos', async () => {
    await dssService.recalcularAbc(empresaId);
    const resultado = await dssService.recalcularEoqRop(empresaId);

    expect(resultado.productosProcesados).toBe(1);
    expect(resultado.productosConParametrosCuantitativos).toBe(1);

    const [param] = await db
      .select()
      .from(parametrosCalculo)
      .where(and(eq(parametrosCalculo.empresaId, empresaId), eq(parametrosCalculo.esVigente, true)));

    expect(param.categoriaAbc).toBe('A');
    // EOQ teórico sqrt(2*7300*150/13) = 410.4 -> tope de capital floor(15000/65) = 230.
    expect(Number(param.eoqCalculado)).toBe(230);
    // SS = 2.33 * sqrt(1.6*20) * sqrt(3) = 22.83 · ROP = 20*3 + 22.83 = 82.83.
    expect(Number(param.stockSeguridadCalculado)).toBeCloseTo(22.83, 1);
    expect(Number(param.ropCalculado)).toBeCloseTo(82.83, 1);
  });

  it('expone el producto en el panel de alertas priorizado por criticidad', async () => {
    const panel = await dssService.obtenerAlertas(empresaId);

    expect(panel.totalAlertas).toBe(1);
    expect(panel.alertas[0].productoId).toBe(productoId);
    expect(panel.alertas[0].categoriaAbc).toBe('A');
    expect(panel.alertas[0].eoqSugerido).toBe(230);
    expect(panel.alertas[0].posicionInventario).toBe(0);
    expect(panel.porCriticidad).toEqual([{ categoria: 'A', cantidad: 1 }]);
  });

  it('evalúa la posición de inventario de un producto tras una salida (HU-21)', async () => {
    const alerta = await dssService.evaluarPosicionInventario(empresaId, productoId);
    expect(alerta).not.toBeNull();
    expect(alerta!.ropCalculado).toBeCloseTo(82.83, 1);
    expect(alerta!.eoqSugerido).toBe(230);
  });

  afterAll(async () => {
    if (empresaId) {
      await db.delete(empresas).where(eq(empresas.id, empresaId));
    }
  });
});
