import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PAYPAL_BASE = "https://api-m.paypal.com"; // Production API

async function getPayPalAccessToken(): Promise<string> {
  const clientId = Deno.env.get("PAYPAL_CLIENT_ID");
  const clientSecret = Deno.env.get("PAYPAL_CLIENT_SECRET");
  if (!clientId || !clientSecret) throw new Error("PayPal credentials not configured");

  const res = await fetch(`${PAYPAL_BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  if (!res.ok) throw new Error(`PayPal auth failed [${res.status}]: ${await res.text()}`);
  const data = await res.json();
  return data.access_token;
}

async function ensurePlanExists(token: string): Promise<string> {
  // Check if we already have a plan stored
  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // Use a simple key-value approach in landing_sections or create a config. 
  // For simplicity, we'll store it in a custom approach: create product + plan each time we need it.
  // Actually let's list plans and find ours.
  const listRes = await fetch(
    `${PAYPAL_BASE}/v1/billing/plans?product_id=CARRENTAL_PRO&page_size=1&total_required=true`,
    { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } }
  );

  if (listRes.ok) {
    const listData = await listRes.json();
    if (listData.plans && listData.plans.length > 0) {
      return listData.plans[0].id;
    }
  }

  // Create product first
  const productRes = await fetch(`${PAYPAL_BASE}/v1/catalogs/products`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      id: "CARRENTAL_PRO",
      name: "Car Rental Pro Plan",
      description: "List up to 15 cars on the platform",
      type: "SERVICE",
      category: "SOFTWARE",
    }),
  });

  // Product might already exist, that's fine
  if (!productRes.ok && productRes.status !== 422) {
    const errText = await productRes.text();
    console.error("Product creation error:", errText);
  }

  // Create plan
  const planRes = await fetch(`${PAYPAL_BASE}/v1/billing/plans`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      product_id: "CARRENTAL_PRO",
      name: "Pro Plan - $12/month",
      description: "List up to 15 cars, advanced analytics, priority support",
      billing_cycles: [
        {
          frequency: { interval_unit: "MONTH", interval_count: 1 },
          tenure_type: "REGULAR",
          sequence: 1,
          total_cycles: 0,
          pricing_scheme: {
            fixed_price: { value: "12", currency_code: "USD" },
          },
        },
      ],
      payment_preferences: {
        auto_bill_outstanding: true,
        payment_failure_threshold: 3,
      },
    }),
  });

  if (!planRes.ok) {
    const errText = await planRes.text();
    throw new Error(`Plan creation failed [${planRes.status}]: ${errText}`);
  }

  const planData = await planRes.json();
  return planData.id;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub as string;

    const { return_url, cancel_url } = await req.json();

    // Get PayPal access token
    const accessToken = await getPayPalAccessToken();

    // Ensure plan exists
    const planId = await ensurePlanExists(accessToken);

    // Create subscription
    const subRes = await fetch(`${PAYPAL_BASE}/v1/billing/subscriptions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        plan_id: planId,
        custom_id: userId,
        application_context: {
          brand_name: "Car Rental Platform",
          locale: "en-US",
          shipping_preference: "NO_SHIPPING",
          user_action: "SUBSCRIBE_NOW",
          return_url: return_url || "https://udfmztbbindvniafnoey.lovableproject.com/owner?subscription=success",
          cancel_url: cancel_url || "https://udfmztbbindvniafnoey.lovableproject.com/owner?subscription=cancelled",
        },
      }),
    });

    if (!subRes.ok) {
      const errText = await subRes.text();
      throw new Error(`Subscription creation failed [${subRes.status}]: ${errText}`);
    }

    const subData = await subRes.json();
    const approvalLink = subData.links.find((l: any) => l.rel === "approve")?.href;

    return new Response(
      JSON.stringify({ subscription_id: subData.id, approval_url: approvalLink }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
