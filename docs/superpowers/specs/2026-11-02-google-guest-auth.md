# Google, email, and guest authentication — addendum

Date: 2026-11-02
Status: implemented
Reference: `C:\Users\PC\Desktop\bike replet two` (Google OAuth + email/password + guest sessions)

## What this adds

The Pro backend keeps email/password sign-in and adds two paths:

1. **Google OAuth** — authorization code + PKCE. `GET /api/auth/google` sets short-lived
   `carshare_oauth_state` and `carshare_oauth_verifier` cookies and redirects to Google.
   `GET /api/auth/google/callback` verifies the state, exchanges the code, reads the
   verified profile from Google's userinfo endpoint, and upserts the local user.
2. **Guest sessions** — `POST /api/auth/guest` creates a real `users` row with
   `is_guest = 1`, a generated `guest-…@guests.carshare.local` email, a random unusable
   password hash, a profile, the `renter` role, and a free subscription. Guests get the
   same JWT/cookie session and can book, review, and manage their trips.

A signed-in guest who then uses Google is upgraded in place: the same `users.id` receives
the Google `sub`, the real email, `is_guest = 0`, and the Google avatar. Their bookings,
reviews, and subscription stay attached.

## Users table

`users` gains `google_sub TEXT` and `is_guest INTEGER NOT NULL DEFAULT 0`, plus a unique
partial index on `google_sub`. `bootstrap.ts` applies these as idempotent `ALTER TABLE`
migrations so existing databases upgrade on the first request.

## Sessions

Email/password and guest logins return a Bearer JWT and also set the `carshare_session`
httpOnly cookie. Google login only sets the cookie. `requireAuth` accepts either, so the
SPA can restore a Google session on page load without exposing a token to JavaScript.

`POST /api/auth/logout` clears the cookie. The client also clears `localStorage` and the
TanStack Query cache on sign-out and on any 401.

## Admin

`ADMIN_EMAILS` (comma-separated) grants the admin role on a verified Google sign-in. The
existing `ADMIN_EMAIL` / `ADMIN_PASSWORD` bootstrap account still works. Admin user rows
show `is_guest` so guest accounts are visible.

## Credentials

The Google client used for local testing is the one in `bike replet two/.env`:

```
GOOGLE_CLIENT_ID=REDACTED
GOOGLE_CLIENT_SECRET=REDACTED
GOOGLE_REDIRECT_URI=http://localhost:8080/api/auth/google/callback
ADMIN_EMAILS=sberechou@gmail.com
```

`http://localhost:8080/api/auth/google/callback` must be an authorized redirect URI in
the Google console for that client. Production needs the deployed origin added.

## Verification

- `server/tests/guest-auth.test.ts` — guest row, roles, subscription, Bearer and cookie
  auth, guest booking, logout cookie.
- `server/tests/google-auth.test.ts` — PKCE redirect, callback upsert, no duplicates,
  guest upgrade in place, bad state.
- `scripts/smoke.ts` — guest sign-in followed by a real booking.
