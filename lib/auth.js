// Admin auth: HMAC-signed bearer tokens + a small login rate limiter.
'use strict';
const crypto = require('crypto');

const SECRET = process.env.TOKEN_SECRET || crypto.randomBytes(32).toString('hex');
const TOKEN_TTL_MS = 12 * 60 * 60 * 1000; // 12h

function b64url(buf) {
  return Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function sign(payload) {
  const body = b64url(JSON.stringify(payload));
  const mac = b64url(crypto.createHmac('sha256', SECRET).update(body).digest());
  return `${body}.${mac}`;
}

function verify(token) {
  const parts = String(token || '').split('.');
  if (parts.length !== 2) return null;
  const mac = b64url(crypto.createHmac('sha256', SECRET).update(parts[0]).digest());
  if (!crypto.timingSafeEqual(Buffer.from(mac), Buffer.from(parts[1]))) return null;
  try {
    const payload = JSON.parse(Buffer.from(parts[0].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString());
    if (!payload.exp || payload.exp < Date.now()) return null;
    return payload;
  } catch { return null; }
}

function adminToken() {
  return sign({ role: 'admin', exp: Date.now() + TOKEN_TTL_MS });
}

// ---- login rate limiting (per IP, in-memory) ----
const attempts = new Map(); // ip -> {count, resetAt}
function loginAllowed(ip) {
  const now = Date.now();
  const rec = attempts.get(ip);
  if (!rec || rec.resetAt < now) return true;
  return rec.count < 8;
}
function loginFailed(ip) {
  const now = Date.now();
  const rec = attempts.get(ip);
  if (!rec || rec.resetAt < now) attempts.set(ip, { count: 1, resetAt: now + 15 * 60 * 1000 });
  else rec.count += 1;
}
function loginSucceeded(ip) { attempts.delete(ip); }

function requireAdmin(req, res, next) {
  const h = req.headers.authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : null;
  const payload = verify(token);
  if (!payload || payload.role !== 'admin') return res.status(401).json({ error: 'unauthorized' });
  next();
}

function newToken(bytes = 24) { return crypto.randomBytes(bytes).toString('hex'); }

module.exports = { adminToken, verify, requireAdmin, loginAllowed, loginFailed, loginSucceeded, newToken };
