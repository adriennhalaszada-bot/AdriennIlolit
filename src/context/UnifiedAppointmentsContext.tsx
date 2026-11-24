import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useAuth, useUser } from "@clerk/react";
import {
  appointmentsApi,
  enableBrowserPushForUser,
  showPrivacySafeSystemNotification,
} from "@/lib/appointments/api";
import type {
  PushStatusResponse,
  UnifiedAppointment,
  UnifiedAppointmentCounts,
  UnifiedNotification,
  UnifiedNotificationCategory,
} from "@/lib/appointments/types";

const EMPTY_COUNTS: UnifiedAppointmentCounts = {
  all: 0,
  service: 0,
  serviceTotal: 0,
  property: 0,
  propertyTotal: 0,
  propertyPending: 0,
  propertyConfirmed: 0,
  propertyProposed: 0,
  vehicle: 0,
  vehicleTotal: 0,
  vehiclePending: 0,
  vehicleConfirmed: 0,
  vehicleProposed: 0,
  sellerVehiclePending: 0,
};

const EMPTY_CAT_COUNTS: Record<UnifiedNotificationCategory, number> = {
  INGATLAN: 0,
  JARMU: 0,
  SZOLGALTATAS: 0,
  PIACTER: 0,
  OKTATAS: 0,
};

interface UnifiedAppointmentsContextValue {
  appointments: UnifiedAppointment[];
  counts: UnifiedAppointmentCounts;
  nextUpcoming: UnifiedAppointment | null;
  remindersDue: UnifiedAppointment[];
  notifications: UnifiedNotification[];
  unreadCount: number;
  countsByCategory: Record<UnifiedNotificationCategory, number>;
  pendingPopups: UnifiedNotification[];
  pushStatus: PushStatusResponse | null;
  loading: boolean;
  realtimeConnected: boolean;
  refreshAll: () => Promise<void>;
  dismissPopup: (id: string) => Promise<void>;
  markNotificationRead: (id: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  enablePush: () => Promise<{ ok: boolean; message: string }>;
}

const UnifiedAppointmentsContext = createContext<UnifiedAppointmentsContextValue | null>(null);

export function UnifiedAppointmentsProvider({ children }: { children: React.ReactNode }) {
  const { isSignedIn } = useUser();
  const { getToken } = useAuth();

  const [appointments, setAppointments] = useState<UnifiedAppointment[]>([]);
  const [counts, setCounts] = useState<UnifiedAppointmentCounts>(EMPTY_COUNTS);
  const [nextUpcoming, setNextUpcoming] = useState<UnifiedAppointment | null>(null);
  const [remindersDue, setRemindersDue] = useState<UnifiedAppointment[]>([]);
  const [notifications, setNotifications] = useState<UnifiedNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [countsByCategory, setCountsByCategory] =
    useState<Record<UnifiedNotificationCategory, number>>(EMPTY_CAT_COUNTS);
  const [pendingPopups, setPendingPopups] = useState<UnifiedNotification[]>([]);
  const [pushStatus, setPushStatus] = useState<PushStatusResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [realtimeConnected, setRealtimeConnected] = useState(false);

  const seenSystemNotifIdsRef = useRef<Set<string>>(new Set());
  const locallyDismissedRef = useRef<Set<string>>(new Set());

  const applySyncPayload = useCallback(
    (
      apptsRes?: {
        items?: UnifiedAppointment[];
        counts?: UnifiedAppointmentCounts;
        nextUpcoming?: UnifiedAppointment | null;
        remindersDue?: UnifiedAppointment[];
      },
      notifsRes?: {
        items?: UnifiedNotification[];
        unreadCount?: number;
        countsByCategory?: Record<UnifiedNotificationCategory, number>;
        pendingPopups?: UnifiedNotification[];
      },
    ) => {
      if (apptsRes) {
        setAppointments(Array.isArray(apptsRes.items) ? apptsRes.items : []);
        setCounts(apptsRes.counts || EMPTY_COUNTS);
        setNextUpcoming(apptsRes.nextUpcoming || null);
        setRemindersDue(Array.isArray(apptsRes.remindersDue) ? apptsRes.remindersDue : []);
      }
      if (notifsRes) {
        const list = Array.isArray(notifsRes.items) ? notifsRes.items : [];
        setNotifications(list);
        setUnreadCount(Number(notifsRes.unreadCount || 0));
        setCountsByCategory(notifsRes.countsByCategory || EMPTY_CAT_COUNTS);
        const popups = (Array.isArray(notifsRes.pendingPopups) ? notifsRes.pendingPopups : []).filter(
          (p) => !locallyDismissedRef.current.has(p.id),
        );
        setPendingPopups(popups);

        // If browser push permission is granted and the tab is in the background,
        // dispatch a privacy-safe OS notification (never contains exact address).
        for (const p of popups) {
          if (!seenSystemNotifIdsRef.current.has(p.id)) {
            seenSystemNotifIdsRef.current.add(p.id);
            if (typeof document !== "undefined" && document.visibilityState === "hidden") {
              void showPrivacySafeSystemNotification({
                title: p.title,
                body: p.body,
                webUrl: p.webUrl,
                deepLink: p.deepLink,
                appointmentId: p.appointmentId,
              });
            }
          }
        }
      }
    },
    [],
  );

  const refreshAll = useCallback(async () => {
    if (!isSignedIn) return;
    try {
      const [appts, notifs, push] = await Promise.all([
        appointmentsApi.getMyAppointments(),
        appointmentsApi.getNotifications(),
        appointmentsApi.getPushStatus().catch(() => null),
      ]);
      applySyncPayload(appts, notifs);
      if (push) setPushStatus(push);
    } catch {
      // keep existing state cleanly
    }
  }, [isSignedIn, applySyncPayload]);

  // Initial load + reset when signed out
  useEffect(() => {
    if (!isSignedIn) {
      setAppointments([]);
      setCounts(EMPTY_COUNTS);
      setNextUpcoming(null);
      setRemindersDue([]);
      setNotifications([]);
      setUnreadCount(0);
      setCountsByCategory(EMPTY_CAT_COUNTS);
      setPendingPopups([]);
      setPushStatus(null);
      setRealtimeConnected(false);
      return;
    }

    setLoading(true);
    void refreshAll().finally(() => setLoading(false));
  }, [isSignedIn, refreshAll]);

  // Real-time synchronization via Server-Sent Events (SSE) + focus/visibility + resilient fallback polling
  useEffect(() => {
    if (!isSignedIn) return;

    let cancelled = false;
    let eventSource: EventSource | null = null;
    let reconnectTimer: number | null = null;

    const connectSse = async () => {
      if (cancelled) return;
      try {
        const token = await getToken();
        if (!token || cancelled) return;
        const url = `/api/appointments/stream?token=${encodeURIComponent(token)}`;
        eventSource = new EventSource(url);

        eventSource.addEventListener("sync", (evt) => {
          if (cancelled) return;
          setRealtimeConnected(true);
          try {
            const parsed = JSON.parse((evt as MessageEvent).data);
            applySyncPayload(parsed.appointments, parsed.notifications);
          } catch {
            // ignore malformed frame
          }
        });

        eventSource.addEventListener("ping", () => {
          if (!cancelled) setRealtimeConnected(true);
        });

        eventSource.onerror = () => {
          setRealtimeConnected(false);
          eventSource?.close();
          eventSource = null;
          if (!cancelled) {
            reconnectTimer = window.setTimeout(() => {
              void connectSse();
            }, 3500);
          }
        };
      } catch {
        setRealtimeConnected(false);
      }
    };

    void connectSse();

    const fallbackInterval = window.setInterval(() => {
      void refreshAll();
    }, 15000);

    const handleVisible = () => {
      if (document.visibilityState === "visible") {
        void refreshAll();
      }
    };
    window.addEventListener("focus", handleVisible);
    document.addEventListener("visibilitychange", handleVisible);

    return () => {
      cancelled = true;
      eventSource?.close();
      if (reconnectTimer) window.clearTimeout(reconnectTimer);
      window.clearInterval(fallbackInterval);
      window.removeEventListener("focus", handleVisible);
      document.removeEventListener("visibilitychange", handleVisible);
    };
  }, [isSignedIn, getToken, applySyncPayload, refreshAll]);

  const dismissPopup = useCallback(async (id: string) => {
    locallyDismissedRef.current.add(id);
    setPendingPopups((prev) => prev.filter((p) => p.id !== id));
    try {
      await appointmentsApi.dismissPopup(id);
    } catch {
      // non-fatal
    }
  }, []);

  const markNotificationRead = useCallback(async (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    setUnreadCount((prev) => Math.max(0, prev - 1));
    try {
      await appointmentsApi.markNotificationRead(id);
      await refreshAll();
    } catch {
      // non-fatal
    }
  }, [refreshAll]);

  const markAllNotificationsRead = useCallback(async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
    setCountsByCategory(EMPTY_CAT_COUNTS);
    try {
      await appointmentsApi.markNotificationRead();
    } catch {
      // non-fatal
    }
  }, []);

