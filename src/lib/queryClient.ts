import { QueryClient } from "@tanstack/react-query";

function shouldRetry(failureCount: number, error: unknown): boolean {
  if (error != null && typeof error === "object" && "status" in error) {
    const status = (error as { status: number }).status;
    if (status === 401 || status === 403 || status === 404) {
      return false;
    }
  }
  return failureCount < 2;
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 0,
      gcTime: 60_000,
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      refetchOnMount: "always",
      retry: shouldRetry,
    },
    mutations: {
      retry: false,
    },
  },
});

const DOMAIN_QUERY_PREFIXES: Record<string, string[]> = {
  listings: ["/api/listings", "listings", "my-listings", "search", "universal-search", "home-listings"],
  real_estate: [
    "real-estate",
    "real-estate-list",
    "real-estate-detail",
    "real-estate-my-properties",
    "real-estate-viewings",
    "real-estate-admin",
    "/api/real-estate",
  ],
  vehicles: [
    "vehicles-list",
    "vehicle-detail",
    "my-vehicle-listings",
    "my-vehicle-bookings-admin",
    "vehicle-admin-messages",
    "vehicles-custom-catalog",
    "vehicle-pricing-config",
    "my-dealer-profile",
    "vehicle-saved-searches",
    "vehicle-price-alerts",
    "/api/vehicles",
  ],
  providers: ["providers", "provider", "beauty", "/api/providers"],
  bookings: ["bookings", "provider-bookings", "/api/bookings", "appointments"],
  appointments: ["appointments", "real-estate-viewings", "my-vehicle-bookings-admin", "/api/appointments"],
  education: ["education", "courses", "/api/education"],
  search: ["/api/listings", "vehicles-list", "real-estate-list", "providers", "universal-search"],
  favorites: ["favorites", "saved-searches", "vehicle-saved-searches", "vehicle-price-alerts", "/api/preferences"],
  reviews: ["reviews", "/api/reviews", "/api/listings"],
  messages: ["conversations", "messages", "vehicle-admin-messages", "/api/conversations"],
  notifications: ["notifications", "/api/appointments", "/api/preferences"],
  subscriptions: ["providers", "subscription", "/api/billing", "/api/providers"],
  payments: ["transactions", "seller-payout-summary", "real-estate", "my-listings", "/api/transactions", "/api/billing"],
  coupons: ["coupons", "/api/system/coupons"],
  commissions: ["transactions", "seller-payout-summary", "commissions", "/api/transactions"],
  admin: ["admin", "system-ops-dashboard", "vehicles-custom-catalog", "vehicle-pricing-config"],
  stats: ["system-stats", "system-ops-dashboard", "/api/system/stats"],
  profile: ["/api/auth/me", "/api/users", "me"],
  system_ops: ["system-ops-dashboard", "system-ops-access", "/api/system/ops"],
};

/**
 * Targeted, event-driven React Query cache invalidation.
 * Never wipes unrelated caches blindly; immediately refetches active queries in the affected domain.
 */
export function invalidateQueriesByDomain(domain: string): void {
  const prefixes = DOMAIN_QUERY_PREFIXES[domain];
  if (!prefixes || prefixes.length === 0) {
    void queryClient.invalidateQueries({ refetchType: "active" });
    return;
  }
  void queryClient.invalidateQueries({
    refetchType: "active",
    predicate: (query) => {
      const keyStr = JSON.stringify(query.queryKey).toLowerCase();
      return prefixes.some((p) => keyStr.includes(p.toLowerCase()));
    },
  });
}
