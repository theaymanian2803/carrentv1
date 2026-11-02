import app from "./index";
import type { Env } from "./env";

type PagesEnv = Env & {
  ASSETS: { fetch: (input: Request | string) => Promise<Response> };
};

const hasExtension = (pathname: string): boolean => /\.[a-z0-9]+$/i.test(pathname);

/**
 * Cloudflare Pages entry (advanced mode). Serves /api/* through the Hono app
 * and everything else from the static assets, with an SPA fallback so deep
 * links like /admin survive a refresh.
 */
export default {
  async fetch(request: Request, env: PagesEnv, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === "/api" || url.pathname.startsWith("/api/")) {
      return app.fetch(request, env as unknown as Env, ctx);
    }

    const res = await env.ASSETS.fetch(request);
    if (res.status === 404 && request.method === "GET" && !hasExtension(url.pathname)) {
      return env.ASSETS.fetch(new Request(new URL("/index.html", url).toString(), request));
    }
    return res;
  },
};
