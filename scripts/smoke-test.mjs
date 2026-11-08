/**
 * End-to-end smoke test for the StockFlow API.
 *
 * Boots the real Express app against a throwaway SQLite file and walks through
 * the success criteria from the PRD: signup, login, product CRUD, stock
 * adjustments, dashboard totals, settings, and tenant isolation.
 *
 *   npm run test:api
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const tempDb = path.join(os.tmpdir(), `stockflow-smoke-${Date.now()}.sqlite`);
process.env.DATABASE_FILE = tempDb;
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'smoke-test-secret';

const { createApp } = await import('../server/src/app.js');
const { db } = await import('../server/src/db.js');

const server = await new Promise((resolve) => {
  const instance = createApp().listen(0, () => resolve(instance));
});
const base = `http://127.0.0.1:${server.address().port}`;

let passed = 0;
const failures = [];

function check(label, condition, detail) {
  if (condition) {
    passed += 1;
    console.log(`  PASS  ${label}`);
  } else {
    failures.push(label);
    console.log(`  FAIL  ${label}${detail ? ` -> ${detail}` : ''}`);
  }
}

/** Minimal cookie-aware fetch wrapper so each tenant keeps its own session. */
function client() {
  let cookie = '';
  return async function call(method, url, body) {
    const response = await fetch(base + url, {
      method,
      headers: {
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...(cookie ? { Cookie: cookie } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    const setCookie = response.headers.get('set-cookie');
    if (setCookie) cookie = setCookie.split(';')[0];

    const text = await response.text();
    return { status: response.status, body: text ? JSON.parse(text) : {} };
  };
}

console.log('\nStockFlow API smoke test\n');

// --- Tenant A: signup, products, dashboard ---------------------------------
const alice = client();

let res = await alice('POST', '/api/auth/signup', {
  email: 'alice@example.com',
  password: 'supersecret',
  confirmPassword: 'supersecret',
  organizationName: 'Alice Supplies',
});
check('signup creates an organization and session', res.status === 201, JSON.stringify(res.body));

res = await alice('POST', '/api/auth/signup', {
  email: 'alice@example.com',
  password: 'supersecret',
  confirmPassword: 'supersecret',
  organizationName: 'Duplicate',
});
check('duplicate email is rejected', res.status === 409);

res = await alice('POST', '/api/auth/signup', {
  email: 'not-an-email',
  password: 'short',
  confirmPassword: 'different',
  organizationName: '',
});
check(
  'invalid signup returns per-field errors',
  res.status === 400 && Object.keys(res.body.fields || {}).length >= 3,
  JSON.stringify(res.body)
);

res = await alice('GET', '/api/auth/me');
check('session identifies the signed-in owner', res.body.user?.email === 'alice@example.com');

res = await alice('POST', '/api/products', {
  name: 'Blue T-Shirt',
  sku: 'TSH-BLU-M',
  quantityOnHand: '25',
  costPrice: '180',
  sellingPrice: '499',
  lowStockThreshold: '10',
});
const tshirt = res.body.product;
check('product is created', res.status === 201 && tshirt.quantityOnHand === 25);

res = await alice('POST', '/api/products', {
  name: 'Copy Cat',
  sku: 'tsh-blu-m',
  quantityOnHand: '1',
});
check('duplicate SKU within the org is rejected', res.status === 409);

res = await alice('POST', '/api/products', {
  name: 'Ceramic Mug',
  sku: 'MUG-WHT',
  quantityOnHand: '3',
  sellingPrice: '249',
});
const mug = res.body.product;
check('product without a threshold falls back to the org default', mug.effectiveLowStockThreshold === 5);
check('product below the default default is flagged low stock', mug.isLowStock === true);
check('product above its own threshold is not flagged', tshirt.isLowStock === false);

res = await alice('POST', `/api/products/${tshirt.id}/adjust`, { delta: '-20', note: 'Sold at market' });
check('stock adjustment applies the delta', res.body.product.quantityOnHand === 5);
check('adjustment pushes the product into low stock', res.body.product.isLowStock === true);
check('adjustment note is stored', res.body.product.lastAdjustmentNote === 'Sold at market');

res = await alice('POST', `/api/products/${tshirt.id}/adjust`, { delta: '-500' });
check('adjustment cannot drive stock negative', res.status === 409);

res = await alice('GET', '/api/products?search=mug');
check('product list is searchable', res.body.products.length >= 1);

res = await alice('GET', '/api/dashboard');
check('dashboard counts products', res.body.totals.productCount === 2);
check('dashboard sums units on hand', res.body.totals.totalUnits === 8, JSON.stringify(res.body.totals));
check('dashboard lists both low stock items', res.body.lowStockItems.length === 2);

res = await alice('PATCH', '/api/settings', { defaultLowStockThreshold: '2' });
check('default threshold can be changed', res.body.settings.defaultLowStockThreshold === 2);

res = await alice('GET', '/api/dashboard');
check(
  'raising the bar re-evaluates low stock using the new default',
  res.body.lowStockItems.length === 1,
  JSON.stringify(res.body.lowStockItems.map((item) => item.sku))
);

res = await alice('PATCH', `/api/products/${mug.id}`, { name: 'Ceramic Mug (large)', quantityOnHand: '40' });
check('product can be edited', res.body.product.name === 'Ceramic Mug (large)' && res.body.product.quantityOnHand === 40);

// --- Tenant B: isolation ----------------------------------------------------
const bob = client();

res = await bob('POST', '/api/auth/signup', {
  email: 'bob@example.com',
  password: 'anothersecret',
  confirmPassword: 'anothersecret',
  organizationName: 'Bob Traders',
});
check('second organization can sign up', res.status === 201);

res = await bob('GET', '/api/products');
check('a new org starts with an empty catalogue', res.body.products.length === 0);

res = await bob('POST', '/api/products', { name: 'Same SKU, other org', sku: 'TSH-BLU-M', quantityOnHand: '7' });
check('the same SKU is allowed in a different org', res.status === 201);

res = await bob('GET', `/api/products/${tshirt.id}`);
check('cross-tenant product read is blocked', res.status === 404);

res = await bob('PATCH', `/api/products/${tshirt.id}`, { name: 'Hijacked' });
check('cross-tenant product update is blocked', res.status === 404);

res = await bob('DELETE', `/api/products/${tshirt.id}`);
check('cross-tenant product delete is blocked', res.status === 404);

res = await bob('GET', '/api/dashboard');
check('dashboard only reports the caller org', res.body.totals.productCount === 1);

// --- Auth boundaries --------------------------------------------------------
const stranger = client();

res = await stranger('GET', '/api/products');
check('unauthenticated requests are rejected', res.status === 401);

res = await stranger('POST', '/api/auth/login', { email: 'alice@example.com', password: 'wrong' });
check('wrong password is rejected', res.status === 401);

res = await stranger('POST', '/api/auth/login', { email: 'ALICE@example.com', password: 'supersecret' });
check('login is case-insensitive on email', res.status === 200);

res = await stranger('GET', '/api/products');
check('login restores access to the org catalogue', res.status === 200 && res.body.products.length === 2);

res = await stranger('POST', '/api/auth/logout');
check('logout succeeds', res.status === 200);

// --- Cleanup ----------------------------------------------------------------
res = await alice('DELETE', `/api/products/${mug.id}`);
check('product can be deleted', res.status === 200);

res = await alice('GET', '/api/products');
check('deleted product disappears from the list', res.body.products.length === 1);

server.close();
db.close();
for (const suffix of ['', '-wal', '-shm']) {
  try {
    fs.rmSync(tempDb + suffix, { force: true });
  } catch {
    // Windows can still hold the handle briefly; the OS temp dir cleans it up.
  }
}

console.log(`\n${passed} passed, ${failures.length} failed\n`);
if (failures.length) {
  console.log('Failed checks:');
  failures.forEach((label) => console.log(`  - ${label}`));
  process.exit(1);
}
