import { describe, it, expect, vi, beforeEach } from 'vitest';
import crypto from 'crypto';
import { llaveItemBatch, acotarLlave, MAX_LLAVE_IDEMPOTENCIA } from './idempotencia';
import { transaccionesService } from './transacciones.service';
import { transaccionesRepository } from './transacciones.repository';

describe('llaveItemBatch (llave por ítem de la nota batch)', () => {
  it('con UUID de nota y de producto nunca supera la columna varchar(64)', () => {
    const llave = llaveItemBatch(crypto.randomUUID(), crypto.randomUUID());
    expect(llave.length).toBeLessThanOrEqual(MAX_LLAVE_IDEMPOTENCIA);
  });

  it('es determinística y distinta por producto', () => {
    const nota = crypto.randomUUID();
    const p1 = crypto.randomUUID();
    const p2 = crypto.randomUUID();
    expect(llaveItemBatch(nota, p1)).toBe(llaveItemBatch(nota, p1));
    expect(llaveItemBatch(nota, p1)).not.toBe(llaveItemBatch(nota, p2));
  });

  it('conserva la forma legible cuando cabe en 64 caracteres', () => {
    expect(llaveItemBatch('run1-venta-2026-04-01', 'abc')).toBe('run1-venta-2026-04-01_abc');
  });
});

describe('acotarLlave (llave de la ingesta por foto)', () => {
  it('reduce una clave S3 larga a 64 caracteres de forma determinística', () => {
    const key = `recibos/${crypto.randomUUID()}/${crypto.randomUUID()}_recibo_cuaderno.jpg`;
    expect(key.length).toBeGreaterThan(MAX_LLAVE_IDEMPOTENCIA);
    expect(acotarLlave(key)).toHaveLength(MAX_LLAVE_IDEMPOTENCIA);
    expect(acotarLlave(key)).toBe(acotarLlave(key));
  });
  it('no altera una llave que ya cabe', () => {
    expect(acotarLlave('corta')).toBe('corta');
  });
});

describe('registrarVentaBatch: reintento con llave de idempotencia', () => {
  const empresaId = crypto.randomUUID();
  const productoId = crypto.randomUUID();
  const notaId = crypto.randomUUID();

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('detecta el reintento por la llave derivada y no vuelve a descontar stock', async () => {
    const llave = crypto.randomUUID();
    const buscar = vi.spyOn(transaccionesRepository, 'findByIdempotencia').mockResolvedValue([
      { id: 'trx-1', notaId, llaveIdempotencia: llaveItemBatch(llave, productoId) } as never,
    ]);
    const registrar = vi.spyOn(transaccionesRepository, 'registrarVentaBatch');

    const res = await transaccionesService.registrarVentaBatch(empresaId, {
      notaId,
      llaveIdempotencia: llave,
      items: [{ productoId, cantidad: 1 }],
    });

    expect(res.idempotente).toBe(true);
    expect(res.notaId).toBe(notaId);
    expect(buscar).toHaveBeenCalledWith(empresaId, llaveItemBatch(llave, productoId));
    expect(registrar).not.toHaveBeenCalled();
  });
});
