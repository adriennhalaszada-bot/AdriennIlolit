import React, { createContext, useContext, useState, useEffect } from "react";
import { customFetch } from "@workspace/api-client-react";

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
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [settings, setSettings] = useState<NotificationSettings>(DEFAULT_SETTINGS);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    customFetch<{ items: AppNotification[]; settings: NotificationSettings | null }>("/api/preferences/notifications")
      .then((data) => {
        setNotifications(Array.isArray(data.items) ? data.items : []);
        if (data.settings) setSettings({ ...DEFAULT_SETTINGS, ...data.settings });
      })
      .catch(() => setNotifications([]))
      .finally(() => setHydrated(true));
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    customFetch("/api/preferences/notifications", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: notifications, settings }),
    }).catch((error) => console.warn("Az értesítések mentése sikertelen:", error));
  }, [notifications, settings, hydrated]);

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
