import { db } from '../../db/client';
import { empresas, productos, transacciones, parametrosCalculo, ordenesCompra, productoProveedores } from '../../db/schema';
import { and, eq, isNull, sql, gte, inArray } from 'drizzle-orm';
import { CategoriaAbc } from '../../engine/abcService';

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

  async existeProducto(empresaId: string, productoId: string): Promise<boolean> {
    const rows = await db
      .select({ id: productos.id })
      .from(productos)
      .where(and(eq(productos.id, productoId), eq(productos.empresaId, empresaId), isNull(productos.deletedAt)))
      .limit(1);
    return rows.length > 0;
  },

  async obtenerDatosReporteCostos(
    empresaId: string,
    productoId?: string
  ): Promise<DatosProductoReporte[]> {
    const conditions = [
      eq(productos.empresaId, empresaId),
      isNull(productos.deletedAt),
      eq(parametrosCalculo.esVigente, true),
    ];

    if (productoId) {
      conditions.push(eq(productos.id, productoId));
    }

    const rows = await db
      .select({
        id: productos.id,
        sku: productos.sku,
        nombre: productos.nombre,
        stockActual: productos.stockActual,
        costoUnitario: productos.costoUnitario,
        precioVenta: productos.precioVenta,
        costoPedidoProducto: productos.costoPedido,
        tasaMantenimientoAnual: productos.tasaMantenimientoAnual,
        costoPedidoProveedor: productoProveedores.costoPedido,
        leadTimeDias: productoProveedores.leadTimeDias,
        ropCalculado: parametrosCalculo.ropCalculado,
        eoqCalculado: parametrosCalculo.eoqCalculado,
        stockSeguridadCalculado: parametrosCalculo.stockSeguridadCalculado,
        demandaPromedioDiaria: parametrosCalculo.demandaPromedioDiaria,
        categoriaAbc: parametrosCalculo.categoriaAbc,
      })
      .from(productos)
      .innerJoin(
        parametrosCalculo,
        and(
          eq(parametrosCalculo.productoId, productos.id),
          eq(parametrosCalculo.empresaId, productos.empresaId)
        )
      )
      .leftJoin(
        productoProveedores,
        and(
          eq(productoProveedores.productoId, productos.id),
          eq(productoProveedores.empresaId, productos.empresaId),
          eq(productoProveedores.esPrincipal, true)
        )
      )
      .where(and(...conditions));

    return rows.map((r) => ({
      id: r.id,
      sku: r.sku,
      nombre: r.nombre,
      stockActual: Number(r.stockActual),
      costoUnitario: Number(r.costoUnitario),
      precioVenta: Number(r.precioVenta),
      costoPedido: Number(r.costoPedidoProveedor ?? r.costoPedidoProducto ?? 50),
      tasaMantenimientoAnual: Number(r.tasaMantenimientoAnual ?? 0.2),
      leadTimeDias: r.leadTimeDias != null ? Number(r.leadTimeDias) : 3,
      ropCalculado: r.ropCalculado != null ? Number(r.ropCalculado) : null,
      eoqCalculado: r.eoqCalculado != null ? Number(r.eoqCalculado) : null,
      stockSeguridadCalculado: r.stockSeguridadCalculado != null ? Number(r.stockSeguridadCalculado) : null,
      demandaPromedioDiaria: r.demandaPromedioDiaria != null ? Number(r.demandaPromedioDiaria) : null,
      categoriaAbc: (r.categoriaAbc as CategoriaAbc) ?? null,
    }));
  },

  async obtenerVentasPorDia(
    empresaId: string,
    productoIds: string[],
    fechaDesde: string
  ): Promise<Array<{ productoId: string; fechaEvento: string; cantidadNeta: number }>> {
    if (productoIds.length === 0) return [];

    const rows = await db
      .select({
        productoId: transacciones.productoId,
        fechaEvento: transacciones.fechaEvento,
        cantidadNeta: sql<string>`COALESCE(SUM(CASE WHEN ${transacciones.tipo} = 'venta' THEN ${transacciones.cantidad} ELSE 0 END), 0)
          - COALESCE(SUM(CASE WHEN ${transacciones.tipo} = 'devolucion_cliente' THEN ${transacciones.cantidad} ELSE 0 END), 0)`,
      })
      .from(transacciones)
      .where(
        and(
          eq(transacciones.empresaId, empresaId),
          gte(transacciones.fechaEvento, fechaDesde),
          inArray(transacciones.productoId, productoIds)
        )
      )
      .groupBy(transacciones.productoId, transacciones.fechaEvento);

    return rows.map((r) => ({
      productoId: r.productoId,
      fechaEvento: r.fechaEvento,
      cantidadNeta: Math.max(0, Number(r.cantidadNeta)),
    }));
  },
};

export interface DatosProductoReporte {
  id: string;
  sku: string | null;
  nombre: string;
  stockActual: number;
  costoUnitario: number;
  precioVenta: number;
  costoPedido: number;
  tasaMantenimientoAnual: number;
  leadTimeDias: number;
  ropCalculado: number | null;
  eoqCalculado: number | null;
  stockSeguridadCalculado: number | null;
  demandaPromedioDiaria: number | null;
  categoriaAbc: CategoriaAbc | null;
}
