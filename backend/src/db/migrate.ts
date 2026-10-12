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

  const isLocal = connectionString.includes('localhost') || connectionString.includes('127.0.0.1');
  console.log(`🔄 Conectando a PostgreSQL (${isLocal ? 'Local/CI' : 'Neon Serverless'})...`);
  const pool = new Pool({
    connectionString,
    ssl: isLocal ? false : { rejectUnauthorized: false },
  });

  let client;
  try {
    client = await pool.connect();
    const sqlPath = path.resolve(__dirname, 'migrations/0000_init_schema.sql');
    console.log(`📄 Leyendo archivo SQL de migración: ${sqlPath}`);
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('⚡ Aplicando DDL (Tablas, Extensiones, Índices y Políticas RLS)...');
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('COMMIT');
    console.log('✅ Migración ejecutada exitosamente.');
  } catch (error) {
    if (client) {
      await client.query('ROLLBACK');
    }
    console.error('❌ Error ejecutando la migración:', error);
    throw error;
  } finally {
    if (client) client.release();
    await pool.end();
  }
}

// Ejecutar si se invoca directamente desde CLI
if (require.main === module || process.argv[1]?.includes('migrate')) {
  runMigration().catch(() => process.exit(1));
}
