import { z } from 'zod';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config();
if (!process.env.DATABASE_URL) {
  dotenv.config({ path: path.resolve(__dirname, '../../../.env.development') });
}

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, 'DATABASE_URL es requerida').default(
    process.env.DATABASE_URL || 'postgresql://localhost:5432/libredss'
  ),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  JWT_SECRET: z.string().min(8, 'JWT_SECRET debe tener al menos 8 caracteres').default('libredss_dev_secret_key_change_in_production_123!'),
  JWT_EXPIRES_IN: z.string().default('24h'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Configuración de variables de entorno inválida:', parsed.error.format());
  throw new Error('Variables de entorno incompletas o inválidas');
}

export const env = parsed.data;
