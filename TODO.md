# Tomorrow — sellable-build TODO

Current state (2026-11-02): Turso + Hono + TanStack Query Pro build is working; email/password,
Google OAuth, and guest sessions are live; homepage car rows are controllable; hero/chrome are
fixed; Cloudflare Pages zip builds. What is missing is onboarding, broader page controls, and
the sale-readiness work around them.

## 0. Decide first (30–45 min)

- [x] **Onboarding shape** — guided checklist on `/admin` (chosen)
- [x] **Demo data** — “Load demo data” button on the checklist (idempotent)
- [x] **Admin credentials** — change-password form on the onboarding card
- [x] **First-run gate** — dismissible checklist, persisted on the profile
- [x] **Sale model** — v1: Ed25519-signed, domain-bound license keys verified
      locally, plus the hosted `license/` Worker for issuance limits, release,
      and revocation.
- [ ] **Deploy the license Worker** — `wrangler d1 create carshare-licenses`,
      apply `license/schema.sql`, set the private key + admin password, deploy,
      then set `LICENSE_SERVER_URL` in the template.
- [ ] **Buyer database** — Pro stays env-configured (current), or add a Setup → Connect Turso screen like the Normal build?

## 1. Onboarding

- [x] First-run detection (per user, not global): `profiles.onboarding_completed`
- [x] Checklist card on `/admin` with progress: account → first listing → publish → homepage → preview
- [x] Empty-state guidance inside the checklist with links to each step
- [x] “Preview storefront” action that opens `/` in a new tab
- [x] “Load demo data” action (idempotent) for cars + hero + landing rows
- [x] Admin account safety: change-password form (email users; guests hidden)
- [ ] Tour or checklist QA on desktop and mobile
- [x] Persist completion so a refresh does not restart onboarding

## 2. More page controls

Landing page (beyond the current car rows):
- [x] Editable **hero**: eyebrow, heading lines, description, primary/secondary CTA, image
- [x] Optional **banner/promo** section with four layouts (split, reversed, full-width
      overlay, compact), text alignment, overlay strength, CTA, visibility, and order
- [ ] Optional **text/feature** section (heading, body, 2–4 feature cards)
- [ ] Optional **testimonials/FAQ** section
- [ ] Category strip controls (labels/order/visibility) — decide whether it stays fixed
- [ ] Homepage row preview inside the builder (see the actual cars before saving)
- [ ] Draft/publish state so edits are not live until “Publish”

Other pages:
- [ ] Footer content (tagline, columns, socials) editable
- [ ] About/Contact/FAQ pages with simple CMS content, or explicitly out of scope
- [ ] Search page title/empty-state copy control (optional)
- [ ] Per-section scheduling or “hidden until date” (optional)

## 3. Sale readiness

- [ ] Fully test the Pages zip on a clean Cloudflare account with a fresh Turso DB
- [ ] Buyer README: screenshots, env var table, Google redirect setup, PayPal setup, troubleshooting
- [ ] Demo credentials documented and safe (no secret in the repo)
- [ ] Decide license-key gate for the admin (or explicitly ship without one)
- [ ] Landing page for the template itself (features, screenshots, price, buy button)
- [ ] Screenshot set: homepage, search, car detail, booking, owner dashboard, admin, page builder
- [ ] Bundle contents review: no `.env`, no `.dev.vars`, no `node_modules`, no test DBs
- [ ] Version the template (`1.0.0`) and add a changelog
- [ ] Support/contact address and refund/terms copy
- [ ] Confirm Google OAuth client is not tied to the seller’s personal project; buyer needs their own

## 4. QA / hardening before selling

- [ ] Full browser walkthrough: guest → book → review; owner → list/approve; admin → approve/manage
- [ ] Mobile pass at 390px and tablet at 768px
- [ ] Cross-browser: Chrome, Safari, Firefox
- [ ] Accessibility pass: keyboard nav, labels, focus states, contrast
- [ ] Empty-database first-run test (fresh Turso, no seed) from the buyer zip
- [ ] Wrong-env test: missing `AUTH_SECRET`, bad Turso token, missing Google vars, missing PayPal vars
- [ ] Rate-limit / abuse pass on auth and booking endpoints
- [ ] Backup/export path for buyer data (admin backup button)
- [ ] Error monitoring decision (Sentry or none)
- [ ] Confirm no secrets in git history before publishing

## 5. Deferred / later

- [ ] Normal Turso-direct static build (`docs/superpowers/plans` Phase 2)
- [ ] Admin booking delete and landing create/delete are wired; add section delete confirmation polish
- [ ] Real-time messaging
- [ ] R2/object storage for large catalogs
- [ ] Password reset / email verification

## Tomorrow’s first three actions

1. ~~Pick the onboarding shape and demo-data policy.~~ Done — checklist + demo data.
2. ~~Build the `/admin` checklist + first-run persistence + “Add demo data”.~~ Done.
3. ~~Add hero + banner controls to the page builder~~ Done. Next: run the full browser walkthrough,
   decide license/sale model, and finish the remaining sale-readiness items.
