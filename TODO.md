# Tomorrow — sellable-build TODO

Current state (2026-11-02): Turso + Hono + TanStack Query Pro build is working; email/password,
Google OAuth, and guest sessions are live; homepage car rows are controllable; hero/chrome are
fixed; Cloudflare Pages zip builds. What is missing is onboarding, broader page controls, and
the sale-readiness work around them.

## 0. Decide first (30–45 min)

- [ ] **Onboarding shape** — pick one:
  - A. guided checklist on `/admin` (simplest, no tour library)
  - B. step-by-step product tour with `data-tour` anchors (closest to `workflow/onboarding-workflow.md`)
  - C. setup wizard that runs before the admin (DB check → admin account → first car → publish)
- [ ] **Demo data** — ship seeded demo cars and sections, or start empty with an “Add demo data” button?
- [ ] **Admin credentials** — do we add a change-email/password screen, or keep bootstrap-env-only?
- [ ] **First-run gate** — does onboarding block the dashboard until complete, or stay dismissible?
- [ ] **Sale model** — plain template, or license-key gated admin like `dogcatpro`?
- [ ] **Buyer database** — Pro stays env-configured (current), or add a Setup → Connect Turso screen like the Normal build?

## 1. Onboarding

- [ ] First-run detection (per user, not global): `onboarding_completed` setting or localStorage
- [ ] Checklist card on `/admin` with progress: connect DB → admin account → first listing →
      approve it → add a homepage row → preview storefront
- [ ] Empty states on owner/admin screens that link to the next step
- [ ] “Preview storefront” action that opens `/` without losing the admin session
- [ ] “Add demo data” action (idempotent) for cars + landing rows + one booking
- [ ] Admin account safety: change password, or a clear “set ADMIN_EMAIL/ADMIN_PASSWORD” note
- [ ] Tour or checklist QA on desktop and mobile
- [ ] Persist completion so a refresh does not restart onboarding

## 2. More page controls

Landing page (beyond the current car rows):
- [ ] Editable **hero**: eyebrow, heading lines, description, primary/secondary CTA, image
- [ ] Optional **banner/promo** section (image, title, subtitle, CTA, visibility, order)
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

1. Pick the onboarding shape and demo-data policy.
2. Build the `/admin` checklist + first-run persistence + “Add demo data”.
3. Add hero + banner controls to the page builder, then run the full browser walkthrough.
