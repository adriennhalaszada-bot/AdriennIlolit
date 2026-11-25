import type { SafeVisitPass } from "@/lib/realEstate/types";

export type UnifiedAppointmentType = "SERVICE" | "PROPERTY_VIEWING" | "VEHICLE_VIEWING";

export type UnifiedAppointmentStatus =
  | "PENDING"
  | "CONFIRMED"
  | "PROPOSED_NEW_TIME"
  | "REJECTED"
  | "CANCELLED"
  | "COMPLETED";

export type UnifiedNotificationCategory =
  | "INGATLAN"
  | "JARMU"
  | "SZOLGALTATAS"
  | "PIACTER"
  | "OKTATAS";

export interface UnifiedAppointment {
  appointment_id: string;
  user_id: string;
  listing_id: string;
  appointment_type: UnifiedAppointmentType;
  requested_datetime: string;
  confirmed_datetime: string | null;
  date: string;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  status: UnifiedAppointmentStatus;
  seller_id: string;
  seller_name: string;
  seller_username?: string;
  requester_name?: string;
  phone_verified: boolean;
  location_released: boolean;
  created_at: string;
  updated_at: string;
  cancellation_reason: string | null;
  seller_message: string | null;
  buyer_message?: string | null;
  proposed_datetime: string | null;
  proposed_date?: string | null;
  proposed_start_time?: string | null;
  proposed_end_time?: string | null;
  proposed_note?: string | null;
  reminder_24h_enabled: boolean;
  reminder_2h_enabled: boolean;
  reminder_24h_due: boolean;
  reminder_2h_due: boolean;
  role: "buyer" | "seller";
  source: "native" | "real_estate" | "service_booking";
  title: string;
  service_name?: string;
  cover_image: string;
  city: string;
  approx_location: string;
  price: number;
  transaction_type?: string;
  deposit_amount?: number;
  deposit_status?: string;
  vehicle_brand?: string;
  vehicle_model?: string;
  vehicle_year?: string;
  vehicle_fuel?: string;
  vehicle_km?: string;
  deep_link: string;
  web_url: string;
}

export interface UnifiedAppointmentDetails {
  appointment_id: string;
  appointment_type: UnifiedAppointmentType;
  listing_id: string;
  title: string;
  date: string;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  exact_address_text: string;
  exact_address?: {
    postalCode?: string;
    city?: string;
    district?: string;
    streetName?: string;
    streetType?: string;
    houseNumber?: string;
    floorDoor?: string;
    parcelNumber?: string;
    viewingInstructions?: string;
    latitude?: number | null;
    longitude?: number | null;
  };
  latitude?: number | null;
  longitude?: number | null;
  navigation_url: string | null;
  seller_name: string;
  seller_phone: string | null;
  seller_message: string | null;
  instructions: string | null;
  safe_visit_pass?: SafeVisitPass | null;
  vehicle_basics?: {
    brand: string;
    model: string;
    year: string;
    fuel: string;
    km: string;
    price: number;
  };
}

export interface UnifiedAppointmentCounts {
  all: number;
  service: number;
  serviceTotal: number;
  property: number;
  propertyTotal: number;
  propertyPending: number;
  propertyConfirmed: number;
  propertyProposed: number;
  vehicle: number;
  vehicleTotal: number;
  vehiclePending: number;
  vehicleConfirmed: number;
  vehicleProposed: number;
  sellerVehiclePending: number;
}

export interface UnifiedAppointmentsResponse {
  items: UnifiedAppointment[];
  counts: UnifiedAppointmentCounts;
  nextUpcoming: UnifiedAppointment | null;
  remindersDue: UnifiedAppointment[];
  serverTime: string;
}

export interface UnifiedNotification {
  id: string;
  userId: string;
  category: UnifiedNotificationCategory;
  eventType: string;
  title: string;
  body: string;
  appointmentId?: string;
  appointmentType?: UnifiedAppointmentType;
  listingId?: string;
  listingTitle?: string;
  coverImage?: string;
  date?: string;
  startTime?: string;
  shortLocation?: string;
  deepLink?: string;
  webUrl?: string;
  read: boolean;
  popupRequired?: boolean;
  popupDismissed?: boolean;
  createdAt: string;
}

export interface UnifiedNotificationsResponse {
  items: UnifiedNotification[];
  unreadCount: number;
  countsByCategory: Record<UnifiedNotificationCategory, number>;
  pendingPopups: UnifiedNotification[];
}

export interface PushStatusResponse {
  subscribed: boolean;
  webSubscriptionsCount: number;
  mobileDevicesCount: number;
  vapidPublicKey: string | null;
  devices: Array<{
    id: string;
    platform: string;
    deviceLabel: string;
    updatedAt: string;
  }>;
}

export const APPOINTMENT_STATUS_META: Record<
  UnifiedAppointmentStatus,
  { label: string; shortLabel: string; className: string }
> = {
  PENDING: {
    label: "Visszaigazolásra vár",
    shortLabel: "Visszaigazolásra vár",
    className: "border-amber-200 bg-amber-50 text-amber-800",
  },
  CONFIRMED: {
    label: "Visszaigazolva",
    shortLabel: "Visszaigazolva",
    className: "border-emerald-200 bg-emerald-50 text-emerald-800",
  },
  PROPOSED_NEW_TIME: {
    label: "Másik időpont javasolva",
    shortLabel: "Új időpont elfogadásra vár",
    className: "border-slate-300 bg-slate-100 text-slate-800",
  },
  REJECTED: {
    label: "Elutasítva",
    shortLabel: "Elutasítva",
    className: "border-rose-200 bg-rose-50 text-rose-700",
  },
  CANCELLED: {
    label: "Lemondva",
    shortLabel: "Lemondva",
    className: "border-slate-200 bg-slate-100 text-slate-600",
  },
  COMPLETED: {
    label: "Teljesítve",
    shortLabel: "Teljesítve",
    className: "border-emerald-200 bg-white text-emerald-700",
  },
};

export const NOTIFICATION_CATEGORY_LABELS: Record<UnifiedNotificationCategory, string> = {
  INGATLAN: "Ingatlan",
  JARMU: "Jármű",
  SZOLGALTATAS: "Szolgáltatás",
  PIACTER: "Piactér",
  OKTATAS: "Oktatás",
};

const HU_MONTHS = [
  "január",
  "február",
  "március",
  "április",
  "május",
  "június",
  "július",
  "augusztus",
  "szeptember",
  "október",
  "november",
  "december",
];

export function formatHuDate(dateIso?: string | null): string {
  if (!dateIso) return "";
  const m = String(dateIso).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return dateIso;
  const year = m[1];
  const monthIdx = Number(m[2]) - 1;
  const day = Number(m[3]);
  const monthName = HU_MONTHS[monthIdx] || m[2];
  return `${year}. ${monthName} ${day}.`;
}

export function formatHuShortDate(dateIso?: string | null): string {
  if (!dateIso) return "";
  const m = String(dateIso).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return dateIso;
  const monthIdx = Number(m[2]) - 1;
  const day = Number(m[3]);
  const monthName = HU_MONTHS[monthIdx] || m[2];
  return `${monthName.charAt(0).toUpperCase()}${monthName.slice(1)} ${day}.`;
}
