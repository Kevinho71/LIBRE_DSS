import { db } from '../../db/client';
import { productos, empresas, parametrosCalculo } from '../../db/schema';
import { and, eq, isNull, sql, ilike, or } from 'drizzle-orm';
import { CreateProductoDto, UpdateProductoDto } from './productos.types';

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
};
