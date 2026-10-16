import { getDb, type VentaPendiente } from './db';

export type { VentaPendiente } from './db';

export interface NuevaVentaPendiente {
  id: string;
  notaId: string;
  llaveIdempotencia: string;
  items: VentaPendiente['items'];
  estadoPago: VentaPendiente['estadoPago'];
  fechaEvento: string;
  motivo?: string;
}

export async function encolarVenta(venta: NuevaVentaPendiente): Promise<VentaPendiente> {
  const db = await getDb();
  const registro: VentaPendiente = {
    ...venta,
    createdAt: new Date().toISOString(),
    intentos: 0,
    fallido: false,
  };
  await db.put('ventasPendientes', registro);
  return registro;
}

export async function listarVentasPendientes(): Promise<VentaPendiente[]> {
  const db = await getDb();
  return db.getAllFromIndex('ventasPendientes', 'by-createdAt');
}

export async function contarVentasPendientes(): Promise<number> {
  const db = await getDb();
  return db.count('ventasPendientes');
}

export async function obtenerVentaPendiente(id: string): Promise<VentaPendiente | undefined> {
  const db = await getDb();
  return db.get('ventasPendientes', id);
}

export async function eliminarVentaPendiente(id: string): Promise<void> {
  const db = await getDb();
  await db.delete('ventasPendientes', id);
}

export async function marcarIntentoFallido(id: string, error: string): Promise<void> {
  const db = await getDb();
  const actual = await db.get('ventasPendientes', id);
  if (!actual) return;
  await db.put('ventasPendientes', {
    ...actual,
    intentos: actual.intentos + 1,
    ultimoError: error,
  });
}

export async function marcarVentaFallida(id: string, error: string): Promise<void> {
  const db = await getDb();
  const actual = await db.get('ventasPendientes', id);
  if (!actual) return;
  await db.put('ventasPendientes', {
    ...actual,
    intentos: actual.intentos + 1,
    ultimoError: error,
    fallido: true,
  });
}

export async function eliminarVentasFallidas(): Promise<void> {
  const db = await getDb();
  const pendientes = await db.getAll('ventasPendientes');
  const tx = db.transaction('ventasPendientes', 'readwrite');
  await Promise.all(
    pendientes.filter((v) => v.fallido).map((v) => tx.store.delete(v.id))
  );
  await tx.done;
}

export async function limpiarCola(): Promise<void> {
  const db = await getDb();
  await db.clear('ventasPendientes');
}
