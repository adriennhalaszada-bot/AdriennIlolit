import { customFetch } from "@workspace/api-client-react";
import type {
  ApprovedVehicleBookingDetails,
  CustomCatalogEntry,
  DealerProfile,
  PricingRuleConfig,
  SavedVehicleSearch,
  VehicleBookingKind,
  VehicleBookingRecord,
  VehicleCategory,
  VehicleListing,
  VehicleListingStatus,
  VehiclePriceAlert,
} from "./types";

export interface VehicleSearchParams {
  category?: VehicleCategory;
  collection?: string;
  q?: string;
  brands?: string[];
  models?: string[];
  typeVariant?: string;
  bodyType?: string;
  factoryBodyDesignation?: string;
  fuelTypes?: string[];
  transmissions?: string[];
  driveType?: string;
  climateType?: string;
  euroClass?: string;
  condition?: string;
  documentStatus?: string;
  sellerType?: string;
  yearMin?: number;
  yearMax?: number;
  priceMin?: number;
  priceMax?: number;
  mileageMin?: number;
  mileageMax?: number;
  powerMinHp?: number;
  powerMaxHp?: number;
  ccMin?: number;
  ccMax?: number;
  evRangeMinKm?: number;
  evBatterySohMin?: number;
  equipment?: string[];
  hasServiceBook?: boolean;
  hasWarranty?: boolean;
  hasDocuments?: boolean;
  viewableWhen?: "today" | "tomorrow" | "week" | "online_booking" | "test_drive" | "";
  sort?:
    | "newest"
    | "price_asc"
    | "price_desc"
    | "year_desc"
    | "year_asc"
    | "mileage_asc"
    | "distance_asc"
    | "brand_asc";
  mine?: boolean;
  favoritesOnly?: boolean;
}

