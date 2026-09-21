import { verifyToken } from "@clerk/backend";

interface Env {
  MEDIA_BUCKET: R2Bucket;
  CLERK_SECRET_KEY: string;
  STRIPE_SECRET_KEY: string;
  STRIPE_WEBHOOK_SECRET: string;
}

type Context = EventContext<Env, string, Record<string, unknown>>;
const PROVIDER_PREFIX = "data/providers/";
const BOOKING_PREFIX = "data/bookings/";
const LISTING_PREFIX = "data/listings/";

function json(data: unknown, status = 200) {
  return Response.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      "Access-Control-Allow-Headers": "Authorization, Content-Type",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    },
  });
}

function routeParts(context: Context): string[] {
  const value = context.params.path;
  return (Array.isArray(value) ? value : typeof value === "string" ? value.split("/") : []).filter(Boolean);
}

async function currentUserId(request: Request, env: Env): Promise<string | null> {
  const authorization = request.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ") || !env.CLERK_SECRET_KEY) return null;
  try {
    const payload = await verifyToken(authorization.slice(7), { secretKey: env.CLERK_SECRET_KEY });
    return typeof payload.sub === "string" ? payload.sub : null;
  } catch {
    return null;
  }
}

async function stripeRequest(env: Env, path: string, init?: RequestInit) {
  if (!env.STRIPE_SECRET_KEY) throw new Error("A Stripe még nincs konfigurálva.");
  return fetch(`https://api.stripe.com/v1${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
      ...(init?.headers || {}),
    },
  });
}

async function validStripeSignature(payload: string, signature: string, secret: string) {
  const parts = Object.fromEntries(signature.split(",").map((part) => part.split("=", 2)));
  const timestamp = parts.t;
  const expected = parts.v1;
  if (!timestamp || !expected || Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) return false;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const digest = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${timestamp}.${payload}`));
  const actual = [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  if (actual.length !== expected.length) return false;
  let mismatch = 0;
  for (let i = 0; i < actual.length; i += 1) mismatch |= actual.charCodeAt(i) ^ expected.charCodeAt(i);
  return mismatch === 0;
}

async function updateSubscription(env: Env, ownerId: string, subscription: Record<string, unknown>) {
  const key = `${PROVIDER_PREFIX}provider_${ownerId}.json`;
  const object = await env.MEDIA_BUCKET.get(key);
  if (!object) return;
  const provider = await object.json<any>();
  const updatedAt = new Date().toISOString();
  const mustUnpublish = ["unpaid", "cancelled", "inactive"].includes(String(subscription.status || ""));
  await env.MEDIA_BUCKET.put(key, JSON.stringify({
    ...provider,
    subscription,
    isPublished: mustUnpublish ? false : provider.isPublished,
    updatedAt,
  }), {
    httpMetadata: { contentType: "application/json" },
    customMetadata: { owner: ownerId, updatedAt },
  });
}

async function updateBookingPayment(env: Env, bookingId: string, payment: Record<string, unknown>) {
  const key = `${BOOKING_PREFIX}${bookingId}.json`;
  const object = await env.MEDIA_BUCKET.get(key);
  if (!object) return null;
  const booking = await object.json<any>();
  const updated = { ...booking, depositPayment: payment, updatedAt: new Date().toISOString() };
  await env.MEDIA_BUCKET.put(key, JSON.stringify(updated), {
    httpMetadata: { contentType: "application/json" },
    customMetadata: { customerId: booking.customerId, providerOwnerId: booking.providerOwnerId },
  });
  return updated;
}

async function activateListingPromotion(env: Env, listingId: string, days: number, payment: Record<string, unknown>) {
  const key = `${LISTING_PREFIX}${listingId}.json`;
  const object = await env.MEDIA_BUCKET.get(key);
  if (!object) return null;
  const listing = await object.json<any>();
  const startsAt = new Date();
  const currentEnd = listing.featuredUntil ? new Date(listing.featuredUntil) : null;
  if (currentEnd && currentEnd > startsAt) startsAt.setTime(currentEnd.getTime());
  const featuredUntil = new Date(startsAt.getTime() + days * 86400000).toISOString();
  const updated = { ...listing, featuredUntil, promotionPayment: payment, updatedAt: new Date().toISOString() };
  await env.MEDIA_BUCKET.put(key, JSON.stringify(updated), {
    httpMetadata: { contentType: "application/json" },
    customMetadata: { owner: listing.userId, updatedAt: updated.updatedAt },
  });
  return updated;
}

