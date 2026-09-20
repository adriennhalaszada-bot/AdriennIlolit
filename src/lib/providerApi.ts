import { customFetch } from "@workspace/api-client-react";

export interface ProviderServiceRecord {
  id: string;
  name: string;
  description?: string;
  price: number;
  durationMinutes: number;
  requiresDeposit?: boolean;
  depositPercentage?: number;
  deposit?: number;
  isAvailable?: boolean;
}

export interface ProviderSlotRecord {
  id: string;
  day: string;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
}

export interface ProviderProfileRecord {
  id?: string;
  exists?: boolean;
  displayName: string;
  category: string;
  subCategory: string;
  city: string;
  region?: string;
  address: string;
  phone: string;
  email: string;
  bio: string;
  videoUrl: string;
  profileImage: string;
  profileImages?: string[];
  publishPortfolio?: boolean;
  themeId: string;
  services: ProviderServiceRecord[];
  slots: ProviderSlotRecord[];
  isPublished?: boolean;
  subscription?: {
    status: "active" | "trialing" | "past_due" | "unpaid" | "cancelled" | "inactive";
    plan?: "monthly" | "yearly";
    stripeCustomerId?: string;
    stripeSubscriptionId?: string;
    checkoutSessionId?: string;
    activatedAt?: string;
    cancelledAt?: string;
    currentPeriodEnd?: string;
    cancelAtPeriodEnd?: boolean;
  };
  updatedAt?: string;
}

export function getMyProviderProfile() {
  return customFetch<ProviderProfileRecord>("/api/providers/me");
}

export function getProviderProfile(id: string) {
  return customFetch<ProviderProfileRecord>(`/api/providers/${encodeURIComponent(id)}`);
}

export function saveMyProviderProfile(profile: ProviderProfileRecord) {
  return customFetch<ProviderProfileRecord>("/api/providers/me", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(profile),
  });
}
