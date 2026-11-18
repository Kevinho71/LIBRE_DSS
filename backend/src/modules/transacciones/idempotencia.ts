import crypto from 'crypto';

/** Longitud máxima de `transacciones.llave_idempotencia` (varchar(64)). */
export const MAX_LLAVE_IDEMPOTENCIA = 64;

/**
 * Llave de idempotencia de cada ítem de una nota de venta batch.
 *
 * Cada ítem se guarda como una fila propia, así que su llave debe ser distinta
 * (llave de la nota + producto) y determinística para detectar reintentos. Con UUID
 * de 36 caracteres para la nota y para el producto, `llave_productoId` mide 73 y rebasa
 * la columna de 64: en ese caso se usa el SHA-256 hexadecimal (exactamente 64).
 */
export function llaveItemBatch(llaveNota: string, productoId: string): string {
  return acotarLlave(`${llaveNota}_${productoId}`);
}

/**
 * Ajusta cualquier texto a una llave válida para `llave_idempotencia` (varchar(64)):
 * si cabe se conserva; si no, se usa su SHA-256 hexadecimal (determinístico, 64 caracteres).
 */
export function acotarLlave(texto: string): string {
  if (texto.length <= MAX_LLAVE_IDEMPOTENCIA) return texto;
  return crypto.createHash('sha256').update(texto).digest('hex');
}
