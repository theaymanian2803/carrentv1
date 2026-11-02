# Roadmap

## Turso migration (in progress)
- [x] Turso credentials saved (TURSO_DATABASE_URL, TURSO_AUTH_TOKEN)
- [x] Read existing data (profiles, roles, cars, bookings, subscriptions, landing sections)
- [ ] Create Turso schema + seed existing data (users keep same IDs/emails, temp password)
- [ ] Edge functions: _shared Turso helper, turso-auth, turso-api, turso-file, PayPal functions rewritten for Turso
- [ ] Deploy + smoke-test edge functions with curl
- [ ] Client: src/lib/api.ts, AuthContext, ProtectedRoute, Auth page
- [ ] Rewrite pages/components off Supabase (admin, owner, renter, search, details, booking, profile, landing, hooks)
- [ ] Car image upload through Turso-backed storage
- [ ] Build + end-to-end browser verification (login admin@me.com, browse, book)
- [ ] Leave old backend intact until everything verified (remove only on explicit user request)
