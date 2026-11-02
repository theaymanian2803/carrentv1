# CarShare Connect — Turso migration (Pro first, Normal later)

Date: 2026-11-02
Status: draft for approval
Source repo: `C:\Users\PC\Desktop\core sass builds` (CarShare Connect, ex-Supabase/Lovable template)

## 1. Intent and why

The template currently depends on Supabase for everything: Auth, Postgres + RLS, Storage, RPC
functions, and three Edge Functions that drive PayPal subscriptions. We want to ship it the way
the rest of the Desktop templates ship: **Turso (libSQL/SQLite) as the database**, with TanStack
Query as the frontend data layer, and no Supabase dependency.

Two sellable builds come out of one codebase:

| Build | Backend | Deploy | Payments |
|---|---|---|---|
| **Pro** (build first) | Hono API on Cloudflare Workers, holding the Turso token | Cloudflare Pages zip (`_worker.js` + assets) | Live PayPal subscriptions + webhook |
| **Normal** (Phase 2, later) | Browser talks directly to Turso | Static Vercel Drop zip | Pro upgrade managed by admin |

The Pro build is the reference implementation and keeps every feature that exists today. The
Normal build is a smaller static variant for buyers who do not want to run a worker.

## 2. Goals

- Remove `@supabase/supabase-js`, `src/integrations/supabase/*`, `supabase/` (migrations + functions), and the Supabase env vars.
- Preserve functional parity in Pro: signup/login with three roles, car CRUD, admin approval, bookings and status changes, reviews, KYC status, subscriptions with a 3/15 listing cap, PayPal upgrade + webhook, landing-section CMS, admin analytics, image upload.
- Put **all** reads and writes behind TanStack Query hooks and a single data interface.
- Keep the existing UI, routes, and copy. This is a backend migration, not a redesign.
- Make the Normal build a thin adapter over the same interface rather than a fork.
- Local development must work without a paid Turso account, using `turso dev`.

## 3. Non-goals

- No visual redesign, no new pages, no new marketplace features.
- No data migration from the existing Supabase project (this is a template, not live data).
- No real payment capture for car bookings. (The current app only has PayPal for Pro upgrades; Stripe Connect is described in the README but not implemented.)
- No realtime/websocket features. The `messages` table exists but has no UI today.
- No email verification, password reset, or OAuth. Supabase provided these implicitly; the current UI never used them.

## 4. Anti-goals (would make this a failure even if it builds)

- A second copy of the app for Normal that drifts from Pro.
- Supabase calls left behind in a code path that silently fails at runtime.
- A Pro build where the Turso token is still exposed to the browser.
- Admin screens that "work" only because the client filters data it should not have received.

## 5. Constraints

- Follow the house patterns in `C:\Users\PC\Desktop\workflow\admin-panel-workflow.md` (Hono + Turso + JWT/PBKDF2 + TanStack Query) and `cloudflare-pages-workflow.md` (Pages packaging).
- Frontend stays React 18 + Vite 5 + Tailwind 3 + shadcn/ui. Server is Hono + `@libsql/client` + `jose` on Workers, same as `optimialbuild/server`.
- Bun is the package manager for this repo.
- Turso CLI 0.6.0 is installed; Wrangler comes from `server/devDependencies`.
- No Node-only APIs in Worker code. Password hashing uses Web Crypto PBKDF2, not bcrypt.

## 6. Approaches considered

### A. Turso-direct SPA only
Browser → `@libsql/client` with `VITE_TURSO_DB_URL` + `VITE_TURSO_AUTH_TOKEN`; own auth tables; base64 images; no server. Simplest packaging, matches the dogosite family.
Rejected as the primary build: the token ships in the bundle, so role checks are advisory and anyone can write the DB; and PayPal cannot work without a secret.

### B. Turso behind a Hono API (chosen for Pro)
Browser → `/api/*` on a Worker; the Worker holds the Turso token and PayPal secrets, verifies JWTs, and enforces ownership. Full feature parity, real security. Cost: buyers deploy a worker, so packaging is Cloudflare Pages rather than Vercel Drop.

### C. Two separate codebases
Rejected: duplicates ~60% of the work and guarantees drift between Pro and Normal.

### Decision
Build **B** now. Keep **A** as a documented Phase 2 build of the same codebase, selected at build time. A shared data interface plus two adapters keeps the UI single-source.

## 7. How the two builds share one codebase

