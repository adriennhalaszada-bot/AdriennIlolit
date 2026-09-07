import { db } from "@workspace/db";
import { beautyBookingsTable, beautyProvidersTable, notificationsTable } from "@workspace/db";
import { eq, and, lte } from "drizzle-orm";
import { newId } from "../lib/ids";
import { logger } from "../lib/logger";

async function expirePendingBookings() {
  const now = new Date();

  const expired = await db.query.beautyBookingsTable.findMany({
    where: and(
      eq(beautyBookingsTable.status, "PENDING"),
      lte(beautyBookingsTable.expiresAt, now),
    ),
  });

  for (const booking of expired) {
    try {
      await db
        .update(beautyBookingsTable)
        .set({ status: "CANCELLED", cancelledAt: new Date() })
        .where(eq(beautyBookingsTable.id, booking.id));

      const provider = await db.query.beautyProvidersTable.findFirst({
        where: eq(beautyProvidersTable.id, booking.providerId),
      });

      await db.insert(notificationsTable).values({
        id: newId(),
        userId: booking.customerId,
        type: "system",
        title: "Foglalás lejárt",
        message: `A(z) ${booking.bookingDate} ${booking.bookingTime} időpontú foglalásod lejárt, mert a szolgáltató nem válaszolt 48 órán belül.`,
        link: `/beauty/bookings/${booking.id}`,
      });

      if (provider) {
        await db.insert(notificationsTable).values({
          id: newId(),
          userId: provider.userId,
          type: "system",
          title: "Foglalás lejárt",
          message: `Egy foglalás automatikusan lejárt, mert nem válaszoltál 48 órán belül.`,
          link: `/beauty/bookings/${booking.id}`,
        });
      }

      logger.info({ bookingId: booking.id }, "Beauty booking expired (48h no response)");
    } catch (err) {
      logger.error({ err, bookingId: booking.id }, "Error expiring beauty booking");
    }
  }
}

export function startBeautyBookingExpiryJob() {
  const INTERVAL_MS = 5 * 60 * 1000;
  expirePendingBookings().catch((err) => logger.error({ err }, "Initial beauty booking expiry failed"));
  setInterval(() => {
    expirePendingBookings().catch((err) => logger.error({ err }, "Beauty booking expiry job failed"));
  }, INTERVAL_MS);
  logger.info("Beauty booking expiry job started (5min interval)");
}
