export type Env = {
  TURSO_DATABASE_URL: string;
  TURSO_AUTH_TOKEN?: string;
  AUTH_SECRET: string;
  ADMIN_EMAIL?: string;
  ADMIN_PASSWORD?: string;
  PAYPAL_CLIENT_ID?: string;
  PAYPAL_CLIENT_SECRET?: string;
  PAYPAL_BASE?: string;
  PAYPAL_PLAN_ID?: string;
  PAYPAL_WEBHOOK_ID?: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  GOOGLE_REDIRECT_URI?: string;
  ADMIN_EMAILS?: string;
  APP_ORIGIN?: string;
  LICENSE_PUBLIC_KEY?: string;
  LICENSE_PRODUCT?: string;
  LICENSE_DISABLED?: string;
};

export type AppEnv = { Bindings: Env; Variables: { userId: string } };
