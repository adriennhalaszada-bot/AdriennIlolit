import type Stripe from "stripe";
import {
  getStripeSync,
  getUncachableStripeClient,
  getStripeWebhookSecret,
} from "./stripeClient";
import { db } from "@workspace/db";
import { transactionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

export class WebhookHandlers {
  static async processWebhook(
    payload: Buffer,
    signature: string,
  ): Promise<void> {
    if (!Buffer.isBuffer(payload)) {
      throw new Error(
        "STRIPE WEBHOOK ERROR: Payload must be a Buffer. " +
          "Received type: " +
          typeof payload +
          ". " +
          "This usually means express.json() parsed the body before reaching this handler. " +
          "FIX: Ensure webhook route is registered BEFORE app.use(express.json()).",
      );
    }

    const stripe = await getUncachableStripeClient();
    const webhookSecret = await getStripeWebhookSecret();

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    } catch {
      throw new Error("Webhook signature verification failed");
    }

    const sync = await getStripeSync();
    await sync.processWebhook(payload, signature);

    const now = new Date();

    if (event.type === "payment_intent.succeeded") {
      const pi = event.data.object as Stripe.PaymentIntent;
      const txId = pi.metadata?.transactionId;
      if (txId) {
        await db
          .update(transactionsTable)
          .set({ status: "PAID_PENDING_CONFIRMATION", paidAt: now, updatedAt: now })
          .where(eq(transactionsTable.id, txId));
      } else {
        await db
          .update(transactionsTable)
          .set({ status: "PAID_PENDING_CONFIRMATION", paidAt: now, updatedAt: now })
          .where(eq(transactionsTable.paymentIntentId, pi.id));
      }
    }

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const txId = session.metadata?.transactionId;
      const piId =
        typeof session.payment_intent === "string"
          ? session.payment_intent
          : (session.payment_intent as Stripe.PaymentIntent | null)?.id;

      if (txId) {
        await db
          .update(transactionsTable)
          .set({
            status: "PAID_PENDING_CONFIRMATION",
            paymentIntentId: piId ?? null,
            paidAt: now,
            updatedAt: now,
          })
          .where(eq(transactionsTable.id, txId));
      }
    }
  }
}
