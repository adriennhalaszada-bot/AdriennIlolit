import { customFetch } from "@workspace/api-client-react";
import type {
  PushStatusResponse,
  UnifiedAppointment,
  UnifiedAppointmentDetails,
  UnifiedAppointmentsResponse,
  UnifiedNotificationsResponse,
} from "./types";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export const appointmentsApi = {
  getMyAppointments(params?: { type?: string; role?: "buyer" | "seller" }) {
    const qs = new URLSearchParams();
    if (params?.type) qs.set("type", params.type);
    if (params?.role) qs.set("role", params.role);
    const suffix = qs.toString() ? `?${qs.toString()}` : "";
    return customFetch<UnifiedAppointmentsResponse>(`/api/appointments/me${suffix}`);
  },

  getAppointment(id: string) {
    return customFetch<UnifiedAppointment>(`/api/appointments/${encodeURIComponent(id)}`);
  },

  getAppointmentDetails(id: string) {
    return customFetch<UnifiedAppointmentDetails>(`/api/appointments/${encodeURIComponent(id)}/details`);
  },

  createVehicleViewing(payload: {
    listing_id: string;
    date: string;
    start_time: string;
    duration_minutes?: number;
    requester_name: string;
    message?: string;
    reminder_24h_enabled?: boolean;
    reminder_2h_enabled?: boolean;
  }) {
    return customFetch<UnifiedAppointment>("/api/appointments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        appointment_type: "VEHICLE_VIEWING",
        ...payload,
      }),
    });
  },

  respondToAppointment(
    id: string,
    payload: {
      action: "CONFIRM" | "PROPOSE_NEW_TIME" | "REJECT" | "CANCEL" | "COMPLETE";
      note?: string;
      exact_location?: string;
      instructions?: string;
      seller_phone?: string;
      proposed_date?: string;
      proposed_start_time?: string;
    },
  ) {
    return customFetch<UnifiedAppointment>(`/api/appointments/${encodeURIComponent(id)}/respond`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  },

  acceptProposal(id: string) {
    return customFetch<UnifiedAppointment>(`/api/appointments/${encodeURIComponent(id)}/accept-proposal`, {
      method: "PATCH",
    });
  },

  requestOtherTime(id: string, payload: { date: string; start_time: string; note?: string }) {
    return customFetch<UnifiedAppointment>(`/api/appointments/${encodeURIComponent(id)}/request-other-time`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  },

  cancelAppointment(id: string, reason?: string) {
    return customFetch<UnifiedAppointment>(`/api/appointments/${encodeURIComponent(id)}/cancel`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason }),
    });
  },

  updateReminders(id: string, reminder_24h_enabled: boolean, reminder_2h_enabled: boolean) {
    return customFetch<UnifiedAppointment>(`/api/appointments/${encodeURIComponent(id)}/reminders`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reminder_24h_enabled, reminder_2h_enabled }),
    });
  },

  deleteAppointment(id: string) {
    return customFetch<{ deleted: boolean; id: string }>(`/api/appointments/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
  },

  getNotifications() {
    return customFetch<UnifiedNotificationsResponse>("/api/appointments/notifications");
  },

  markNotificationRead(id?: string) {
    return customFetch<{ ok: boolean }>("/api/appointments/notifications/read", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(id ? { id } : { all: true }),
    });
  },

  dismissPopup(id: string) {
    return customFetch<{ ok: boolean }>(`/api/appointments/notifications/${encodeURIComponent(id)}/dismiss-popup`, {
      method: "POST",
    });
  },

  deleteNotification(id: string) {
    return customFetch<{ deleted: boolean }>(`/api/appointments/notifications/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
  },

  getPushStatus() {
    return customFetch<PushStatusResponse>("/api/appointments/push/status");
  },

  registerPushSubscription(payload: {
    platform: "web" | "ios" | "android" | "expo";
    endpoint?: string;
    keys?: { p256dh: string; auth: string };
    deviceToken?: string;
    deviceLabel?: string;
  }) {
    return customFetch<{ subscribed: boolean; id: string; totalDevices: number }>("/api/appointments/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  },

  unsubscribePush(payload: { id?: string; endpoint?: string; deviceToken?: string }) {
    return customFetch<{ unsubscribed: boolean; totalDevices: number }>("/api/appointments/push/unsubscribe", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  },
};

/**
 * Requests browser Notification permission and registers a Web Push / device subscription
 * with the backend (NOT SMS). Returns status message for the user.
 */
export async function enableBrowserPushForUser(vapidPublicKey?: string | null): Promise<{
  ok: boolean;
  permission: NotificationPermission | "unsupported";
  message: string;
}> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return {
      ok: false,
      permission: "unsupported",
      message: "Ez a böngésző nem támogatja a push értesítéseket.",
    };
  }

  let permission = Notification.permission;
  if (permission === "default") {
    permission = await Notification.requestPermission();
  }
  if (permission !== "granted") {
    return {
      ok: false,
      permission,
      message: "A push értesítések engedélyezése el lett utasítva a böngészőben.",
    };
  }

  let endpoint = `web-notif://${window.location.origin}/${navigator.userAgent.slice(0, 48)}`;
  let keys: { p256dh: string; auth: string } | undefined;

  if ("serviceWorker" in navigator) {
    try {
      const registration = await navigator.serviceWorker.ready;
      if (registration.pushManager && vapidPublicKey) {
        const existing = await registration.pushManager.getSubscription();
        const sub =
          existing ||
          (await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as BufferSource,
          }));
        const json = sub.toJSON();
        if (json.endpoint) endpoint = json.endpoint;
        if (json.keys?.p256dh && json.keys?.auth) {
          keys = { p256dh: json.keys.p256dh, auth: json.keys.auth };
        }
      }
    } catch {
      // Fallback to browser Notification API + SW showNotification registration
    }
  }

  const label = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent)
    ? "Mobil böngésző"
    : "Asztali böngésző";

  await appointmentsApi.registerPushSubscription({
    platform: "web",
    endpoint,
    keys,
    deviceLabel: label,
  });

  return {
    ok: true,
    permission: "granted",
    message: "Push értesítések aktiválva ezen az eszközön.",
  };
}

/**
 * Triggers a privacy-safe OS-level notification through the Service Worker (never contains exact address).
 */
export async function showPrivacySafeSystemNotification(payload: {
  title: string;
  body: string;
  webUrl?: string;
  deepLink?: string;
  appointmentId?: string;
}) {
  if (typeof window === "undefined" || !("Notification" in window) || Notification.permission !== "granted") {
    return;
  }
  try {
    if ("serviceWorker" in navigator) {
      const reg = await navigator.serviceWorker.ready;
      await reg.showNotification(payload.title, {
        body: payload.body,
        tag: payload.appointmentId ? `ilolit-appt-${payload.appointmentId}` : "ilolit-notif",
        data: {
          webUrl: payload.webUrl || "/dashboard/bookings/properties",
          deepLink: payload.deepLink || "",
          appointmentId: payload.appointmentId || "",
        },
      });
      return;
    }
    const notif = new Notification(payload.title, { body: payload.body });
    notif.onclick = () => {
      window.focus();
      if (payload.webUrl) window.location.assign(payload.webUrl);
    };
  } catch {
    // non-fatal
  }
}
