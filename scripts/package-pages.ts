import { execFileSync } from "node:child_process";
import { cpSync, mkdirSync, readdirSync, renameSync, rmSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Builds the drag-and-drop Cloudflare Pages package:
 *   1. vite build                 -> dist/
 *   2. wrangler deploy --dry-run  -> bundled _worker.js (Hono API + Pages wrapper)
 *   3. dist/ + _worker.js + README.txt -> one zip the buyer drags into Pages
 *
 * Output: C:\Users\PC\Desktop\builds\carshare-cloudflare-pages.zip
 */

const repo = process.cwd();
const staging = join(repo, "dist-pages");
const outDir = "C:\\Users\\PC\\Desktop\\builds";
const outPath = join(outDir, "carshare-cloudflare-pages.zip");

const run = (cmd: string, args: string[], cwd: string) =>
  execFileSync(cmd, args, { stdio: "inherit", cwd });

const README = `CarShare Connect — Cloudflare Pages package (Pro)
===============================================

This is a ready-built app. No build step, no CLI, no Git on the buyer side.

BEFORE YOU DEPLOY (one-time, 2 values from Turso)
  1. Create a free database at https://turso.tech.
  2. Copy its URL (libsql://...) and create a database token.
  3. In Cloudflare Pages -> your project -> Settings -> Environment Variables, add:
       TURSO_DATABASE_URL   = libsql://<your-db>.turso.io
       TURSO_AUTH_TOKEN     = <token>
       AUTH_SECRET          = <a long random string>
       ADMIN_EMAIL          = <your admin email>
       ADMIN_PASSWORD       = <8+ characters>
     Optional, for Pro upgrades:
       PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET, PAYPAL_BASE,
       PAYPAL_PLAN_ID, PAYPAL_WEBHOOK_ID
     Optional, for Google sign-in:
       GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET,
       GOOGLE_REDIRECT_URI = https://<your-domain>/api/auth/google/callback
       ADMIN_EMAILS = comma-separated Google emails that get admin access

DEPLOY (drag and drop)
  1. Go to https://dash.cloudflare.com -> Workers & Pages -> Create -> Pages
     -> "Upload assets".
  2. Drag THIS ZIP (or the unzipped folder) into the upload box and click Deploy.
  3. Open the URL it gives you (https://<your-name>.pages.dev).

FIRST RUN
  - The first request creates the schema and the admin account from ADMIN_EMAIL /
    ADMIN_PASSWORD. Sign in at /admin with those credentials, or with Google if
    the Google variables are configured and your email is in ADMIN_EMAILS.
  - Open /admin and paste the license key from your purchase. The storefront is
    always visible; the key unlocks admin changes (listings, settings, page rows).
  - Visitors can create an account, continue with Google, or continue as a guest.
    Guests can book a car and later upgrade by signing in with Google.
  - The storefront is live immediately. Demo cars are not seeded in production;
    use Admin -> "Ajouter une annonce" to add your first listing.
  - Admin -> "Éditeur de page" adds homepage car rows by category (SUVs, Luxury,
    etc.) and banners with split, reversed, full-width, or compact layouts.
    The header, hero, category strip, host block, and footer stay fixed.
  - If you change environment variables later, redeploy the same zip so the
    worker picks them up.

NOTES
  - The Turso token lives only in the Worker; it is never shipped to the browser.
  - PayPal checkout returns a clear "Payments not configured" message until the
    PayPal variables above are set.
  - Set a strong ADMIN_PASSWORD before deploying; the account is created on the
    first request.

Questions? Contact the seller.
`;

console.log("[1/5] Building the web app…");
run("bun", ["run", "build"], repo);

console.log("[2/5] Bundling the API worker…");
rmSync(staging, { recursive: true, force: true });
mkdirSync(staging, { recursive: true });
run(
  "bun",
  ["x", "wrangler", "deploy", "--dry-run", "--outdir", staging, "--config", "wrangler.pages.jsonc"],
  join(repo, "server"),
);

console.log("[3/5] Assembling _worker.js + static assets…");
const bundle = readdirSync(staging).find((f) => f.endsWith(".js") && !f.endsWith(".map"));
if (!bundle) throw new Error(`No worker bundle produced in ${staging}`);
renameSync(join(staging, bundle), join(staging, "_worker.js"));
for (const f of readdirSync(staging)) {
  if (f.endsWith(".map") || f === "README.md") rmSync(join(staging, f), { force: true });
}
cpSync(join(repo, "dist"), staging, { recursive: true });

console.log("[4/5] Writing README.txt for the buyer…");
writeFileSync(join(staging, "README.txt"), README, "utf8");
const files = readdirSync(staging, { recursive: true }) as string[];
if (files.length > 900) {
  throw new Error(`Too many files for Pages drag-and-drop free plan: ${files.length}`);
}

console.log("[5/5] Zipping…");
mkdirSync(outDir, { recursive: true });
rmSync(outPath, { force: true });
const topLevel = readdirSync(staging);
run("tar", ["-a", "-c", "-f", outPath, "-C", staging, ...topLevel], repo);

const sizeMb = (statSync(outPath).size / (1024 * 1024)).toFixed(1);
console.log(`\nCreated ${outPath} (${sizeMb} MB, ${files.length} files)`);
console.log("Buyer drags this zip into Cloudflare Pages -> Upload assets.");
