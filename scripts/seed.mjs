/**
 * Seeds a demo organization so the app can be shown end-to-end immediately.
 *
 *   npm run seed
 *
 * Safe to re-run: if the demo user already exists the script just reports it.
 */
import bcrypt from 'bcryptjs';
import { db } from '../server/src/db.js';

const DEMO_EMAIL = 'demo@stockflow.app';
const DEMO_PASSWORD = 'demo12345';

const products = [
  ['Blue Cotton T-Shirt (M)', 'TSH-BLU-M', 'Regular fit, 180 GSM', 42, 180, 499, null],
  ['Blue Cotton T-Shirt (L)', 'TSH-BLU-L', 'Regular fit, 180 GSM', 4, 180, 499, null],
  ['Ceramic Mug - White', 'MUG-WHT-01', '350 ml, dishwasher safe', 18, 95, 299, 8],
  ['Ceramic Mug - Matte Black', 'MUG-BLK-01', '350 ml, dishwasher safe', 6, 110, 349, 8],
  ['Canvas Tote Bag', 'BAG-CNV-01', '12 oz canvas, natural', 0, 140, 399, 3],
  ['Steel Water Bottle 750ml', 'BTL-STL-750', 'Double walled, 24h cold', 27, 320, 799, 10],
  ['Notebook A5 - Dotted', 'NTB-A5-DOT', '160 pages, 100 GSM', 3, 85, 249, null],
  ['Desk Mat - Charcoal', 'MAT-CHR-90', '900 x 400 mm, stitched edge', 11, 410, 999, 6],
];

const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(DEMO_EMAIL);
if (existing) {
  console.log(`Demo account already exists: ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
  process.exit(0);
}

const passwordHash = bcrypt.hashSync(DEMO_PASSWORD, 10);

const seed = db.transaction(() => {
  const org = db
    .prepare('INSERT INTO organizations (name, default_low_stock_threshold) VALUES (?, ?)')
    .run('Demo Store', 5);
  const orgId = Number(org.lastInsertRowid);

  const user = db
    .prepare('INSERT INTO users (organization_id, email, password_hash) VALUES (?, ?, ?)')
    .run(orgId, DEMO_EMAIL, passwordHash);

  const insert = db.prepare(`
    INSERT INTO products (
      organization_id, name, sku, description, quantity_on_hand,
      cost_price, selling_price, low_stock_threshold, last_updated_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const row of products) {
    insert.run(orgId, ...row, Number(user.lastInsertRowid));
  }
});

seed();

console.log('Seeded "Demo Store" with 8 products.');
console.log(`Sign in with ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
