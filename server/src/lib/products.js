/** Shapes a DB row into the camelCase object the client works with. */
export function toProduct(row, defaultThreshold) {
  const effectiveThreshold =
    row.low_stock_threshold === null ? defaultThreshold : row.low_stock_threshold;

  return {
    id: row.id,
    name: row.name,
    sku: row.sku,
    description: row.description,
    quantityOnHand: row.quantity_on_hand,
    costPrice: row.cost_price,
    sellingPrice: row.selling_price,
    lowStockThreshold: row.low_stock_threshold,
    effectiveLowStockThreshold: effectiveThreshold,
    isLowStock: row.quantity_on_hand <= effectiveThreshold,
    usesDefaultThreshold: row.low_stock_threshold === null,
    lastAdjustmentNote: row.last_adjustment_note,
    lastUpdatedBy: row.last_updated_by_email ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
