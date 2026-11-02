# Roadmap

> Tomorrow’s prioritised sellers’ checklist is in [`TODO.md`](TODO.md).

## Done — Pro build

- [x] Turso schema, bootstrap, and idempotent migrations
- [x] Hono API on Cloudflare Workers with JWT + PBKDF2 auth
- [x] Email/password, Google OAuth (PKCE), and guest sessions
- [x] Cars, bookings with server-side pricing, reviews, media uploads
- [x] Admin users, roles, KYC, listings, bookings, subscriptions
- [x] PayPal subscription create/activate/webhook
- [x] Homepage car-row controls (fixed header and chrome)
- [x] TanStack Query across all screens
- [x] Cloudflare Pages drag-and-drop package

## Next — Normal build (Phase 2)

- [ ] Browser-direct Turso adapter (`src/lib/data/direct.ts`) sharing the same `DataClient`
- [ ] Client-side `setupDatabase()` and base64 media
- [ ] Admin-managed Pro plan instead of live PayPal
- [ ] Static Vercel Drop package

## Optional

- [ ] Password reset and email verification
- [ ] R2/object storage for large catalogs
- [ ] Real-time messaging between renters and owners
- [ ] Admin user impersonation for support