  const deleteNotification = useCallback(async (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    try {
      await appointmentsApi.deleteNotification(id);
      await refreshAll();
    } catch {
      // non-fatal
    }
  }, [refreshAll]);

  const enablePush = useCallback(async () => {
    const res = await enableBrowserPushForUser(pushStatus?.vapidPublicKey);
    if (res.ok) {
      const status = await appointmentsApi.getPushStatus().catch(() => null);
      if (status) setPushStatus(status);
    }
    return { ok: res.ok, message: res.message };
  }, [pushStatus?.vapidPublicKey]);

  return (
    <UnifiedAppointmentsContext.Provider
      value={{
        appointments,
        counts,
        nextUpcoming,
        remindersDue,
        notifications,
        unreadCount,
        countsByCategory,
        pendingPopups,
        pushStatus,
        loading,
        realtimeConnected,
        refreshAll,
        dismissPopup,
        markNotificationRead,
        markAllNotificationsRead,
        deleteNotification,
        enablePush,
      }}
    >
      {children}
    </UnifiedAppointmentsContext.Provider>
  );
}

export function useUnifiedAppointments() {
  const ctx = useContext(UnifiedAppointmentsContext);
  if (!ctx) {
    return {
      appointments: [] as UnifiedAppointment[],
      counts: EMPTY_COUNTS,
      nextUpcoming: null,
      remindersDue: [] as UnifiedAppointment[],
      notifications: [] as UnifiedNotification[],
      unreadCount: 0,
      countsByCategory: EMPTY_CAT_COUNTS,
      pendingPopups: [] as UnifiedNotification[],
      pushStatus: null,
      loading: false,
      realtimeConnected: false,
      refreshAll: async () => {},
      dismissPopup: async () => {},
      markNotificationRead: async () => {},
      markAllNotificationsRead: async () => {},
      deleteNotification: async () => {},
      enablePush: async () => ({ ok: false, message: "" }),
    };
  }
  return ctx;
}
