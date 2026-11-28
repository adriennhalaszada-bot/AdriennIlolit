import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useAuth, useUser } from "@clerk/react";
import { customFetch } from "@workspace/api-client-react";
import { invalidateQueriesByDomain } from "@/lib/queryClient";
import { useUnifiedAppointments } from "./UnifiedAppointmentsContext";

export interface RealtimeSyncContextValue {
  connected: boolean;
  globalVersion: number;
  lastSyncAt: string | null;
  isDeveloper: boolean;
  developerChecked: boolean;
  notifyLocalMutation: (domain: string) => void;
}

const RealtimeSyncContext = createContext<RealtimeSyncContextValue>({
  connected: false,
  globalVersion: 0,
  lastSyncAt: null,
  isDeveloper: false,
  developerChecked: false,
  notifyLocalMutation: () => {},
});

const CHANNEL_NAME = "ilolit-realtime-sync";

export function RealtimeSyncProvider({ children }: { children: React.ReactNode }) {
  const { isSignedIn, user } = useUser();
  const { getToken } = useAuth();
  const { refreshAll: refreshAppointments } = useUnifiedAppointments();

  const [connected, setConnected] = useState(false);
  const [globalVersion, setGlobalVersion] = useState(0);
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);
  const [isDeveloper, setIsDeveloper] = useState(false);
  const [developerChecked, setDeveloperChecked] = useState(false);

  const prevVersionsRef = useRef<Record<string, number>>({});
  const prevUserDomainsRef = useRef<Record<string, number>>({});
  const initializedRef = useRef(false);
  const channelRef = useRef<BroadcastChannel | null>(null);

  const triggerDomainRefresh = useCallback(
    (domain: string) => {
      invalidateQueriesByDomain(domain);
      if (["appointments", "notifications", "bookings", "messages"].includes(domain)) {
        void refreshAppointments();
      }
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("ilolit:realtime-update", { detail: { domain, ts: Date.now() } }));
      }
    },
    [refreshAppointments],
  );

  const notifyLocalMutation = useCallback(
    (domain: string) => {
      triggerDomainRefresh(domain);
      try {
        channelRef.current?.postMessage({ type: "domain-mutated", domain, ts: Date.now() });
      } catch {
        // ignore BroadcastChannel errors on restricted browsers
      }
    },
    [triggerDomainRefresh],
  );

  // Check strict server-side developer access (normal users and non-developer admins get false)
  useEffect(() => {
    let active = true;
    if (!isSignedIn) {
      setIsDeveloper(false);
      setDeveloperChecked(true);
      return;
    }
    customFetch<{ isDeveloper: boolean }>("/api/system/ops/access")
      .then((res) => {
        if (active) {
          setIsDeveloper(Boolean(res?.isDeveloper));
          setDeveloperChecked(true);
        }
      })
      .catch(() => {
        if (active) {
          setIsDeveloper(false);
          setDeveloperChecked(true);
        }
      });
    return () => {
      active = false;
    };
  }, [isSignedIn, user?.id]);

  // Cross-tab instant synchronization via BroadcastChannel + custom-fetch local mutation hook
  useEffect(() => {
    if (typeof window === "undefined") return;

    if ("BroadcastChannel" in window) {
      try {
        const ch = new BroadcastChannel(CHANNEL_NAME);
        channelRef.current = ch;
        ch.onmessage = (evt) => {
          const data = evt.data;
          if (data?.type === "domain-mutated" && typeof data.domain === "string") {
            triggerDomainRefresh(data.domain);
          }
        };
      } catch {
        channelRef.current = null;
      }
    }

    const handleLocalMutation = (e: Event) => {
      const detail = (e as CustomEvent<{ domain?: string }>).detail;
      if (detail?.domain) {
        notifyLocalMutation(detail.domain);
      }
    };
    window.addEventListener("ilolit:local-mutation", handleLocalMutation);

    return () => {
      window.removeEventListener("ilolit:local-mutation", handleLocalMutation);
      try {
        channelRef.current?.close();
      } catch {
        // ignore
      }
      channelRef.current = null;
    };
  }, [triggerDomainRefresh, notifyLocalMutation]);

  // Live Server-Sent Events (/api/system/events) for 0-3s cross-device updates
  useEffect(() => {
    let cancelled = false;
    let es: EventSource | null = null;
    let reconnectTimer: number | null = null;

    const applyVersionFrame = (frame: {
      globalVersion?: number;
      versions?: Record<string, number>;
      userDomains?: Record<string, number>;
      updatedAt?: string;
    }) => {
      if (!frame) return;
      const nextGlobal = Number(frame.globalVersion || 0);
      setGlobalVersion(nextGlobal);
      setLastSyncAt(frame.updatedAt || new Date().toISOString());

      const nextVersions = frame.versions || {};
      const nextUserDomains = frame.userDomains || {};

      if (!initializedRef.current) {
        prevVersionsRef.current = { ...nextVersions };
        prevUserDomainsRef.current = { ...nextUserDomains };
        initializedRef.current = true;
        return;
      }

      const changed = new Set<string>();
      for (const [domain, ver] of Object.entries(nextVersions)) {
        if ((prevVersionsRef.current[domain] || 0) !== ver) {
          changed.add(domain);
        }
      }
      for (const [domain, ver] of Object.entries(nextUserDomains)) {
        if ((prevUserDomainsRef.current[domain] || 0) !== ver) {
          changed.add(domain);
        }
      }

      prevVersionsRef.current = { ...nextVersions };
      prevUserDomainsRef.current = { ...nextUserDomains };

      changed.forEach((domain) => triggerDomainRefresh(domain));
    };

    const connect = async () => {
      if (cancelled) return;
      try {
        let url = "/api/system/events";
        if (isSignedIn) {
          const token = await getToken().catch(() => null);
          if (token) url += `?token=${encodeURIComponent(token)}`;
        }
        if (cancelled) return;
        es = new EventSource(url);

        es.addEventListener("version", (evt) => {
          if (cancelled) return;
          setConnected(true);
          try {
            applyVersionFrame(JSON.parse((evt as MessageEvent).data));
          } catch {
            // ignore malformed frame
          }
        });

        es.addEventListener("ping", () => {
          if (!cancelled) setConnected(true);
        });

        es.onerror = () => {
          setConnected(false);
          es?.close();
          es = null;
          if (!cancelled) {
            reconnectTimer = window.setTimeout(() => {
              void connect();
            }, 3500);
          }
        };
      } catch {
        setConnected(false);
      }
    };

    void connect();

    // Lightweight focus/visibility re-sync to catch any missed events while tab slept
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        fetch("/api/system/state", { cache: "no-store" })
          .then((r) => (r.ok ? r.json() : null))
          .then((data) => {
            if (data && !cancelled) applyVersionFrame(data);
          })
          .catch(() => {});
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      cancelled = true;
      es?.close();
      if (reconnectTimer) window.clearTimeout(reconnectTimer);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [isSignedIn, getToken, triggerDomainRefresh]);

  return (
    <RealtimeSyncContext.Provider
      value={{
        connected,
        globalVersion,
        lastSyncAt,
        isDeveloper,
        developerChecked,
        notifyLocalMutation,
      }}
    >
      {children}
    </RealtimeSyncContext.Provider>
  );
}

export function useRealtimeSync() {
  return useContext(RealtimeSyncContext);
}
