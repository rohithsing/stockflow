/**
 * Seeds a demo organization so the app can be shown end-to-end immediately.
 *
 *   npm run seed
 *
 * Safe to re-run: if the demo user already exists the script just reports it.
 */
import { seedDemoData, DEMO_EMAIL, DEMO_PASSWORD } from '../server/src/lib/seed.js';

const result = seedDemoData();

if (result.created) {
  console.log(`Seeded "Demo Store" with ${result.productCount} products.`);
} else {
  console.log('Demo account already exists.');
}

console.log(`Sign in with ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
