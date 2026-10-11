// Poruwe — wedding invitation platform.
'use strict';
const path = require('path');
const express = require('express');

const { createStore } = require('./lib/store');
const { derive, formatLKR } = require('./lib/format');
const { coupleSlug } = require('./lib/slugify');
const auth = require('./lib/auth');
const payments = require('./lib/payments');
const { defaultStory, defaultProgram, defaultContacts } = require('./lib/catalog');
const { buildInvitationPdf } = require('./lib/render/pdfcard');
const { buildInvitationImage } = require('./lib/render/imagecard');
const { buildReceiptPdf } = require('./lib/render/receipt');

const PORT = process.env.PORT || 4323;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'poruwe-dev-admin';
const IS_PROD = process.env.NODE_ENV === 'production' || !!process.env.RENDER;
const STOCK = {
  hero: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1950&q=80',
  venue: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=1600&q=80',
  rsvp: 'https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?auto=format&fit=crop&w=1950&q=80',
};

const app = express();
app.set('trust proxy', 1);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.json({ limit: '8mb' }));
app.use(express.urlencoded({ extended: false }));
app.use('/public', express.static(path.join(__dirname, 'public'), { maxAge: '7d' }));

// Once PUBLIC_BASE_URL points at the custom domain, old onrender.com links 301 there.
// GET/HEAD only (webhooks must not be redirected); /healthz stays for platform checks.
const CANONICAL_HOST = (() => { try { return new URL(process.env.PUBLIC_BASE_URL).host; } catch { return null; } })();
app.use((req, res, next) => {
  const host = req.get('host');
  if (CANONICAL_HOST && host && host !== CANONICAL_HOST && /\.onrender\.com$/i.test(host)
      && (req.method === 'GET' || req.method === 'HEAD') && req.path !== '/healthz') {
    return res.redirect(301, `https://${CANONICAL_HOST}${req.originalUrl}`);
  }
  next();
});

let store;

/* --------------------------------- helpers --------------------------------- */
const baseUrl = (req) => process.env.PUBLIC_BASE_URL || `${req.protocol}://${req.get('host')}`;
const asyncH = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

function str(v, max = 300) { return typeof v === 'string' ? v.trim().slice(0, max) : ''; }
function digits(v, max = 15) { return String(v || '').replace(/\D/g, '').slice(0, max); }

// Whitelist-build the order data object from client input.
function sanitizeData(input) {
  const i = input && typeof input === 'object' ? input : {};
  const list = (arr, map, cap) => (Array.isArray(arr) ? arr.slice(0, cap).map(map) : []);
  return {
    couple: { groom: str((i.couple || {}).groom, 40), bride: str((i.couple || {}).bride, 40) },
    event: {
      date: str((i.event || {}).date, 10),
      time: str((i.event || {}).time, 5),
      arriveBy: str((i.event || {}).arriveBy, 5),
      rsvpBy: str((i.event || {}).rsvpBy, 10),
    },
    venue: {
      name: str((i.venue || {}).name, 80),
      address: str((i.venue || {}).address, 160),
      mapQuery: str((i.venue || {}).mapQuery, 160),
      website: str((i.venue || {}).website, 200),
    },
    story: list(i.story, (s) => ({ label: str(s.label, 60), title: str(s.title, 80), text: str(s.text, 400) }), 6),
    program: list(i.program, (p) => ({ time: str(p.time, 12), title: str(p.title, 60), text: str(p.text, 200) }), 8),
    contacts: list(i.contacts, (c) => ({ role: str(c.role, 30), name: str(c.name, 40), phone: str(c.phone, 20), wa: digits(c.wa) }), 2),
    rsvp: { wa: digits((i.rsvp || {}).wa) },
    accommodation: str(i.accommodation, 200),
    arriveNote: str(i.arriveNote, 200),
    customer: { name: str((i.customer || {}).name, 60), wa: digits((i.customer || {}).wa), email: str((i.customer || {}).email, 100) },
    photos: {
      groom: str((i.photos || {}).groom, 40) || null,
      bride: str((i.photos || {}).bride, 40) || null,
      venue: str((i.photos || {}).venue, 40) || null,
      card: str((i.photos || {}).card, 40) || null,
    },
  };
}

async function uniqueSlug(groom, bride) {
  const base = coupleSlug(groom, bride);
  let slug = base;
  for (let n = 2; await store.slugTaken(slug); n++) slug = `${base}-${n}`;
  return slug;
}

