import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../db.js';
import { config } from '../config.js';
import { asyncRoute, conflict, parseBody, unauthorized } from '../lib/http.js';
import { loginSchema, signupSchema } from '../lib/schemas.js';
import { clearSession, issueSession, requireAuth } from '../middleware/auth.js';

export const authRouter = Router();

const emailTaken = db.prepare('SELECT id FROM users WHERE email = ?');
const insertOrg = db.prepare(
  'INSERT INTO organizations (name, default_low_stock_threshold) VALUES (?, ?)'
);
const insertUser = db.prepare(
  'INSERT INTO users (organization_id, email, password_hash) VALUES (?, ?, ?)'
);
const userByEmail = db.prepare(`
  SELECT u.id, u.email, u.password_hash, u.organization_id, o.name AS organization_name
  FROM users u
  JOIN organizations o ON o.id = u.organization_id
  WHERE u.email = ?
`);

const publicUser = (user) => ({
  id: user.id,
  email: user.email,
  organizationId: user.organization_id,
  organizationName: user.organization_name,
});

authRouter.post(
  '/signup',
  asyncRoute(async (req, res) => {
    const data = parseBody(signupSchema, req.body);

    if (emailTaken.get(data.email)) {
      throw conflict('An account with that email already exists');
    }

    const passwordHash = await bcrypt.hash(data.password, 10);

    // Organization and its first user are created together: a signup always
    // produces exactly one tenant, and all later data hangs off that org.
    const createTenant = db.transaction(() => {
      const org = insertOrg.run(data.organizationName, config.defaultLowStockThreshold);
      const user = insertUser.run(org.lastInsertRowid, data.email, passwordHash);
      return {
        id: Number(user.lastInsertRowid),
        email: data.email,
        organization_id: Number(org.lastInsertRowid),
        organization_name: data.organizationName,
      };
    });

    const user = createTenant();
    issueSession(res, user);
    res.status(201).json({ user: publicUser(user) });
  })
);

authRouter.post(
  '/login',
  asyncRoute(async (req, res) => {
    const data = parseBody(loginSchema, req.body);
    const user = userByEmail.get(data.email);

    // Same message either way so the form cannot be used to enumerate accounts.
    const invalid = unauthorized('Email or password is incorrect');
    if (!user) {
      await bcrypt.compare(data.password, '$2a$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidinv');
      throw invalid;
    }

    const ok = await bcrypt.compare(data.password, user.password_hash);
    if (!ok) throw invalid;

    issueSession(res, user);
    res.json({ user: publicUser(user) });
  })
);

authRouter.post('/logout', (req, res) => {
  clearSession(res);
  res.json({ ok: true });
});

authRouter.get('/me', requireAuth, (req, res) => {
  res.json({ user: publicUser(req.user) });
});
