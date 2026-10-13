import { db } from '../../db/client';
import { empresas, productos, transacciones, parametrosCalculo, productoProveedores, ordenesCompra } from '../../db/schema';
import { and, eq, isNull, sql, asc } from 'drizzle-orm';
import { CategoriaAbc } from '../../engine/abcService';
import { FaseArranque } from '../../engine/coldStartService';
import { PoliticaInventario } from '../../engine/periodicService';

export interface DemandaProducto {
  productoId: string;
  costoUnitario: number;
  demandaNeta: number;
  diasConVenta: number;
  diasHistorial: number;
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

export interface FilaLogistica {
  productoId: string;
  categoriaAbc: CategoriaAbc | null;
  demandaPromedioDiaria: number | null;
  demandaAnual: number | null;
  costoUnitario: number;
  costoPedido: number;
  tasaMantenimientoAnual: number;
  leadTimeDias: number;
  loteMinimo: number;
  costoPedidoProveedor: number | null;
}

export interface FilaPosicionInventario {
  productoId: string;
  categoriaAbc: CategoriaAbc | null;
  ropCalculado: number | null;
  eoqCalculado: number | null;
  stockSeguridadCalculado: number | null;
  stockActual: number;
  enTransito: number;
  sku: string | null;
  nombre: string;
}

export interface FilaEoqRopCalculada {
  productoId: string;
  eoq: number;
  rop: number | null;
  ss: number | null;
}

export interface FilaSistema {
  productoId: string;
  categoriaAbc: CategoriaAbc | null;
  politica: PoliticaInventario;
  faseArranque: FaseArranque;
  demandaPromedioDiaria: number | null;
  demandaAnual: number | null;
  leadTimeDias: number;
  eoqCalculado: number | null;
  ropCalculado: number | null;
  stockSeguridadCalculado: number | null;
  intervaloRevisionDias: number | null;
  nivelObjetivoT: number | null;
  diasHistorial: number;
  diasConVenta: number;
  stockMinimoManual: number | null;
  stockMaximoManual: number | null;
  stockActual: number;
  sku: string | null;
  nombre: string;
}

export interface FilaAsignacionSistema {
  productoId: string;
  politica: PoliticaInventario;
  faseArranque: FaseArranque;
  intervaloRevisionDias: number | null;
  nivelObjetivoT: number | null;
  ropCalculado: number | null;
  stockSeguridadCalculado: number | null;
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
        diasHistorial: sql<number>`COALESCE((MAX(${transacciones.fechaEvento}) - MIN(${transacciones.fechaEvento})) + 1, 0)::int`,
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
      diasHistorial: Number(r.diasHistorial),
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

  async obtenerParametrosLogisticos(empresaId: string): Promise<FilaLogistica[]> {
    const rows = await db
      .select({
        productoId: parametrosCalculo.productoId,
        categoriaAbc: parametrosCalculo.categoriaAbc,
        demandaPromedioDiaria: parametrosCalculo.demandaPromedioDiaria,
        demandaAnual: parametrosCalculo.demandaAnual,
        costoUnitario: productos.costoUnitario,
        costoPedido: productos.costoPedido,
        tasaMantenimientoAnual: productos.tasaMantenimientoAnual,
        leadTimeDias: sql<number>`COALESCE(MAX(${productoProveedores.leadTimeDias}), 3)::int`,
        loteMinimo: sql<string>`COALESCE(MAX(${productoProveedores.loteMinimo}), 1)::numeric`,
        costoPedidoProveedor: sql<string | null>`MAX(${productoProveedores.costoPedido})::numeric`,
      })
      .from(parametrosCalculo)
      .innerJoin(productos, eq(parametrosCalculo.productoId, productos.id))
      .leftJoin(
        productoProveedores,
        and(
          eq(productoProveedores.productoId, productos.id),
          eq(productoProveedores.empresaId, productos.empresaId),
          eq(productoProveedores.esPrincipal, true)
        )
      )
      .where(and(eq(parametrosCalculo.empresaId, empresaId), eq(parametrosCalculo.esVigente, true)))
      .groupBy(
        parametrosCalculo.productoId,
        parametrosCalculo.categoriaAbc,
        parametrosCalculo.demandaPromedioDiaria,
        parametrosCalculo.demandaAnual,
        productos.costoUnitario,
        productos.costoPedido,
        productos.tasaMantenimientoAnual
      );

    return rows.map((r) => ({
      productoId: r.productoId,
      categoriaAbc: (r.categoriaAbc as CategoriaAbc | null) ?? null,
      demandaPromedioDiaria: r.demandaPromedioDiaria != null ? Number(r.demandaPromedioDiaria) : null,
      demandaAnual: r.demandaAnual != null ? Number(r.demandaAnual) : null,
      costoUnitario: Number(r.costoUnitario),
      costoPedido: Number(r.costoPedido),
      tasaMantenimientoAnual: Number(r.tasaMantenimientoAnual),
      leadTimeDias: Number(r.leadTimeDias),
      loteMinimo: Number(r.loteMinimo),
      costoPedidoProveedor: r.costoPedidoProveedor != null ? Number(r.costoPedidoProveedor) : null,
    }));
  },