async function activateOrder(order) {
  const d = derive(order.data);
  const patch = {
    status: 'active',
    activated_at: new Date(),
    wedding_date: order.data.event && order.data.event.date ? order.data.event.date : null,
    expires_at: d.expiresAt,
  };
  if (order.kind === 'website' && !order.slug) patch.slug = await uniqueSlug(d.groom, d.bride);
  const updated = await store.updateOrder(order.id, patch);
  await store.audit(order.id, 'activated', { slug: updated.slug });
  return updated;
}

function orderExpired(order) {
  return order.expires_at && new Date(order.expires_at) < new Date();
}

function publicOrder(order, req) {
  const d = derive(order.data);
  return {
    orderNo: order.order_no, token: order.token, templateId: order.template_id, kind: order.kind,
    status: order.status, slug: order.slug, data: order.data,
    liveUrl: order.slug ? `${baseUrl(req)}/i/${order.slug}` : null,
    expiresAt: order.expires_at, coupleTitle: d.coupleTitle,
  };
}

async function imgUrlFor(order, kind, fallback) {
  const id = order.data.photos && order.data.photos[kind];
  return id ? `/img/${id}` : (fallback || null);
}

async function renderWebsite(req, res, order, { preview = false } = {}) {
  const tpl = await store.getTemplate(order.template_id);
  const d = order.data;
  const s = derive(d);
  const theme = tpl.theme || {};
  let themeCss = '';
  if (theme.vars) themeCss += `:root{${Object.entries(theme.vars).map(([k, v]) => `${k}:${v}`).join(';')}}`;
  if (theme.extraCss) themeCss += theme.extraCss;
  res.render(`templates/${tpl.renderer}`, {
    t: tpl, d, s, preview, themeCss,
    img: {
      groom: await imgUrlFor(order, 'groom'),
      bride: await imgUrlFor(order, 'bride'),
      venue: await imgUrlFor(order, 'venue', STOCK.venue),
      hero: STOCK.hero, rsvpBg: STOCK.rsvp,
    },
    brandBase: baseUrl(req),
  });
}

async function cardPhotoDataUri(order) {
  const id = order.data.photos && (order.data.photos.card || order.data.photos.bride || order.data.photos.groom);
  if (!id) return null;
  const im = await store.getImage(id);
  if (!im || im.order_id !== order.id) return null;
  return `data:${im.mime};base64,${Buffer.from(im.data).toString('base64')}`;
}

/* ------------------------------- public pages ------------------------------ */
app.get('/healthz', (req, res) => res.json({ ok: true }));

app.get('/', asyncH(async (req, res) => {
  const templates = await store.listTemplates(true);
  res.render('landing', { templates, formatLKR });
}));

const createLimiter = new Map(); // ip -> {count, resetAt}
app.get('/start/:templateId', asyncH(async (req, res) => {
  const tpl = await store.getTemplate(req.params.templateId);
  if (!tpl || !tpl.active) return res.status(404).render('notfound');
  const ip = req.ip;
  const rec = createLimiter.get(ip);
  const now = Date.now();
  if (rec && rec.resetAt > now && rec.count >= 25) return res.status(429).send('Too many drafts — please try again later.');
  createLimiter.set(ip, rec && rec.resetAt > now ? { count: rec.count + 1, resetAt: rec.resetAt } : { count: 1, resetAt: now + 24 * 3600e3 });

  const data = sanitizeData({ story: defaultStory(), program: defaultProgram(), contacts: defaultContacts(), rsvp: { wa: '94770000001' } });
  const order = await store.createOrder(tpl.id, tpl.kind, data);
  await store.audit(order.id, 'created', { template: tpl.id });
  res.redirect(`/b/${order.token}`);
}));

app.get('/b/:token', asyncH(async (req, res) => {
  const order = await store.orderByToken(req.params.token);
  if (!order) return res.status(404).render('notfound');
  if (['active', 'expired', 'revoked'].includes(order.status)) return res.redirect(`/status/${order.token}`);
  const tpl = await store.getTemplate(order.template_id);
  res.render('builder', { order, tpl, formatLKR });
}));

