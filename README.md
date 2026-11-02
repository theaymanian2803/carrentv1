# CarShare Connect

A peer-to-peer car rental marketplace. Owners list vehicles, renters book them, and admins
approve listings, manage users, and oversee bookings.

## Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite 5, TypeScript, Tailwind CSS 3, shadcn/ui |
| Data fetching | TanStack Query v5 |
| Backend | Hono on Cloudflare Workers (`/api/*`) |
| Database | Turso (libSQL / SQLite) |
| Auth | Email/password (PBKDF2 + JWT), Google OAuth (PKCE), guest sessions |
| Media | Image BLOBs in the database, served from `/api/media/:id` |
| Payments | PayPal subscriptions for the Pro plan |

## Features

- **Marketplace**: search and filter cars, car detail pages, date-range booking, reviews.
- **Owner dashboard**: fleet grid, add/edit cars with image upload, booking requests,
  free/pro listing limits (3 / 15).
- **Admin dashboard**: analytics, listing approval, all listings, bookings, users, roles,
  KYC status, subscriptions, and homepage controls.
- **Auth**: email/password, Google sign-in, and “Continue as guest”. Guests get a real
  account and can book; signing in with Google later upgrades the same account in place.
- **Homepage controls**: add car rows by category (SUVs, Luxury, etc.), reorder, hide, or
  delete them. The header, hero, category strip, host block, and footer stay fixed.

## Local development

Requires [Bun](https://bun.sh).

```bash
bun install
bun --cwd server install
cp server/.dev.vars.example server/.dev.vars   # fill in the values
```

Set at least `AUTH_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, and a `TURSO_DATABASE_URL`.
For Google sign-in also set `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and
`GOOGLE_REDIRECT_URI`; set `ADMIN_EMAILS` to the Google emails that should be admins.

Run the API and the web app:

```bash
bun run --cwd server dev    # Wrangler on :8787
bun run dev                 # Vite on :8080, proxies /api to :8787
```

For a file-backed local API without Wrangler:

```bash
TURSO_DATABASE_URL=file:./server/.smoke/dev.db bun run server/scripts/serve.ts
```

Apply the schema and optional demo data:

```bash
bun run --cwd server apply
bun run --cwd server seed
```

The schema is also created automatically on the first API request. The admin account is
created from `ADMIN_EMAIL` / `ADMIN_PASSWORD` and never overwritten afterward.

## Google sign-in

Add these authorized redirect URIs in the Google Cloud console for the OAuth client:

```
http://localhost:8080/api/auth/google/callback
https://<your-domain>/api/auth/google/callback
```

Set `GOOGLE_REDIRECT_URI` to the matching callback URL. The flow uses PKCE and stores the
session in an httpOnly cookie; email/password and guest sessions return a Bearer JWT as well.

## Tests

```bash
bun run test                 # frontend unit tests
bun run --cwd server test    # API, auth, bookings, admin, PayPal
bun run scripts/smoke.ts     # end-to-end API smoke (needs the API on :8787)
bun run lint
bun run build
```

## Packaging

```bash
bun run package:pages
```

Writes `C:\Users\PC\Desktop\builds\carshare-cloudflare-pages.zip` with `_worker.js`,
`index.html`, `assets/`, and buyer instructions. The buyer drags the zip into Cloudflare
Pages → Upload assets and sets the environment variables described in the README inside
the zip.

## Project structure

```
server/            Hono API, schema, bootstrap, PayPal, Google OAuth
src/lib/data/      DataClient interface + HTTP adapter
src/hooks/         TanStack Query hooks
src/pages/         Storefront, dashboards, admin, page builder
scripts/           Smoke test and Cloudflare Pages packaging
docs/superpowers/  Design specs, implementation plan, QA checklist
```

## Notes

- PayPal routes return `503 Payments not configured` until the PayPal variables are set.
- Media uploads are limited to 5 MB and validated by file signature, not just MIME type.
- Bookings recompute all prices server-side and reject overlapping dates atomically.
- Listing rows with no live cars render nothing.
- The public homepage falls back to the default selection when no car rows are configured.

## Deferred

- Normal (Turso-direct, static) build: documented as Phase 2, not implemented.
- Landing-section create/delete is exposed by the API; the Page Builder currently manages
  car rows only.
