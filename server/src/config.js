import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const here = path.dirname(fileURLToPath(import.meta.url));
export const ROOT_DIR = path.resolve(here, '..', '..');

dotenv.config({ path: path.join(ROOT_DIR, '.env') });

const isProd = process.env.NODE_ENV === 'production';

if (isProd && !process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET must be set when NODE_ENV=production');
}

export const config = {
  isProd,
  port: Number(process.env.PORT || 4000),
  jwtSecret: process.env.JWT_SECRET || 'dev-only-insecure-secret',
  sessionTtlDays: 7,
  databaseFile: path.resolve(
    ROOT_DIR,
    process.env.DATABASE_FILE || './data/stockflow.sqlite'
  ),
  defaultLowStockThreshold: Number(process.env.DEFAULT_LOW_STOCK_THRESHOLD || 5),
  seedDemoData: process.env.SEED_DEMO_DATA === 'true',
  clientDistDir: path.join(ROOT_DIR, 'client', 'dist'),
};