const PREVIEW_TTL_H = +(process.env.PREVIEW_TTL_HOURS || 72);
app.get('/p/:token', asyncH(async (req, res) => {
  const order = await store.orderByToken(req.params.token);
  if (!order) return res.status(404).render('notfound');
  if (['expired', 'revoked'].includes(order.status)) return res.status(410).render('gone');
  const preview = order.status !== 'active';
  // Unpaid previews go stale: a watermarked preview must not become a free invitation.
  // Paid orders awaiting verification are exempt.
  if (['draft', 'pending_payment', 'rejected'].includes(order.status)) {
    const age = Date.now() - new Date(order.updated_at).getTime();
    if (age > PREVIEW_TTL_H * 3600e3) {
      return res.status(410).render('preview-expired', { order, ttlHours: PREVIEW_TTL_H });
    }
  }
  if (order.kind === 'website') return renderWebsite(req, res, order, { preview });
  if (order.kind === 'pdf') {
    const buf = await buildInvitationPdf(derive(order.data), { preview });
    res.type('application/pdf').setHeader('Content-Disposition', 'inline; filename="invitation-preview.pdf"');
    return res.send(buf);
  }
  const buf = await buildInvitationImage(derive(order.data), await cardPhotoDataUri(order), { preview });
  res.type('image/png');
  return res.send(buf);
}));

app.get('/i/:slug', asyncH(async (req, res) => {
  const order = await store.orderBySlug(req.params.slug);
  if (!order) return res.status(404).render('notfound');
  if (order.status !== 'active' || orderExpired(order)) {
    if (order.status === 'active') { await store.purgeExpired(); }
    return res.status(410).render('gone');
  }
  res.setHeader('X-Robots-Tag', 'noindex');
  return renderWebsite(req, res, order, { preview: false });
}));

app.get('/demo', (req, res) => res.redirect('/i/demo'));

app.get('/status/:token', asyncH(async (req, res) => {
  const order = await store.orderByToken(req.params.token);
  if (!order) return res.status(404).render('notfound');
  const tpl = await store.getTemplate(order.template_id);
  const settings = await store.allSettings();
  res.render('status', {
    order, tpl, formatLKR,
    liveUrl: order.slug ? `${baseUrl(req)}/i/${order.slug}` : null,
    statusUrl: `${baseUrl(req)}/status/${order.token}`,
    support: settings.supportWhatsapp || '',
  });
}));

app.get('/receipt/:token.pdf', asyncH(async (req, res) => {
  const order = await store.orderByToken(req.params.token);
  if (!order) return res.status(404).render('notfound');
  const tpl = await store.getTemplate(order.template_id);
  const settings = await store.allSettings();
  const buf = await buildReceiptPdf(order, tpl, settings);
  res.type('application/pdf').setHeader('Content-Disposition', `inline; filename="poruwe-receipt-${order.order_no}.pdf"`);
  res.send(buf);
}));

app.get('/receipt/:token', asyncH(async (req, res) => {
  const order = await store.orderByToken(req.params.token);
  if (!order) return res.status(404).render('notfound');
  const tpl = await store.getTemplate(order.template_id);
  res.render('receipt', { order, tpl, formatLKR });
}));

app.get('/d/:token/invitation.pdf', asyncH(async (req, res) => {
  const order = await store.orderByToken(req.params.token);
  if (!order || order.kind !== 'pdf') return res.status(404).render('notfound');
  if (order.status !== 'active' || orderExpired(order)) return res.status(410).render('gone');
  const buf = await buildInvitationPdf(derive(order.data), { preview: false });
  res.type('application/pdf').setHeader('Content-Disposition', 'attachment; filename="wedding-invitation.pdf"');
  res.send(buf);
}));

app.get('/d/:token/card.png', asyncH(async (req, res) => {
  const order = await store.orderByToken(req.params.token);
  if (!order || order.kind !== 'image') return res.status(404).render('notfound');
  if (order.status !== 'active' || orderExpired(order)) return res.status(410).render('gone');
  const buf = await buildInvitationImage(derive(order.data), await cardPhotoDataUri(order), { preview: false });
  res.type('image/png').setHeader('Content-Disposition', 'attachment; filename="wedding-invitation.png"');
  res.send(buf);
}));

app.get('/img/:id', asyncH(async (req, res) => {
  const im = await store.getImage(req.params.id);
  if (!im) return res.status(404).end();
  res.setHeader('Cache-Control', 'public, max-age=86400');
  res.type(im.mime).send(Buffer.from(im.data));
}));

