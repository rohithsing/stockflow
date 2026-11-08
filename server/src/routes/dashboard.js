import { Router } from 'express';
import { db } from '../db.js';
import { toProduct } from '../lib/products.js';

export const dashboardRouter = Router();

const summary = db.prepare(`
  SELECT
    COUNT(*) AS product_count,
    COALESCE(SUM(quantity_on_hand), 0) AS total_units,
    COALESCE(SUM(quantity_on_hand * COALESCE(selling_price, 0)), 0) AS retail_value
  FROM products
  WHERE organization_id = ?
`);

// A product counts as low stock against its own threshold, falling back to the
// organization-wide default when the product does not set one.
const lowStock = db.prepare(`
  SELECT p.id, p.name, p.sku, p.description, p.quantity_on_hand, p.cost_price,
         p.selling_price, p.low_stock_threshold, p.last_adjustment_note,
         p.created_at, p.updated_at, u.email AS last_updated_by_email
  FROM products p
  LEFT JOIN users u ON u.id = p.last_updated_by
  WHERE p.organization_id = @orgId
    AND p.quantity_on_hand <= COALESCE(p.low_stock_threshold, @defaultThreshold)
  ORDER BY (p.quantity_on_hand - COALESCE(p.low_stock_threshold, @defaultThreshold)) ASC,
           p.quantity_on_hand ASC,
           p.name ASC
`);

dashboardRouter.get('/', (req, res) => {
  const orgId = req.user.organization_id;
  const defaultThreshold = req.user.default_low_stock_threshold;

  const totals = summary.get(orgId);
  const lowStockRows = lowStock.all({ orgId, defaultThreshold });

  res.json({
    organizationName: req.user.organization_name,
    defaultLowStockThreshold: defaultThreshold,
    totals: {
      productCount: totals.product_count,
      totalUnits: totals.total_units,
      retailValue: Math.round(totals.retail_value * 100) / 100,
      lowStockCount: lowStockRows.length,
    },
    lowStockItems: lowStockRows.map((row) => toProduct(row, defaultThreshold)),
  });
});
