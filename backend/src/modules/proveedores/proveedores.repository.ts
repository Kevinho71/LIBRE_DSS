import { db } from '../../db/client';
import { proveedores, productoProveedores } from '../../db/schema';
import { and, eq } from 'drizzle-orm';
import { CreateProveedorDto, AsociarProductoProveedorDto } from './proveedores.types';

export const proveedoresRepository = {
  async create(empresaId: string, data: CreateProveedorDto): Promise<typeof proveedores.$inferSelect> {
    const [row] = await db
      .insert(proveedores)
      .values({
        empresaId,
        nombre: data.nombre,
        contacto: data.contacto ?? null,
        telefono: data.telefono ?? null,
      })
      .returning();

    return row;
  },

  async findById(empresaId: string, id: string): Promise<typeof proveedores.$inferSelect | null> {
    const rows = await db
      .select()
      .from(proveedores)
      .where(and(
        eq(proveedores.empresaId, empresaId),
        eq(proveedores.id, id)
      ))
      .limit(1);

    return rows[0] ?? null;
  },

  async findAll(empresaId: string): Promise<Array<typeof proveedores.$inferSelect>> {
    return db
      .select()
      .from(proveedores)
      .where(eq(proveedores.empresaId, empresaId))
      .orderBy(proveedores.nombre);
  },

  async findProductoProveedor(
    empresaId: string,
    productoId: string,
    proveedorId: string
  ): Promise<typeof productoProveedores.$inferSelect | null> {
    const rows = await db
      .select()
      .from(productoProveedores)
      .where(and(
        eq(productoProveedores.empresaId, empresaId),
        eq(productoProveedores.productoId, productoId),
        eq(productoProveedores.proveedorId, proveedorId)
      ))
      .limit(1);

    return rows[0] ?? null;
  },

  async desmarcarPrincipalAnteriores(empresaId: string, productoId: string): Promise<void> {
    await db
      .update(productoProveedores)
      .set({ esPrincipal: false })
      .where(and(
        eq(productoProveedores.empresaId, empresaId),
        eq(productoProveedores.productoId, productoId)
      ));
  },

  async asociarProducto(
    empresaId: string,
    productoId: string,
    data: AsociarProductoProveedorDto
  ): Promise<typeof productoProveedores.$inferSelect> {
    const existing = await this.findProductoProveedor(empresaId, productoId, data.proveedorId);

    if (existing) {
      const [updated] = await db
        .update(productoProveedores)
        .set({
          codigoProveedor: data.codigoProveedor ?? null,
          costoCompra: data.costoCompra != null ? String(data.costoCompra) : null,
          leadTimeDias: data.leadTimeDias ?? 3,
          costoPedido: String(data.costoPedido ?? 50.00),
          loteMinimo: String(data.loteMinimo ?? 1),
          esPrincipal: data.esPrincipal ?? true,
        })
        .where(eq(productoProveedores.id, existing.id))
        .returning();

      return updated;
    }

    const [created] = await db
      .insert(productoProveedores)
      .values({
        empresaId,
        productoId,
        proveedorId: data.proveedorId,
        codigoProveedor: data.codigoProveedor ?? null,
        costoCompra: data.costoCompra != null ? String(data.costoCompra) : null,
        leadTimeDias: data.leadTimeDias ?? 3,
        costoPedido: String(data.costoPedido ?? 50.00),
        loteMinimo: String(data.loteMinimo ?? 1),
        esPrincipal: data.esPrincipal ?? true,
      })
      .returning();

    return created;
  },

  async findProveedoresByProducto(
    empresaId: string,
    productoId: string
  ): Promise<Array<{ vinculo: typeof productoProveedores.$inferSelect; proveedorNombre: string }>> {
    const rows = await db
      .select({
        vinculo: productoProveedores,
        proveedorNombre: proveedores.nombre,
      })
      .from(productoProveedores)
      .innerJoin(
        proveedores,
        eq(proveedores.id, productoProveedores.proveedorId)
      )
      .where(and(
        eq(productoProveedores.empresaId, empresaId),
        eq(productoProveedores.productoId, productoId)
      ))
      .orderBy(productoProveedores.esPrincipal);

    return rows;
  },
};