/* ------------------------------- customer API ------------------------------ */
app.get('/api/orders/:token', asyncH(async (req, res) => {
  const order = await store.orderByToken(req.params.token);
  if (!order) return res.status(404).json({ error: 'not_found' });
  res.json(publicOrder(order, req));
}));

app.put('/api/orders/:token', asyncH(async (req, res) => {
  const order = await store.orderByToken(req.params.token);
  if (!order) return res.status(404).json({ error: 'not_found' });
  if (!['draft', 'pending_payment'].includes(order.status)) return res.status(409).json({ error: 'locked' });
  const incoming = sanitizeData(req.body && req.body.data);
  // preserve photo ids already uploaded unless explicitly replaced
  for (const k of ['groom', 'bride', 'venue', 'card']) {
    if (!incoming.photos[k] && order.data.photos && order.data.photos[k]) incoming.photos[k] = order.data.photos[k];
  }
  const updated = await store.updateOrder(order.id, { data: incoming });
  res.json(publicOrder(updated, req));
}));

const IMG_KINDS = ['groom', 'bride', 'venue', 'card', 'slip'];
app.post('/api/orders/:token/image', asyncH(async (req, res) => {
  const order = await store.orderByToken(req.params.token);
  if (!order) return res.status(404).json({ error: 'not_found' });
  if (!['draft', 'pending_payment', 'pending_verification'].includes(order.status)) return res.status(409).json({ error: 'locked' });
  const { kind, dataUrl } = req.body || {};
  if (!IMG_KINDS.includes(kind)) return res.status(400).json({ error: 'bad_kind' });
  const m = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(String(dataUrl || ''));
  if (!m) return res.status(400).json({ error: 'bad_image' });
  const buf = Buffer.from(m[2], 'base64');
  if (buf.length > 5 * 1024 * 1024) return res.status(413).json({ error: 'too_large' });
  const id = await store.insertImage(order.id, kind, m[1], buf);
  if (kind !== 'slip') {
    const data = { ...order.data, photos: { ...(order.data.photos || {}), [kind]: id } };
    await store.updateOrder(order.id, { data });
  } else {
    const payment = { ...(order.payment || {}), slipImage: id };
    await store.updateOrder(order.id, { payment });
  }
  res.json({ id, url: `/img/${id}` });
}));

app.get('/api/orders/:token/checkout', asyncH(async (req, res) => {
  const order = await store.orderByToken(req.params.token);
  if (!order) return res.status(404).json({ error: 'not_found' });
  const tpl = await store.getTemplate(order.template_id);
  const settings = await store.allSettings();
  const methods = payments.availableMethods(settings, tpl.price_lkr);
  const out = { methods, price: tpl.price_lkr, priceDisplay: formatLKR(tpl.price_lkr), currency: 'LKR', bank: settings.bank || {} };
  if (methods.includes('payhere')) out.payhere = payments.payhereCheckout(order, tpl, settings, baseUrl(req));
  res.json(out);
}));

app.post('/api/orders/:token/submit', asyncH(async (req, res) => {
  let order = await store.orderByToken(req.params.token);
  if (!order) return res.status(404).json({ error: 'not_found' });
  if (!['draft', 'pending_payment'].includes(order.status)) return res.status(409).json({ error: 'locked' });
  const tpl = await store.getTemplate(order.template_id);
  const settings = await store.allSettings();
  const d = derive(order.data);
  if (!d.groom || !d.bride || !order.data.event || !order.data.event.date) {
    return res.status(400).json({ error: 'incomplete', message: 'Couple names and wedding date are required.' });
  }
  const method = str((req.body || {}).method, 20);
  const allowed = payments.availableMethods(settings, tpl.price_lkr);
  if (!allowed.includes(method)) return res.status(400).json({ error: 'bad_method' });

  if (method === 'free') {
    await store.updateOrder(order.id, { payment: { method: 'free', amount: 0, paidAt: new Date().toISOString() } });
    order = await store.orderById(order.id);
    const activated = await activateOrder(order);
    return res.json(publicOrder(activated, req));
  }
  if (method === 'manual') {
    const reference = str((req.body || {}).reference, 80);
    const payment = { ...(order.payment || {}), method: 'manual', amount: tpl.price_lkr, reference, submittedAt: new Date().toISOString() };
    const updated = await store.updateOrder(order.id, { status: 'pending_verification', payment });
    await store.audit(order.id, 'payment_submitted', { method, reference });
    return res.json(publicOrder(updated, req));
  }
  if (method === 'payhere') {
    const payment = { ...(order.payment || {}), method: 'payhere', amount: tpl.price_lkr };
    await store.updateOrder(order.id, { status: 'pending_payment', payment });
    await store.audit(order.id, 'payhere_checkout_started', {});
    return res.json({ checkout: payments.payhereCheckout(order, tpl, settings, baseUrl(req)) });
  }
  res.status(400).json({ error: 'bad_method' });
}));

