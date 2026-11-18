import { describe, it, expect, afterAll } from 'vitest';
import { db } from '../src/db/client';
import { empresas, productos, transacciones, parametrosCalculo } from '../src/db/schema';
import { eq, and } from 'drizzle-orm';
import { dssService } from '../src/modules/dss/dss.service';

const isDatabaseConfigured = Boolean(
  process.env.DATABASE_URL &&
  (process.env.DATABASE_URL.startsWith('postgres://') || process.env.DATABASE_URL.startsWith('postgresql://'))
);

describe.runIf(isDatabaseConfigured)('Motor ABC — Integración (Sprint 3 / LIB-4 en Neon)', { timeout: 30000 }, () => {
  let empresaId: string;
  let productoAltoId: string;
  let productoBajoId: string;

  it('prepara empresa, productos y transacciones de demanda', async () => {
    const [emp] = await db
      .insert(empresas)
      .values({ nombre: 'Empresa ABC Integración', plan: 'gratuito' })
      .returning();
    empresaId = emp.id;

    const [alto] = await db
      .insert(productos)
      .values({ empresaId, nombre: 'Producto Alto Valor', costoUnitario: '100', precioVenta: '150', stockActual: '0' })
      .returning();
    const [bajo] = await db
      .insert(productos)
      .values({ empresaId, nombre: 'Producto Bajo Valor', costoUnitario: '10', precioVenta: '15', stockActual: '0' })
      .returning();
    productoAltoId = alto.id;
    productoBajoId = bajo.id;

    const fecha = '2026-01-10';
    const ventasAlto = Array.from({ length: 10 }, () => ({
      empresaId,
      productoId: productoAltoId,
      tipo: 'venta' as const,
      cantidad: '1',
      costoUnitarioHistorico: '100',
      precioVentaHistorico: '150',
      estadoPago: 'contado' as const,
      fechaEvento: fecha,
    }));

    await db.insert(transacciones).values([
      ...ventasAlto,
      {
        empresaId,
        productoId: productoBajoId,
        tipo: 'venta' as const,
        cantidad: '1',
        costoUnitarioHistorico: '10',
        precioVentaHistorico: '15',
        estadoPago: 'contado' as const,
        fechaEvento: fecha,
      },
    ]);
  });

  it('recalcula ABC y persiste las clases con es_vigente = true', async () => {
    const resultado = await dssService.recalcularAbc(empresaId);
    expect(resultado.totalProductos).toBe(2);
    expect(resultado.valorConsumoTotal).toBeGreaterThan(0);

    const filas = await db
      .select()
      .from(parametrosCalculo)
      .where(and(eq(parametrosCalculo.empresaId, empresaId), eq(parametrosCalculo.esVigente, true)));

    expect(filas).toHaveLength(2);

    const alto = filas.find((f) => f.productoId === productoAltoId)!;
    const bajo = filas.find((f) => f.productoId === productoBajoId)!;

    expect(alto.categoriaAbc).toBe('A');
    expect(bajo.categoriaAbc).toBe('C');
    expect(alto.jobId).toBe(resultado.jobId);
    expect(Number(bajo.porcentajeAcumulado)).toBeCloseTo(100, 1);
  });

  it('invalida la clasificación previa al recalcular nuevamente', async () => {
    await dssService.recalcularAbc(empresaId);

    const vigentes = await db
      .select()
      .from(parametrosCalculo)
      .where(and(eq(parametrosCalculo.empresaId, empresaId), eq(parametrosCalculo.esVigente, true)));

    const total = await db
      .select()
      .from(parametrosCalculo)
      .where(eq(parametrosCalculo.empresaId, empresaId));

    expect(vigentes).toHaveLength(2);
    expect(total).toHaveLength(4);
  });

  afterAll(async () => {
    if (empresaId) {
      await db.delete(empresas).where(eq(empresas.id, empresaId));
    }
  });
});
