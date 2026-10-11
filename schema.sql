-- Poruwe platform schema (idempotent)

CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value JSONB NOT NULL
);

CREATE TABLE IF NOT EXISTS templates (
  id        TEXT PRIMARY KEY,
  kind      TEXT NOT NULL,              -- website | pdf | image
  name      TEXT NOT NULL,
  tagline   TEXT,
  tier      TEXT NOT NULL,              -- free | essential | premium | pro
  price_lkr INTEGER NOT NULL DEFAULT 0,
  theme     JSONB NOT NULL DEFAULT '{}'::jsonb,
  renderer  TEXT NOT NULL,
  sort      INTEGER NOT NULL DEFAULT 0,
  active    BOOLEAN NOT NULL DEFAULT TRUE
);
ALTER TABLE templates ADD COLUMN IF NOT EXISTS discount_lkr INTEGER; -- NULL/0 = no discount

CREATE TABLE IF NOT EXISTS testimonials (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id    UUID UNIQUE REFERENCES orders(id) ON DELETE CASCADE,
  template_id TEXT,
  author      TEXT NOT NULL,
  couple      TEXT,
  rating      INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  text        TEXT NOT NULL,
  visible     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE SEQUENCE IF NOT EXISTS order_no_seq START 1000;

CREATE TABLE IF NOT EXISTS orders (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_no     TEXT UNIQUE NOT NULL,
  token        TEXT UNIQUE NOT NULL,
  template_id  TEXT NOT NULL REFERENCES templates(id),
  kind         TEXT NOT NULL,
  status       TEXT NOT NULL DEFAULT 'draft',  -- draft | pending_payment | pending_verification | active | rejected | expired | revoked
  slug         TEXT UNIQUE,
  data         JSONB NOT NULL DEFAULT '{}'::jsonb,
  payment      JSONB NOT NULL DEFAULT '{}'::jsonb,
  wedding_date DATE,
  expires_at   TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  activated_at TIMESTAMPTZ,
  purged_at    TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_orders_status  ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at DESC);

CREATE TABLE IF NOT EXISTS images (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id   UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  kind       TEXT NOT NULL,             -- groom | bride | venue | card | slip
  mime       TEXT NOT NULL,
  data       BYTEA NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_images_order ON images(order_id);

CREATE TABLE IF NOT EXISTS audit (
  id       BIGSERIAL PRIMARY KEY,
  order_id UUID,
  action   TEXT NOT NULL,
  meta     JSONB NOT NULL DEFAULT '{}'::jsonb,
  at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_audit_order ON audit(order_id);
