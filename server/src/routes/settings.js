import { Router } from 'express';
import { db } from '../db.js';
import { parseBody } from '../lib/http.js';
import { settingsSchema } from '../lib/schemas.js';

export const settingsRouter = Router();

const updateDefaults = db.prepare(`
  UPDATE organizations
  SET default_low_stock_threshold = ?, updated_at = datetime('now')
  WHERE id = ?
`);

const readOrg = db.prepare(
  'SELECT id, name, default_low_stock_threshold FROM organizations WHERE id = ?'
);

const present = (org) => ({
  organizationId: org.id,
  organizationName: org.name,
  defaultLowStockThreshold: org.default_low_stock_threshold,
});

settingsRouter.get('/', (req, res) => {
  res.json({ settings: present(readOrg.get(req.user.organization_id)) });
});

settingsRouter.patch('/', (req, res) => {
  const data = parseBody(settingsSchema, req.body);
  updateDefaults.run(data.defaultLowStockThreshold, req.user.organization_id);
  res.json({ settings: present(readOrg.get(req.user.organization_id)) });
});
