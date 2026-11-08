import { Router } from 'express';
import { db } from '../db.js';
import { asyncRoute, conflict, notFound, parseBody } from '../lib/http.js';
import { productSchema, productUpdateSchema, stockAdjustmentSchema } from '../lib/schemas.js';
import { toProduct } from '../lib/products.js';

export const productsRouter = Router();

const SELECT_COLUMNS = `
  p.id, p.name, p.sku, p.description, p.quantity_on_hand, p.cost_price,
  p.selling_price, p.low_stock_threshold, p.last_adjustment_note,
  p.created_at, p.updated_at, u.email AS last_updated_by_email
`;

const listProducts = db.prepare(`
  SELECT ${SELECT_COLUMNS}
  FROM products p
  LEFT JOIN users u ON u.id = p.last_updated_by
  WHERE p.organization_id = @orgId
    AND (@search = '' OR p.name LIKE @like OR p.sku LIKE @like)
  ORDER BY p.created_at DESC, p.id DESC
`);

const getProduct = db.prepare(`
  SELECT ${SELECT_COLUMNS}
  FROM products p
  LEFT JOIN users u ON u.id = p.last_updated_by
  WHERE p.organization_id = ? AND p.id = ?
`);

const skuExists = db.prepare(
  'SELECT id FROM products WHERE organization_id = ? AND sku = ? COLLATE NOCASE AND id != ?'
);

const insertProduct = db.prepare(`
  INSERT INTO products (
    organization_id, name, sku, description, quantity_on_hand,
    cost_price, selling_price, low_stock_threshold, last_updated_by
  ) VALUES (
    @organizationId, @name, @sku, @description, @quantityOnHand,
    @costPrice, @sellingPrice, @lowStockThreshold, @lastUpdatedBy
  )
`);

const deleteProduct = db.prepare('DELETE FROM products WHERE organization_id = ? AND id = ?');

/** Loads a product or throws - scoped to the caller's organization every time. */
function loadProduct(req) {
  const row = getProduct.get(req.user.organization_id, Number(req.params.id));
  if (!row) throw notFound('That product does not exist');
  return row;
}

productsRouter.get('/', (req, res) => {
  const search = String(req.query.search || '').trim();
  const rows = listProducts.all({
    orgId: req.user.organization_id,
    search,
    like: `%${search}%`,
  });

  res.json({
    products: rows.map((row) => toProduct(row, req.user.default_low_stock_threshold)),
    defaultLowStockThreshold: req.user.default_low_stock_threshold,
  });
});

productsRouter.post(
  '/',
  asyncRoute(async (req, res) => {
    const data = parseBody(productSchema, req.body);

    if (skuExists.get(req.user.organization_id, data.sku, 0)) {
      throw conflict(`SKU "${data.sku}" is already used by another product`);
    }

    const result = insertProduct.run({
      organizationId: req.user.organization_id,
      name: data.name,
      sku: data.sku,
      description: data.description,
      quantityOnHand: data.quantityOnHand,
      costPrice: data.costPrice,
      sellingPrice: data.sellingPrice,
      lowStockThreshold: data.lowStockThreshold,
      lastUpdatedBy: req.user.id,
    });

    const row = getProduct.get(req.user.organization_id, Number(result.lastInsertRowid));
    res.status(201).json({ product: toProduct(row, req.user.default_low_stock_threshold) });
  })
);

productsRouter.get('/:id', (req, res) => {
  const row = loadProduct(req);
  res.json({ product: toProduct(row, req.user.default_low_stock_threshold) });
});

productsRouter.patch('/:id', (req, res) => {
  const existing = loadProduct(req);
  const data = parseBody(productUpdateSchema, req.body);

  if (data.sku && skuExists.get(req.user.organization_id, data.sku, existing.id)) {
    throw conflict(`SKU "${data.sku}" is already used by another product`);
  }

  const next = {
    name: data.name ?? existing.name,
    sku: data.sku ?? existing.sku,
    description: data.description !== undefined ? data.description : existing.description,
    quantityOnHand: data.quantityOnHand ?? existing.quantity_on_hand,
    costPrice: data.costPrice !== undefined ? data.costPrice : existing.cost_price,
    sellingPrice: data.sellingPrice !== undefined ? data.sellingPrice : existing.selling_price,
    lowStockThreshold:
      data.lowStockThreshold !== undefined ? data.lowStockThreshold : existing.low_stock_threshold,
  };

  db.prepare(`
    UPDATE products SET
      name = @name, sku = @sku, description = @description,
      quantity_on_hand = @quantityOnHand, cost_price = @costPrice,
      selling_price = @sellingPrice, low_stock_threshold = @lowStockThreshold,
      last_updated_by = @lastUpdatedBy, updated_at = datetime('now')
    WHERE organization_id = @organizationId AND id = @id
  `).run({
    ...next,
    lastUpdatedBy: req.user.id,
    organizationId: req.user.organization_id,
    id: existing.id,
  });

  const row = getProduct.get(req.user.organization_id, existing.id);
  res.json({ product: toProduct(row, req.user.default_low_stock_threshold) });
});

productsRouter.post('/:id/adjust', (req, res) => {
  const existing = loadProduct(req);
  const data = parseBody(stockAdjustmentSchema, req.body);

  const quantity = existing.quantity_on_hand + data.delta;
  if (quantity < 0) {
    throw conflict(
      `Only ${existing.quantity_on_hand} unit(s) on hand - that adjustment would go negative`
    );
  }

  db.prepare(`
    UPDATE products SET
      quantity_on_hand = ?, last_adjustment_note = ?,
      last_updated_by = ?, updated_at = datetime('now')
    WHERE organization_id = ? AND id = ?
  `).run(quantity, data.note, req.user.id, req.user.organization_id, existing.id);

  const row = getProduct.get(req.user.organization_id, existing.id);
  res.json({ product: toProduct(row, req.user.default_low_stock_threshold) });
});

productsRouter.delete('/:id', (req, res) => {
  const existing = loadProduct(req);
  deleteProduct.run(req.user.organization_id, existing.id);
  res.json({ ok: true, id: existing.id });
});
