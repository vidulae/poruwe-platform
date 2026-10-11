// Storage layer. With DATABASE_URL -> Postgres; without -> in-memory store
// (full-featured, non-persistent — for local development only).
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { TEMPLATES, DEFAULT_SETTINGS, sampleData } = require('./catalog');
const { newToken } = require('./auth');

/* ------------------------------ Postgres ------------------------------ */
class PgStore {
  constructor(url) {
    const { Pool } = require('pg');
    this.pool = new Pool({
      connectionString: url,
      ssl: /localhost|127\.0\.0\.1/.test(url) ? false : { rejectUnauthorized: false },
      max: 5,
    });
  }
  async q(text, params) { return this.pool.query(text, params); }

  async init() {
    const schema = fs.readFileSync(path.join(__dirname, '..', 'schema.sql'), 'utf8');
    await this.q(schema);
    // seed/refresh templates (price_lkr + active are admin-owned after first seed)
    for (const t of TEMPLATES) {
      await this.q(
        `INSERT INTO templates (id, kind, name, tagline, tier, price_lkr, theme, renderer, sort, active)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,TRUE)
         ON CONFLICT (id) DO UPDATE SET kind=$2, name=$3, tagline=$4, tier=$5, theme=$7, renderer=$8, sort=$9`,
        [t.id, t.kind, t.name, t.tagline, t.tier, t.price_lkr, JSON.stringify(t.theme || {}), t.renderer, t.sort]
      );
    }
    for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
      await this.q(`INSERT INTO settings (key, value) VALUES ($1,$2) ON CONFLICT (key) DO NOTHING`, [key, JSON.stringify(value)]);
    }
    await this.seedDemo();
  }

  async seedDemo() {
    const { rows } = await this.q(`SELECT id FROM orders WHERE slug='demo'`);
    if (rows.length) return;
    const orderNo = await this.nextOrderNo();
    await this.q(
      `INSERT INTO orders (order_no, token, template_id, kind, status, slug, data, payment, wedding_date, expires_at, activated_at)
       VALUES ($1,$2,'golden-seal','website','active','demo',$3,'{"method":"demo"}','2027-12-12','2099-01-01T00:00:00Z', now())`,
      [orderNo, newToken(), JSON.stringify(sampleData())]
    );
  }

  async getSetting(key) { const { rows } = await this.q(`SELECT value FROM settings WHERE key=$1`, [key]); return rows[0] ? rows[0].value : undefined; }
  async putSetting(key, value) { await this.q(`INSERT INTO settings (key, value) VALUES ($1,$2) ON CONFLICT (key) DO UPDATE SET value=$2`, [key, JSON.stringify(value)]); }
  async allSettings() { const { rows } = await this.q(`SELECT key, value FROM settings`); return Object.fromEntries(rows.map(r => [r.key, r.value])); }

  async listTemplates(activeOnly) {
    const { rows } = await this.q(`SELECT * FROM templates ${activeOnly ? 'WHERE active=TRUE' : ''} ORDER BY sort`);
    return rows;
  }
  async getTemplate(id) { const { rows } = await this.q(`SELECT * FROM templates WHERE id=$1`, [id]); return rows[0]; }
  async updateTemplate(id, patch) {
    const t = await this.getTemplate(id);
    if (!t) return null;
    const price = patch.price_lkr != null ? Math.max(0, Math.round(+patch.price_lkr || 0)) : t.price_lkr;
    const active = patch.active != null ? !!patch.active : t.active;
    const discount = patch.discount_lkr !== undefined
      ? (patch.discount_lkr ? Math.max(0, Math.round(+patch.discount_lkr || 0)) : null)
      : t.discount_lkr;
    await this.q(`UPDATE templates SET price_lkr=$2, active=$3, discount_lkr=$4 WHERE id=$1`, [id, price, active, discount]);
    return this.getTemplate(id);
  }

  async nextOrderNo() {
    const { rows } = await this.q(`SELECT nextval('order_no_seq') AS n`);
    return 'PW-' + String(rows[0].n).padStart(6, '0');
  }

  async createOrder(templateId, kind, data) {
    const orderNo = await this.nextOrderNo();
    const token = newToken();
    const { rows } = await this.q(
      `INSERT INTO orders (order_no, token, template_id, kind, data) VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [orderNo, token, templateId, kind, JSON.stringify(data || {})]
    );
    return rows[0];
  }
  async orderByToken(token) { const { rows } = await this.q(`SELECT * FROM orders WHERE token=$1`, [token]); return rows[0]; }
  async orderBySlug(slug) { const { rows } = await this.q(`SELECT * FROM orders WHERE slug=$1`, [slug]); return rows[0]; }
  async orderById(id) { const { rows } = await this.q(`SELECT * FROM orders WHERE id=$1`, [id]); return rows[0]; }
  async orderByOrderNo(no) { const { rows } = await this.q(`SELECT * FROM orders WHERE order_no=$1`, [no]); return rows[0]; }
  async slugTaken(slug) { const { rows } = await this.q(`SELECT 1 FROM orders WHERE slug=$1`, [slug]); return rows.length > 0; }

  async updateOrder(id, patch) {
    const sets = ['updated_at=now()'];
    const vals = [id];
    let i = 2;
    for (const [k, v] of Object.entries(patch)) {
      if (!['status', 'slug', 'data', 'payment', 'wedding_date', 'expires_at', 'activated_at', 'purged_at'].includes(k)) continue;
      sets.push(`${k}=$${i++}`);
      vals.push((k === 'data' || k === 'payment') ? JSON.stringify(v) : v);
    }
    const { rows } = await this.q(`UPDATE orders SET ${sets.join(',')} WHERE id=$1 RETURNING *`, vals);
    return rows[0];
  }

  async listOrders({ status, kind, q, limit = 50, offset = 0 }) {
    const where = [`slug IS DISTINCT FROM 'demo'`];
    const vals = [];
    let i = 1;
    if (status) { where.push(`status=$${i++}`); vals.push(status); }
    if (kind) { where.push(`kind=$${i++}`); vals.push(kind); }
    if (q) {
      where.push(`(order_no ILIKE $${i} OR data->'couple'->>'groom' ILIKE $${i} OR data->'couple'->>'bride' ILIKE $${i} OR data->'customer'->>'name' ILIKE $${i} OR data->'customer'->>'wa' ILIKE $${i})`);
      vals.push(`%${q}%`); i++;
    }
    vals.push(Math.min(+limit || 50, 200), +offset || 0);
    const { rows } = await this.q(
      `SELECT id, order_no, token, template_id, kind, status, slug, data, payment, wedding_date, expires_at, created_at, updated_at, activated_at
       FROM orders WHERE ${where.join(' AND ')} ORDER BY created_at DESC LIMIT $${i++} OFFSET $${i}`, vals);
    const { rows: cnt } = await this.q(`SELECT count(*)::int AS n FROM orders WHERE ${where.join(' AND ')}`, vals.slice(0, -2));
    return { orders: rows, total: cnt[0].n };
  }

  async insertImage(orderId, kind, mime, buf) {
    await this.q(`DELETE FROM images WHERE order_id=$1 AND kind=$2`, [orderId, kind]);
    const { rows } = await this.q(`INSERT INTO images (order_id, kind, mime, data) VALUES ($1,$2,$3,$4) RETURNING id`, [orderId, kind, mime, buf]);
    return rows[0].id;
  }
  async getImage(id) {
    if (!/^[0-9a-f-]{36}$/.test(String(id))) return undefined;
    const { rows } = await this.q(`SELECT * FROM images WHERE id=$1`, [id]);
    return rows[0];
  }
  async deleteImages(orderId) { await this.q(`DELETE FROM images WHERE order_id=$1`, [orderId]); }
  async deleteOrder(orderId) {
    await this.q(`DELETE FROM audit WHERE order_id=$1`, [orderId]);
    await this.q(`DELETE FROM orders WHERE id=$1`, [orderId]); // images cascade
  }

  async audit(orderId, action, meta) { await this.q(`INSERT INTO audit (order_id, action, meta) VALUES ($1,$2,$3)`, [orderId, action, JSON.stringify(meta || {})]); }
  async auditFor(orderId) { const { rows } = await this.q(`SELECT * FROM audit WHERE order_id=$1 ORDER BY at DESC LIMIT 100`, [orderId]); return rows; }

  // Paid/published orders per template (the demo never counts)
  async templateSales() {
    const { rows } = await this.q(
      `SELECT template_id, count(*)::int AS n FROM orders
       WHERE slug IS DISTINCT FROM 'demo' AND (payment->>'paidAt' IS NOT NULL OR status='active')
       GROUP BY template_id`);
    return Object.fromEntries(rows.map(r => [r.template_id, r.n]));
  }

  async upsertTestimonial(orderId, t) {
    const { rows } = await this.q(
      `INSERT INTO testimonials (order_id, template_id, author, couple, rating, text)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (order_id) DO UPDATE SET author=$3, couple=$4, rating=$5, text=$6, created_at=now()
       RETURNING *`,
      [orderId, t.template_id, t.author, t.couple, t.rating, t.text]);
    return rows[0];
  }
  async testimonialForOrder(orderId) { const { rows } = await this.q(`SELECT * FROM testimonials WHERE order_id=$1`, [orderId]); return rows[0]; }
  async createTestimonial(t) { // admin-entered, not tied to an order
    const { rows } = await this.q(
      `INSERT INTO testimonials (order_id, template_id, author, couple, rating, text, visible)
       VALUES (NULL,$1,$2,$3,$4,$5,$6) RETURNING *`,
      [t.template_id || null, t.author, t.couple || null, t.rating, t.text, !!t.visible]);
    return rows[0];
  }
  async listTestimonials() { const { rows } = await this.q(`SELECT * FROM testimonials ORDER BY created_at DESC LIMIT 200`); return rows; }
  async visibleTestimonials(limit) { const { rows } = await this.q(`SELECT * FROM testimonials WHERE visible=TRUE ORDER BY rating DESC, created_at DESC LIMIT $1`, [limit || 9]); return rows; }
  async setTestimonialVisible(id, visible) { const { rows } = await this.q(`UPDATE testimonials SET visible=$2 WHERE id=$1 RETURNING *`, [id, !!visible]); return rows[0]; }
  async deleteTestimonial(id) { await this.q(`DELETE FROM testimonials WHERE id=$1`, [id]); }

  async stats() {
    const { rows: byStatus } = await this.q(`SELECT status, count(*)::int AS n FROM orders WHERE slug IS DISTINCT FROM 'demo' GROUP BY status`);
    const { rows: rev } = await this.q(
      `SELECT COALESCE(SUM((payment->>'amount')::numeric),0)::int AS revenue FROM orders WHERE payment->>'paidAt' IS NOT NULL AND slug IS DISTINCT FROM 'demo'`);
    const { rows: weekly } = await this.q(
      `SELECT to_char(date_trunc('week', created_at), 'YYYY-MM-DD') AS wk, count(*)::int AS n
       FROM orders WHERE created_at > now() - interval '8 weeks' AND slug IS DISTINCT FROM 'demo' GROUP BY 1 ORDER BY 1`);
    const { rows: upcoming } = await this.q(
      `SELECT count(*)::int AS n FROM orders WHERE status='active' AND wedding_date BETWEEN now()::date AND (now()::date + 7)`);
    return { byStatus: Object.fromEntries(byStatus.map(r => [r.status, r.n])), revenue: rev[0].revenue, weekly, upcomingWeddings: upcoming[0].n };
  }

  // Expired actives -> strip personal data. Stale 7-day drafts -> delete.
  async purgeExpired() {
    const { rows: expired } = await this.q(
      `SELECT id, payment FROM orders WHERE status='active' AND expires_at IS NOT NULL AND expires_at < now() AND slug IS DISTINCT FROM 'demo'`);
    for (const o of expired) {
      await this.deleteImages(o.id);
      const keep = { method: (o.payment || {}).method, amount: (o.payment || {}).amount, paidAt: (o.payment || {}).paidAt };
      await this.q(`UPDATE orders SET status='expired', data='{}'::jsonb, payment=$2, purged_at=now(), updated_at=now() WHERE id=$1`, [o.id, JSON.stringify(keep)]);
      await this.audit(o.id, 'auto_purged', {});
    }
    const { rowCount } = await this.q(`DELETE FROM orders WHERE status='draft' AND updated_at < now() - interval '7 days'`);
    return { purged: expired.length, draftsDeleted: rowCount };
  }
}

/* ------------------------------ In-memory ------------------------------ */
class MemStore {
  constructor() {
    this.settings = new Map(Object.entries(JSON.parse(JSON.stringify(DEFAULT_SETTINGS))));
    this.templates = new Map(TEMPLATES.map(t => [t.id, { theme: {}, active: true, ...JSON.parse(JSON.stringify(t)) }]));
    this.orders = new Map();
    this.images = new Map();
    this.audits = [];
    this.counter = 1000;
  }
  async init() { await this.seedDemo(); }
  async seedDemo() {
    if ([...this.orders.values()].some(o => o.slug === 'demo')) return;
    const o = await this.createOrder('golden-seal', 'website', sampleData());
    Object.assign(o, { status: 'active', slug: 'demo', wedding_date: '2027-12-12', expires_at: new Date('2099-01-01'), activated_at: new Date(), payment: { method: 'demo' } });
  }
  async getSetting(k) { return this.settings.get(k); }
  async putSetting(k, v) { this.settings.set(k, v); }
  async allSettings() { return Object.fromEntries(this.settings); }
  async listTemplates(activeOnly) { return [...this.templates.values()].filter(t => !activeOnly || t.active).sort((a, b) => a.sort - b.sort); }
  async getTemplate(id) { return this.templates.get(id); }
  async updateTemplate(id, patch) {
    const t = this.templates.get(id);
    if (!t) return null;
    if (patch.price_lkr != null) t.price_lkr = Math.max(0, Math.round(+patch.price_lkr || 0));
    if (patch.active != null) t.active = !!patch.active;
    if (patch.discount_lkr !== undefined) t.discount_lkr = patch.discount_lkr ? Math.max(0, Math.round(+patch.discount_lkr || 0)) : null;
    return t;
  }
  async nextOrderNo() { return 'PW-' + String(++this.counter).padStart(6, '0'); }
  async createOrder(templateId, kind, data) {
    const o = {
      id: crypto.randomUUID(), order_no: await this.nextOrderNo(), token: newToken(),
      template_id: templateId, kind, status: 'draft', slug: null,
      data: data || {}, payment: {}, wedding_date: null, expires_at: null,
      created_at: new Date(), updated_at: new Date(), activated_at: null, purged_at: null,
    };
    this.orders.set(o.id, o);
    return o;
  }
  async orderByToken(t) { return [...this.orders.values()].find(o => o.token === t); }
  async orderBySlug(s) { return [...this.orders.values()].find(o => o.slug === s); }
  async orderById(id) { return this.orders.get(id); }
  async orderByOrderNo(n) { return [...this.orders.values()].find(o => o.order_no === n); }
  async slugTaken(s) { return !!(await this.orderBySlug(s)); }
  async updateOrder(id, patch) { const o = this.orders.get(id); if (!o) return null; Object.assign(o, patch, { updated_at: new Date() }); return o; }
  async listOrders({ status, kind, q, limit = 50, offset = 0 }) {
    let list = [...this.orders.values()].filter(o => o.slug !== 'demo');
    if (status) list = list.filter(o => o.status === status);
    if (kind) list = list.filter(o => o.kind === kind);
    if (q) {
      const needle = q.toLowerCase();
      list = list.filter(o => JSON.stringify([o.order_no, o.data.couple, o.data.customer]).toLowerCase().includes(needle));
    }
    list.sort((a, b) => b.created_at - a.created_at);
    return { orders: list.slice(offset, offset + Math.min(limit, 200)), total: list.length };
  }
  async insertImage(orderId, kind, mime, buf) {
    for (const [id, im] of this.images) if (im.order_id === orderId && im.kind === kind) this.images.delete(id);
    const id = crypto.randomUUID();
    this.images.set(id, { id, order_id: orderId, kind, mime, data: buf });
    return id;
  }
  async getImage(id) { return this.images.get(id); }
  async deleteImages(orderId) { for (const [id, im] of this.images) if (im.order_id === orderId) this.images.delete(id); }
  async deleteOrder(orderId) {
    await this.deleteImages(orderId);
    this.audits = this.audits.filter(a => a.order_id !== orderId);
    (this.testimonials || new Map()).delete(orderId);
    this.orders.delete(orderId);
  }
  async audit(orderId, action, meta) { this.audits.push({ order_id: orderId, action, meta: meta || {}, at: new Date() }); }
  async auditFor(orderId) { return this.audits.filter(a => a.order_id === orderId).reverse().slice(0, 100); }

  async templateSales() {
    const out = {};
    for (const o of this.orders.values()) {
      if (o.slug === 'demo') continue;
      if ((o.payment && o.payment.paidAt) || o.status === 'active') out[o.template_id] = (out[o.template_id] || 0) + 1;
    }
    return out;
  }
  async upsertTestimonial(orderId, t) {
    this.testimonials = this.testimonials || new Map();
    const prev = this.testimonials.get(orderId) || { id: newToken().slice(0, 32), order_id: orderId, visible: false, created_at: new Date() };
    const row = { ...prev, template_id: t.template_id, author: t.author, couple: t.couple, rating: t.rating, text: t.text, created_at: new Date() };
    this.testimonials.set(orderId, row);
    return row;
  }
  async testimonialForOrder(orderId) { return (this.testimonials || new Map()).get(orderId); }
  async createTestimonial(t) {
    this.testimonials = this.testimonials || new Map();
    const id = newToken().slice(0, 32);
    const row = { id, order_id: null, template_id: t.template_id || null, author: t.author, couple: t.couple || null, rating: t.rating, text: t.text, visible: !!t.visible, created_at: new Date() };
    this.testimonials.set('manual-' + id, row);
    return row;
  }
  async listTestimonials() { return [...(this.testimonials || new Map()).values()].sort((a, b) => b.created_at - a.created_at); }
  async visibleTestimonials(limit) { return (await this.listTestimonials()).filter(t => t.visible).slice(0, limit || 9); }
  async setTestimonialVisible(id, visible) {
    for (const row of (this.testimonials || new Map()).values()) if (row.id === id) { row.visible = !!visible; return row; }
  }
  async deleteTestimonial(id) {
    for (const [k, row] of (this.testimonials || new Map())) if (row.id === id) this.testimonials.delete(k);
  }
  async stats() {
    const list = [...this.orders.values()].filter(o => o.slug !== 'demo');
    const byStatus = {};
    let revenue = 0;
    for (const o of list) {
      byStatus[o.status] = (byStatus[o.status] || 0) + 1;
      if (o.payment && o.payment.paidAt) revenue += +o.payment.amount || 0;
    }
    return { byStatus, revenue, weekly: [], upcomingWeddings: 0 };
  }
  async purgeExpired() {
    let purged = 0;
    for (const o of this.orders.values()) {
      if (o.status === 'active' && o.expires_at && o.expires_at < new Date() && o.slug !== 'demo') {
        await this.deleteImages(o.id);
        o.status = 'expired';
        o.data = {};
        o.payment = { method: o.payment.method, amount: o.payment.amount, paidAt: o.payment.paidAt };
        o.purged_at = new Date();
        purged++;
      }
    }
    let draftsDeleted = 0;
    const cutoff = Date.now() - 7 * 24 * 3600e3;
    for (const [id, o] of this.orders) {
      if (o.status === 'draft' && new Date(o.updated_at).getTime() < cutoff) { await this.deleteOrder(id); draftsDeleted++; }
    }
    return { purged, draftsDeleted };
  }
}

async function createStore() {
  if (process.env.DATABASE_URL) {
    const store = new PgStore(process.env.DATABASE_URL);
    await store.init();
    console.log('[store] Postgres connected');
    return store;
  }
  console.warn('[store] DATABASE_URL not set — using in-memory store (dev only, data is not persisted)');
  const store = new MemStore();
  await store.init();
  return store;
}

module.exports = { createStore };
