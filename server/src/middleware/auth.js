import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { db } from '../db.js';
import { unauthorized } from '../lib/http.js';

export const AUTH_COOKIE = 'stockflow_token';

export function issueSession(res, user) {
  const token = jwt.sign(
    { sub: user.id, orgId: user.organization_id },
    config.jwtSecret,
    { expiresIn: `${config.sessionTtlDays}d` }
  );

  res.cookie(AUTH_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: config.isProd,
    maxAge: config.sessionTtlDays * 24 * 60 * 60 * 1000,
  });
}

export function clearSession(res) {
  res.clearCookie(AUTH_COOKIE, {
    httpOnly: true,
    sameSite: 'lax',
    secure: config.isProd,
  });
}

const findUser = db.prepare(`
  SELECT u.id, u.email, u.organization_id, o.name AS organization_name,
         o.default_low_stock_threshold
  FROM users u
  JOIN organizations o ON o.id = u.organization_id
  WHERE u.id = ?
`);

/**
 * Attaches req.user (and therefore the tenant scope) or rejects the request.
 * Every data route below depends on this for organization isolation.
 */
export function requireAuth(req, res, next) {
  const token = req.cookies?.[AUTH_COOKIE];
  if (!token) return next(unauthorized());

  let payload;
  try {
    payload = jwt.verify(token, config.jwtSecret);
  } catch {
    clearSession(res);
    return next(unauthorized('Your session has expired, please sign in again'));
  }

  const user = findUser.get(payload.sub);
  if (!user) {
    clearSession(res);
    return next(unauthorized());
  }

  req.user = user;
  next();
}
