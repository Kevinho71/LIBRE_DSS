import { defineConfig } from 'drizzle-kit';
import * as dotenv from 'dotenv';

import * as path from 'path';

dotenv.config();
if (!process.env.DATABASE_URL) {
  dotenv.config({ path: path.resolve(__dirname, '.env.development') });
}

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './src/db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL || '',
  },
  strict: true,
  verbose: true,
});