```
src/
  lib/data/
    types.ts        # domain types + DataClient interface
    api.ts          # HTTP adapter -> /api/*        (Pro)
    direct.ts       # @libsql/client adapter        (Normal, Phase 2)
    index.ts        # re-export the active adapter
  hooks/queries/    # TanStack Query hooks, adapter-agnostic
  contexts/AuthContext.tsx
server/             # Pro only
```

`vite.config.ts` aliases `@data-impl` to `api.ts` by default, or `direct.ts` when
`DATA_MODE=direct`. Hooks import from `@/lib/data`, never from an adapter. The Normal bundle
therefore never includes `/api` code, and the Pro bundle never includes `@libsql/client`.

The interface covers auth, cars, bookings, reviews, profile, subscriptions, landing sections,
admin, and media. Auth is part of the interface so `AuthContext` is identical in both builds.

## 8. Database schema (Turso / SQLite)

Conventions: TEXT UUID primary keys generated with `crypto.randomUUID()`, ISO-8601 TEXT
timestamps, booleans as `0/1`, JSON as TEXT, money as REAL.

Tables:

- `users` — `id`, `email` (UNIQUE, NOCASE), `password_hash`, `name`, `created_at`
- `profiles` — `id`, `user_id` (UNIQUE), `full_name`, `avatar_url`, `kyc_status` (`pending|verified|rejected`), `stripe_account_id`, `created_at`, `updated_at`
- `user_roles` — `id`, `user_id`, `role` (`admin|owner|renter`), UNIQUE(`user_id`,`role`)
- `cars` — `id`, `owner_id`, `make`, `model`, `year`, `category` (`SUV|Sedan|Luxury|Electric`), `daily_rate`, `location_lat`, `location_lng`, `address`, `description`, `features` (JSON), `images` (JSON array), `is_active`, `status` (`pending_approval|live|delisted`), `created_at`, `updated_at`
- `bookings` — `id`, `car_id`, `renter_id`, `start_date`, `end_date`, `total_days`, `platform_fee`, `owner_payout`, `total_price`, `status` (`pending|approved|active|completed|cancelled|disputed`), `renter_phone`, `renter_email`, `renter_notes`, `created_at`, `updated_at`
- `reviews` — `id`, `booking_id`, `reviewer_id`, `reviewee_id`, `rating` (1–5), `comment`, `created_at`
- `subscriptions` — `id`, `user_id` (UNIQUE), `plan` (`free|pro`), `status` (`active|cancelled|past_due|expired`), `paypal_subscription_id`, `current_period_start`, `current_period_end`, `created_at`, `updated_at`
- `landing_sections` — `id`, `section_type`, `title`, `content` (JSON), `sort_order`, `is_visible`, `created_at`, `updated_at`
- `media` — `id`, `mime`, `data` (BLOB), `created_at`, replacing the `car-images` bucket
- `messages` — created for schema parity with the old DB but **unused**: no UI and no routes in this migration

Indexes: `cars(owner_id)`, `cars(status, is_active)`, `bookings(renter_id)`, `bookings(car_id)`,
`reviews(reviewee_id)`, `reviews(booking_id)`, `user_roles(user_id)`,
`landing_sections(sort_order)`, `subscriptions(user_id)`.

`server/schema.sql` uses `CREATE TABLE IF NOT EXISTS` / `CREATE INDEX IF NOT EXISTS` and is
applied by `server/scripts/apply.ts`. `server/seed.sql` provides demo cars, sections, and three
demo accounts (admin, owner, renter).

RLS is replaced by route-level checks. Every write path validates ownership server-side:
owners mutate only their cars and bookings on their cars; renters mutate only their bookings and
reviews; admins bypass. This is the point of choosing Pro.

## 9. Auth

- `POST /api/auth/register` `{email, password, fullName, role}` → creates `users`, `profiles`, `user_roles`, and a `free` `subscriptions` row in one batch; returns `{token, user}`. Role is limited to `owner|renter`; `admin` can only be granted by an admin.
- `POST /api/auth/login` → PBKDF2-SHA256 verify (100k iterations), returns `{token, user}`.
- `GET /api/auth/me` → `{user, profile, roles}`; used for session restore.
- JWT: HS256 via `jose`, 30-day expiry, `sub` = user id, secret from `AUTH_SECRET`.
- Frontend stores the token in `localStorage["carshare_token"]`; `apiFetch` attaches `Authorization: Bearer`.
- Middleware: `requireAuth`, `requireAdmin`, plus per-route ownership helpers.
- A user may hold both `owner` and `renter` roles; registration picks one to start.
- `src/integrations/supabase/previewAuthStorage.ts` is deleted. The Lovable preview-auth broker has no meaning off Lovable.