app.post('/api/payments/payhere/notify', asyncH(async (req, res) => {
  const settings = await store.allSettings();
  const body = req.body || {};
  if (!payments.payhereVerify(body, settings)) return res.status(400).send('invalid');
  const order = await store.orderByOrderNo(str(body.order_id, 20));
  if (!order) return res.status(404).send('unknown order');
  const payment = { ...(order.payment || {}), method: 'payhere', amount: Number(body.payhere_amount) || order.payment.amount, reference: str(body.payment_id, 60), paidAt: new Date().toISOString(), verified: true };
  await store.updateOrder(order.id, { payment });
  await store.audit(order.id, 'payhere_paid', { payment_id: body.payment_id });
  const fresh = await store.orderById(order.id);
  if (!['active', 'expired', 'revoked'].includes(fresh.status)) await activateOrder(fresh);
  res.send('ok');
}));

/* --------------------------------- admin API ------------------------------- */
const ADMIN_ORIGINS = new Set([
  ...String(process.env.ADMIN_ORIGIN || '').split(',').map((s) => s.trim()).filter(Boolean),
  'http://localhost:4324', 'http://127.0.0.1:4324',
]);
app.use('/api/admin', (req, res, next) => {
  const origin = req.headers.origin;
  if (origin && (ADMIN_ORIGINS.has(origin) || (!IS_PROD && (origin === 'null' || /^http:\/\/localhost/.test(origin))))) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  }
  if (req.method === 'OPTIONS') return res.status(204).end();
  next();
});

app.post('/api/admin/login', asyncH(async (req, res) => {
  const ip = req.ip;
  if (!auth.loginAllowed(ip)) return res.status(429).json({ error: 'too_many_attempts' });
  const password = str((req.body || {}).password, 200);
  const stored = await store.getSetting('adminPassword');
  const expected = (stored && stored.value) || ADMIN_PASSWORD;
  if (password !== expected) { auth.loginFailed(ip); return res.status(401).json({ error: 'bad_credentials' }); }
  auth.loginSucceeded(ip);
  res.json({ token: auth.adminToken() });
}));

app.use('/api/admin', (req, res, next) => (req.path === '/login' ? next() : auth.requireAdmin(req, res, next)));

app.get('/api/admin/overview', asyncH(async (req, res) => {
  const [stats, settings, recent] = await Promise.all([
    store.stats(), store.allSettings(), store.listOrders({ limit: 8 }),
  ]);
  res.json({ stats, settings: { ...settings, adminPassword: undefined }, recent: recent.orders });
}));

app.get('/api/admin/orders', asyncH(async (req, res) => {
  const { status, kind, q, limit, offset } = req.query;
  res.json(await store.listOrders({ status, kind, q, limit: +limit || 50, offset: +offset || 0 }));
}));

app.get('/api/admin/orders/:id', asyncH(async (req, res) => {
  const order = await store.orderById(req.params.id);
  if (!order) return res.status(404).json({ error: 'not_found' });
  const audit = await store.auditFor(order.id);
  res.json({ order, audit });
}));

app.post('/api/admin/orders/:id/approve', asyncH(async (req, res) => {
  let order = await store.orderById(req.params.id);
  if (!order) return res.status(404).json({ error: 'not_found' });
  if (!['pending_verification', 'pending_payment', 'draft', 'rejected'].includes(order.status)) return res.status(409).json({ error: 'bad_status' });
  const payment = { ...(order.payment || {}), paidAt: (order.payment || {}).paidAt || new Date().toISOString(), verifiedBy: 'admin' };
  await store.updateOrder(order.id, { payment });
  order = await store.orderById(order.id);
  const activated = await activateOrder(order);
  await store.audit(order.id, 'approved', {});
  res.json({ order: activated });
}));

