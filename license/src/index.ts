import { createApp } from "./app";
import { d1Store } from "./store";

type Env = {
  DB: D1Database;
  LICENSE_PRIVATE_KEY: string;
  LICENSE_ADMIN_PASSWORD: string;
};

export default {
  fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const app = createApp({
      store: d1Store(env.DB),
      privateJwk: env.LICENSE_PRIVATE_KEY,
      adminPassword: env.LICENSE_ADMIN_PASSWORD,
    });
    return app.fetch(request, env, ctx);
  },
};
