import bcrypt from 'bcryptjs';
import { db } from '../db.js';

export const DEMO_EMAIL = 'demo@stockflow.app';
export const DEMO_PASSWORD = 'demo12345';

const DEMO_PRODUCTS = [
  ['Blue Cotton T-Shirt (M)', 'TSH-BLU-M', 'Regular fit, 180 GSM', 42, 180, 499, null],
  ['Blue Cotton T-Shirt (L)', 'TSH-BLU-L', 'Regular fit, 180 GSM', 4, 180, 499, null],
  ['Ceramic Mug - White', 'MUG-WHT-01', '350 ml, dishwasher safe', 18, 95, 299, 8],
  ['Ceramic Mug - Matte Black', 'MUG-BLK-01', '350 ml, dishwasher safe', 6, 110, 349, 8],
  ['Canvas Tote Bag', 'BAG-CNV-01', '12 oz canvas, natural', 0, 140, 399, 3],
  ['Steel Water Bottle 750ml', 'BTL-STL-750', 'Double walled, 24h cold', 27, 320, 799, 10],
  ['Notebook A5 - Dotted', 'NTB-A5-DOT', '160 pages, 100 GSM', 3, 85, 249, null],
  ['Desk Mat - Charcoal', 'MAT-CHR-90', '900 x 400 mm, stitched edge', 11, 410, 999, 6],
];

/**
 * Creates the "Demo Store" organization if it is not already there.
 *
 * Idempotent, so it is safe to call on every boot. The hosted demo runs on an
 * ephemeral filesystem where the database is recreated on each restart, and
 * this keeps the advertised demo login working without manual intervention.
 */
export function seedDemoData() {
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(DEMO_EMAIL);
  if (existing) return { created: false, productCount: 0 };

  const passwordHash = bcrypt.hashSync(DEMO_PASSWORD, 10);

  const run = db.transaction(() => {
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

    for (const row of DEMO_PRODUCTS) {
      insert.run(orgId, ...row, Number(user.lastInsertRowid));
    }
  });

  run();
  return { created: true, productCount: DEMO_PRODUCTS.length };
}
