import { db } from '../../db/client';
import { empresas, productos, transacciones, parametrosCalculo } from '../../db/schema';
import { and, eq, isNull, sql, asc } from 'drizzle-orm';
import { CategoriaAbc } from '../../engine/abcService';

export interface DemandaProducto {
  productoId: string;
  costoUnitario: number;
  demandaNeta: number;
  diasConVenta: number;
}

export interface FilaClasificacion {
  productoId: string;
  categoria: CategoriaAbc;
  demandaAnual: number;
  demandaPromedioDiaria: number;
  valorConsumoAnual: number;
  porcentajeValor: number;
  porcentajeAcumulado: number;
  diasHistorial: number;
  diasConVenta: number;
}

export interface ParametroVigente {
  productoId: string;
  categoriaAbc: CategoriaAbc | null;
  jobId: string | null;
  valorConsumoAnual: number | null;
  porcentajeValor: number | null;
  porcentajeAcumulado: number | null;
  fechaCalculo: Date;
  sku: string | null;
  nombre: string;
}

export const dssRepository = {
  async listarEmpresas(): Promise<string[]> {
    const rows = await db.select({ id: empresas.id }).from(empresas);
    return rows.map((r) => r.id);
  },

  async obtenerVentana(empresaId: string): Promise<number | null> {
    const rows = await db
      .select({
        min: sql<string>`min(${transacciones.fechaEvento})::text`,
        max: sql<string>`max(${transacciones.fechaEvento})::text`,
      })
      .from(transacciones)
      .where(eq(transacciones.empresaId, empresaId));

    const min = rows[0]?.min;
    const max = rows[0]?.max;
    if (!min || !max) return null;

    const inicio = new Date(min).getTime();
    const fin = new Date(max).getTime();
    return Math.max(1, Math.round((fin - inicio) / 86400000) + 1);
  },

  async obtenerDemanda(empresaId: string): Promise<DemandaProducto[]> {
    const rows = await db
      .select({
        productoId: productos.id,
        costoUnitario: productos.costoUnitario,
        demandaNeta: sql<string>`COALESCE(SUM(CASE WHEN ${transacciones.tipo} = 'venta' THEN ${transacciones.cantidad} ELSE 0 END), 0)
          - COALESCE(SUM(CASE WHEN ${transacciones.tipo} = 'devolucion_cliente' THEN ${transacciones.cantidad} ELSE 0 END), 0)`,
        diasConVenta: sql<number>`COUNT(DISTINCT CASE WHEN ${transacciones.tipo} = 'venta' THEN ${transacciones.fechaEvento} END)::int`,
      })
      .from(productos)
      .leftJoin(
        transacciones,
        and(
          eq(transacciones.productoId, productos.id),
          eq(transacciones.empresaId, productos.empresaId)
        )
      )
      .where(and(eq(productos.empresaId, empresaId), isNull(productos.deletedAt)))
      .groupBy(productos.id, productos.costoUnitario);

    return rows.map((r) => ({
      productoId: r.productoId,
      costoUnitario: Number(r.costoUnitario),
      demandaNeta: Number(r.demandaNeta),
      diasConVenta: Number(r.diasConVenta),
    }));
  },

  async invalidarVigentes(empresaId: string): Promise<void> {
    await db
      .update(parametrosCalculo)
      .set({ esVigente: false })
      .where(eq(parametrosCalculo.empresaId, empresaId));
  },

  async insertarClasificacion(empresaId: string, jobId: string, filas: FilaClasificacion[]): Promise<void> {
    if (filas.length === 0) return;

    await db.insert(parametrosCalculo).values(
      filas.map((f) => ({
        empresaId,
        productoId: f.productoId,
        jobId,
        categoriaAbc: f.categoria,
        demandaPromedioDiaria: String(f.demandaPromedioDiaria),
        demandaAnual: String(f.demandaAnual),
        valorConsumoAnual: String(f.valorConsumoAnual),
        porcentajeValor: String(f.porcentajeValor),
        porcentajeAcumulado: String(f.porcentajeAcumulado),
        diasHistorial: f.diasHistorial,
        diasConVenta: f.diasConVenta,
        esVigente: true,
      }))
    );
  },

  async obtenerVigentes(empresaId: string): Promise<ParametroVigente[]> {
    const rows = await db
      .select({
        productoId: parametrosCalculo.productoId,
        categoriaAbc: parametrosCalculo.categoriaAbc,
        jobId: parametrosCalculo.jobId,
        valorConsumoAnual: parametrosCalculo.valorConsumoAnual,
        porcentajeValor: parametrosCalculo.porcentajeValor,
        porcentajeAcumulado: parametrosCalculo.porcentajeAcumulado,
        fechaCalculo: parametrosCalculo.fechaCalculo,
        sku: productos.sku,
        nombre: productos.nombre,
      })
      .from(parametrosCalculo)
      .innerJoin(productos, eq(parametrosCalculo.productoId, productos.id))
      .where(and(eq(parametrosCalculo.empresaId, empresaId), eq(parametrosCalculo.esVigente, true)))
      .orderBy(asc(parametrosCalculo.porcentajeAcumulado));

    return rows.map((r) => ({
      productoId: r.productoId,
      categoriaAbc: (r.categoriaAbc as CategoriaAbc | null) ?? null,
      jobId: r.jobId,
      valorConsumoAnual: r.valorConsumoAnual != null ? Number(r.valorConsumoAnual) : null,
      porcentajeValor: r.porcentajeValor != null ? Number(r.porcentajeValor) : null,
      porcentajeAcumulado: r.porcentajeAcumulado != null ? Number(r.porcentajeAcumulado) : null,
      fechaCalculo: r.fechaCalculo,
      sku: r.sku,
      nombre: r.nombre,
    }));
  },
};