app.post('/api/admin/orders/:id/reject', asyncH(async (req, res) => {
  const order = await store.orderById(req.params.id);
  if (!order) return res.status(404).json({ error: 'not_found' });
  const reason = str((req.body || {}).reason, 300);
  const updated = await store.updateOrder(order.id, { status: 'rejected', payment: { ...(order.payment || {}), rejectReason: reason } });
  await store.audit(order.id, 'rejected', { reason });
  res.json({ order: updated });
}));

app.post('/api/admin/orders/:id/revoke', asyncH(async (req, res) => {
  const order = await store.orderById(req.params.id);
  if (!order) return res.status(404).json({ error: 'not_found' });
  await store.deleteImages(order.id);
  const keep = { method: (order.payment || {}).method, amount: (order.payment || {}).amount, paidAt: (order.payment || {}).paidAt };
  const updated = await store.updateOrder(order.id, { status: 'revoked', data: {}, payment: keep, purged_at: new Date() });
  await store.audit(order.id, 'revoked', {});
  res.json({ order: updated });
}));

app.post('/api/admin/orders/:id/extend', asyncH(async (req, res) => {
  const order = await store.orderById(req.params.id);
  if (!order) return res.status(404).json({ error: 'not_found' });
  const days = Math.min(Math.max(+((req.body || {}).days) || 7, 1), 60);
  const from = order.expires_at ? new Date(order.expires_at) : new Date();
  from.setUTCDate(from.getUTCDate() + days);
  const updated = await store.updateOrder(order.id, { expires_at: from });
  await store.audit(order.id, 'extended', { days });
  res.json({ order: updated });
}));

app.put('/api/admin/orders/:id/data', asyncH(async (req, res) => {
  const order = await store.orderById(req.params.id);
  if (!order) return res.status(404).json({ error: 'not_found' });
  const incoming = sanitizeData((req.body || {}).data);
  for (const k of ['groom', 'bride', 'venue', 'card']) {
    if (!incoming.photos[k] && order.data.photos && order.data.photos[k]) incoming.photos[k] = order.data.photos[k];
  }
  const updated = await store.updateOrder(order.id, { data: incoming });
  await store.audit(order.id, 'admin_edited', {});
  res.json({ order: updated });
}));

app.get('/api/admin/settings', asyncH(async (req, res) => {
  const s = await store.allSettings();
  delete s.adminPassword;
  res.json(s);
}));

app.put('/api/admin/settings', asyncH(async (req, res) => {
  const b = req.body || {};
  if (b.bank) await store.putSetting('bank', { accountName: str(b.bank.accountName, 80), bank: str(b.bank.bank, 60), branch: str(b.bank.branch, 60), accountNumber: str(b.bank.accountNumber, 40) });
  if (b.payhere) await store.putSetting('payhere', { merchantId: str(b.payhere.merchantId, 40), merchantSecret: str(b.payhere.merchantSecret, 120), sandbox: !!b.payhere.sandbox });
  if (b.supportWhatsapp != null) await store.putSetting('supportWhatsapp', digits(b.supportWhatsapp));
  if (b.newAdminPassword) await store.putSetting('adminPassword', { value: str(b.newAdminPassword, 200) });
  const s = await store.allSettings();
  delete s.adminPassword;
  res.json(s);
}));

app.get('/api/admin/templates', asyncH(async (req, res) => res.json(await store.listTemplates(false))));
app.put('/api/admin/templates/:id', asyncH(async (req, res) => {
  const t = await store.updateTemplate(req.params.id, req.body || {});
  if (!t) return res.status(404).json({ error: 'not_found' });
  res.json(t);
}));

app.post('/api/admin/purge', asyncH(async (req, res) => res.json(await store.purgeExpired())));

/* ------------------------------- boot & errors ------------------------------ */
app.use((req, res) => res.status(404).render('notfound'));
app.use((err, req, res, next) => {
  console.error('[error]', err.message);
  if (res.headersSent) return next(err);
  if (req.path.startsWith('/api/')) return res.status(500).json({ error: 'server_error' });
  res.status(500).render('notfound');
});

(async () => {
  store = await createStore();
  await store.purgeExpired();
  setInterval(() => store.purgeExpired().catch((e) => console.error('[purge]', e.message)), 60 * 60 * 1000);
  app.listen(PORT, '0.0.0.0', () => console.log(`Poruwe platform running on :${PORT}`));
})().catch((e) => { console.error('boot failed:', e); process.exit(1); });
