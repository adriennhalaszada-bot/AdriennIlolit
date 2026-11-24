// Shared unified notifications + device/web push dispatch helper for Cloudflare Pages Functions.
// IMPORTANT: Push notifications are strictly device-token / Web Push subscription based (NEVER SMS).
// Privacy-by-design: Push notification text MUST NEVER contain exact street addresses.

export interface UnifiedNotificationEnv {
  MEDIA_BUCKET: R2Bucket;
  VAPID_PUBLIC_KEY?: string;
}

export type UnifiedNotificationCategory =
  | "INGATLAN"
  | "JARMU"
  | "SZOLGALTATAS"
  | "PIACTER"
  | "OKTATAS";

export type AppointmentEventType =
  | "APPOINTMENT_REQUESTED"
  | "APPOINTMENT_CONFIRMED"
  | "APPOINTMENT_PROPOSED_NEW_TIME"
  | "APPOINTMENT_REJECTED"
  | "APPOINTMENT_CANCELLED"
  | "APPOINTMENT_COMPLETED"
  | "APPOINTMENT_REMINDER_24H"
  | "APPOINTMENT_REMINDER_2H"
  | "GENERAL";

export interface UnifiedNotificationRecord {
  id: string;
  userId: string;
  category: UnifiedNotificationCategory;
  eventType: AppointmentEventType;
  title: string;
  body: string;
  appointmentId?: string;
  appointmentType?: "SERVICE" | "PROPERTY_VIEWING" | "VEHICLE_VIEWING";
  listingId?: string;
  listingTitle?: string;
  coverImage?: string;
  date?: string;
  startTime?: string;
  shortLocation?: string;
  deepLink?: string;
  webUrl?: string;
  read: boolean;
  popupRequired?: boolean;
  popupDismissed?: boolean;
  dedupeKey?: string;
  createdAt: string;
}

export interface StoredPushSubscription {
  id: string;
  platform: "web" | "ios" | "android" | "expo";
  endpoint?: string;
  keys?: {
    p256dh: string;
    auth: string;
  };
  deviceToken?: string;
  deviceLabel?: string;
  createdAt: string;
  updatedAt: string;
}

export const UNIFIED_NOTIF_PREFIX = "data/unified-notifications/";
export const PUSH_SUB_PREFIX = "data/push-subscriptions/";

async function readJson<T = any>(env: UnifiedNotificationEnv, key: string): Promise<T | null> {
  const obj = await env.MEDIA_BUCKET.get(key);
  if (!obj) return null;
  try {
    return await obj.json<T>();
  } catch {
    return null;
  }
}

async function writeJson(env: UnifiedNotificationEnv, key: string, value: unknown): Promise<void> {
  await env.MEDIA_BUCKET.put(key, JSON.stringify(value), {
    httpMetadata: { contentType: "application/json" },
  });
}

export function buildAppointmentLinks(
  appointmentType: "SERVICE" | "PROPERTY_VIEWING" | "VEHICLE_VIEWING",
  appointmentId: string,
): { deepLink: string; webUrl: string } {
  if (appointmentType === "PROPERTY_VIEWING") {
    return {
      deepLink: `ilolit://appointments/property/${appointmentId}`,
      webUrl: `/appointments/property/${appointmentId}`,
    };
  }
  if (appointmentType === "VEHICLE_VIEWING") {
    return {
      deepLink: `ilolit://appointments/vehicle/${appointmentId}`,
      webUrl: `/appointments/vehicle/${appointmentId}`,
    };
  }
  return {
    deepLink: `ilolit://appointments/service/${appointmentId}`,
    webUrl: `/dashboard/bookings/services`,
  };
}

/**
 * Dispatches privacy-safe push notifications to registered mobile device tokens (Expo/APNs/FCM)
 * when available. Never sends SMS to phone numbers and never includes exact street addresses.
 */
export async function dispatchDevicePush(
  env: UnifiedNotificationEnv,
  userId: string,
  payload: {
    title: string;
    body: string;
    deepLink?: string;
    webUrl?: string;
    appointmentId?: string;
    appointmentType?: string;
  },
): Promise<{ attempted: number; delivered: number }> {
  const subs = (await readJson<StoredPushSubscription[]>(env, `${PUSH_SUB_PREFIX}${userId}.json`)) || [];
  if (subs.length === 0) return { attempted: 0, delivered: 0 };

  const expoTokens = subs
    .filter((s) => s.deviceToken && s.deviceToken.startsWith("ExponentPushToken["))
    .map((s) => s.deviceToken as string);

  let delivered = 0;
  if (expoTokens.length > 0) {
    try {
      const messages = expoTokens.map((to) => ({
        to,
        sound: "default",
        title: payload.title,
        body: payload.body,
        data: {
          appointmentId: payload.appointmentId,
          appointmentType: payload.appointmentType,
          deepLink: payload.deepLink,
          webUrl: payload.webUrl,
        },
      }));
      const res = await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(messages),
      });
      if (res.ok) delivered += expoTokens.length;
    } catch {
      // Non-fatal: web/in-app real-time notifications still deliver cleanly.
    }
  }

  return { attempted: subs.length, delivered };
}

export async function emitUnifiedNotification(
  env: UnifiedNotificationEnv,
  userId: string,
  input: Omit<UnifiedNotificationRecord, "id" | "userId" | "read" | "createdAt">,
  options?: { sendPush?: boolean; pushTitle?: string; pushBody?: string },
): Promise<UnifiedNotificationRecord> {
  const key = `${UNIFIED_NOTIF_PREFIX}${userId}.json`;
  const existing = (await readJson<UnifiedNotificationRecord[]>(env, key)) || [];

  if (input.dedupeKey && existing.some((item) => item.dedupeKey === input.dedupeKey)) {
    return existing.find((item) => item.dedupeKey === input.dedupeKey)!;
  }

  const record: UnifiedNotificationRecord = {
    id: crypto.randomUUID(),
    userId,
    ...input,
    read: false,
    popupDismissed: false,
    createdAt: new Date().toISOString(),
  };

  const next = [record, ...existing].slice(0, 250);
  await writeJson(env, key, next);

  if (options?.sendPush !== false) {
    await dispatchDevicePush(env, userId, {
      title: options?.pushTitle || record.title,
      body: options?.pushBody || record.body,
      deepLink: record.deepLink,
      webUrl: record.webUrl,
      appointmentId: record.appointmentId,
      appointmentType: record.appointmentType,
    });
  }

  return record;
}
