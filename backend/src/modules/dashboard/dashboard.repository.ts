import { db } from '../../db/client';
import { empresas, productos, transacciones, parametrosCalculo, ordenesCompra } from '../../db/schema';
import { and, eq, isNull, sql, gte, inArray } from 'drizzle-orm';

export interface ResumenProductos {
  productosActivos: number;
  valorInventario: number;
}

export interface MermasMesResumen {
  cantidad: number;
  valorEstimado: number;
}

export interface PosicionAlerta {
  productoId: string;
  stockActual: number;
  enTransito: number;
  ropCalculado: number | null;
  stockSeguridadCalculado: number | null;
  costoUnitario: number;
  precioVenta: number;
}

export const dashboardRepository = {
  async obtenerPlan(empresaId: string): Promise<string> {
    const rows = await db
      .select({ plan: empresas.plan })
      .from(empresas)
      .where(eq(empresas.id, empresaId))
      .limit(1);

    return rows[0]?.plan ?? 'gratuito';
  },

  async obtenerResumenProductos(empresaId: string): Promise<ResumenProductos> {
    const rows = await db
      .select({
        productosActivos: sql<number>`count(*)::int`,
        valorInventario: sql<string>`COALESCE(SUM(${productos.stockActual} * ${productos.costoUnitario}), 0)::numeric`,
      })
      .from(productos)
      .where(and(eq(productos.empresaId, empresaId), isNull(productos.deletedAt)));

    const row = rows[0];
    return {
      productosActivos: row?.productosActivos ?? 0,
      valorInventario: row != null ? Number(row.valorInventario) : 0,
    };
  },

  async obtenerMermasMes(empresaId: string, inicioMes: string): Promise<MermasMesResumen> {
    const rows = await db
      .select({
        cantidad: sql<string>`COALESCE(SUM(${transacciones.cantidad}), 0)::numeric`,
        valorEstimado: sql<string>`COALESCE(SUM(${transacciones.cantidad} * ${transacciones.costoUnitarioHistorico}), 0)::numeric`,
      })
      .from(transacciones)
      .where(
        and(
          eq(transacciones.empresaId, empresaId),
          inArray(transacciones.tipo, ['merma', 'ajuste']),
          gte(transacciones.fechaEvento, inicioMes)
        )
      );

    const row = rows[0];
    return {
      cantidad: row != null ? Number(row.cantidad) : 0,
      valorEstimado: row != null ? Number(row.valorEstimado) : 0,
    };
  },

  async obtenerPosicionesAlerta(empresaId: string): Promise<PosicionAlerta[]> {
    const rows = await db
      .select({
        productoId: parametrosCalculo.productoId,
        ropCalculado: parametrosCalculo.ropCalculado,
        stockSeguridadCalculado: parametrosCalculo.stockSeguridadCalculado,
        stockActual: productos.stockActual,
        costoUnitario: productos.costoUnitario,
        precioVenta: productos.precioVenta,
        enTransito: sql<string>`COALESCE(SUM(CASE WHEN ${ordenesCompra.estado} = 'en_transito' THEN ${ordenesCompra.cantidadPedida} ELSE 0 END), 0)::numeric`,
      })
      .from(parametrosCalculo)
      .innerJoin(productos, eq(parametrosCalculo.productoId, productos.id))
      .leftJoin(
        ordenesCompra,
        and(eq(ordenesCompra.productoId, productos.id), eq(ordenesCompra.empresaId, productos.empresaId))
      )
      .where(
        and(
          eq(parametrosCalculo.empresaId, empresaId),
          eq(parametrosCalculo.esVigente, true),
          isNull(productos.deletedAt)
        )
      )
      .groupBy(
        parametrosCalculo.productoId,
        parametrosCalculo.ropCalculado,
        parametrosCalculo.stockSeguridadCalculado,
        productos.stockActual,
        productos.costoUnitario,
        productos.precioVenta
      );

    return rows.map((r) => ({
      productoId: r.productoId,
      stockActual: Number(r.stockActual),
      enTransito: Number(r.enTransito),
      ropCalculado: r.ropCalculado != null ? Number(r.ropCalculado) : null,
      stockSeguridadCalculado: r.stockSeguridadCalculado != null ? Number(r.stockSeguridadCalculado) : null,
      costoUnitario: Number(r.costoUnitario),
      precioVenta: Number(r.precioVenta),
    }));
  },
};
