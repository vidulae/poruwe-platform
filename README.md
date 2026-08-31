# Poruwe Platform

**Poruwe** — wedding invitations, sealed with love. A self-service platform where couples build, preview, pay for, and share luxury wedding invitations.

## Products

| Template | Kind | Tier | Price |
|---|---|---|---|
| Simple Scroll | Invitation website | Free | LKR 0 |
| Classic Card | Printable A5 PDF | Essential | LKR 400 |
| WhatsApp Card | Share-ready image (1080×1350) | Essential | LKR 900 |
| Golden Seal | Invitation website (flagship) | Premium | LKR 2,900 |
| Midnight Poruwa | Invitation website (dark theme) | Premium | LKR 3,900 |
| Poruwe Royale | Website + designer session | Pro | LKR 7,900 |

Prices and visibility are editable live from the admin panel.

## How it works

1. Customer picks a template → guided builder (autosaving draft) → instant watermarked preview.
2. Payment: **bank transfer** (admin verifies & approves) or **PayHere** (auto-activates on the verified webhook). Free templates publish instantly. A **Stripe adapter slot** is ready for a future US Stripe account (`lib/payments.js`).
3. Every order gets an order number (`PW-000123`), a status page, and an official receipt (HTML + PDF).
4. Website invitations go live at `/i/<couple-slug>`; PDF/image products unlock clean downloads.
5. **Privacy:** all personal data, photos, and links are automatically and permanently purged 3 days after the wedding date (hourly job + lazy checks). Stale 30-day drafts are deleted too.

## Stack

Node 20 + Express + EJS + Postgres (`pg`). Document generation: `pdfkit` (PDF card + receipts), `satori` + `@resvg/resvg-js` (image cards). No build step.

Without `DATABASE_URL` the server runs on an in-memory store — full-featured, for local development only.

## Run locally

```bash
npm install
ADMIN_PASSWORD=dev PORT=4323 node server.js
```

## Environment

| Var | Purpose |
|---|---|
| `DATABASE_URL` | Postgres connection string |
| `ADMIN_PASSWORD` | Admin panel password (changeable later in Settings) |
| `TOKEN_SECRET` | HMAC secret for admin sessions |
| `ADMIN_ORIGIN` | Allowed CORS origin of the admin panel |
| `PUBLIC_BASE_URL` | Canonical base URL used in links/receipts |

## Key routes

- `/` landing + template gallery · `/start/:templateId` → builder · `/p/:token` watermarked preview
- `/i/:slug` live invitation · `/status/:token` order status · `/receipt/:token(.pdf)`
- `/d/:token/invitation.pdf`, `/d/:token/card.png` paid deliverables
- `/api/admin/*` admin API (Bearer token; see `poruwe-admin`)
- `POST /api/payments/payhere/notify` PayHere webhook
