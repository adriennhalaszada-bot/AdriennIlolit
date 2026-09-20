import { customFetch } from "@workspace/api-client-react";

export type SubscriptionPlan = "monthly" | "yearly";

export function createProviderSubscriptionCheckout(plan: SubscriptionPlan, email: string) {
  return customFetch<{ checkoutUrl: string }>("/api/billing/provider-subscription", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ plan, email }),
  });
}

export function confirmProviderSubscription(sessionId: string) {
  return customFetch<{ active: boolean; plan?: SubscriptionPlan }>(
    `/api/billing/provider-subscription/status?session_id=${encodeURIComponent(sessionId)}`,
  );
}

export function createProviderBillingPortal() {
  return customFetch<{ portalUrl: string }>("/api/billing/provider-subscription/portal", {
    method: "POST",
  });
}

export function createBookingDepositCheckout(bookingId: string) {
  return customFetch<{ checkoutUrl: string }>("/api/billing/booking-deposit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ bookingId }),
  });
}

export function confirmBookingDeposit(sessionId: string) {
  return customFetch<{ paid: boolean; bookingId: string }>(
    `/api/billing/booking-deposit/status?session_id=${encodeURIComponent(sessionId)}`,
  );
}
