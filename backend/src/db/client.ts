import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from './schema';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config();
if (!process.env.DATABASE_URL) {
  dotenv.config({ path: path.resolve(__dirname, '../../.env.development') });
}
const isLocal = !process.env.DATABASE_URL || process.env.DATABASE_URL.includes('localhost') || process.env.DATABASE_URL.includes('127.0.0.1');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL, // Cadena con connection pooling de Neon o DB local
  ssl: isLocal ? false : { rejectUnauthorized: false },
  max: 10,
  idleTimeoutMillis: 30000,
});

export const db = drizzle(pool, { schema });

/**
 * Ejecuta una operación en base de datos inyectando el tenant_id en la transacción.
 * El tercer parámetro 'true' garantiza que el valor de configuración expire al terminar la transacción.
 */
export async function withTenant<T>(empresaId: string, callback: (tx: any) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SET LOCAL ROLE libredss_app');
    await client.query("SELECT set_config('app.empresa_id', $1, true)", [empresaId]);
    const tx = drizzle(client, { schema });
    const result = await callback(tx);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
