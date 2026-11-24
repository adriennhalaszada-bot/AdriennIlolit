import { customFetch } from "@workspace/api-client-react";
import type {
  ApprovedViewingDetails,
  AuditLogEntry,
  ModerationLogOverview,
  PhoneVerificationStatus,
  PropertyMessage,
  PropertyStatus,
  RealEstateNotification,
  RealEstateProperty,
  ViewingPurpose,
  ViewingRequest,
  ViewingSlot,
} from "./types";

export const realEstateApi = {
  // Public & owner property listing
  listProperties(params?: { mine?: boolean; transactionType?: string; category?: string }) {
    const query = new URLSearchParams();
    if (params?.mine) query.set("mine", "true");
    if (params?.transactionType && params.transactionType !== "all") {
      query.set("transactionType", params.transactionType);
    }
    if (params?.category && params.category !== "all") {
      query.set("category", params.category);
    }
    const qs = query.toString();
    return customFetch<{ items: RealEstateProperty[]; total: number }>(
      `/api/real-estate/properties${qs ? `?${qs}` : ""}`,
    );
  },

  getProperty(id: string) {
    return customFetch<RealEstateProperty>(`/api/real-estate/properties/${encodeURIComponent(id)}`);
  },

  createProperty(payload: Partial<RealEstateProperty> & { submitForPayment?: boolean }) {
    return customFetch<RealEstateProperty>("/api/real-estate/properties", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  },

  updateProperty(id: string, payload: Partial<RealEstateProperty>) {
    return customFetch<RealEstateProperty>(`/api/real-estate/properties/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  },

  updatePropertyStatus(id: string, status: PropertyStatus) {
    return customFetch<RealEstateProperty>(`/api/real-estate/properties/${encodeURIComponent(id)}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
  },

  testActivateProperty(id: string) {
    return customFetch<RealEstateProperty>(
      `/api/real-estate/properties/${encodeURIComponent(id)}/test-activate`,
      { method: "POST" },
    );
  },

  createTestViewing(propertyId: string) {
    return customFetch<ViewingRequest>(
      `/api/real-estate/properties/${encodeURIComponent(propertyId)}/test-viewing`,
      { method: "POST" },
    );
  },

  toggleFavorite(id: string) {
    return customFetch<{ favorited: boolean; favoritesCount: number }>(
      `/api/real-estate/properties/${encodeURIComponent(id)}/favorite`,
      { method: "POST" },
    );
  },

  // Viewing slots management (owner)
  addSlots(
    propertyId: string,
    payload: {
      slots?: { date: string; startTime: string; durationMinutes: number; note?: string }[];
      recurring?: {
        startDate: string;
        endDate: string;
        weekdays: number[]; // 0=Sun..6=Sat
        windowStart: string;
        windowEnd: string;
        durationMinutes: number;
      };
    },
  ) {
    return customFetch<{ viewingSlots: ViewingSlot[]; addedCount: number }>(
      `/api/real-estate/properties/${encodeURIComponent(propertyId)}/slots`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    );
  },

  toggleBlockSlot(propertyId: string, slotId: string, isBlocked: boolean) {
    return customFetch<{ viewingSlots: ViewingSlot[] }>(
      `/api/real-estate/properties/${encodeURIComponent(propertyId)}/slots/${encodeURIComponent(slotId)}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isBlocked }),
      },
    );
  },

  deleteSlot(propertyId: string, slotId: string) {
    return customFetch<{ viewingSlots: ViewingSlot[] }>(
      `/api/real-estate/properties/${encodeURIComponent(propertyId)}/slots/${encodeURIComponent(slotId)}`,
      { method: "DELETE" },
    );
  },

  // Phone verification (SMS OTP)
  getPhoneStatus() {
    return customFetch<PhoneVerificationStatus>("/api/real-estate/phone/status");
  },

  sendPhoneOtp(phone: string) {
    return customFetch<{
      sent: boolean;
      phoneMasked: string;
      expiresInSeconds: number;
      deliveryMode: "sms" | "platform_verification";
      verificationPreviewCode?: string;
      message: string;
    }>("/api/real-estate/phone/send-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone }),
    });
  },

  verifyPhoneOtp(code: string) {
    return customFetch<PhoneVerificationStatus>("/api/real-estate/phone/verify-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });
  },

  // Viewing requests & server-enforced exact address reveal
  createViewingRequest(payload: {
    propertyId: string;
    slotId: string;
    requesterName: string;
    requesterEmailVerified?: boolean;
    requesterProfileComplete?: boolean;
    requesterAccountCreatedAt?: string;
    viewingPurpose: ViewingPurpose;
    declarationAccepted: boolean;
    declarationVersion: string;
    message?: string;
    reminder24hEnabled?: boolean;
    reminder2hEnabled?: boolean;
  }) {
    return customFetch<ViewingRequest>("/api/real-estate/viewings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  },

  getMyViewings(propertyId?: string) {
    const qs = propertyId ? `?propertyId=${encodeURIComponent(propertyId)}` : "";
    return customFetch<{ items: ViewingRequest[]; total: number }>(`/api/real-estate/viewings/me${qs}`);
  },

  getApprovedViewingDetails(viewingId: string) {
    return customFetch<ApprovedViewingDetails>(
      `/api/real-estate/viewings/${encodeURIComponent(viewingId)}/details`,
    );
  },

  respondToViewing(
    viewingId: string,
    payload: {
      action: "APPROVE" | "PROPOSE_NEW_TIME" | "REJECT" | "REVOKE";
      proposedDate?: string;
      proposedStartTime?: string;
      proposedDurationMinutes?: number;
      note?: string;
    },
  ) {
    return customFetch<ViewingRequest>(`/api/real-estate/viewings/${encodeURIComponent(viewingId)}/respond`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  },

  cancelViewing(viewingId: string) {
    return customFetch<ViewingRequest>(`/api/real-estate/viewings/${encodeURIComponent(viewingId)}/cancel`, {
      method: "PATCH",
    });
  },

  acceptProposedTime(viewingId: string) {
    return customFetch<ViewingRequest>(
      `/api/real-estate/viewings/${encodeURIComponent(viewingId)}/accept-proposal`,
      { method: "PATCH" },
    );
  },

  updateViewingReminders(viewingId: string, reminder24hEnabled: boolean, reminder2hEnabled: boolean) {
    return customFetch<ViewingRequest>(`/api/real-estate/viewings/${encodeURIComponent(viewingId)}/reminders`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reminder24hEnabled, reminder2hEnabled }),
    });
  },

  deleteViewing(viewingId: string) {
    return customFetch<{ deleted: boolean; id: string }>(
      `/api/real-estate/viewings/${encodeURIComponent(viewingId)}`,
      { method: "DELETE" },
    );
  },

  // Audit log, messages, blocks, reports, notifications
  getAuditLog(propertyId: string) {
    return customFetch<{ items: AuditLogEntry[] }>(
      `/api/real-estate/properties/${encodeURIComponent(propertyId)}/audit`,
    );
  },

  getMessages(propertyId: string) {
    return customFetch<{ items: PropertyMessage[] }>(
      `/api/real-estate/properties/${encodeURIComponent(propertyId)}/messages`,
    );
  },

  sendMessage(propertyId: string, body: string, recipientId?: string, senderName?: string) {
    return customFetch<PropertyMessage>(
      `/api/real-estate/properties/${encodeURIComponent(propertyId)}/messages`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body, recipientId, senderName }),
      },
    );
  },

  blockUser(targetUserId: string, propertyId?: string) {
    return customFetch<{ blockedUserIds: string[] }>("/api/real-estate/blocks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetUserId, propertyId }),
    });
  },

  reportAbuse(payload: {
    propertyId?: string;
    viewingId?: string;
    targetUserId?: string;
    reasonCode?: string;
    reason: string;
    details?: string;
  }) {
    return customFetch<{ reported: boolean; id: string; moderationStatus: string }>("/api/real-estate/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  },

  getModerationLog(propertyId?: string) {
    const qs = propertyId ? `?propertyId=${encodeURIComponent(propertyId)}` : "";
    return customFetch<ModerationLogOverview>(`/api/real-estate/moderation/log${qs}`);
  },

  applyModerationDecision(payload: {
    reportId: string;
    decision: "DISMISSED" | "WARNING_ISSUED" | "TEMP_RESTRICTED" | "EXTENDED_RESTRICTED" | "SUSPENDED";
    note?: string;
  }) {
    return customFetch<{ ok: boolean; restrictionLevel: string }>("/api/real-estate/moderation/decisions", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  },

  getNotifications() {
    return customFetch<{ items: RealEstateNotification[]; unreadCount: number }>(
      "/api/real-estate/notifications",
    );
  },

  markNotificationsRead() {
    return customFetch<{ ok: boolean }>("/api/real-estate/notifications/read", { method: "POST" });
  },

  // Stripe payment for real estate listing activation
  startListingCheckout(propertyId: string) {
    return customFetch<{ checkoutUrl?: string; activated?: boolean; fee: number; propertyId: string }>(
      "/api/billing/real-estate-checkout",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ propertyId }),
      },
    );
  },

  verifyListingCheckout(sessionId: string) {
    return customFetch<{ paid: boolean; propertyId: string; status: PropertyStatus }>(
      `/api/billing/real-estate-checkout/status?session_id=${encodeURIComponent(sessionId)}`,
    );
  },
};
