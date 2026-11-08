import { config } from './config.js';
import { createApp } from './app.js';
import { seedDemoData } from './lib/seed.js';

// The hosted demo runs on an ephemeral filesystem, so the database starts empty
// after every restart. Re-seeding on boot keeps the published demo login valid.
if (config.seedDemoData) {
  const { created, productCount } = seedDemoData();
  console.log(
    created ? `Seeded demo data (${productCount} products)` : 'Demo data already present'
  );
}

createApp().listen(config.port, () => {
  console.log(`StockFlow API listening on http://localhost:${config.port}`);
});
