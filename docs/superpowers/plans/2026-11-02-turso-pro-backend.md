# CarShare Connect — Turso Pro Backend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Supabase with a Hono-on-Cloudflare-Workers API backed by Turso (libSQL), and move every frontend read/write onto TanStack Query through one typed data interface.

**Architecture:** React SPA → `/api/*` Hono Worker → Turso. The Worker owns the database token, JWT sessions, PBKDF2 password hashes, media BLOBs, and the PayPal subscription flows. The SPA talks only to `src/lib/data/api.ts`; all hooks are adapter-agnostic so the Phase 2 direct-Turso build can swap in another adapter.

**Tech Stack:** React 18, Vite 5, TypeScript, TanStack Query v5, Tailwind 3, shadcn/ui, Hono 4, `@libsql/client`, `jose`, Vitest, Cloudflare Workers/Wrangler, Bun.

**Spec:** `docs/superpowers/specs/2026-11-02-turso-pro-backend-design.md`

## Global Constraints

- Package manager is **Bun** (`bun install`, `bun run ...`).
- No `@supabase/supabase-js`, no `src/integrations/supabase/*`, no `supabase/` directory, no `VITE_SUPABASE_*` after Task 16.
- Worker code must not use Node-only APIs. Password hashing is Web Crypto PBKDF2-SHA256, 100,000 iterations.
- SQLite conventions: TEXT UUID PKs, ISO-8601 TEXT timestamps, booleans `0/1`, JSON as TEXT, money as REAL.
- JWTs are HS256, 30-day expiry, `sub` = user id, `localStorage` key is `carshare_token`.
- `PLATFORM_FEE_RATE = 0` (constant in `server/src/lib/booking.ts`) to preserve current totals.
- Roles are `admin | owner | renter`; registration may only create `owner` or `renter`.
- Public responses never include email or phone. Admin booking responses do.
- PayPal routes return `503 {error:"Payments not configured"}` when PayPal env vars are absent.
- The public homepage stays hardcoded; `landing_sections` drives only the admin Page Builder.
- Every task ends with a commit. Do not carry uncommitted work into the next task.

## Review Focus

These are the failure modes most likely to reach a real user. Each has a test in the task that owns the code.

1. **Broken or expired session** — a stale token should land the user on the login screen, never leave `loading` stuck true or show an empty dashboard. (Task 12)
2. **IDOR on ownership** — a signed-in renter guessing a car or booking id must get `403/404`, never another user's data. (Tasks 4, 5, 6)
3. **Client-authored money** — a tampered `total_price` in the request must be ignored and recomputed. (Task 5)
4. **Upload abuse** — a non-image or >5 MB file must be rejected before it reaches the database. (Task 4)
5. **Fresh-database bootstrap** — a deployed Worker with no schema and no `ADMIN_EMAIL` must still serve the public site and fail admin access cleanly. (Tasks 1, 2)

---

## File Structure

```
server/
  package.json  tsconfig.json  wrangler.jsonc  wrangler.pages.jsonc  vitest.config.ts
  .dev.vars.example
  src/
    index.ts            app assembly, middleware order
    env.ts              Env type
    db.ts               per-request libsql client
    schema.ts           SCHEMA_SQL (single source for DDL)
    password.ts         hashPassword / verifyPassword
    bootstrap.ts        applySchema + ensureAdmin
    auth.ts             signToken / verifyToken / requireAuth / requireAdmin / optionalAuth
    lib/booking.ts      money + overlap rules
    lib/paypal.ts       PayPal REST helpers
    routes/
      auth.ts  catalog.ts  media.ts  me.ts  admin.ts  payments.ts
      me/profile.ts  me/cars.ts  me/bookings.ts  me/reviews.ts
      admin/users.ts  admin/stats.ts  admin/cars.ts  admin/bookings.ts
      admin/subscriptions.ts  admin/landing.ts
  scripts/apply.ts  scripts/seed.ts
  tests/helpers.ts  tests/*.test.ts

src/
  lib/api.ts            apiFetch + token storage
  lib/data/types.ts     domain types + DataClient
  lib/data/api.ts       HTTP adapter
  lib/data/index.ts     active adapter export
  lib/queryKeys.ts
  hooks/queries/*.ts
  contexts/AuthContext.tsx
  components/... pages/... (converted)

scripts/smoke.ts        end-to-end API smoke test
docs/superpowers/...    spec + this plan
```

---

### Task 1: Server foundation, schema, and bootstrap

**Files:**
- Create: `server/package.json`, `server/tsconfig.json`, `server/wrangler.jsonc`, `server/vitest.config.ts`, `server/.dev.vars.example`
- Create: `server/src/env.ts`, `server/src/db.ts`, `server/src/schema.ts`, `server/src/password.ts`, `server/src/bootstrap.ts`, `server/src/index.ts`
- Create: `server/scripts/apply.ts`, `server/scripts/seed.ts`
- Create: `server/tests/helpers.ts`, `server/tests/health.test.ts`, `server/tests/bootstrap.test.ts`
- Modify: `.gitignore` (add `server/.dev.vars`, `server/.wrangler`, `server/.test`, `.turso`)

**Interfaces:**
- Produces:
  - `type Env = { TURSO_DATABASE_URL: string; TURSO_AUTH_TOKEN?: string; AUTH_SECRET: string; ADMIN_EMAIL?: string; ADMIN_PASSWORD?: string; PAYPAL_CLIENT_ID?: string; PAYPAL_CLIENT_SECRET?: string; PAYPAL_BASE?: string; PAYPAL_PLAN_ID?: string; PAYPAL_WEBHOOK_ID?: string; APP_ORIGIN?: string }`
  - `db(env: Env): Client`
  - `SCHEMA_SQL: string`
  - `hashPassword(password: string, existingSaltB64?: string): Promise<string>`
  - `verifyPassword(password: string, stored: string): Promise<boolean>`
  - `applySchema(d: Client): Promise<void>`
  - `ensureBootstrap(env: Env): Promise<void>`
  - `app` (default export from `server/src/index.ts`)
  - test helpers: `makeTestEnv(): Promise<Env>`, `resetSchema(env: Env): Promise<void>`, `call(app, env, path, init?)`

- [ ] **Step 1: Scaffold `server/package.json`**

Dependencies: `@libsql/client ^0.14.0`, `hono ^4.6.0`, `jose ^5.9.0`.
Dev: `@cloudflare/workers-types`, `typescript ^5.8.3`, `vitest ^3.2.4`, `wrangler ^4.25.0`.
Scripts: `dev: "wrangler dev --port 8787"`, `deploy: "wrangler deploy"`, `test: "vitest run"`, `apply: "bun run scripts/apply.ts"`, `seed: "bun run scripts/seed.ts"`.

- [ ] **Step 2: Write the failing tests**

