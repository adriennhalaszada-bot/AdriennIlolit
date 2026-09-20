import { customFetch } from "@workspace/api-client-react";

export interface ProviderBookingRecord {
  id: string;
  providerId: string;
  providerName: string;
  serviceId: string;
  serviceName: string;
  price: number;
  durationMinutes: number;
  depositAmount: number;
  bookingDate: string;
  bookingTime: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  notes?: string;
  status: "PENDING" | "CONFIRMED" | "REJECTED" | "CANCELLED";
  role?: "provider" | "customer";
  createdAt: string;
  updatedAt: string;
}

export interface CreateProviderBookingInput {
  providerId: string;
  serviceId: string;
  bookingDate: string;
  bookingTime: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  notes?: string;
}

export function createProviderBooking(input: CreateProviderBookingInput) {
  return customFetch<ProviderBookingRecord>("/api/bookings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
}

export function getMyProviderBookings() {
  return customFetch<{ items: ProviderBookingRecord[]; total: number }>("/api/bookings/me");
}

export function respondToProviderBooking(id: string, status: "CONFIRMED" | "REJECTED") {
  return customFetch<ProviderBookingRecord>(`/api/bookings/${encodeURIComponent(id)}/respond`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
}

export function cancelProviderBooking(id: string) {
  return customFetch<ProviderBookingRecord>(`/api/bookings/${encodeURIComponent(id)}/cancel`, { method: "PATCH" });
}
