import { Hono } from "hono";
import { SignJWT, jwtVerify } from "jose";
import type { Store, LicenseRow } from "./store";
import { keygen } from "./keys";

export type AdminDeps = { store: Store; adminPassword: string };

const COOKIE = "lic_admin";
const enc = new TextEncoder();

const esc = (s: unknown): string =>
  String(s ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string,
  );

async function issueSession(password: string): Promise<string> {
  return new SignJWT({ role: "admin" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("12h")
    .sign(enc.encode(password));
}

async function hasSession(cookieHeader: string, password: string): Promise<boolean> {
  const m = cookieHeader.match(/(?:^|;\s*)lic_admin=([^;]+)/);
  if (!m) return false;
  try {
    await jwtVerify(decodeURIComponent(m[1]), enc.encode(password), { algorithms: ["HS256"] });
    return true;
  } catch {
    return false;
  }
}

const STYLE = `body{font:14px/1.5 system-ui,sans-serif;margin:0;background:#0f1419;color:#e6edf3}
.wrap{max-width:920px;margin:0 auto;padding:28px}
h1{font-size:20px;margin:0 0 16px}
.card{background:#161d24;border:1px solid #2a333d;border-radius:10px;padding:16px;margin:12px 0}
table{width:100%;border-collapse:collapse}
th,td{text-align:left;padding:6px 8px;border-bottom:1px solid #232c35;vertical-align:top}
code{background:#0b0f13;padding:2px 6px;border-radius:5px}
input,select{background:#0b0f13;color:#e6edf3;border:1px solid #2a333d;border-radius:6px;padding:7px 9px;margin:3px 6px 3px 0}
button{background:#35c46a;color:#04140a;border:0;border-radius:6px;padding:8px 14px;font-weight:600;cursor:pointer}
button.danger{background:#e5534b;color:#fff}
.muted{color:#8b98a5;font-size:12px}
form{display:flex;flex-wrap:wrap;align-items:center;gap:2px}`;

function layout(title: string, inner: string): string {
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(
    title,
  )}</title><style>${STYLE}</style></head><body><div class="wrap">${inner}</div></body></html>`;
}

function loginPage(error = ""): string {
  return layout(
    "CarShare license admin",
    `<h1>CarShare License Admin</h1>
     <div class="card">
       ${error ? `<p style="color:#e5534b">${esc(error)}</p>` : ""}
       <form method="post" action="/admin/login">
         <input type="password" name="password" placeholder="Admin password" autofocus>
         <button type="submit">Sign in</button>
       </form>
     </div>`,
  );
}

async function dashboard(deps: AdminDeps): Promise<string> {
  const keys = await deps.store.listLicenses();
  const blocks: string[] = [];
  for (const k of keys) {
    const acts = await deps.store.listActivations(k.key);
    const domains = acts.length
      ? acts
          .map(
            (a) =>
              `<code>${esc(a.domain)}</code> <span class="muted">last seen ${esc(a.last_seen ?? a.activated_at)}</span>`,
          )
          .join("<br>")
      : `<span class="muted">none</span>`;
    blocks.push(`<div class="card">
      <table>
        <tr><th>Key</th><td><code>${esc(k.key)}</code> <span class="muted">${esc(k.note ?? "")}</span></td></tr>
        <tr><th>Product</th><td>${esc(k.product)}</td></tr>
        <tr><th>Domains</th><td>${acts.length} / ${k.max_domains} — ${domains}</td></tr>
        <tr><th>Mode</th><td>${esc(k.mode)} · <span class="muted">status ${esc(k.status)}${
          k.expires_at ? ` · expires ${esc(k.expires_at)}` : ""
        }</span></td></tr>
        <tr><th>Actions</th><td>
          <form method="post" action="/admin/keys/${encodeURIComponent(k.key)}/reset">
            <input name="domain" placeholder="domain to release">
            <button type="submit">Release</button>
          </form>
          <form method="post" action="/admin/keys/${encodeURIComponent(k.key)}/update">
            <input name="max_domains" type="number" min="1" value="${k.max_domains}" style="width:70px">
            <select name="mode"><option value="forever"${
              k.mode === "forever" ? " selected" : ""
            }>forever</option><option value="managed"${
              k.mode === "managed" ? " selected" : ""
            }>managed</option></select>
            <button type="submit">Save</button>
          </form>
          <form method="post" action="/admin/keys/${encodeURIComponent(k.key)}/revoke">
            <button class="danger" type="submit">${k.status === "revoked" ? "Revoked" : "Revoke"}</button>
          </form>
        </td></tr>
      </table>
    </div>`);
  }
  return layout(
    "CarShare license admin",
    `<h1>CarShare License Admin</h1>
     <div class="card">
       <form method="post" action="/admin/keys">
         <input name="key" placeholder="key (blank = generate)">
         <input name="product" value="carshare" placeholder="product">
         <input name="max_domains" type="number" min="1" value="3" style="width:80px">
         <select name="mode"><option value="forever">forever</option><option value="managed">managed</option></select>
         <input name="expires_at" placeholder="expires_at (optional ISO)">
         <input name="note" placeholder="buyer / order note">
         <button type="submit">Create key</button>
       </form>
     </div>
     ${blocks.join("") || `<div class="card muted">No keys yet.</div>`}
     <p class="muted">License server · actions take effect on the next activation/heartbeat.</p>`,
  );
}

export function adminRoutes(deps: AdminDeps): Hono {
  const app = new Hono();

  app.get("/", async (c) => {
    if (!(await hasSession(c.req.header("Cookie") ?? "", deps.adminPassword))) {
      return c.html(loginPage());
    }
    return c.html(await dashboard(deps));
  });

  app.post("/login", async (c) => {
    const body = await c.req.parseBody();
    if (String(body.password ?? "") !== deps.adminPassword) {
      return c.html(loginPage("Wrong password."), 401);
    }
    const token = await issueSession(deps.adminPassword);
    c.header("Set-Cookie", `${COOKIE}=${token}; HttpOnly; Path=/admin; Max-Age=43200; SameSite=Lax; Secure`);
    return c.redirect("/admin");
  });

  const guard = async (c: any): Promise<Response | void> => {
    if (!(await hasSession(c.req.header("Cookie") ?? "", deps.adminPassword))) {
      return c.redirect("/admin");
    }
  };

  app.post("/keys", async (c) => {
    const g = await guard(c);
    if (g) return g;
    const b = await c.req.parseBody();
    const now = new Date().toISOString();
    const row: LicenseRow = {
      key: String(b.key ?? "").trim() || keygen("CARSHARE"),
      product: String(b.product ?? "carshare").trim() || "carshare",
      max_domains: Math.max(1, Number(b.max_domains ?? 3) || 3),
      mode: b.mode === "managed" ? "managed" : "forever",
      status: "active",
      expires_at: String(b.expires_at ?? "").trim() || null,
      note: String(b.note ?? "").trim() || null,
      created_at: now,
    };
    await deps.store.createLicense(row);
    return c.redirect("/admin");
  });

  app.post("/keys/:key/reset", async (c) => {
    const g = await guard(c);
    if (g) return g;
    const b = await c.req.parseBody();
    const domain = String(b.domain ?? "").trim();
    if (domain) await deps.store.releaseActivation(c.req.param("key"), domain);
    return c.redirect("/admin");
  });

  app.post("/keys/:key/update", async (c) => {
    const g = await guard(c);
    if (g) return g;
    const b = await c.req.parseBody();
    await deps.store.updateLicense(c.req.param("key"), {
      max_domains: Math.max(1, Number(b.max_domains ?? 3) || 3),
      mode: b.mode === "managed" ? "managed" : "forever",
    });
    return c.redirect("/admin");
  });

  app.post("/keys/:key/revoke", async (c) => {
    const g = await guard(c);
    if (g) return g;
    const key = c.req.param("key");
    const lic = await deps.store.getLicense(key);
    if (lic) await deps.store.updateLicense(key, { status: lic.status === "revoked" ? "active" : "revoked" });
    return c.redirect("/admin");
  });

  return app;
}
