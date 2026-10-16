import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { ItemVentaRequest } from '@/api/transacciones.api';

export interface VentaPendiente {
  id: string;
  notaId: string;
  llaveIdempotencia: string;
  items: ItemVentaRequest[];
  estadoPago: 'contado' | 'credito_pendiente';
  fechaEvento: string;
  motivo?: string;
  createdAt: string;
  intentos: number;
  ultimoError?: string;
  fallido?: boolean;
}

interface LibreDssDB extends DBSchema {
  ventasPendientes: {
    key: string;
    value: VentaPendiente;
    indexes: { 'by-createdAt': string };
  };
}

const DB_NAME = 'libredss-offline';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<LibreDssDB>> | null = null;

export function getDb(): Promise<IDBPDatabase<LibreDssDB>> {
  if (!dbPromise) {
    dbPromise = openDB<LibreDssDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        const store = db.createObjectStore('ventasPendientes', { keyPath: 'id' });
        store.createIndex('by-createdAt', 'createdAt');
      },
    });
  }
  return dbPromise;
}

/** Solo para pruebas: cierra y descarta la conexión cacheada. */
export async function resetDbConnection(): Promise<void> {
  if (dbPromise) {
    try {
      const db = await dbPromise;
      db.close();
    } catch {
      // ignorar
    }
    dbPromise = null;
  }
}
