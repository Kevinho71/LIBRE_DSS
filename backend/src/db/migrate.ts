import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config();
if (!process.env.DATABASE_URL) {
  dotenv.config({ path: path.resolve(__dirname, '../../.env.development') });
}

const TRACKING_TABLE = 'schema_migrations';

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

    // Tabla de seguimiento de migraciones ya aplicadas (idempotente)
    await client.query(
      `CREATE TABLE IF NOT EXISTS ${TRACKING_TABLE} (
        filename text PRIMARY KEY,
        applied_at timestamp DEFAULT now() NOT NULL
      )`
    );

    // Si la migración 0000 ya se aplicó antes de existir el tracking (tabla empresa presente),
    // se registra como aplicada para no volver a ejecutarla.
    const empresaResult = await client.query(`SELECT to_regclass('public.empresa') AS reg`);
    const schemaYaInicializado = empresaResult.rows[0]?.reg != null;

    const migrationsDir = path.resolve(__dirname, 'migrations');
    const files = fs
      .readdirSync(migrationsDir)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    for (const file of files) {
      const yaAplicada = await client.query(
        `SELECT 1 FROM ${TRACKING_TABLE} WHERE filename = $1`,
        [file]
      );

      if (yaAplicada.rowCount && yaAplicada.rowCount > 0) {
        continue;
      }

      if (file.startsWith('0000') && schemaYaInicializado) {
        await client.query(`INSERT INTO ${TRACKING_TABLE} (filename) VALUES ($1)`, [file]);
        console.log(`⏭️  Migración ${file} ya aplicada previamente (esquema inicializado). Registrada.`);
        continue;
      }

      const sqlPath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(sqlPath, 'utf8');
      console.log(`📄 Aplicando migración: ${file}`);

      await client.query('BEGIN');
      await client.query(sql);
      await client.query(`INSERT INTO ${TRACKING_TABLE} (filename) VALUES ($1)`, [file]);
      await client.query('COMMIT');
      console.log(`✅ Migración aplicada: ${file}`);
    }

    console.log('✅ Migraciones al día.');
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