export const onRequest: PagesFunction<Env> = async (rawContext) => {
  const context = rawContext as Context;
  if (context.request.method === "OPTIONS") return json(null, 204);
  const route = routeParts(context);
  if (route[0] === "stripe-webhook" && context.request.method === "POST") {
    const payload = await context.request.text();
    const signature = context.request.headers.get("Stripe-Signature") || "";
    if (!context.env.STRIPE_WEBHOOK_SECRET || !(await validStripeSignature(payload, signature, context.env.STRIPE_WEBHOOK_SECRET))) {
      return json({ error: "Érvénytelen Stripe-aláírás." }, 400);
    }
    const event = JSON.parse(payload);
    const object = event?.data?.object || {};
    if (event.type === "checkout.session.completed" && object.metadata?.kind === "booking_deposit" && object.metadata?.bookingId) {
      await updateBookingPayment(context.env, object.metadata.bookingId, {
        status: object.payment_status === "paid" ? "paid" : "pending",
        amount: Number(object.amount_total || 0),
        stripeCheckoutSessionId: object.id || "",
        stripePaymentIntentId: object.payment_intent || "",
        paidAt: object.payment_status === "paid" ? new Date().toISOString() : undefined,
      });
    } else if (event.type === "checkout.session.completed" && object.metadata?.kind === "listing_promotion" && object.metadata?.listingId) {
      await activateListingPromotion(context.env, object.metadata.listingId, Number(object.metadata.days) === 7 ? 7 : 1, {
        status: object.payment_status === "paid" ? "paid" : "pending",
        amount: Number(object.amount_total || 0),
        stripeCheckoutSessionId: object.id || "",
        stripePaymentIntentId: object.payment_intent || "",
        paidAt: object.payment_status === "paid" ? new Date().toISOString() : undefined,
      });
    } else if (event.type === "checkout.session.completed" && object.client_reference_id) {
      await updateSubscription(context.env, object.client_reference_id, {
        status: "active",
        plan: object.metadata?.plan || "monthly",
        stripeCustomerId: object.customer || "",
        stripeSubscriptionId: object.subscription || "",
        checkoutSessionId: object.id || "",
        activatedAt: new Date().toISOString(),
      });
    }
    if (event.type === "customer.subscription.deleted" && object.metadata?.ownerId) {
      await updateSubscription(context.env, object.metadata.ownerId, {
        status: "cancelled",
        plan: object.metadata?.plan || "monthly",
        stripeCustomerId: object.customer || "",
        stripeSubscriptionId: object.id || "",
        cancelledAt: new Date().toISOString(),
      });
    }
    if (event.type === "customer.subscription.updated" && object.metadata?.ownerId) {
      const status = ["active", "trialing", "past_due", "unpaid"].includes(object.status) ? object.status : "inactive";
      await updateSubscription(context.env, object.metadata.ownerId, {
        status,
        plan: object.metadata?.plan || "monthly",
        stripeCustomerId: object.customer || "",
        stripeSubscriptionId: object.id || "",
        currentPeriodEnd: typeof object.current_period_end === "number" ? new Date(object.current_period_end * 1000).toISOString() : undefined,
        cancelAtPeriodEnd: object.cancel_at_period_end === true,
        updatedAt: new Date().toISOString(),
      });
    }
    return json({ received: true });
  }
  const userId = await currentUserId(context.request, context.env);
  if (!userId) return json({ error: "A fizetéshez jelentkezz be." }, 401);
  if (route[0] === "listing-promotion" && context.request.method === "POST") {
    try {
      const body = await context.request.json<{ listingId?: string; days?: number }>();
      const listingId = typeof body.listingId === "string" ? body.listingId.trim().slice(0, 160) : "";
      const days = Number(body.days) === 7 ? 7 : Number(body.days) === 1 ? 1 : 0;
      if (!listingId || !days) return json({ error: "Érvénytelen kiemelési adatok." }, 400);
      const object = await context.env.MEDIA_BUCKET.get(`${LISTING_PREFIX}${listingId}.json`);
      if (!object) return json({ error: "A hirdetés nem található." }, 404);
      const listing = await object.json<any>();
      if (listing.userId !== userId) return json({ error: "Csak a saját hirdetésedet emelheted ki." }, 403);
      if (listing.status !== "ACTIVE" || listing.isSold) return json({ error: "Csak aktív hirdetés emelhető ki." }, 409);
      const amount = days === 7 ? 990 : 199;
      const origin = new URL(context.request.url).origin;
      const form = new URLSearchParams({
        mode: "payment",
        client_reference_id: userId,
        "line_items[0][quantity]": "1",
        "line_items[0][price_data][currency]": "huf",
        "line_items[0][price_data][unit_amount]": String(amount),
        "line_items[0][price_data][product_data][name]": `ILOLIT Top kiemelés – ${days} nap`,
        "metadata[kind]": "listing_promotion",
        "metadata[listingId]": listingId,
        "metadata[ownerId]": userId,
        "metadata[days]": String(days),
        success_url: `${origin}/dashboard/listings?promotion=success`,
        cancel_url: `${origin}/product/${encodeURIComponent(listingId)}?promotion=cancelled`,
      });
      const response = await stripeRequest(context.env, "/checkout/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: form,
      });
      const session = await response.json<any>();
      if (!response.ok || !session.url) return json({ error: session?.error?.message || "A kiemelés fizetése nem indítható." }, 502);
      return json({ checkoutUrl: session.url });
    } catch (error: any) {
      return json({ error: error?.message || "A kiemelés fizetése sikertelen." }, 500);
    }
  }
  if (route[0] === "booking-deposit") {
    try {
      if (context.request.method === "POST" && route.length === 1) {
        const body = await context.request.json<{ bookingId?: string }>();
        const bookingId = typeof body.bookingId === "string" ? body.bookingId.trim().slice(0, 160) : "";
        const object = bookingId ? await context.env.MEDIA_BUCKET.get(`${BOOKING_PREFIX}${bookingId}.json`) : null;
        if (!object) return json({ error: "A foglalás nem található." }, 404);
        const booking = await object.json<any>();
        if (booking.customerId !== userId) return json({ error: "Ehhez a foglaláshoz nincs hozzáférésed." }, 403);
        if (booking.status !== "CONFIRMED") return json({ error: "Előleget csak visszaigazolt foglalásra lehet fizetni." }, 409);
        const amount = Math.round(Number(booking.depositAmount) || 0);
        if (amount <= 0) return json({ error: "Ehhez a foglaláshoz nem tartozik fizetendő előleg." }, 409);
        if (booking.depositPayment?.status === "paid") return json({ error: "Az előleg már ki van fizetve." }, 409);

        const origin = new URL(context.request.url).origin;
        const form = new URLSearchParams({
          mode: "payment",
          client_reference_id: userId,
          customer_email: String(booking.customerEmail || "").slice(0, 180),
          "line_items[0][quantity]": "1",
          "line_items[0][price_data][currency]": "huf",
          "line_items[0][price_data][unit_amount]": String(amount),
          "line_items[0][price_data][product_data][name]": `ILOLIT foglalási előleg – ${String(booking.serviceName || "szolgáltatás").slice(0, 120)}`,
          "metadata[kind]": "booking_deposit",
          "metadata[bookingId]": booking.id,
          "metadata[customerId]": userId,
          success_url: `${origin}/beauty/bookings?deposit=success&session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${origin}/beauty/bookings?deposit=cancelled`,
        });
        const response = await stripeRequest(context.env, "/checkout/sessions", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: form,
        });
        const session = await response.json<any>();
        if (!response.ok || !session.url) return json({ error: session?.error?.message || "Az előlegfizetés nem indítható." }, 502);
        await updateBookingPayment(context.env, booking.id, {
          status: "pending",
          amount,
          stripeCheckoutSessionId: session.id,
          createdAt: new Date().toISOString(),
        });
        return json({ checkoutUrl: session.url });
      }

      if (context.request.method === "GET" && route[1] === "status") {
        const sessionId = new URL(context.request.url).searchParams.get("session_id") || "";
        if (!/^cs_(test_|live_)?[A-Za-z0-9]+$/.test(sessionId)) return json({ error: "Érvénytelen fizetési azonosító." }, 400);
        const response = await stripeRequest(context.env, `/checkout/sessions/${encodeURIComponent(sessionId)}`);
        const session = await response.json<any>();
        if (!response.ok) return json({ error: session?.error?.message || "Az előlegfizetés nem ellenőrizhető." }, 502);
        if (session.metadata?.kind !== "booking_deposit" || session.metadata?.customerId !== userId) {
          return json({ error: "Ez a fizetés nem ehhez a felhasználóhoz tartozik." }, 403);
        }
        const paid = session.status === "complete" && session.payment_status === "paid";
        if (paid && session.metadata?.bookingId) {
          await updateBookingPayment(context.env, session.metadata.bookingId, {
            status: "paid",
            amount: Number(session.amount_total || 0),
            stripeCheckoutSessionId: session.id,
            stripePaymentIntentId: session.payment_intent || "",
            paidAt: new Date().toISOString(),
          });
        }
        return json({ paid, bookingId: session.metadata?.bookingId || "" });
      }
    } catch (error: any) {
      return json({ error: error?.message || "Váratlan előlegfizetési hiba történt." }, 500);
    }
    return json({ error: "Nem támogatott előlegfizetési művelet." }, 405);
  }
  if (route[0] !== "provider-subscription") return json({ error: "Ismeretlen számlázási végpont." }, 404);

  try {
    if (context.request.method === "POST" && route[1] === "portal") {
      const providerObject = await context.env.MEDIA_BUCKET.get(`${PROVIDER_PREFIX}provider_${userId}.json`);
      if (!providerObject) return json({ error: "A szolgáltatói profil nem található." }, 404);
      const provider = await providerObject.json<any>();
      const customerId = provider.subscription?.stripeCustomerId;
      if (typeof customerId !== "string" || !customerId.startsWith("cus_")) {
        return json({ error: "Ehhez a profilhoz még nem tartozik Stripe-előfizetés." }, 409);
      }
      const origin = new URL(context.request.url).origin;
      const form = new URLSearchParams({
        customer: customerId,
        return_url: `${origin}/providers/dashboard`,
      });
      const response = await stripeRequest(context.env, "/billing_portal/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: form,
      });
      const portal = await response.json<any>();
      if (!response.ok || !portal.url) {
        return json({ error: portal?.error?.message || "A Stripe előfizetés-kezelő nem indítható." }, 502);
      }
      return json({ portalUrl: portal.url });
    }

    if (context.request.method === "POST" && route.length === 1) {
      const body = await context.request.json<{ plan?: string; email?: string }>();
      const plan = body.plan === "yearly" ? "yearly" : body.plan === "monthly" ? "monthly" : null;
      const email = typeof body.email === "string" ? body.email.trim().slice(0, 180) : "";
      if (!plan || !email) return json({ error: "Érvénytelen előfizetési adatok." }, 400);

      const providerObject = await context.env.MEDIA_BUCKET.get(`${PROVIDER_PREFIX}provider_${userId}.json`);
      const provider = providerObject ? await providerObject.json<any>() : null;
      const currentStatus = provider?.subscription?.status;
      if (currentStatus === "active" || currentStatus === "trialing") {
        return json({ error: "Ehhez a fiókhoz már tartozik aktív előfizetés. A módosításhoz használd az előfizetés-kezelőt." }, 409);
      }

      const amount = plan === "yearly" ? 9999 : 999;
      const interval = plan === "yearly" ? "year" : "month";
      const origin = new URL(context.request.url).origin;
      const form = new URLSearchParams({
        mode: "subscription",
        client_reference_id: userId,
        "line_items[0][quantity]": "1",
        "line_items[0][price_data][currency]": "huf",
        // HUF is a zero-decimal Stripe currency: unit_amount is expressed in whole forints.
        "line_items[0][price_data][unit_amount]": String(amount),
        "line_items[0][price_data][recurring][interval]": interval,
        "line_items[0][price_data][product_data][name]": plan === "yearly" ? "ILOLIT szolgáltatói előfizetés – éves" : "ILOLIT szolgáltatói előfizetés – havi",
        "metadata[ownerId]": userId,
        "metadata[plan]": plan,
        "subscription_data[metadata][ownerId]": userId,
        "subscription_data[metadata][plan]": plan,
        success_url: `${origin}/beauty/register?payment=success&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/beauty/register?payment=cancelled`,
      });
      const existingCustomerId = provider?.subscription?.stripeCustomerId;
      if (typeof existingCustomerId === "string" && existingCustomerId.startsWith("cus_")) {
        form.set("customer", existingCustomerId);
      } else {
        form.set("customer_email", email);
      }
      const response = await stripeRequest(context.env, "/checkout/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: form,
      });
      const session = await response.json<any>();
      if (!response.ok || !session.url) return json({ error: session?.error?.message || "A Stripe fizetési oldal nem indítható." }, 502);
      return json({ checkoutUrl: session.url });
    }

    if (context.request.method === "GET" && route[1] === "status") {
      const sessionId = new URL(context.request.url).searchParams.get("session_id") || "";
      if (!/^cs_(test_|live_)?[A-Za-z0-9]+$/.test(sessionId)) return json({ error: "Érvénytelen fizetési azonosító." }, 400);
      const response = await stripeRequest(context.env, `/checkout/sessions/${encodeURIComponent(sessionId)}`);
      const session = await response.json<any>();
      if (!response.ok) return json({ error: session?.error?.message || "A fizetés nem ellenőrizhető." }, 502);
      if (session.client_reference_id !== userId) return json({ error: "Ez a fizetés nem ehhez a fiókhoz tartozik." }, 403);
      const active = session.status === "complete" && session.payment_status === "paid";
      const plan = session.metadata?.plan === "yearly" ? "yearly" : "monthly";
      if (active) {
        const key = `${PROVIDER_PREFIX}provider_${userId}.json`;
        const object = await context.env.MEDIA_BUCKET.get(key);
        if (object) {
          const provider = await object.json<any>();
          const updatedAt = new Date().toISOString();
          await updateSubscription(context.env, userId, {
            status: "active", plan, stripeCustomerId: session.customer || "", stripeSubscriptionId: session.subscription || "",
            checkoutSessionId: session.id, activatedAt: updatedAt,
          });
        }
      }
      return json({ active, plan });
    }
  } catch (error: any) {
    return json({ error: error?.message || "Váratlan fizetési hiba történt." }, 500);
  }

  return json({ error: "Nem támogatott számlázási művelet." }, 405);
};