`server/tests/health.test.ts`
```ts
import { describe, it, expect } from "vitest";
import app from "../src/index";
import { makeTestEnv, call } from "./helpers";

describe("health", () => {
  it("returns ok without authentication", async () => {
    const env = await makeTestEnv();
    const res = await call(app, env, "/api/health");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });
});
```

`server/tests/bootstrap.test.ts`
```ts
import { describe, it, expect } from "vitest";
import { makeTestEnv, resetSchema, call } from "./helpers";
import { ensureBootstrap, applySchema } from "../src/bootstrap";
import { db } from "../src/db";
import { verifyPassword } from "../src/password";

describe("bootstrap", () => {
  it("creates every table", async () => {
    const env = await makeTestEnv();
    await resetSchema(env);
    const { rows } = await db(env).execute(
      "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
    );
    const names = rows.map((r) => String(r.name));
    for (const t of ["users","profiles","user_roles","cars","bookings","reviews",
                     "subscriptions","landing_sections","media","messages"]) {
      expect(names).toContain(t);
    }
  });

  it("creates the env admin once and never rewrites its password", async () => {
    const env = { ...(await makeTestEnv()), ADMIN_EMAIL: "boss@example.com", ADMIN_PASSWORD: "secret123" };
    await ensureBootstrap(env);
    await ensureBootstrap(env);
    const { rows } = await db(env).execute("SELECT id, email, password_hash FROM users");
    expect(rows).toHaveLength(1);
    expect(await verifyPassword("secret123", String(rows[0].password_hash))).toBe(true);
    const roles = await db(env).execute("SELECT role FROM user_roles WHERE user_id = ?", [rows[0].id]);
    expect(roles.rows.map((r) => r.role)).toContain("admin");
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `bun --cwd server test`
Expected: FAIL — cannot resolve `../src/index`.

- [ ] **Step 4: Implement the schema**

`server/src/schema.ts` exports `SCHEMA_SQL` containing `CREATE TABLE IF NOT EXISTS` for `users`, `profiles`, `user_roles`, `cars`, `bookings`, `reviews`, `subscriptions`, `landing_sections`, `media`, `messages`, plus the indexes from spec §8, and `PRAGMA foreign_keys = ON;`. Use CHECK constraints for the role, car category/status, booking status, plan/status, and kyc status enums; `reviews.rating` CHECK 1–5; `UNIQUE(user_id, role)`; `UNIQUE(booking_id, reviewer_id)` on reviews.

- [ ] **Step 5: Implement `db.ts`, `password.ts`, `bootstrap.ts`**

- `db.ts`: `createClient({ url: env.TURSO_DATABASE_URL, authToken: env.TURSO_AUTH_TOKEN || undefined })`.
- `password.ts`: PBKDF2-SHA256, 100k iterations, format `pbkdf2$100000$<saltB64>$<hashB64>`; `verifyPassword` reuses the stored salt and compares with a constant-time loop.
- `bootstrap.ts`:
  - `applySchema(d)` → `d.executeMultiple(SCHEMA_SQL)`.
  - `ensureBootstrap(env)` → module-level `let done = false`; on first call, if `SELECT name FROM sqlite_master WHERE type='table' AND name='users'` is empty, call `applySchema`. Then if `ADMIN_EMAIL` and `ADMIN_PASSWORD` are set, `ensureAdmin`: insert the user + profile + admin role + free subscription when absent; if the user exists, insert the admin role only (`ON CONFLICT DO NOTHING`) and never touch `password_hash`.

- [ ] **Step 6: Implement `index.ts` and the apply/seed scripts**

`index.ts` creates `new Hono<AppEnv>().basePath("/api")`, applies `cors()` with `origin: env.APP_ORIGIN ?? "*"`, adds `GET /health`, and calls `ensureBootstrap(c.env)` from an `app.use("*", ...)` middleware (fire once per isolate; failures are logged and the request continues so public reads still work).
`scripts/apply.ts` loads `.dev.vars` via `Bun.env`, calls `applySchema`, logs table count.
`scripts/seed.ts` inserts 8 demo cars, 3 landing sections with the current copy, and (if absent) demo owner/renter accounts with PBKDF2 hashes.

- [ ] **Step 7: Add test helpers**

`tests/helpers.ts`: `makeTestEnv()` creates `TURSO_DATABASE_URL=file:./.test/<uuid>.db`, `AUTH_SECRET="test-secret"`; `resetSchema` deletes the file then applies; `call(app, env, path, init)` → `app.request(path, init, env)`.

- [ ] **Step 8: Run tests to verify they pass**

Run: `bun --cwd server test`
Expected: PASS (2 files, 3 tests).

- [ ] **Step 9: Commit**

```bash
git add server .gitignore
git commit -m "feat(server): scaffold Hono API, Turso schema, and bootstrap"
```

---

### Task 2: Auth routes and middleware

**Files:**
- Create: `server/src/auth.ts`, `server/src/routes/auth.ts`
- Create: `server/tests/auth.test.ts`
- Modify: `server/src/index.ts`

**Interfaces:**
- Consumes: Task 1 (`db`, `hashPassword`, `verifyPassword`, `Env`, `app`).
- Produces:
  - `appType AppEnv = { Bindings: Env; Variables: { userId: string } }`
  - `signToken(env: Env, user: { id: string; email: string }): Promise<string>`
  - `requireAuth`, `requireAdmin`, `optionalAuth` (`MiddlewareHandler<AppEnv>`)
  - `authRoutes(app: Hono<AppEnv>): void`

- [ ] **Step 1: Write the failing tests**

`server/tests/auth.test.ts` — cases:
1. `POST /api/auth/register` with `{email:"o@example.com",password:"password123",fullName:"Owner",role:"owner"}` → 201, body has `token` and `user.id`; `users`, `profiles`, `user_roles`, `subscriptions` each have one row.
2. duplicate email → 409.
3. password `"short"` → 400.
4. `role:"admin"` on register → 400.
5. `POST /api/auth/login` correct → 200 with token; wrong password → 401.
6. `GET /api/auth/me` with `Authorization: Bearer <token>` → 200 `{user, profile, roles:["owner"]}`; without header → 401.

- [ ] **Step 2: Run tests to verify they fail**

Run: `bun --cwd server test auth`
Expected: FAIL — 404 on `/api/auth/register`.

- [ ] **Step 3: Implement `auth.ts`**

`signToken` uses `jose` `SignJWT` HS256, `sub`, 30 days. `verifyToken` uses `jwtVerify`. `requireAuth` reads `Authorization: Bearer`, sets `c.set("userId", String(payload.sub))`, else 401. `requireAdmin` runs after `requireAuth` and checks `user_roles` for `admin`, else 403. `optionalAuth` sets `userId` when a valid token is present and never rejects.

- [ ] **Step 4: Implement `routes/auth.ts`**

Register validates email regex, password ≥ 8, role in `owner|renter`; inserts user/profile/role/subscription in one `batch`; returns 201. Login compares PBKDF2 and returns `{token, user}`. `GET /me` returns the current user, profile, and roles array.

- [ ] **Step 5: Mount auth routes in `index.ts`**

Call `authRoutes(app)` after `/health`.

- [ ] **Step 6: Run tests to verify they pass**

Run: `bun --cwd server test auth`
Expected: PASS (6 tests).

- [ ] **Step 7: Commit**

```bash
git add server/src/auth.ts server/src/routes/auth.ts server/src/index.ts server/tests/auth.test.ts
git commit -m "feat(server): add JWT auth with PBKDF2 and three roles"
```

---

### Task 3: Public catalog, car detail, and media serving

**Files:**
- Create: `server/src/routes/catalog.ts`, `server/src/routes/media.ts`
- Create: `server/tests/catalog.test.ts`, `server/tests/media.test.ts`
- Modify: `server/src/index.ts`

**Interfaces:**
- Consumes: Task 1, Task 2 (`optionalAuth`).
- Produces:
  - `GET /api/cars?category=&minPrice=&maxPrice=&q=` → `CarWithOwner[]`
  - `GET /api/cars/:id` → `CarWithOwner` (404 unless live+active or requester is owner/admin)
  - `GET /api/cars/:id/reviews` → `Review[]`
  - `GET /api/reviews?reviewee_id=` → `Review[]`
  - `GET /api/landing-sections` → visible sections only
  - `GET /api/media/:id` → binary with stored mime
  - `catalogRoutes(app)`, `mediaRoutes(app)`

- [ ] **Step 1: Write the failing tests**

`catalog.test.ts`:
1. Seed three cars directly: live+active, live+inactive, pending. `GET /api/cars` returns only the first.
2. `GET /api/cars/:pendingId` anonymous → 404; with the owner's token → 200.
3. Car detail includes `owner.full_name`, `owner.rating_avg`, and **does not** include `owner.email` or any phone field.
4. `GET /api/landing-sections` returns only `is_visible=1` rows, ordered by `sort_order`.

`media.test.ts`:
1. Insert a row into `media` with `mime:"image/png"` and a 4-byte body; `GET /api/media/:id` returns 200, the bytes, `Content-Type: image/png`, and `Cache-Control: public, max-age=31536000, immutable`.
2. Unknown id → 404.

- [ ] **Step 2: Run tests to verify they fail**

Run: `bun --cwd server test catalog media`
Expected: FAIL — 404.

- [ ] **Step 3: Implement `catalog.ts`**

List query filters `status='live' AND is_active=1`; joins the owner profile and computes `rating_avg` / `review_count` with a correlated subquery on `reviews.reviewee_id`. Detail applies `optionalAuth` and allows the owner or an admin to see non-live rows. Parse `images` and `features` JSON before returning. `landing-sections` filters `is_visible=1` and orders by `sort_order`.

- [ ] **Step 4: Implement `media.ts`**

`SELECT mime, data FROM media WHERE id = ?`; return `new Response(blob, { headers })`; 404 when absent. No auth.

- [ ] **Step 5: Mount both routes**

`app.route("/", catalog); app.route("/media", media);`

- [ ] **Step 6: Run tests to verify they pass**

Run: `bun --cwd server test catalog media`
Expected: PASS (6 tests).

- [ ] **Step 7: Commit**

```bash
git add server/src/routes/catalog.ts server/src/routes/media.ts server/src/index.ts server/tests/catalog.test.ts server/tests/media.test.ts
git commit -m "feat(server): add public catalog, car detail, and media serving"
```

---

### Task 4: My profile, cars, uploads, and subscription limits

**Files:**
- Create: `server/src/routes/me.ts`, `server/src/routes/me/profile.ts`, `server/src/routes/me/cars.ts`
- Create: `server/tests/me-cars.test.ts`
- Modify: `server/src/index.ts`

**Interfaces:**
- Consumes: Tasks 1–3.
- Produces:
  - `meRoutes(app)` mounted with `requireAuth` on `/me/*`
  - `GET/PUT /api/me/profile`
  - `GET/POST /api/me/cars`, `PUT/DELETE /api/me/cars/:id`
  - `POST /api/me/upload` → `{ url: "/api/media/<id>" }`
  - `GET /api/me/subscription` → `{ plan, status, listingCount, listingLimit }`

- [ ] **Step 1: Write the failing tests**

`me-cars.test.ts`:
1. Owner creates a car → 201, `status:"pending_approval"`, `is_active:1`, `images:[]`.
2. Free owner creates 3 cars, the 4th → 403 `{error:"Listing limit reached"}`.
3. After `UPDATE subscriptions SET plan='pro', status='active'`, the 4th succeeds.
4. Owner A cannot `PUT` or `DELETE` owner B's car → 403/404 (choose 404 for both).
5. `GET /api/me/subscription` returns `listingCount:3`, `listingLimit:3` for free; `15` for pro.
6. `POST /api/me/upload` with a 2 MB `image/png` returns `{url:"/api/media/..."}` and the media row exists; with `text/plain` → 415; with 6 MB → 413.
7. `PUT /api/me/profile` updates `full_name` and rejects an empty body with 400.

- [ ] **Step 2: Run tests to verify they fail**

Run: `bun --cwd server test me-cars`
Expected: FAIL — 404.

- [ ] **Step 3: Implement `me.ts` mounting**

Create a sub-Hono, `use("*", requireAuth)`, mount profile, cars, bookings (Task 5), reviews (Task 6) routers.

- [ ] **Step 4: Implement `me/cars.ts`**

`POST` ignores `status`, `is_active`, `owner_id`, and any money-shaped fields; generates `id` with `crypto.randomUUID()`; stores `features`/`images` with `JSON.stringify`. Enforce the limit by counting `cars WHERE owner_id`; limit is 15 only when `plan='pro' AND status='active'`, else 3. `PUT` and `DELETE` first check ownership and return 404 when not the owner. Upload parses multipart, enforces 5 MB and an image mime allowlist (`image/png|jpeg|webp|gif`), inserts into `media`, returns the URL.

- [ ] **Step 5: Implement `me/profile.ts`**

Update `full_name` / `avatar_url` only when present; always bump `updated_at`; return the row.

- [ ] **Step 6: Run tests to verify they pass**

Run: `bun --cwd server test me-cars`
Expected: PASS (7 tests).

- [ ] **Step 7: Commit**

```bash
git add server/src/routes/me.ts server/src/routes/me server/src/index.ts server/tests/me-cars.test.ts
git commit -m "feat(server): add profile, car CRUD, uploads, and listing limits"
```

---

### Task 5: Bookings with server-authoritative money

**Files:**
- Create: `server/src/lib/booking.ts`, `server/src/routes/me/bookings.ts`
- Create: `server/tests/bookings.test.ts`

**Interfaces:**
- Consumes: Tasks 1–4.
- Produces:
  - `computeBooking(input: { dailyRate: number; startDate: string; endDate: string }): { totalDays: number; totalPrice: number; platformFee: number; ownerPayout: number }`
  - `rangesOverlap(aStart, aEnd, bStart, bEnd): boolean`
  - `GET /api/me/bookings` → `{ asRenter: RenterBooking[]; asOwner: OwnerBooking[] }`
  - `POST /api/me/bookings` `{ carId, startDate, endDate, renterPhone?, renterEmail?, renterNotes? }`
  - `PATCH /api/me/bookings/:id/status` `{ status }`

- [ ] **Step 1: Write the failing tests**

1. `computeBooking` for 3 days at 100 returns `totalDays:3`, `totalPrice:300`, `platformFee:0`, `ownerPayout:300`.
2. Create booking with a tampered `total_price: 1` in the body → stored `total_price` is `300`.
3. Booking a non-live car → 409; booking your own car → 400; overlapping dates on the same car → 409; `endDate <= startDate` → 400.
4. Renter's `asRenter` includes the booking with `car.make`; owner's `asOwner` includes it with `renter.full_name`.
5. Owner `pending → approved` → 200; renter cannot `pending → approved` → 403; owner cannot set `completed` → 403; admin can set `completed` → 200; renter `pending → cancelled` → 200.

- [ ] **Step 2: Run tests to verify they fail**

Run: `bun --cwd server test bookings`
Expected: FAIL — 404.

- [ ] **Step 3: Implement `lib/booking.ts`**

`totalDays` = inclusive whole days between the dates (`Math.ceil((end-start)/86400000)` with a minimum of 1). Ignore every money field from the client. Overlap check queries `bookings` for the car where `status != 'cancelled'` and the ranges intersect.

- [ ] **Step 4: Implement `me/bookings.ts`**

`POST` verifies the car is `live` and `is_active=1`, not owned by the caller, and not overlapping; computes money; inserts with `status='pending'`. `GET` returns both projections in one response. `PATCH` applies the transition matrix from spec §17.2 and returns 403 for a disallowed transition, 409 if the target status is invalid.

- [ ] **Step 5: Run tests to verify they pass**

Run: `bun --cwd server test bookings`
Expected: PASS (5 tests).

- [ ] **Step 6: Commit**

```bash
git add server/src/lib/booking.ts server/src/routes/me/bookings.ts server/tests/bookings.test.ts
git commit -m "feat(server): add bookings with server-side pricing and transition rules"
```

---

### Task 6: Reviews

**Files:**
- Create: `server/src/routes/me/reviews.ts`
- Create: `server/tests/reviews.test.ts`

**Interfaces:**
- Consumes: Tasks 1–5.
- Produces:
  - `GET /api/me/reviews` → reviews written by the caller
  - `POST /api/me/reviews` `{ bookingId, rating, comment? }` → created review

- [ ] **Step 1: Write the failing tests**

1. Renter reviews their own completed booking → 201; `reviewee_id` equals the car owner; `reviewer_id` equals the caller.
2. Reviewing a `pending` booking → 409.
3. Reviewing someone else's booking → 404.
4. Second review for the same booking → 409.
5. `rating: 6` → 400.

- [ ] **Step 2: Run tests to verify they fail**

Run: `bun --cwd server test reviews`
Expected: FAIL — 404.

- [ ] **Step 3: Implement `me/reviews.ts`**

Load the booking with its car; require `booking.renter_id === userId`, `booking.status === 'completed'`; derive `reviewee_id` from `cars.owner_id`; insert; map the `UNIQUE(booking_id, reviewer_id)` violation to 409.

- [ ] **Step 4: Run tests to verify they pass**

Run: `bun --cwd server test reviews`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add server/src/routes/me/reviews.ts server/tests/reviews.test.ts
git commit -m "feat(server): add gated, derived-reviewee reviews"
```

---

### Task 7: Admin users, roles, KYC, and stats

**Files:**
- Create: `server/src/routes/admin.ts`, `server/src/routes/admin/users.ts`, `server/src/routes/admin/stats.ts`
- Create: `server/tests/admin-users.test.ts`
- Modify: `server/src/index.ts`

**Interfaces:**
- Consumes: Tasks 1–6.
- Produces:
  - `adminRoutes(app)` with `requireAuth` + `requireAdmin` on `/admin/*`
  - `GET /api/admin/users` → `{ id, email, full_name, avatar_url, kyc_status, roles: AppRole[], plan, status }[]`
  - `PUT /api/admin/users/:id/roles` `{ roles: AppRole[] }`
  - `PATCH /api/admin/users/:id/kyc` `{ status: "pending"|"verified"|"rejected" }`
  - `GET /api/admin/stats` → `{ userSignups, bookingsTrend, userRoles, engagementMetrics }` matching `ActivityAnalytics.tsx`

- [ ] **Step 1: Write the failing tests**

1. Non-admin `GET /api/admin/users` → 403.
2. Admin gets one row per user with roles array and plan.
3. `PUT roles {roles:["owner","renter"]}` replaces the set (adds renter, removes nothing else); `{roles:[]}` → 400.
4. Demoting the last admin → 409.
5. KYC patch persists `verified`.
6. Stats returns the four keys and correct `totalUsers` / `totalBookings` after seeding.

- [ ] **Step 2: Run tests to verify they fail**

Run: `bun --cwd server test admin-users`
Expected: FAIL — 403 or 404.

- [ ] **Step 3: Implement `admin/users.ts` and `admin/stats.ts`**

`/users` joins `users`, `profiles`, `user_roles`, `subscriptions`. Role replacement runs in a batch: delete all roles for the user, insert the new set; before deleting, count remaining admins and refuse if the target is the last one. Stats uses grouped `substr(created_at,1,10)` queries for the two series, a role count, and totals; `activeUsers` counts distinct `renter_id` in the last 30 days.

- [ ] **Step 4: Run tests to verify they pass**

Run: `bun --cwd server test admin-users`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add server/src/routes/admin.ts server/src/routes/admin server/src/index.ts server/tests/admin-users.test.ts
git commit -m "feat(server): add admin users, roles, KYC, and analytics"
```

---

### Task 8: Admin cars, bookings, and subscriptions

**Files:**
- Create: `server/src/routes/admin/cars.ts`, `server/src/routes/admin/bookings.ts`, `server/src/routes/admin/subscriptions.ts`
- Create: `server/tests/admin-content.test.ts`
- Modify: `server/src/routes/admin.ts`

**Interfaces:**
- Produces:
  - `GET /api/admin/cars`, `POST /api/admin/cars`, `PATCH /api/admin/cars/:id/status` `{status}`, `DELETE /api/admin/cars/:id`
  - `GET /api/admin/bookings`, `PATCH /api/admin/bookings/:id/status` `{status}`, `DELETE /api/admin/bookings/:id`
  - `GET /api/admin/subscriptions`, `PATCH /api/admin/subscriptions/:id` `{plan, status}`

- [ ] **Step 1: Write the failing tests**

1. Admin creates a car with `status:"live"` on a fresh DB while already owning 3 cars → 201 (cap bypassed) and `is_active:1`.
2. `PATCH status:"delisted"` sets `is_active:0`; back to `live` sets `is_active:1`.
3. `DELETE /api/admin/cars/:id` removes it; a referenced booking is cascade-deleted.
4. Admin bookings include `renter.email`/`renter_phone` and `car` summary; status can move to any value; invalid value → 400.
5. `PATCH /api/admin/subscriptions/:id {plan:"pro",status:"active"}` sets period end ~30 days out; `{plan:"free"}` clears it.

- [ ] **Step 2: Run tests to verify they fail**

Run: `bun --cwd server test admin-content`
Expected: FAIL — 404.

- [ ] **Step 3: Implement the three routers**

Reuse `computeBooking` only where needed; admin car create accepts `status` and skips the cap. Booking status is unrestricted but validated against the enum. Subscription update sets `current_period_start=now` and `current_period_end=now+30d` for pro, `NULL` for free, and `updated_at`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `bun --cwd server test admin-content`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add server/src/routes/admin server/tests/admin-content.test.ts
git commit -m "feat(server): add admin car, booking, and subscription management"
```

---

### Task 9: Admin landing sections

**Files:**
- Create: `server/src/routes/admin/landing.ts`
- Create: `server/tests/admin-landing.test.ts`
- Modify: `server/src/routes/admin.ts`

**Interfaces:**
- Produces:
  - `GET /api/admin/landing-sections` (includes hidden, ordered by `sort_order`)
  - `POST /api/admin/landing-sections`
  - `PUT /api/admin/landing-sections/:id`
  - `DELETE /api/admin/landing-sections/:id`

- [ ] **Step 1: Write the failing tests**

1. List includes a row with `is_visible=0` (the public endpoint hides it).
2. Create with `{section_type:"banner", title:"X", content:{...}}` → 201, content round-trips as an object.
3. Reorder two rows via two PUTs → list order changes.
4. Delete → 204 and row gone.
5. Non-admin → 403.

- [ ] **Step 2: Run tests to verify they fail**

Run: `bun --cwd server test admin-landing`
Expected: FAIL — 404.

- [ ] **Step 3: Implement `admin/landing.ts`**

Serialize `content` with `JSON.stringify`, parse on read, default `sort_order` to `MAX(sort_order)+1`, and bump `updated_at` on update.

- [ ] **Step 4: Run tests to verify they pass**

Run: `bun --cwd server test admin-landing`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add server/src/routes/admin/landing.ts server/src/routes/admin.ts server/tests/admin-landing.test.ts
git commit -m "feat(server): add admin landing-section CRUD"
```

---

### Task 10: PayPal subscriptions and webhook

**Files:**
- Create: `server/src/lib/paypal.ts`, `server/src/routes/payments.ts`
- Create: `server/tests/payments.test.ts`
- Modify: `server/src/index.ts`, `server/src/env.ts`

**Interfaces:**
- Consumes: Tasks 1–2.
- Produces:
  - `paypalConfigured(env): boolean`
  - `paypalToken(env): Promise<string>`
  - `POST /api/payments/paypal/create-subscription` `{return_url, cancel_url}` → `{approval_url, subscription_id}`
  - `POST /api/payments/paypal/activate` `{subscription_id}` → `{plan:"pro", status:"active"}`
  - `POST /api/payments/paypal/webhook` (no auth)

- [ ] **Step 1: Write the failing tests**

1. Without PayPal env vars, create/activate → 503 `{error:"Payments not configured"}`.
2. With env vars and a stubbed `fetch` returning an ACTIVE subscription, create returns `approval_url` from the `links` array.
3. Activate with a stubbed `status:"SUSPENDED"` → 400; with `ACTIVE` → 200 and the DB row becomes `pro/active` with the subscription id and a period end.
4. Webhook with a stubbed `verification_status:"FAILURE"` → 400 and no DB change; with `"SUCCESS"` and `BILLING.SUBSCRIPTION.CANCELLED` → row becomes `cancelled`.
5. `activate` requires auth (401 without a token).

- [ ] **Step 2: Run tests to verify they fail**

Run: `bun --cwd server test payments`
Expected: FAIL — 404/503 shape mismatch.

- [ ] **Step 3: Implement `lib/paypal.ts`**

Bearer token via `POST /v1/oauth2/token` with Basic auth. Helpers: `createSubscription`, `getSubscription`, `verifyWebhook`, all using `env.PAYPAL_BASE` (default `https://api-m.sandbox.paypal.com`). Return parsed JSON and throw typed errors for non-2xx.

- [ ] **Step 4: Implement `routes/payments.ts`**

Mount with `requireAuth` for create/activate; webhook stays public and verifies the signature before parsing the event. Activation updates `subscriptions` by `user_id` from the JWT. Webhook resolves the user by `paypal_subscription_id` (fallback `custom_id`) and applies cancelled/suspended/expired/activated.

- [ ] **Step 5: Run tests to verify they pass**

Run: `bun --cwd server test payments`
Expected: PASS (5 tests).

- [ ] **Step 6: Commit**

```bash
git add server/src/lib/paypal.ts server/src/routes/payments.ts server/src/env.ts server/src/index.ts server/tests/payments.test.ts
git commit -m "feat(server): port PayPal subscriptions and webhook to the worker"
```

---

### Task 11: Frontend API client, types, and adapter

**Files:**
- Create: `src/lib/api.ts`, `src/lib/data/types.ts`, `src/lib/data/api.ts`, `src/lib/data/index.ts`, `src/lib/queryKeys.ts`
- Create: `src/lib/__tests__/api.test.ts`
- Modify: `src/types/database.ts` (add missing fields), `src/App.tsx` (QueryClient defaults)

**Interfaces:**
- Consumes: the API contract from Tasks 2–10.
- Produces:
  - `getToken(): string | null`, `setToken(t: string | null): void`
  - `apiFetch<T>(path: string, init?: { method?: string; body?: unknown; formData?: FormData }): Promise<T>`
  - `class ApiError extends Error { status: number }`
  - `data: DataClient` (from `@/lib/data`)
  - `queryKeys` constants

- [ ] **Step 1: Write the failing tests**

`api.test.ts`:
1. `apiFetch` prefixes `/api` and attaches `Authorization` when a token is stored.
2. A 401 response clears the token and throws `ApiError` with `status:401`.
3. A non-JSON error body still yields `ApiError` with the status text.
4. `formData` requests do not set `Content-Type` manually.

- [ ] **Step 2: Run tests to verify they fail**

Run: `bun run test src/lib/__tests__/api.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Define `types.ts` and `DataClient`**

Export `AuthUser`, `Session`, `Profile`, `Car`, `CarWithOwner`, `CarFilters`, `CarInput`, `Booking`, `RenterBooking`, `OwnerBooking`, `BookingInput`, `BookingStatus`, `Review`, `SubscriptionInfo`, `LandingSection`, `AdminStats`, `AdminUser`, `AdminSubscription`, and:

```ts
export interface DataClient {
  auth: { register(i: RegisterInput): Promise<Session>; login(i: LoginInput): Promise<Session>;
          me(): Promise<{ user: AuthUser; profile: Profile; roles: AppRole[] }>; logout(): void; getToken(): string | null };
  profile: { update(i: { fullName?: string; avatarUrl?: string }): Promise<Profile> };
  cars: { list(f?: CarFilters): Promise<CarWithOwner[]>; get(id: string): Promise<CarWithOwner>;
          mine(): Promise<Car[]>; create(i: CarInput): Promise<Car>; update(id: string, i: Partial<CarInput>): Promise<Car>; remove(id: string): Promise<void> };
  bookings: { mine(): Promise<{ asRenter: RenterBooking[]; asOwner: OwnerBooking[] }>;
              create(i: BookingInput): Promise<Booking>; setStatus(id: string, status: BookingStatus): Promise<Booking> };
  reviews: { forUser(id: string): Promise<Review[]>; mine(): Promise<Review[]>; create(i: { bookingId: string; rating: number; comment?: string }): Promise<Review> };
  subscriptions: { info(): Promise<SubscriptionInfo>; createCheckout(returnUrl: string, cancelUrl: string): Promise<{ approvalUrl: string }>; activate(subscriptionId: string): Promise<void> };
  landing: { list(): Promise<LandingSection[]>; create(i: LandingSectionInput): Promise<LandingSection>; update(id: string, i: Partial<LandingSectionInput>): Promise<LandingSection>; remove(id: string): Promise<void> };
  admin: { stats(): Promise<AdminStats>; users(): Promise<AdminUser[]>; setRoles(id: string, roles: AppRole[]): Promise<void>; setKyc(id: string, status: KycStatus): Promise<void>;
           cars(): Promise<CarWithOwner[]>; createCar(i: CarInput & { status?: CarStatus }): Promise<Car>; setCarStatus(id: string, status: CarStatus): Promise<Car>; removeCar(id: string): Promise<void>;
           bookings(): Promise<OwnerBooking[]>; setBookingStatus(id: string, status: BookingStatus): Promise<Booking>; removeBooking(id: string): Promise<void>;
           subscriptions(): Promise<AdminSubscription[]>; setSubscription(id: string, i: { plan: "free"|"pro"; status: string }): Promise<void> };
  media: { upload(file: File): Promise<{ url: string }> };
}
```

- [ ] **Step 4: Implement `api.ts`**

`apiFetch` prefixes `/api`, JSON-encodes bodies, attaches the bearer token, throws `ApiError`, and clears the token on 401. `setToken` writes `localStorage["carshare_token"]`.

- [ ] **Step 5: Implement `data/api.ts` and `data/index.ts`**

Map every method to its route, camelCase in the adapter, snake_case on the wire. `data/index.ts` exports `apiAdapter as data`. (Phase 2 adds the direct adapter here.)

- [ ] **Step 6: Set QueryClient defaults in `App.tsx`**

`staleTime: 30_000`, `retry: 1`, `refetchOnWindowFocus: false`.

- [ ] **Step 7: Run tests to verify they pass**

Run: `bun run test src/lib/__tests__/api.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 8: Commit**

```bash
git add src/lib src/types/database.ts src/App.tsx
git commit -m "feat(data): add typed API client and data adapter"
```

---

### Task 12: AuthContext, Auth page, and session handling

**Files:**
- Modify: `src/contexts/AuthContext.tsx`, `src/pages/Auth.tsx`, `src/components/ProtectedRoute.tsx`, `src/components/Navbar.tsx`, `src/App.tsx`
- Create: `src/contexts/__tests__/AuthContext.test.tsx`

**Interfaces:**
- Consumes: `data` from Task 11.
- Produces: same context shape as before plus `signIn(email,password)`, `signUp(input)`, `refresh()`.

- [ ] **Step 1: Write the failing tests**

`AuthContext.test.tsx` (mock `@/lib/data`):
1. On mount with a token, `me()` resolves and `user`/`profile`/`roles` populate; `loading` becomes false.
2. On mount with `me()` rejecting 401, `getToken` is cleared and `loading` becomes false.
3. `signIn` stores the token via `setToken` and sets the user.
4. `signOut` clears the token and resets state.
5. `hasRole("admin")` is true only when roles include admin.

- [ ] **Step 2: Run tests to verify they fail**

Run: `bun run test src/contexts/__tests__/AuthContext.test.tsx`
Expected: FAIL — Supabase imports.

- [ ] **Step 3: Rewrite `AuthContext.tsx`**

Remove `@supabase/supabase-js` types. Expose `user: AuthUser | null`, `profile`, `roles`, `loading`, `signIn`, `signUp`, `signOut`, `hasRole`, `refresh`. On mount: if no token → `loading=false` immediately; else `data.auth.me()`; on failure clear token and stop loading. No `onAuthStateChange`.

- [ ] **Step 4: Update `Auth.tsx`**

`signIn` → `data.auth.login`, then navigate by first role (`admin` → `/admin`, `owner` → `/owner`, else `/renter`). `signUp` → `data.auth.register({email,password,fullName,role})`, then navigate. Keep the French copy and toasts.

- [ ] **Step 5: Update `ProtectedRoute.tsx` and `Navbar.tsx`**

Gating stays `loading` → skeleton, `!user` → `/auth`, role mismatch → `/`. Navbar reads `profile.full_name` instead of Supabase metadata.

- [ ] **Step 6: Run tests and typecheck**

Run: `bun run test src/contexts/__tests__/AuthContext.test.tsx`
Expected: PASS (5 tests).
Run: `bunx tsc --noEmit -p tsconfig.app.json`
Expected: no errors in `src/contexts`, `src/pages/Auth.tsx`, `src/components/ProtectedRoute.tsx`, `src/components/Navbar.tsx`.

- [ ] **Step 7: Commit**

```bash
git add src/contexts src/pages/Auth.tsx src/components/ProtectedRoute.tsx src/components/Navbar.tsx src/App.tsx
git commit -m "feat(auth): replace Supabase sessions with JWT auth context"
```

---

### Task 13: Query hooks and public pages

**Files:**
- Create: `src/hooks/queries/useCars.ts`, `useCar.ts`, `useReviews.ts`, `useBookings.ts`, `useMyCars.ts`, `useProfile.ts`, `useSubscription.ts`
- Create: `src/hooks/queries/__tests__/useCars.test.tsx`
- Modify: `src/pages/Index.tsx`, `src/pages/Search.tsx`, `src/pages/CarDetails.tsx`, `src/pages/BookCar.tsx`, `src/pages/Profile.tsx`
- Modify: `src/components/BookingModal.tsx`, `src/components/ReviewModal.tsx`, `src/hooks/useSubscription.ts`

**Interfaces:**
- Consumes: `data`, `queryKeys`.
- Produces: hooks returning `{ data, isLoading, error }` plus mutation hooks that invalidate their domain key.

- [ ] **Step 1: Write the failing test**

`useCars.test.tsx`: with `data.cars.list` mocked, `renderHook` inside a `QueryClientProvider` returns the list; a mutation `useCreateBooking` calls `data.bookings.create` and invalidates `["bookings"]`.

- [ ] **Step 2: Run the test to verify it fails**

Run: `bun run test src/hooks/queries/__tests__/useCars.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the hooks**

Each read uses `useQuery` with the keys from `queryKeys`. Mutations use `useMutation` and `invalidateQueries` on the affected domain. `useSubscription` calls `data.subscriptions.info()` and is invalidated after checkout activation.

- [ ] **Step 4: Convert the public pages**

- `Index.tsx` — `useCars({ limit: 6 })` for the featured grid; remove the Supabase `useEffect`.
- `Search.tsx` — `useCars(filters)` and keep the same filter UI.
- `CarDetails.tsx` — `useCar(id)` and `useReviews(ownerId)`; keep the loading skeleton.
- `BookCar.tsx` — `useCar(id)`, `data.bookings.create` via mutation, then navigate to `/renter`; drop all client-side money math and send only `{carId,startDate,endDate,renterPhone,renterEmail,renterNotes}`.
- `Profile.tsx` — `useProfile` + `useUpdateProfile`.
- `BookingModal.tsx` and `ReviewModal.tsx` — call the booking/review mutations.

- [ ] **Step 5: Run tests and build**

Run: `bun run test src/hooks/queries`
Expected: PASS.
Run: `bun run build`
Expected: build succeeds.

- [ ] **Step 6: Commit**

```bash
git add src/hooks src/pages/Index.tsx src/pages/Search.tsx src/pages/CarDetails.tsx src/pages/BookCar.tsx src/pages/Profile.tsx src/components/BookingModal.tsx src/components/ReviewModal.tsx
git commit -m "feat(ui): move public pages onto TanStack Query hooks"
```

---

### Task 14: Renter and owner dashboards

**Files:**
- Modify: `src/pages/RenterDashboard.tsx`, `src/pages/OwnerDashboard.tsx`, `src/pages/AdminAddCar.tsx`
- Modify: `src/components/owner/AddCarForm.tsx`, `src/components/owner/BookingRequestBoard.tsx`, `src/components/owner/FleetGrid.tsx`, `src/components/owner/UpgradeModal.tsx`, `src/components/owner/PlanBadge.tsx`
- Create: `src/hooks/queries/useOwner.ts`

**Interfaces:**
- Consumes: Task 13 hooks.
- Produces: owner mutations for car create/toggle/delete and booking status.

- [ ] **Step 1: Convert `RenterDashboard.tsx`**

Use `useBookings()` for `asRenter`; cancel via `useSetBookingStatus`; review via `useCreateReview`. Remove the Supabase `useEffect` and the `car:cars(...)` join (the API returns `car`).

- [ ] **Step 2: Convert `FleetGrid.tsx` and `AddCarForm.tsx`**

`FleetGrid` uses `useMyCars` + update/delete mutations. `AddCarForm` uploads through `data.media.upload` (returns `/api/media/:id`), reads limits from `useSubscription`, creates through `useCreateCar`, and preserves the two-step form.

- [ ] **Step 3: Convert `BookingRequestBoard.tsx`**

Use `useBookings().asOwner`; approve/cancel through `useSetBookingStatus`; keep the Kanban grouping.

- [ ] **Step 4: Convert `UpgradeModal.tsx`**

`handleUpgrade` → `data.subscriptions.createCheckout(return, cancel)` then `window.location.href = approvalUrl`. On return with `?subscription=success&subscription_id=...`, call `data.subscriptions.activate(id)` and invalidate `queryKeys.subscription`. If the API returns 503, show a toast: "Payments are not configured on this deployment."

- [ ] **Step 5: Verify**

Run: `bun run build`
Expected: build succeeds with no `supabase` references in the modified files.

- [ ] **Step 6: Commit**

```bash
git add src/pages/RenterDashboard.tsx src/pages/OwnerDashboard.tsx src/pages/AdminAddCar.tsx src/components/owner src/hooks/queries/useOwner.ts
git commit -m "feat(ui): move renter and owner dashboards onto the data layer"
```

---

### Task 15: Admin dashboard and tables

**Files:**
- Modify: `src/pages/AdminDashboard.tsx`, `src/components/admin/ActivityAnalytics.tsx`, `src/components/admin/AllListingsTable.tsx`, `src/components/admin/BookingManagement.tsx`, `src/components/admin/ListingApprovalQueue.tsx`
- Create: `src/hooks/queries/useAdmin.ts`

**Interfaces:**
- Consumes: Task 13 patterns.
- Produces: `useAdminStats`, `useAdminCars`, `useAdminBookings`, `useAdminSetCarStatus`, `useAdminSetBookingStatus`, `useAdminRemoveCar`, `useAdminRemoveBooking`.

- [ ] **Step 1: Convert `ActivityAnalytics.tsx`**

Replace the six Supabase queries with `useAdminStats()`; map the response into the existing chart shapes unchanged.

- [ ] **Step 2: Convert the three tables**

`AllListingsTable` → `useAdminCars` + status/delete mutations, keeping the confirm dialogs. `ListingApprovalQueue` → filter `pending_approval`, approve sets `live`. `BookingManagement` → `useAdminBookings`, status dropdown, delete.

- [ ] **Step 3: Convert `AdminDashboard.tsx`**

Use `useAdminStats` and `useAdminCars` for the stat cards; keep the layout.

- [ ] **Step 4: Verify**

Run: `bun run build`
Expected: build succeeds.

- [ ] **Step 5: Commit**

```bash
git add src/pages/AdminDashboard.tsx src/components/admin src/hooks/queries/useAdmin.ts
git commit -m "feat(admin): move dashboard and tables onto admin query hooks"
```

---

### Task 16: Admin users, subscriptions, and page builder

**Files:**
- Modify: `src/components/admin/UserManagement.tsx`, `src/components/admin/SubscriptionManager.tsx`, `src/pages/AdminPageBuilder.tsx`
- Modify: `src/hooks/useLandingSections.ts`
- Delete afterward: `src/integrations/supabase/` (all files), `supabase/` (all files), `.env`

**Interfaces:**
- Consumes: `data.admin.*`, `data.landing.*`.
- Produces: working admin user/role/KYC, subscription, and section editing.

- [ ] **Step 1: Convert `UserManagement.tsx`**

`useAdminUsers`; role toggles compute the next array and call `data.admin.setRoles`; KYC select calls `setKyc`; invalidate `queryKeys.admin.users`.

- [ ] **Step 2: Convert `SubscriptionManager.tsx`**

`useAdminSubscriptions`; plan/status changes call `data.admin.setSubscription`; keep the 30-day period display.

- [ ] **Step 3: Convert `AdminPageBuilder.tsx` and `useLandingSections.ts`**

`useLandingSections` uses `data.landing.list()` (admin endpoint, includes hidden) and exposes create/update/delete mutations with invalidation. `AdminPageBuilder` keeps its reorder logic but persists through mutations.

- [ ] **Step 4: Delete Supabase artifacts**

```bash
rm -rf src/integrations/supabase supabase
rm .env
```

Remove `@supabase/supabase-js` from `package.json` with `bun remove @supabase/supabase-js`. Keep `src/types/database.ts`.

- [ ] **Step 5: Verify no Supabase references remain**

Run: `rg -n "supabase|VITE_SUPABASE" src server package.json .env.example`
Expected: no matches (the word may appear only in historical docs under `docs/`).

Run: `bun run lint && bun run build && bun run test`
Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(admin): finish admin conversion and remove Supabase"
```

---

### Task 17: End-to-end smoke test and verification

**Files:**
- Create: `scripts/smoke.ts`
- Create: `docs/superpowers/plans/2026-11-02-manual-qa.md` (checklist produced from this task)

**Interfaces:**
- Consumes: a running API on `http://127.0.0.1:8787` and a seeded local DB.

- [ ] **Step 1: Write `scripts/smoke.ts`**

Sequence with `fetch` and assertions:
1. health.
2. register owner, register renter, login owner, `me`.
3. owner creates 3 cars; 4th fails with 403.
4. admin login (bootstrap account) approves car 1 (`PATCH /admin/cars/:id/status {status:"live"}`).
5. public `GET /cars` contains car 1; anonymous `GET /cars/car2` 404.
6. renter books car 1; owner sees it in `asOwner`; owner approves; admin sets `completed`.
7. renter reviews; public reviews include it.
8. admin sets owner to pro; owner creates a 4th car successfully.
9. renter `PUT /me/cars/:ownerCar` → 404.
10. print `SMOKE OK` on success, exit 1 with the failing step otherwise.

- [ ] **Step 2: Run it**

Setup: `turso dev --db-file .turso/dev.db --port 8080`, apply, seed, `bun --cwd server dev`, then `bun run scripts/smoke.ts`.
Expected: `SMOKE OK`.

- [ ] **Step 3: Run the full gate**

```bash
bun --cwd server test
bun run test
bun run lint
bun run build
bunx tsc --noEmit -p tsconfig.app.json
rg -n "TURSO_AUTH_TOKEN|PAYPAL_CLIENT_SECRET" dist
```

Expected: tests pass; lint clean; build succeeds; the `dist` grep returns no matches.

- [ ] **Step 4: Manual walkthrough**

Start both servers and walk `/`, `/search`, `/car/:id`, `/book/:id`, `/auth`, `/profile`, `/renter`, `/owner`, `/admin` (all tabs), including one image upload and one page-builder save. Record results in `docs/superpowers/plans/2026-11-02-manual-qa.md`.

- [ ] **Step 5: Commit**

```bash
git add scripts/smoke.ts docs/superpowers/plans/2026-11-02-manual-qa.md
git commit -m "test: add end-to-end smoke script and QA checklist"
```

---

### Task 18: Cloudflare Pages packaging

**Files:**
- Create: `server/src/pages-entry.ts`, `server/wrangler.pages.jsonc`, `scripts/package-pages.ts`
- Modify: `package.json` (`package:pages` script), `server/package.json`

**Interfaces:**
- Consumes: a passing build from Task 17.
- Produces: `C:\Users\PC\Desktop\builds\carshare-cloudflare-pages.zip` containing `index.html`, `assets/`, `_worker.js`, `README.txt`.

- [ ] **Step 1: Copy the reference packaging setup**

Copy `server/src/pages-entry.ts`, `server/wrangler.pages.jsonc`, and `scripts/package-pages.ts` from `C:\Users\PC\Desktop\dogcatpro`, then change the app name to `carshare-pages-api` and the output path to `C:\Users\PC\Desktop\builds\carshare-cloudflare-pages.zip`. The entry must serve `/api*` through the Hono app, serve other paths from `env.ASSETS`, and SPA-fallback extensionless 404 GETs to `/index.html`.

- [ ] **Step 2: Add the script**

`package.json`: `"package:pages": "bun run scripts/package-pages.ts"`.

- [ ] **Step 3: Build the package**

```bash
bun run build
bun run package:pages
```

Expected: zip exists; a top-level listing shows `_worker.js`, `index.html`, `assets/`, `README.txt`; no `node_modules`, `.dev.vars`, `.git`, or `.env`.

- [ ] **Step 4: Smoke-test the assembled package**

```bash
bun x wrangler pages dev dist-pages
```

Expected: `/` serves the SPA and `/api/health` returns `{ok:true}`.

- [ ] **Step 5: Commit**

```bash
git add server/src/pages-entry.ts server/wrangler.pages.jsonc scripts/package-pages.ts package.json server/package.json
git commit -m "build: add Cloudflare Pages packaging for the Pro build"
```

---

## Phase 2 (deferred): Normal Turso-direct build

Do **not** start this until the Pro build ships. It gets its own plan, but the seam is already in place:

- Add `src/lib/data/direct.ts` implementing the same `DataClient` with `@libsql/client` and `VITE_TURSO_DB_URL` / `VITE_TURSO_AUTH_TOKEN`.
- Add `src/lib/setupDatabase.ts` with idempotent DDL.
- Swap `src/lib/data/index.ts` to select the adapter at build time.
- Store images as base64 in `cars.images`; replace `UpgradeModal` with an admin-managed request.
- Package with `zip-workflow.md` (Vercel Drop).

The parallel worktree split happens here, after the Pro contract is frozen.

---

## Self-Review

- **Spec coverage:** §8 schema (Tasks 1, 5, 6), §9 auth (Tasks 2, 12), §10 API (Tasks 2–10), §11 PayPal (Task 10), §12 data layer (Tasks 11–16), §13 verification (Task 17), §13 packaging (Task 18), §14 Normal (Phase 2 section), §17 contract details (Tasks 4–9), §18 decisions (Tasks 1, 3, 16). No uncovered requirement.
- **Step scan:** every step names a file, a route, a test, or a command; no TBDs.
- **Type consistency:** `DataClient` names match the hook tasks; `BookingWithCar` is exposed as `RenterBooking`/`OwnerBooking` consistently; `setUserRoles` is named `setRoles` in the interface and every hook.
- **Review Focus:** session recovery (Task 12), IDOR (Tasks 4–6), money tampering (Task 5), upload limits (Task 4), bootstrap (Tasks 1–2).
- **Proportion:** task count matches the spec’s phase list; code bodies are limited to the interfaces the next task consumes.