## 10. API contract (Pro)

All under `/api`, JSON, errors `{error}`. Public reads are unauthenticated.

**Public**
- `GET /health`
- `GET /cars` (live + active), `GET /cars/:id` (live + active unless owner/admin), `GET /cars/:id/reviews`
- `GET /landing-sections` (visible only)
- `GET /reviews?reviewee_id=`
- `GET /media/:id`

**Auth**
- `POST /auth/register`, `POST /auth/login`, `GET /auth/me`

**Me (Bearer)**
- `GET/PUT /me/profile`
- `GET/POST /me/cars`, `PUT/DELETE /me/cars/:id`
- `GET /me/bookings` (as renter and as owner), `POST /me/bookings`, `PATCH /me/bookings/:id/status`
- `GET /me/reviews`, `POST /me/reviews`
- `GET /me/subscription` → `{plan, status, listingCount, listingLimit}`
- `POST /me/upload` (multipart, ≤5 MB, image mime allowlist), returns `{url: "/api/media/:id"}`

**Admin (Bearer + admin role)**
- `GET /admin/stats` → signups by day, bookings by day, role distribution, totals, active users
- `GET /admin/users`, `PUT /admin/users/:id/roles`, `PATCH /admin/users/:id/kyc`
- `GET /admin/cars`, `POST /admin/cars` (admin may set status, bypasses the listing cap), `PATCH /admin/cars/:id/status`, `DELETE /admin/cars/:id`
- `GET /admin/bookings`, `PATCH /admin/bookings/:id/status`, `DELETE /admin/bookings/:id`
- `GET /admin/subscriptions`, `PATCH /admin/subscriptions/:id`
- `GET/POST/PUT/DELETE /admin/landing-sections[/:id]` (`GET` includes hidden sections; the public one does not)
- `GET /admin/reviews/:id` not needed; reviews are created through `/me/reviews` and read publicly

**Payments**
- `POST /payments/paypal/create-subscription`
- `POST /payments/paypal/activate`
- `POST /payments/paypal/webhook` (public; verifies signature with PayPal before acting)

If PayPal env vars are absent, the two authenticated payment routes return `503` with a clear
message and the UI shows "Payments not configured". The rest of the app keeps working.

## 11. PayPal

Port the three Edge Functions to Worker routes, preserving behaviour:

