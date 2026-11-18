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
  GEMINI_API_KEY: z.string().min(1).optional(),
  GEMINI_MODEL: z.string().min(1).default('gemini-3.1-flash-lite'),
  AWS_S3_BUCKET: z.string().min(1).default('libredss-recibos-dev'),
  AWS_REGION: z.string().min(1).default('us-east-2'),
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  AWS_SESSION_TOKEN: z.string().optional(),
  // Almacenamiento S3-compatible fuera de AWS (Cloudflare R2, Railway Bucket, MinIO).
  // Si se define, se usa como endpoint del cliente S3 con direccionamiento por ruta.
  S3_ENDPOINT: z.string().url().optional(),
  // Orígenes permitidos por CORS, separados por comas (vacío = solo mismo origen en producción).
  CORS_ORIGINS: z.string().default(''),
  // Simulación determinística (Plan de Simulación §4.1). Fecha inicial del reloj inyectable.
  DSS_SIM_FECHA: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'DSS_SIM_FECHA debe tener formato YYYY-MM-DD').optional(),
  // Habilita el endpoint POST /dss/simular/reloj para avanzar la fecha en caliente.
  DSS_HABILITAR_SIMULACION: z.enum(['true', 'false']).default('false'),
});

// Una variable declarada pero vacía (p. ej. `AWS_S3_BUCKET=` en una plantilla .env) equivale a no definirla.
const entorno = Object.fromEntries(Object.entries(process.env).filter(([, valor]) => valor !== ''));
const parsed = envSchema.safeParse(entorno);

if (!parsed.success) {
  console.error('Configuración de variables de entorno inválida:', parsed.error.format());
  throw new Error('Variables de entorno incompletas o inválidas');
}

const JWT_SECRET_DESARROLLO = 'libredss_dev_secret_key_change_in_production_123!';

// En producción el secreto de firma debe provenir del entorno: el valor por defecto es público.
if (parsed.data.NODE_ENV === 'production' && parsed.data.JWT_SECRET === JWT_SECRET_DESARROLLO) {
  throw new Error('JWT_SECRET es obligatorio en producción (no se admite el valor por defecto).');
}

export const env = parsed.data;