export const vehiclesApi = {
  // Catalog & Pricing Admin
  getCustomCatalog() {
    return customFetch<{ items: CustomCatalogEntry[] }>("/api/vehicles/catalog");
  },

  addCustomCatalogEntry(entry: Omit<CustomCatalogEntry, "id" | "verifiedAt">) {
    return customFetch<CustomCatalogEntry>("/api/vehicles/catalog/entries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(entry),
    });
  },

  reportMissingBrand(payload: { category: VehicleCategory; brandName: string; modelName?: string; note?: string }) {
    return customFetch<{ reported: boolean; id: string }>("/api/vehicles/catalog/missing-brand", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  },

  getPricingConfig() {
    return customFetch<PricingRuleConfig>("/api/vehicles/pricing");
  },

  updatePricingConfig(config: Partial<PricingRuleConfig>) {
    return customFetch<PricingRuleConfig>("/api/vehicles/pricing", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(config),
    });
  },

  // Listings CRUD & Search
  listVehicles(params: VehicleSearchParams = {}) {
    const sp = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v === undefined || v === null || v === "" || v === false) return;
      if (Array.isArray(v)) {
        if (v.length > 0) sp.set(k, v.join(","));
      } else {
        sp.set(k, String(v));
      }
    });
    const qs = sp.toString();
    return customFetch<{ items: VehicleListing[]; total: number }>(`/api/vehicles${qs ? `?${qs}` : ""}`);
  },

  getVehicle(id: string) {
    return customFetch<VehicleListing>(`/api/vehicles/${encodeURIComponent(id)}`);
  },

  createVehicle(payload: Record<string, any>) {
    return customFetch<VehicleListing>("/api/vehicles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  },

  updateVehicle(id: string, payload: Record<string, any>) {
    return customFetch<VehicleListing>(`/api/vehicles/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  },

  updateVehicleStatus(id: string, status: VehicleListingStatus) {
    return customFetch<VehicleListing>(`/api/vehicles/${encodeURIComponent(id)}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
  },

  activateVehicleTest(id: string) {
    return customFetch<VehicleListing>(`/api/vehicles/${encodeURIComponent(id)}/activate`, {
      method: "POST",
    });
  },

  toggleFavorite(id: string) {
    return customFetch<{ favorited: boolean; favoritesCount: number }>(
      `/api/vehicles/${encodeURIComponent(id)}/favorite`,
      { method: "POST" },
    );
  },

  // Slots (Viewing & Test Drive separately)
  addSlots(
    vehicleId: string,
    payload: {
      slots?: Array<{ date: string; startTime: string; durationMinutes: number; slotKind: VehicleBookingKind; note?: string }>;
      recurring?: {
        startDate: string;
        endDate: string;
        weekdays: number[];
        windowStart: string;
        windowEnd: string;
        durationMinutes: number;
        slotKind: VehicleBookingKind;
      };
    },
  ) {
    return customFetch<{ viewingSlots: any[]; addedCount: number }>(
      `/api/vehicles/${encodeURIComponent(vehicleId)}/slots`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    );
  },

  toggleBlockSlot(vehicleId: string, slotId: string, isBlocked: boolean) {
    return customFetch<{ viewingSlots: any[] }>(
      `/api/vehicles/${encodeURIComponent(vehicleId)}/slots/${encodeURIComponent(slotId)}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isBlocked }),
      },
    );
  },

  deleteSlot(vehicleId: string, slotId: string) {
    return customFetch<{ viewingSlots: any[] }>(
      `/api/vehicles/${encodeURIComponent(vehicleId)}/slots/${encodeURIComponent(slotId)}`,
      { method: "DELETE" },
    );
  },

  // Bookings (Viewings & Test Drives)
  getMyBookings(vehicleId?: string) {
    const qs = vehicleId ? `?vehicleId=${encodeURIComponent(vehicleId)}` : "";
    return customFetch<{ items: VehicleBookingRecord[]; total: number }>(`/api/vehicles/viewings/me${qs}`);
  },

  createBooking(payload: {
    vehicleId: string;
    bookingKind: VehicleBookingKind;
    slotId?: string;
    date?: string;
    startTime?: string;
    durationMinutes?: number;
    requesterName: string;
    message?: string;
    declaration1Accepted: boolean;
    declaration2Accepted: boolean;
    legalNoticeViewed: boolean;
    declarationVersion: string;
    licenseCategoryConfirmed?: string;
    hasRequiredLicenseDeclared?: boolean;
    reminder24hEnabled?: boolean;
    reminder2hEnabled?: boolean;
  }) {
    return customFetch<VehicleBookingRecord>("/api/vehicles/viewings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  },

  getApprovedBookingDetails(bookingId: string) {
    return customFetch<ApprovedVehicleBookingDetails>(
      `/api/vehicles/viewings/${encodeURIComponent(bookingId)}/details`,
    );
  },

  respondToBooking(
    bookingId: string,
    payload: {
      action: "APPROVE" | "PROPOSE_NEW_TIME" | "REJECT" | "REVOKE" | "COMPLETE" | "NO_SHOW";
      exactAddress?: string;
      meetingPlace?: string;
      instructions?: string;
      ownerPhone?: string;
      proposedDate?: string;
      proposedStartTime?: string;
      note?: string;
    },
  ) {
    return customFetch<VehicleBookingRecord>(
      `/api/vehicles/viewings/${encodeURIComponent(bookingId)}/respond`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    );
  },

  acceptProposal(bookingId: string) {
    return customFetch<VehicleBookingRecord>(
      `/api/vehicles/viewings/${encodeURIComponent(bookingId)}/accept-proposal`,
      { method: "PATCH" },
    );
  },

  cancelBooking(bookingId: string) {
    return customFetch<VehicleBookingRecord>(
      `/api/vehicles/viewings/${encodeURIComponent(bookingId)}/cancel`,
      { method: "PATCH" },
    );
  },

  deleteBooking(bookingId: string) {
    return customFetch<{ deleted: boolean; id: string }>(
      `/api/vehicles/viewings/${encodeURIComponent(bookingId)}`,
      { method: "DELETE" },
    );
  },

  // Messages
  getMessages(vehicleId: string) {
    return customFetch<{ items: Array<{ id: string; senderId: string; senderName: string; recipientId: string; body: string; createdAt: string }> }>(
      `/api/vehicles/${encodeURIComponent(vehicleId)}/messages`,
    );
  },

  sendMessage(vehicleId: string, body: string, recipientId?: string, senderName?: string) {
    return customFetch<{ id: string; body: string; createdAt: string }>(
      `/api/vehicles/${encodeURIComponent(vehicleId)}/messages`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body, recipientId, senderName }),
      },
    );
  },

  // Saved searches & Price alerts
  getSavedSearches() {
    return customFetch<{ items: SavedVehicleSearch[] }>("/api/vehicles/saved-searches");
  },

  createSavedSearch(name: string, filters: Record<string, any>, notifyNewListings = true) {
    return customFetch<SavedVehicleSearch>("/api/vehicles/saved-searches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, filters, notifyNewListings }),
    });
  },

  deleteSavedSearch(id: string) {
    return customFetch<{ deleted: boolean }>(`/api/vehicles/saved-searches/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
  },

  getPriceAlerts() {
    return customFetch<{ items: VehiclePriceAlert[] }>("/api/vehicles/price-alerts");
  },

  // Dealer profile & CSV bulk import
  getDealerProfile() {
    return customFetch<{ profile: DealerProfile | null }>("/api/vehicles/dealer-profile");
  },

  saveDealerProfile(profile: Partial<DealerProfile>) {
    return customFetch<{ profile: DealerProfile }>("/api/vehicles/dealer-profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(profile),
    });
  },

  importDealerCsv(rows: Array<Record<string, any>>) {
    return customFetch<{ importedCount: number; errors: string[]; ids: string[] }>(
      "/api/vehicles/dealer/csv-import",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows }),
      },
    );
  },

  // Abuse reports
  reportAbuse(payload: {
    vehicleId?: string;
    bookingId?: string;
    targetUserId?: string;
    reasonCode: string;
    reason: string;
    details?: string;
  }) {
    return customFetch<{ reported: boolean; id: string }>("/api/vehicles/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  },
};