- `create-subscription` — creates a PayPal subscription against `PAYPAL_PLAN_ID` and returns `approval_url`.
- `activate` — after the payer returns, fetches the subscription from PayPal, verifies it is `ACTIVE`, then sets `plan='pro'`, `status='active'`, stores `paypal_subscription_id`, and sets the period end.
- `webhook` — verifies via `/v1/notifications/verify-webhook-signature` using `PAYPAL_WEBHOOK_ID`, then handles activation, cancellation, suspension, and expiry by updating `subscriptions`.
- Env: `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `PAYPAL_BASE`, `PAYPAL_PLAN_ID`, `PAYPAL_WEBHOOK_ID`.

Listing limits are computed in SQL: `pro + active` → 15, otherwise 3; count is
`SELECT COUNT(*) FROM cars WHERE owner_id = ?`.

## 12. Frontend data layer

- `src/lib/api.ts` — `apiFetch<T>(path, {method, body})`, token helpers, 401 handling.
- `src/lib/data/types.ts` — `Car`, `Booking`, `Review`, `Profile`, `Subscription`, `LandingSection`, `AdminStats`, `DataClient`.
- `src/hooks/queries/` — one file per domain: `useCars`, `useCar`, `useMyCars`, `useBookings`, `useMyBookings`, `useReviews`, `useProfile`, `useSubscription`, `useLandingSections`, `useAdminUsers`, `useAdminStats`, `useAdminCars`, `useAdminBookings`, `useAdminSubscriptions`, `useMediaUpload`.
- Query keys: `['cars', filters]`, `['car', id]`, `['bookings', scope]`, `['admin','users']`, etc. Mutations invalidate the narrowest affected key.
- `QueryClient` defaults: `staleTime: 30_000`, `retry: 1`, `refetchOnWindowFocus: false`.
- Every `useEffect`-based fetch in the affected components is replaced by `useQuery`; every mutation becomes `useMutation` + invalidation. Toast behaviour stays as-is.
- `AuthContext` keeps its public shape (`user`, `profile`, `roles`, `loading`, `signOut`, `hasRole`) and adds `signIn`/`signUp`, so existing consumers change minimally.

Files currently touching Supabase and their replacement: `AuthContext`, `Auth`, `BookCar`,
`CarDetails`, `Index`, `Profile`, `RenterDashboard`, `Search`, `AdminDashboard`,
`AdminPageBuilder`, `AddCarForm`, `BookingRequestBoard`, `FleetGrid`, `UpgradeModal`,
`ActivityAnalytics`, `AllListingsTable`, `BookingManagement`, `ListingApprovalQueue`,
`SubscriptionManager`, `UserManagement`, `useLandingSections`, `useSubscription`,
plus `src/integrations/supabase/*` (deleted).

## 13. Pro dev and verification

Local:
1. `turso dev --db-file .turso/dev.db --port 8080` (local libSQL server; verify flags at implementation).
2. `server/.dev.vars`: `TURSO_DATABASE_URL=http://127.0.0.1:8080`, `TURSO_AUTH_TOKEN=` (empty locally), `AUTH_SECRET=<random>`, `ADMIN_EMAIL=<you>`, `ADMIN_PASSWORD=<8+ chars>`.
3. `bun run --cwd server scripts/apply.ts` then seed. The Worker also runs `ensureBootstrap(env)` on first
   request: idempotent schema creation, then create-or-promote the `ADMIN_EMAIL` account with the
   PBKDF2 hash of `ADMIN_PASSWORD`. If the user already exists it is promoted to admin and its
   password is **not** overwritten. This keeps drag-and-drop Pages deploys working without a CLI.
4. `bun run --cwd server dev` (Wrangler on 8787) and `bun run dev` (Vite proxies `/api` → 8787).

Acceptance checks:
- `tsc --noEmit` in `server/`; `bun run lint`, `bun run test`, `bun run build` in root.
- A curl smoke script covering: register owner + renter, login, create car (pending), admin approves, public list shows it, renter books, owner approves, renter reviews, subscription limit blocks a 4th car on free, admin flips to pro and the 4th succeeds.
- Manual walkthrough of `/`, `/search`, `/car/:id`, `/book/:id`, `/auth`, `/profile`, `/renter`, `/owner`, `/admin` tabs.
- Negative checks: renter cannot edit another owner's car; non-admin cannot hit `/admin/*`; no Turso token in the built bundle (`grep` for `TURSO_AUTH_TOKEN`).

Packaging (Pro): copy `scripts/package-pages.ts` and `server/src/pages-entry.ts` conventions from
`dogcatpro`, add `server/wrangler.pages.jsonc`, and ship
`C:\Users\PC\Desktop\builds\carshare-cloudflare-pages.zip` with `_worker.js` flat beside `index.html`.

## 14. Phase 2 — Normal (Turso-direct), later

Deferred by decision. Deltas from Pro:

- No `server/`; add `src/lib/data/direct.ts` using `@libsql/client` with `VITE_TURSO_DB_URL` + `VITE_TURSO_AUTH_TOKEN`.
- Auth reads/writes `users` directly; session in `localStorage["carshare_session"]`; PBKDF2 in the browser for consistency with the Pro hashes.
- Images stored as base64 data URLs in `cars.images` (≤2 MB), no `media` table usage.
- Pro upgrades are admin-managed in the existing SubscriptionManager; `UpgradeModal` shows "request upgrade" instead of PayPal.
- `setupDatabase()` runs idempotent `CREATE TABLE IF NOT EXISTS` on first connect, following the dogosite pattern.
- Packaging: Vercel Drop source zip via `zip-workflow.md`.

Parallelism: after the Pro API contract and schema are frozen (end of Phase 2 below), the Normal
adapter can be built in a git worktree by a parallel subagent against the same `DataClient`,
while the Pro frontend conversion continues. It must not touch shared UI files.

## 15. Build phases

1. **Foundation** — `server/` scaffold, schema, seed, db/env/auth, media route, apply script.
2. **API** — all routes above + PayPal + stats; freeze the contract.
3. **Frontend data layer** — interface, `api.ts`, TanStack Query hooks, `AuthContext` rewrite.
4. **Screen conversion** — replace Supabase in all listed components; delete Supabase artifacts.
5. **Verification** — smoke script, lint/build/tests, manual walkthrough, secret checks.
6. **Pro packaging** — Pages `_worker.js` packaging; zip to `builds`.
7. **Normal (later)** — `direct.ts` adapter, direct auth, base64 media, admin-managed plans, Vercel zip.

Main build is Pro through phase 6. Phase 7 is recorded now and scheduled separately; the
worktree split described in §14 is the intended way to run it without blocking Pro.

## 16. Decisions made by the builder (not the human partner)

- One repo with a build-time adapter seam instead of two apps.
- Pro uses `media` BLOBs + `/api/media/:id` rather than base64, matching `optimialbuild`.
- `messages` table is created but unused, preserving old schema parity.
- Registration is restricted to `owner|renter`; admin role is granted by an existing admin.
- Local dev uses `turso dev` rather than requiring a remote database.
- PayPal returns 503 when unconfigured instead of hiding the upgrade UI entirely.
- Transport is a bearer token in `localStorage` (house pattern), not httpOnly cookies.

## 17. Contract details resolved after review

These were gaps the first draft left open. They are builder calls, made to preserve current
behaviour unless noted.

1. **Public profile data.** Payloads embed a safe summary instead of adding a public profile
   endpoint: `owner: {id, full_name, avatar_url, kyc_status, rating_avg, review_count}` on car
   detail, and `renter: {id, full_name, avatar_url}` on owner/admin booking rows. Email and
   phone are never exposed publicly; admin booking rows include the renter's `renter_email` and
   `renter_phone` because the current admin screen shows them.
2. **Booking transitions.** Owner: `pending → approved|cancelled` and `approved → active|cancelled`.
   Renter: `pending|approved → cancelled`. Admin: any transition. `completed` is admin-only, which
   keeps the review gate meaningful. Any other transition is `409`.
3. **Server-authoritative money.** `POST /me/bookings` recomputes `total_days` from the dates and
   `total_price = daily_rate × total_days`; `platform_fee = total_price × PLATFORM_FEE_RATE`
   (constant, default `0` to match today); `owner_payout = total_price − platform_fee`. Client
   money fields are ignored. The route rejects non-live/inactive cars, self-booking, and
   date-range overlap with a non-cancelled booking on the same car.
4. **Admin cars.** Admins get create and delete endpoints because `AllListingsTable` and
   `/admin/add-car` use them today. Admin-created cars may set `status` directly and bypass the
   listing cap. Setting `status='live'` also sets `is_active=1`; `delisted` sets `is_active=0`,
   matching the current re-list behaviour.
5. **Role changes.** `PUT /admin/users/:id/roles` replaces the role set with an array (the UI
   toggles individual roles). The server rejects an empty set and refuses to remove the last
   remaining admin.
6. **Reviews.** `POST /me/reviews` accepts `{booking_id, rating, comment}`; it derives
   `reviewer_id` from the token and `reviewee_id` from the car owner. It requires the booking to
   belong to the caller, to be `completed`, and to be unreviewed by that caller
   (`UNIQUE(booking_id, reviewer_id)`), with rating 1–5.
7. **Landing sections.** The builder uses `GET /admin/landing-sections` so hidden sections stay
   visible in the editor. The public homepage stays hardcoded by decision (§18), so
   `GET /landing-sections` is retained but unused by the UI for now.

## 18. Product decisions from the human partner

- **First admin:** env bootstrap, no shipped default password. `ADMIN_EMAIL` + `ADMIN_PASSWORD`
  are read by `apply.ts` locally and by `ensureBootstrap(env)` in the Worker for packaged
  deploys. Existing accounts are promoted, never password-reset.
- **Homepage:** stays hardcoded. The Page Builder keeps saving to `landing_sections`, and the
  admin endpoint returns visible and hidden rows, but `Index.tsx` does not render them. This is
  recorded as a known gap rather than a silent half-feature.

## 19. Left to the builder

- Exact `turso dev` flags for CLI 0.6.0.
- Whether `@libsql/client` needs the web build or the Workers build inside Wrangler (verify at scaffold time).
- CORS origin allowlist for the Worker (localhost + deployed Pages domain).
- Precise zod-style validation shape for request bodies (can use hand-rolled guards as in `optimialbuild`).
- Whether to keep `src/integrations/supabase/types.ts` as a type reference or delete it outright (delete; `src/types/database.ts` remains the source of truth).