  async actualizarEoqRop(empresaId: string, jobId: string, filas: FilaEoqRopCalculada[]): Promise<void> {
    for (const f of filas) {
      await db
        .update(parametrosCalculo)
        .set({
          eoqCalculado: String(f.eoq),
          ropCalculado: f.rop != null ? String(f.rop) : null,
          stockSeguridadCalculado: f.ss != null ? String(f.ss) : null,
          jobId,
          fechaCalculo: new Date(),
        })
        .where(
          and(
            eq(parametrosCalculo.empresaId, empresaId),
            eq(parametrosCalculo.productoId, f.productoId),
            eq(parametrosCalculo.esVigente, true)
          )
        );
    }
  },

  async obtenerPosiciones(empresaId: string, productoId?: string): Promise<FilaPosicionInventario[]> {
    const conditions = [
      eq(parametrosCalculo.empresaId, empresaId),
      eq(parametrosCalculo.esVigente, true),
      isNull(productos.deletedAt),
    ];
    if (productoId) {
      conditions.push(eq(parametrosCalculo.productoId, productoId));
    }

    const rows = await db
      .select({
        productoId: parametrosCalculo.productoId,
        categoriaAbc: parametrosCalculo.categoriaAbc,
        ropCalculado: parametrosCalculo.ropCalculado,
        eoqCalculado: parametrosCalculo.eoqCalculado,
        stockSeguridadCalculado: parametrosCalculo.stockSeguridadCalculado,
        stockActual: productos.stockActual,
        sku: productos.sku,
        nombre: productos.nombre,
        enTransito: sql<string>`COALESCE(SUM(CASE WHEN ${ordenesCompra.estado} = 'en_transito' THEN ${ordenesCompra.cantidadPedida} ELSE 0 END), 0)::numeric`,
      })
      .from(parametrosCalculo)
      .innerJoin(productos, eq(parametrosCalculo.productoId, productos.id))
      .leftJoin(
        ordenesCompra,
        and(eq(ordenesCompra.productoId, productos.id), eq(ordenesCompra.empresaId, productos.empresaId))
      )
      .where(and(...conditions))
      .groupBy(
        parametrosCalculo.productoId,
        parametrosCalculo.categoriaAbc,
        parametrosCalculo.ropCalculado,
        parametrosCalculo.eoqCalculado,
        parametrosCalculo.stockSeguridadCalculado,
        productos.stockActual,
        productos.sku,
        productos.nombre
      );

    return rows.map((r) => ({
      productoId: r.productoId,
      categoriaAbc: (r.categoriaAbc as CategoriaAbc | null) ?? null,
      ropCalculado: r.ropCalculado != null ? Number(r.ropCalculado) : null,
      eoqCalculado: r.eoqCalculado != null ? Number(r.eoqCalculado) : null,
      stockSeguridadCalculado: r.stockSeguridadCalculado != null ? Number(r.stockSeguridadCalculado) : null,
      stockActual: Number(r.stockActual),
      enTransito: Number(r.enTransito),
      sku: r.sku,
      nombre: r.nombre,
    }));
  },

