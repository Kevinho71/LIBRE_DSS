import { describe, it, expect, afterAll } from 'vitest';
import { db } from '../src/db/client';
import { empresas, productos } from '../src/db/schema';
import { eq } from 'drizzle-orm';
import { aiMatcher } from '../src/modules/ai/ai.matcher';

const isDatabaseConfigured = Boolean(
  process.env.DATABASE_URL &&
  (process.env.DATABASE_URL.startsWith('postgres://') || process.env.DATABASE_URL.startsWith('postgresql://'))
);

describe.runIf(isDatabaseConfigured)('Coincidencia difusa pg_trgm (LIB-31)', { timeout: 30000 }, () => {
  let empresaId: string;
  let productoMelaminaId: string;

  it('prepara empresa y producto de referencia', async () => {
    const [emp] = await db
      .insert(empresas)
      .values({ nombre: 'Empresa Fuzzy Matcher', plan: 'gratuito' })
      .returning();
    empresaId = emp.id;

    const [prod] = await db
      .insert(productos)
      .values({
        empresaId,
        nombre: 'Melamina Blanca 18mm',
        costoUnitario: '120',
        precioVenta: '180',
        stockActual: '0',
      })
      .returning();
    productoMelaminaId = prod.id;
  });

  it('debe encontrar el producto con variaciones tipográficas (pg_trgm)', async () => {
    const coincidencias = await aiMatcher.buscarCoincidencias(empresaId, 'Melam. Blan 18', 5);
    expect(coincidencias.length).toBeGreaterThan(0);
    expect(coincidencias[0].productoId).toBe(productoMelaminaId);
    expect(coincidencias[0].similitud).toBeGreaterThan(0.3);
  });

  it('no debe devolver coincidencias para texto sin relación', async () => {
    const coincidencias = await aiMatcher.buscarCoincidencias(empresaId, 'Zzzz Xxq 999', 5);
    expect(coincidencias).toHaveLength(0);
  });

  afterAll(async () => {
    if (empresaId) {
      await db.delete(empresas).where(eq(empresas.id, empresaId));
    }
  });
});
