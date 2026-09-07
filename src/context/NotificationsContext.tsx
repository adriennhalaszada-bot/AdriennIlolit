import React, { createContext, useContext, useState, useEffect } from "react";

export type NotificationCategory = "saved_search" | "price_drop" | "appointment" | "course" | "back_in_stock" | "system";

export interface AppNotification {
  id: string;
  category: NotificationCategory;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  actionUrl?: string;
  meta?: {
    oldPrice?: number;
    newPrice?: number;
    itemTitle?: string;
  };
}

export interface NotificationSettings {
  webEnabled: boolean;
  emailEnabled: boolean;
  pushEnabled: boolean;
  savedSearchAlerts: boolean;
  priceDropAlerts: boolean;
  appointmentAlerts: boolean;
  courseAlerts: boolean;
}

interface NotificationsContextType {
  notifications: AppNotification[];
  unreadCount: number;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  deleteNotification: (id: string) => void;
  clearAll: () => void;
  settings: NotificationSettings;
  updateSettings: (patch: Partial<NotificationSettings>) => void;
  addNotification: (notification: Omit<AppNotification, "id" | "timestamp" | "read">) => void;
}

const STORAGE_KEY = "ilolit_notifications_v1";
const SETTINGS_KEY = "ilolit_notification_settings_v1";

const INITIAL_MOCK_NOTIFICATIONS: AppNotification[] = [
  {
    id: "notif-1",
    category: "price_drop",
    title: "🔥 Árcsökkenés egy kedvenc járművednél!",
    message: "A BMW 320d Touring ára 9 990 000 Ft-ról 9 490 000 Ft-ra csökkent (-500 000 Ft).",
    timestamp: "2026-09-04T09:30:00Z",
    read: false,
    actionUrl: "/vehicles",
    meta: { oldPrice: 9990000, newPrice: 9490000, itemTitle: "BMW 320d Touring" }
  },
  {
    id: "notif-2",
    category: "saved_search",
    title: "🏠 Új ingatlan érkezett a mentett keresésedhez!",
    message: "Új eladó családi ház Miskolcon, 68.5 MFt (Mentett keresés: Eladó családi ház Miskolcon).",
    timestamp: "2026-09-04T08:15:00Z",
    read: false,
    actionUrl: "/real-estate"
  },
  {
    id: "notif-3",
    category: "appointment",
    title: "💅 Felszabadult időpont a kedvenc kozmetikusodnál!",
    message: "Dr. Kovács Éva szalonjában holnap 14:00-ra felszabadult egy arcesztétikai időpont.",
    timestamp: "2026-09-03T18:00:00Z",
    read: true,
    actionUrl: "/beauty"
  },
  {
    id: "notif-4",
    category: "course",
    title: "🎓 Új kurzus indult az általad követett témában!",
    message: "Megjelent a 'Full-Stack Webfejlesztő & AI Integrációs Kurzus' új évfolyama.",
    timestamp: "2026-09-02T11:00:00Z",
    read: true,
    actionUrl: "/education"
  },
  {
    id: "notif-5",
    category: "back_in_stock",
    title: "📦 Elérhető lett egy korábban kiszemelt termék!",
    message: "Az Apple MacBook Pro M2 Max ismét raktáron van kedvező áron.",
    timestamp: "2026-09-01T15:20:00Z",
    read: true,
    actionUrl: "/marketplace"
  }
];

const DEFAULT_SETTINGS: NotificationSettings = {
  webEnabled: true,
  emailEnabled: true,
  pushEnabled: false,
  savedSearchAlerts: true,
  priceDropAlerts: true,
  appointmentAlerts: true,
  courseAlerts: true,
};

const NotificationsContext = createContext<NotificationsContextType | undefined>(undefined);

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<AppNotification[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn("Could not load notifications:", e);
    }
    return INITIAL_MOCK_NOTIFICATIONS;
  });

  const [settings, setSettings] = useState<NotificationSettings>(() => {
    try {
      const saved = localStorage.getItem(SETTINGS_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn("Could not load notification settings:", e);
    }
    return DEFAULT_SETTINGS;
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications));
    } catch (e) {
      console.warn("Could not save notifications:", e);
    }
  }, [notifications]);

  useEffect(() => {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch (e) {
      console.warn("Could not save notification settings:", e);
    }
  }, [settings]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const deleteNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const clearAll = () => {
    setNotifications([]);
  };

  const updateSettings = (patch: Partial<NotificationSettings>) => {
    setSettings((prev) => ({ ...prev, ...patch }));
  };

  const addNotification = (n: Omit<AppNotification, "id" | "timestamp" | "read">) => {
    const newItem: AppNotification = {
      ...n,
      id: "notif-" + Date.now(),
      timestamp: new Date().toISOString(),
      read: false,
    };
    setNotifications((prev) => [newItem, ...prev]);
  };

  return (
    <NotificationsContext.Provider
      value={{
        notifications,
        unreadCount,
        markAsRead,
        markAllAsRead,
        deleteNotification,
        clearAll,
        settings,
        updateSettings,
        addNotification,
      }}
    >
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationsContext);
  if (!context) {
    throw new Error("useNotifications must be used within a NotificationsProvider");
  }
  return context;
}
