import app from "./app";
import { logger } from "./lib/logger";
import { startAuctionSettlementJob } from "./jobs/auctionSettlement";
import { startBeautyBookingExpiryJob } from "./jobs/beautyBookingExpiry";
import { startEscrowReleaseJob } from "./jobs/escrowRelease";

const rawPort = process.env["PORT"] || "8080";

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

app.listen(port, async (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
  startAuctionSettlementJob();
  startBeautyBookingExpiryJob();
  startEscrowReleaseJob();

  initStripe().catch((err) => {
    logger.warn({ err }, "Stripe initialization failed – payments unavailable until resolved");
  });
});

async function initStripe() {
  const { runMigrations } = await import("stripe-replit-sync");
  const { getStripeSync } = await import("./stripeClient");

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) return;

  const domains = process.env.REPLIT_DOMAINS?.split(",")[0];
  if (!domains) {
    logger.warn("REPLIT_DOMAINS not set, skipping Stripe webhook setup");
    return;
  }

  logger.info("Initializing Stripe schema…");
  await runMigrations({ databaseUrl });

  const stripeSync = await getStripeSync();
  const webhookBaseUrl = `https://${domains}`;

  await stripeSync.findOrCreateManagedWebhook(`${webhookBaseUrl}/api/stripe/webhook`);
  logger.info("Stripe webhook configured");

  stripeSync.syncBackfill().catch((err: unknown) => {
    logger.warn({ err }, "Stripe backfill error");
  });
}
