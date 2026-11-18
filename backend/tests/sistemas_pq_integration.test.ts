import { describe, it, expect, afterAll } from 'vitest';
import { db } from '../src/db/client';
import { empresas, productos, proveedores, productoProveedores, transacciones, parametrosCalculo } from '../src/db/schema';
import { eq, and } from 'drizzle-orm';
import { dssService } from '../src/modules/dss/dss.service';

const isDatabaseConfigured = Boolean(
  process.env.DATABASE_URL &&
  (process.env.DATABASE_URL.startsWith('postgres://') || process.env.DATABASE_URL.startsWith('postgresql://'))
);

function fechaHace(dias: number): string {
  const d = new Date();
  d.setDate(d.getDate() - dias);
  return d.toISOString().slice(0, 10);
}

describe.runIf(isDatabaseConfigured)('Sistemas P/Q y Arranque en Frío — Integración (Sprint 5 / LIB-6 en Neon)', { timeout: 30000 }, () => {
  let empresaId: string;
  let productoAId: string;
  let productoCId: string;
  let productoNuevoId: string;

  it('prepara empresa, productos (A, C y nuevo sin historial) y demanda de 60 días', async () => {
    const [emp] = await db
      .insert(empresas)
      .values({ nombre: 'Empresa P/Q Integración', plan: 'gratuito' })
      .returning();
    empresaId = emp.id;

    const [prodA] = await db
      .insert(productos)
      .values({ empresaId, nombre: 'Producto Clase A', sku: 'PQ-A', costoUnitario: '100', precioVenta: '150', stockActual: '0' })
      .returning();
    const [prodC] = await db
      .insert(productos)
      .values({ empresaId, nombre: 'Producto Clase C', sku: 'PQ-C', costoUnitario: '10', precioVenta: '15', stockActual: '0' })
      .returning();
    const [prodNuevo] = await db
      .insert(productos)
      .values({
        empresaId,
        nombre: 'Producto Nuevo (arranque en frío)',
        sku: 'PQ-NUEVO',
        costoUnitario: '8',
        precioVenta: '12',
        stockActual: '5',
        stockMinimoManual: '10',
        stockMaximoManual: '50',
      })
      .returning();
    productoAId = prodA.id;
    productoCId = prodC.id;
    productoNuevoId = prodNuevo.id;

    const [prov] = await db
      .insert(proveedores)
      .values({ empresaId, nombre: 'Proveedor Principal P/Q' })
      .returning();

    for (const productoId of [productoAId, productoCId, productoNuevoId]) {
      await db.insert(productoProveedores).values({
        empresaId,
        productoId,
        proveedorId: prov.id,
        leadTimeDias: 3,
        costoPedido: '150',
        loteMinimo: '1',
        esPrincipal: true,
      });
    }

    // Producto A: 21 días con venta repartidos en 60 días de historial -> fase 3.
    const ventasA = Array.from({ length: 21 }, (_, i) => ({
      empresaId,
      productoId: productoAId,
      tipo: 'venta' as const,
      cantidad: '1',
      costoUnitarioHistorico: '100',
      precioVentaHistorico: '150',
      estadoPago: 'contado' as const,
      fechaEvento: fechaHace(60 - i * 3),
    }));

    await db.insert(transacciones).values([
      ...ventasA,
      {
        empresaId,
        productoId: productoCId,
        tipo: 'venta' as const,
        cantidad: '1',
        costoUnitarioHistorico: '10',
        precioVentaHistorico: '15',
        estadoPago: 'contado' as const,
        fechaEvento: fechaHace(5),
      },
    ]);
  });

  it('recalcula ABC + EOQ/ROP + sistemas P/Q y asigna política y fase', async () => {
    await dssService.recalcularAbc(empresaId);
    await dssService.recalcularEoqRop(empresaId);
    const resultado = await dssService.recalcularSistemas(empresaId);

    expect(resultado.totalProductos).toBe(3);
    expect(resultado.productosQ).toBe(1);
    expect(resultado.productosP).toBe(2);
    expect(resultado.enFase3).toBe(1);
  });

  it('asigna Sistema Q al producto Clase A en Fase 3 (ROP vigente)', async () => {
    const sistemas = await dssService.obtenerSistemas(empresaId);
    const filaA = sistemas.items.find((i) => i.productoId === productoAId)!;

    expect(filaA.categoriaAbc).toBe('A');
    expect(filaA.politica).toBe('Q');
    expect(filaA.faseArranque).toBe(3);
    expect(filaA.cuantitativoHabilitado).toBe(true);
    expect(filaA.ropCalculado).not.toBeNull();
    expect(filaA.intervaloRevisionDias).toBeNull();
    expect(filaA.nivelObjetivoT).toBeNull();
  });

  it('asigna Sistema P al producto Clase C con intervalo R y nivel objetivo T (sin ROP)', async () => {
    const sistemas = await dssService.obtenerSistemas(empresaId);
    const filaC = sistemas.items.find((i) => i.productoId === productoCId)!;

    expect(filaC.categoriaAbc).toBe('C');
    expect(filaC.politica).toBe('P');
    expect(filaC.intervaloRevisionDias).not.toBeNull();
    expect(filaC.nivelObjetivoT).not.toBeNull();
    expect(filaC.ropCalculado).toBeNull();
  });

  it('mantiene el producto nuevo en Fase 1 y lo expone como alerta Min/Max (HU-38)', async () => {
    const sistemas = await dssService.obtenerSistemas(empresaId);
    const filaNuevo = sistemas.items.find((i) => i.productoId === productoNuevoId)!;

    expect(filaNuevo.faseArranque).toBe(1);
    expect(filaNuevo.cuantitativoHabilitado).toBe(false);

    const panel = await dssService.obtenerAlertasMinMax(empresaId);
    const alerta = panel.alertas.find((a) => a.productoId === productoNuevoId);

    expect(panel.totalAlertas).toBe(1);
    expect(alerta).toBeDefined();
    expect(alerta!.tipo).toBe('bajo_minimo');
    expect(alerta!.cantidadSugerida).toBe(45); // max(50) - stock(5)
  });

  it('persiste la política y fase en parametros_calculo vigentes', async () => {
    const filas = await db
      .select()
      .from(parametrosCalculo)
      .where(and(eq(parametrosCalculo.empresaId, empresaId), eq(parametrosCalculo.esVigente, true)));

    const filaA = filas.find((f) => f.productoId === productoAId)!;
    const filaC = filas.find((f) => f.productoId === productoCId)!;
    const filaNuevo = filas.find((f) => f.productoId === productoNuevoId)!;

    expect(filaA.politica).toBe('Q');
    expect(filaA.faseArranque).toBe(3);
    expect(filaC.politica).toBe('P');
    expect(filaC.ropCalculado).toBeNull();
    expect(filaC.intervaloRevisionDias).not.toBeNull();
    expect(filaNuevo.faseArranque).toBe(1);
  });

  afterAll(async () => {
    if (empresaId) {
      await db.delete(empresas).where(eq(empresas.id, empresaId));
    }
  });
});
