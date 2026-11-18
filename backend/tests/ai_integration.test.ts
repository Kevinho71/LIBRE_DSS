import { describe, it, expect, afterAll, vi } from 'vitest';

vi.mock('../src/shared/aws/s3', () => ({
  leerObjetoComoBase64: async () => ({ mimeType: 'image/jpeg', base64: 'ZmFrZUludmlkYQ==' }),
}));
vi.mock('../src/modules/ai/ai.extractor', () => ({
  extraerDesdeImagen: async () => ({
    fecha: null,
    items: [{ descripcion: 'Melamina Blanca 18mm', cantidad: 2, precioUnitario: 100 }],
  }),
}));

import { db } from '../src/db/client';
import { empresas, productos, transacciones } from '../src/db/schema';
import { eq, and } from 'drizzle-orm';
import { aiService } from '../src/modules/ai/ai.service';

const isDatabaseConfigured = Boolean(
  process.env.DATABASE_URL &&
  (process.env.DATABASE_URL.startsWith('postgres://') || process.env.DATABASE_URL.startsWith('postgresql://'))
);

describe.runIf(isDatabaseConfigured)('Ingesta IA — Integración (LIB-31 / LIB-32 en Neon)', { timeout: 30000 }, () => {
  let empresaId: string;
  let productoId: string;
  let ingestaId: string;

  it('prepara empresa y producto de referencia', async () => {
    const [emp] = await db
      .insert(empresas)
      .values({ nombre: 'Empresa IA Integración', plan: 'gratuito' })
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
    productoId = prod.id;
  });

  it('extrae y matchea ítems creando una ingesta pendiente (Human-in-the-Loop)', async () => {
    const r = await aiService.extraerIngesta(empresaId, { s3Key: 'recibos/test.jpg' });

    expect(r.estado).toBe('pendiente');
    expect(r.items).toHaveLength(1);
    expect(r.items[0].productoId).toBe(productoId);
    expect(r.items[0].similitud).toBeGreaterThan(0.3);

    ingestaId = r.ingestaId;
  });

  it('confirma la ingesta creando transacciones históricas (sin tocar stock)', async () => {
    const r = await aiService.confirmarIngesta(empresaId, ingestaId, {
      fechaEvento: '2026-10-01',
      items: [{ productoId, cantidad: 2, precioVenta: 150 }],
    });

    expect(r.estado).toBe('confirmada');
    expect(r.transaccionesCreadas).toBe(1);
    expect(r.yaConfirmada).toBe(false);

    const trx = await db
      .select()
      .from(transacciones)
      .where(and(eq(transacciones.empresaId, empresaId), eq(transacciones.productoId, productoId)));

    expect(trx).toHaveLength(1);
    expect(trx[0].tipo).toBe('venta');
    expect(trx[0].motivo).toBe('Ingesta asistida por IA');
  });

  it('es idempotente al confirmar la misma ingesta dos veces', async () => {
    const r = await aiService.confirmarIngesta(empresaId, ingestaId, {
      fechaEvento: '2026-10-01',
      items: [{ productoId, cantidad: 2 }],
    });

    expect(r.yaConfirmada).toBe(true);
    expect(r.transaccionesCreadas).toBe(0);

    const trx = await db
      .select()
      .from(transacciones)
      .where(eq(transacciones.empresaId, empresaId));

    expect(trx).toHaveLength(1);
  });

  afterAll(async () => {
    if (empresaId) {
      await db.delete(empresas).where(eq(empresas.id, empresaId));
    }
  });
});
