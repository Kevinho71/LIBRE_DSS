import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config();
if (!process.env.DATABASE_URL) {
  dotenv.config({ path: path.resolve(__dirname, '../../.env.development') });
}

export async function runMigration() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL no está definida en las variables de entorno.');
  }

  console.log('🔄 Conectando a Neon PostgreSQL...');
  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });

  const client = await pool.connect();
  try {
    const sqlPath = path.resolve(__dirname, 'migrations/0000_init_schema.sql');
    console.log(`📄 Leyendo archivo SQL de migración: ${sqlPath}`);
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('⚡ Aplicando DDL en Neon (Tablas, Extensiones, Índices y Políticas RLS)...');
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('COMMIT');
    console.log('✅ Migración ejecutada exitosamente en Neon PostgreSQL.');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error ejecutando la migración:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Ejecutar si se invoca directamente desde CLI
if (require.main === module || process.argv[1]?.includes('migrate')) {
  runMigration().catch(() => process.exit(1));
}
