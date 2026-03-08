import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const eventType = body.event_type;

    console.log("PayPal webhook event:", eventType);

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const resource = body.resource;

    if (eventType === "BILLING.SUBSCRIPTION.ACTIVATED" || eventType === "BILLING.SUBSCRIPTION.UPDATED") {
      const userId = resource.custom_id;
      const paypalSubId = resource.id;
      const startTime = resource.start_time || resource.billing_info?.last_payment?.time;
      const nextBilling = resource.billing_info?.next_billing_time;

      if (userId) {
        const { error } = await supabaseAdmin
          .from("subscriptions")
          .update({
            plan: "pro",
            status: "active",
            paypal_subscription_id: paypalSubId,
            current_period_start: startTime || new Date().toISOString(),
            current_period_end: nextBilling || null,
          })
          .eq("user_id", userId);

        if (error) console.error("Error updating subscription:", error);
        else console.log(`User ${userId} upgraded to pro`);
      }
    }

    if (eventType === "BILLING.SUBSCRIPTION.CANCELLED" || eventType === "BILLING.SUBSCRIPTION.EXPIRED") {
      const paypalSubId = resource.id;

      const { error } = await supabaseAdmin
        .from("subscriptions")
        .update({
          plan: "free",
          status: eventType.includes("CANCELLED") ? "cancelled" : "expired",
          current_period_end: new Date().toISOString(),
        })
        .eq("paypal_subscription_id", paypalSubId);

      if (error) console.error("Error cancelling subscription:", error);
      else console.log(`Subscription ${paypalSubId} cancelled/expired`);
    }

    if (eventType === "BILLING.SUBSCRIPTION.PAYMENT.FAILED") {
      const paypalSubId = resource.id;

      const { error } = await supabaseAdmin
        .from("subscriptions")
        .update({ status: "past_due" })
        .eq("paypal_subscription_id", paypalSubId);

      if (error) console.error("Error updating past_due:", error);
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Webhook error:", error);
    return new Response(JSON.stringify({ error: "Webhook processing failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