  async obtenerFilasSistema(empresaId: string): Promise<FilaSistema[]> {
    const rows = await db
      .select({
        productoId: parametrosCalculo.productoId,
        categoriaAbc: parametrosCalculo.categoriaAbc,
        politica: parametrosCalculo.politica,
        faseArranque: parametrosCalculo.faseArranque,
        demandaPromedioDiaria: parametrosCalculo.demandaPromedioDiaria,
        demandaAnual: parametrosCalculo.demandaAnual,
        eoqCalculado: parametrosCalculo.eoqCalculado,
        ropCalculado: parametrosCalculo.ropCalculado,
        stockSeguridadCalculado: parametrosCalculo.stockSeguridadCalculado,
        intervaloRevisionDias: parametrosCalculo.intervaloRevisionDias,
        nivelObjetivoT: parametrosCalculo.nivelObjetivoT,
        diasHistorial: parametrosCalculo.diasHistorial,
        diasConVenta: parametrosCalculo.diasConVenta,
        leadTimeDias: sql<number>`COALESCE(MAX(${productoProveedores.leadTimeDias}), 3)::int`,
        stockMinimoManual: productos.stockMinimoManual,
        stockMaximoManual: productos.stockMaximoManual,
        stockActual: productos.stockActual,
        sku: productos.sku,
        nombre: productos.nombre,
      })
      .from(parametrosCalculo)
      .innerJoin(productos, eq(parametrosCalculo.productoId, productos.id))
      .leftJoin(
        productoProveedores,
        and(
          eq(productoProveedores.productoId, productos.id),
          eq(productoProveedores.empresaId, productos.empresaId),
          eq(productoProveedores.esPrincipal, true)
        )
      )
      .where(and(eq(parametrosCalculo.empresaId, empresaId), eq(parametrosCalculo.esVigente, true)))
      .groupBy(
        parametrosCalculo.productoId,
        parametrosCalculo.categoriaAbc,
        parametrosCalculo.politica,
        parametrosCalculo.faseArranque,
        parametrosCalculo.demandaPromedioDiaria,
        parametrosCalculo.demandaAnual,
        parametrosCalculo.eoqCalculado,
        parametrosCalculo.ropCalculado,
        parametrosCalculo.stockSeguridadCalculado,
        parametrosCalculo.intervaloRevisionDias,
        parametrosCalculo.nivelObjetivoT,
        parametrosCalculo.diasHistorial,
        parametrosCalculo.diasConVenta,
        productos.stockMinimoManual,
        productos.stockMaximoManual,
        productos.stockActual,
        productos.sku,
        productos.nombre
      );

    return rows.map((r) => ({
      productoId: r.productoId,
      categoriaAbc: (r.categoriaAbc as CategoriaAbc | null) ?? null,
      politica: (r.politica as PoliticaInventario) ?? 'Q',
      faseArranque: (r.faseArranque as FaseArranque) ?? 1,
      demandaPromedioDiaria: r.demandaPromedioDiaria != null ? Number(r.demandaPromedioDiaria) : null,
      demandaAnual: r.demandaAnual != null ? Number(r.demandaAnual) : null,
      eoqCalculado: r.eoqCalculado != null ? Number(r.eoqCalculado) : null,
      ropCalculado: r.ropCalculado != null ? Number(r.ropCalculado) : null,
      stockSeguridadCalculado: r.stockSeguridadCalculado != null ? Number(r.stockSeguridadCalculado) : null,
      intervaloRevisionDias: r.intervaloRevisionDias,
      nivelObjetivoT: r.nivelObjetivoT != null ? Number(r.nivelObjetivoT) : null,
      diasHistorial: Number(r.diasHistorial),
      diasConVenta: Number(r.diasConVenta),
      leadTimeDias: Number(r.leadTimeDias),
      stockMinimoManual: r.stockMinimoManual != null ? Number(r.stockMinimoManual) : null,
      stockMaximoManual: r.stockMaximoManual != null ? Number(r.stockMaximoManual) : null,
      stockActual: Number(r.stockActual),
      sku: r.sku,
      nombre: r.nombre,
    }));
  },

  async asignarSistemas(empresaId: string, jobId: string, filas: FilaAsignacionSistema[]): Promise<void> {
    for (const f of filas) {
      await db
        .update(parametrosCalculo)
        .set({
          politica: f.politica,
          faseArranque: f.faseArranque,
          intervaloRevisionDias: f.intervaloRevisionDias,
          nivelObjetivoT: f.nivelObjetivoT != null ? String(f.nivelObjetivoT) : null,
          ropCalculado: f.ropCalculado != null ? String(f.ropCalculado) : null,
          stockSeguridadCalculado: f.stockSeguridadCalculado != null ? String(f.stockSeguridadCalculado) : null,
          jobId,
          fechaCalculo: new Date(),
        })
        .where(
          and(
            eq(parametrosCalculo.empresaId, empresaId),
            eq(parametrosCalculo.productoId, f.productoId),
            eq(parametrosCalculo.esVigente, true)
          )
        );
    }
  },
};
