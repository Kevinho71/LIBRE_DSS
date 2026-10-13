import { db } from '../../db/client';
import { productos } from '../../db/schema';
import { and, eq, isNull, desc, sql } from 'drizzle-orm';

export interface Coincidencia {
  productoId: string;
  nombre: string;
  sku: string | null;
  similitud: number;
}

const UMBRAL_SIMILITUD = 0.3;

export const aiMatcher = {
  async buscarCoincidencias(empresaId: string, descripcion: string, limite = 1): Promise<Coincidencia[]> {
    const normalizada = (descripcion || '').trim();
    if (normalizada === '') return [];

    const similitud = sql<number>`similarity(${productos.nombre}, ${normalizada})`;
    const condicionSimilitud = sql`similarity(${productos.nombre}, ${normalizada}) >= ${UMBRAL_SIMILITUD}`;

    const rows = await db
      .select({
        productoId: productos.id,
        nombre: productos.nombre,
        sku: productos.sku,
        similitud,
      })
      .from(productos)
      .where(and(eq(productos.empresaId, empresaId), isNull(productos.deletedAt), condicionSimilitud))
      .orderBy(desc(similitud))
      .limit(limite);

    return rows.map((r) => ({
      productoId: r.productoId,
      nombre: r.nombre,
      sku: r.sku,
      similitud: Number(r.similitud),
    }));
  },
};
