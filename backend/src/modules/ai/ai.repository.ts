import { db } from '../../db/client';
import { ingestas, transacciones, productos } from '../../db/schema';
import { and, eq, inArray } from 'drizzle-orm';
import { NotFoundError, ConflictError } from '../../shared/errors/AppError';
import { ConfirmarIngestaItemDto } from './ai.types';

export interface CreateIngestaInput {
  empresaId: string;
  s3Key: string;
  estado: 'pendiente';
  fechaEvento: string | null;
  items: Record<string, unknown> | null;
  llaveIdempotencia: string | null;
}

export interface ConfirmarResultado {
  ingesta: typeof ingestas.$inferSelect;
  transaccionesCreadas: number;
  yaConfirmada: boolean;
}

export const aiRepository = {
  async createIngesta(input: CreateIngestaInput): Promise<typeof ingestas.$inferSelect> {
    const [row] = await db
      .insert(ingestas)
      .values({
        empresaId: input.empresaId,
        s3Key: input.s3Key,
        estado: input.estado,
        fechaEvento: input.fechaEvento,
        items: input.items as never,
        llaveIdempotencia: input.llaveIdempotencia,
      })
      .returning();
    return row;
  },

  async findById(empresaId: string, id: string): Promise<typeof ingestas.$inferSelect | null> {
    const [row] = await db
      .select()
      .from(ingestas)
      .where(and(eq(ingestas.empresaId, empresaId), eq(ingestas.id, id)))
      .limit(1);
    return row ?? null;
  },

  async confirmar(
    empresaId: string,
    ingestaId: string,
    fechaEvento: string,
    items: ConfirmarIngestaItemDto[]
  ): Promise<ConfirmarResultado> {
    return db.transaction(async (tx) => {
      const [ingesta] = await tx
        .select()
        .from(ingestas)
        .where(and(eq(ingestas.empresaId, empresaId), eq(ingestas.id, ingestaId)))
        .limit(1);

      if (!ingesta) {
        throw new NotFoundError('INGESTA_NO_ENCONTRADA', `La ingesta '${ingestaId}' no existe.`);
      }
      if (ingesta.estado === 'confirmada') {
        return { ingesta, transaccionesCreadas: 0, yaConfirmada: true };
      }
      if (ingesta.estado === 'descartada') {
        throw new ConflictError('INGESTA_DESCARTADA', 'La ingesta ya fue descartada y no puede confirmarse.');
      }

      const productoIds = items.map((i) => i.productoId);
      const prods = await tx
        .select()
        .from(productos)
        .where(and(eq(productos.empresaId, empresaId), inArray(productos.id, productoIds)));

      const costoMap = new Map(prods.map((p) => [p.id, Number(p.costoUnitario)]));

      for (const [idx, item] of items.entries()) {
        const costoHistorico = costoMap.get(item.productoId) ?? 0;
        await tx
          .insert(transacciones)
          .values({
            empresaId,
            productoId: item.productoId,
            tipo: 'venta',
            cantidad: String(item.cantidad),
            costoUnitarioHistorico: String(costoHistorico),
            precioVentaHistorico: item.precioVenta != null ? String(item.precioVenta) : null,
            motivo: 'Ingesta asistida por IA',
            estadoPago: 'contado',
            llaveIdempotencia: `${ingestaId}:${idx}`,
            fechaEvento,
          });
      }

      const [actualizada] = await tx
        .update(ingestas)
        .set({ estado: 'confirmada', fechaEvento, updatedAt: new Date() })
        .where(and(eq(ingestas.empresaId, empresaId), eq(ingestas.id, ingestaId)))
        .returning();

      return { ingesta: actualizada, transaccionesCreadas: items.length, yaConfirmada: false };
    });
  },
};
