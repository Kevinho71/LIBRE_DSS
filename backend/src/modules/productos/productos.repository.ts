import { db } from '../../db/client';
import { productos, empresas, parametrosCalculo } from '../../db/schema';
import { and, eq, isNull, sql, ilike, or, inArray } from 'drizzle-orm';
import { CreateProductoDto, UpdateProductoDto, FilaCsvProductoDto } from './productos.types';

export const productosRepository = {
  async getEmpresaPlan(empresaId: string): Promise<string> {
    const rows = await db
      .select({ plan: empresas.plan })
      .from(empresas)
      .where(eq(empresas.id, empresaId))
      .limit(1);

    return rows[0]?.plan ?? 'gratuito';
  },

  async countActivos(empresaId: string): Promise<number> {
    const rows = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(productos)
      .where(and(eq(productos.empresaId, empresaId), isNull(productos.deletedAt)));

    return rows[0]?.count ?? 0;
  },

  async findBySku(empresaId: string, sku: string): Promise<typeof productos.$inferSelect | null> {
    const rows = await db
      .select()
      .from(productos)
      .where(and(
        eq(productos.empresaId, empresaId),
        eq(productos.sku, sku),
        isNull(productos.deletedAt)
      ))
      .limit(1);

    return rows[0] ?? null;
  },

  async findById(empresaId: string, id: string): Promise<typeof productos.$inferSelect | null> {
    const rows = await db
      .select()
      .from(productos)
      .where(and(
        eq(productos.empresaId, empresaId),
        eq(productos.id, id),
        isNull(productos.deletedAt)
      ))
      .limit(1);

    return rows[0] ?? null;
  },

  async findBySkus(empresaId: string, skus: string[]): Promise<string[]> {
    const unique = Array.from(new Set(skus)).filter((s) => s && s.trim() !== '');
    if (unique.length === 0) return [];

    const rows = await db
      .select({ sku: productos.sku })
      .from(productos)
      .where(and(
        eq(productos.empresaId, empresaId),
        isNull(productos.deletedAt),
        inArray(productos.sku, unique)
      ));

    return rows.map((r) => r.sku as string);
  },

  async bulkInsert(empresaId: string, filas: FilaCsvProductoDto[]): Promise<number> {
    if (filas.length === 0) return 0;

    const values = filas.map((f) => ({
      empresaId,
      sku: f.sku ?? null,
      nombre: f.nombre,
      unidadMedida: f.unidadMedida ?? 'unidad',
      unidadCompra: f.unidadCompra ?? null,
      factorConversion: String(f.factorConversion ?? 1.0),
      costoUnitario: String(f.costoUnitario),
      precioVenta: String(f.precioVenta),
      costoPedido: String(f.costoPedido ?? 50.0),
      tasaMantenimientoAnual: String(f.tasaMantenimientoAnual ?? 0.2),
      stockActual: String(f.stockActual ?? 0),
      stockMinimoManual: f.stockMinimoManual != null ? String(f.stockMinimoManual) : null,
      stockMaximoManual: f.stockMaximoManual != null ? String(f.stockMaximoManual) : null,
      origenDato: 'csv',
    }));

    const inserted = await db.insert(productos).values(values).returning();
    return inserted.length;
  },

  async create(empresaId: string, data: CreateProductoDto): Promise<typeof productos.$inferSelect> {
    const [row] = await db
      .insert(productos)
      .values({
        empresaId,
        sku: data.sku ?? null,
        nombre: data.nombre,
        unidadMedida: data.unidadMedida ?? 'unidad',
        unidadCompra: data.unidadCompra ?? null,
        factorConversion: String(data.factorConversion ?? 1.00),
        costoUnitario: String(data.costoUnitario),
        precioVenta: String(data.precioVenta),
        costoPedido: String(data.costoPedido ?? 50.00),
        tasaMantenimientoAnual: String(data.tasaMantenimientoAnual ?? 0.2000),
        stockActual: String(data.stockActual ?? 0),
        stockMinimoManual: data.stockMinimoManual != null ? String(data.stockMinimoManual) : null,
        stockMaximoManual: data.stockMaximoManual != null ? String(data.stockMaximoManual) : null,
        origenDato: data.origenDato ?? 'manual',
      })
      .returning();

    return row;
  },

  async update(empresaId: string, id: string, data: UpdateProductoDto): Promise<typeof productos.$inferSelect | null> {
    const valuesToUpdate: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (data.nombre !== undefined) valuesToUpdate.nombre = data.nombre;
    if (data.sku !== undefined) valuesToUpdate.sku = data.sku;
    if (data.unidadMedida !== undefined) valuesToUpdate.unidadMedida = data.unidadMedida;
    if (data.unidadCompra !== undefined) valuesToUpdate.unidadCompra = data.unidadCompra;
    if (data.factorConversion !== undefined) valuesToUpdate.factorConversion = String(data.factorConversion);
    if (data.costoUnitario !== undefined) valuesToUpdate.costoUnitario = String(data.costoUnitario);
    if (data.precioVenta !== undefined) valuesToUpdate.precioVenta = String(data.precioVenta);
    if (data.costoPedido !== undefined) valuesToUpdate.costoPedido = String(data.costoPedido);
    if (data.tasaMantenimientoAnual !== undefined) valuesToUpdate.tasaMantenimientoAnual = String(data.tasaMantenimientoAnual);
    if (data.stockActual !== undefined) valuesToUpdate.stockActual = String(data.stockActual);
    if (data.stockMinimoManual !== undefined) {
      valuesToUpdate.stockMinimoManual = data.stockMinimoManual != null ? String(data.stockMinimoManual) : null;
    }
    if (data.stockMaximoManual !== undefined) {
      valuesToUpdate.stockMaximoManual = data.stockMaximoManual != null ? String(data.stockMaximoManual) : null;
    }
    if (data.origenDato !== undefined) valuesToUpdate.origenDato = data.origenDato;

    const [updated] = await db
      .update(productos)
      .set(valuesToUpdate)
      .where(and(
        eq(productos.empresaId, empresaId),
        eq(productos.id, id),
        isNull(productos.deletedAt)
      ))
      .returning();

    return updated ?? null;
  },

  async softDelete(empresaId: string, id: string): Promise<boolean> {
    const result = await db
      .update(productos)
      .set({
        deletedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(
        eq(productos.empresaId, empresaId),
        eq(productos.id, id),
        isNull(productos.deletedAt)
      ))
      .returning({ id: productos.id });

    return result.length > 0;
  },

  async findList(
    empresaId: string,
    options: { search?: string; offset: number; limit: number }
  ): Promise<{ items: Array<{ producto: typeof productos.$inferSelect; categoriaAbc: string | null; ropCalculado: string | null }>; total: number }> {
    const baseConditions = [
      eq(productos.empresaId, empresaId),
      isNull(productos.deletedAt),
    ];

    if (options.search && options.search.trim() !== '') {
      const pattern = `%${options.search.trim()}%`;
      baseConditions.push(
        or(
          ilike(productos.nombre, pattern),
          ilike(productos.sku, pattern)
        )!
      );
    }

    const whereClause = and(...baseConditions);

    const [totalRow] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(productos)
      .where(whereClause);

    const total = totalRow?.count ?? 0;

    const items = await db
      .select({
        producto: productos,
        categoriaAbc: parametrosCalculo.categoriaAbc,
        ropCalculado: parametrosCalculo.ropCalculado,
      })
      .from(productos)
      .leftJoin(
        parametrosCalculo,
        and(
          eq(parametrosCalculo.productoId, productos.id),
          eq(parametrosCalculo.esVigente, true)
        )
      )
      .where(whereClause)
      .orderBy(productos.nombre)
      .limit(options.limit)
      .offset(options.offset);

    return { items, total };
  },

  async buscarRapido(empresaId: string, query: string, limit = 10) {
    const pattern = `%${(query || '').trim()}%`;
    const rows = await db
      .select({
        id: productos.id,
        sku: productos.sku,
        nombre: productos.nombre,
        precioVenta: productos.precioVenta,
        costoUnitario: productos.costoUnitario,
        stockActual: productos.stockActual,
        unidadMedida: productos.unidadMedida,
        factorConversion: productos.factorConversion,
        unidadCompra: productos.unidadCompra,
      })
      .from(productos)
      .where(and(
        eq(productos.empresaId, empresaId),
        isNull(productos.deletedAt),
        or(
          ilike(productos.nombre, pattern),
          ilike(productos.sku, pattern)
        )!
      ))
      .orderBy(productos.nombre)
      .limit(limit);

    return rows.map(r => ({
      ...r,
      precioVenta: Number(r.precioVenta),
      costoUnitario: Number(r.costoUnitario),
      stockActual: Number(r.stockActual),
      factorConversion: Number(r.factorConversion),
    }));
  },
};
