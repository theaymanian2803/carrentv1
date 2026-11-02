# CarShare License Server

Standalone Cloudflare Worker that issues signed license grants for the CarShare
template. It runs on the Cloudflare free tier (Workers + D1) and is **never**
shipped to buyers.

## How it works

- The buyer pastes a product key in the template's `/admin` → **Licence** card.
- The template calls `POST /v1/activate` with its hostname.
- The server checks the key, binds the domain (default max **3** per key), and
  returns an **Ed25519-signed JWT** grant bound to that domain.
- The template verifies the grant locally forever after. In `managed` mode it
  also re-checks (`/v1/heartbeat`), so revocation and expiry work.

## One-time setup

```bash
cd license
bun install

# 1. Create the D1 database and copy its id into wrangler.jsonc.
npx wrangler d1 create carshare-licenses
npx wrangler d1 execute carshare-licenses --file=./schema.sql --remote

# 2. Set the signing key and admin password.
#    Use the SAME private key whose public JWK is baked into the template
#    (server/src/license-defaults.ts).
npx wrangler secret put LICENSE_PRIVATE_KEY
npx wrangler secret put LICENSE_ADMIN_PASSWORD

# 3. Deploy.
bun run deploy
```

Set the Worker URL (for example `https://carshare-license.<subdomain>.workers.dev`)
as `LICENSE_SERVER_URL` in the template's `.dev.vars` or Pages environment.

## Admin page

Open `https://<license-host>/admin` and sign in with `LICENSE_ADMIN_PASSWORD`.

- **Create key** — leave the key blank to auto-generate `CARSHARE-XXXX-XXXX-XXXX`.
  Pick `max_domains` (default 3) and `mode`:
  - `forever` — activate once and trust offline.
  - `managed` — heartbeat + revocable/expiring.
- **Release** — free a bound domain (buyer moved from `*.pages.dev` to a custom
  domain).
- **Save** — change max domains or mode.
- **Revoke** — invalidate the key on the next activation/heartbeat.

## API

| Endpoint | Body | Result |
|---|---|---|
| `POST /v1/activate` | `{ key, domain, product }` | `{ grant, mode, domains_used, max_domains }` or `400/409` |
| `POST /v1/heartbeat` | `{ key, domain }` | `{ grant }` or `403` |
| `POST /v1/deactivate` | `{ key, domain }` + `x-admin-password` header | `{ ok: true }` |
| `POST /v1/keys` | `{ product, max_domains?, mode?, note? }` + `x-admin-password` header | `{ key }` or `401/400` |

Error codes: `invalid`, `product`, `expired`, `revoked`, `domain_limit`.

Product for this template: `carshare`.

## Tests

```bash
bun test
bun run typecheck
```
