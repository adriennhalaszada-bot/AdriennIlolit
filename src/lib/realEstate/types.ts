export type TransactionType = "sale" | "rent";

export type PropertyCategory =
  | "apartment"
  | "house"
  | "land"
  | "holiday_home"
  | "garage"
  | "retail"
  | "office"
  | "industrial"
  | "agricultural"
  | "other";

export type PropertyCondition =
  | "new_build"
  | "like_new"
  | "renovated"
  | "good"
  | "average"
  | "needs_renovation"
  | "unfinished"
  | "other";

export type PropertyStatus =
  | "DRAFT"
  | "PAYMENT_PENDING"
  | "ACTIVE"
  | "PAUSED"
  | "SOLD"
  | "RENTED"
  | "EXPIRED"
  | "DELETED";

export type ViewingStatus =
  | "PENDING"
  | "APPROVED"
  | "PROPOSED_NEW_TIME"
  | "REJECTED"
  | "REVOKED_BY_OWNER"
  | "CANCELLED_BY_REQUESTER";

export type AgentInquiryPolicy = "no_agents" | "allow_agents";

export type ViewingPurpose =
  | "own_purchase"
  | "own_rent"
  | "family_friend"
  | "buyer_representative"
  | "real_estate_agent";

export type ModerationRestrictionLevel =
  | "none"
  | "warning"
  | "temp_restricted"
  | "extended_restricted"
  | "suspended";

export interface RequesterTrustProfile {
  displayName: string;
  phoneVerified: boolean;
  emailVerified: boolean;
  profileComplete: boolean;
  accountCreatedAt: string;
  totalViewings: number;
  completedViewings: number;
  cancelledViewings: number;
  previousReportsCount: number;
  restrictionLevel: ModerationRestrictionLevel;
  restrictedUntil?: string | null;
}

export interface ViewingDeclarationLog {
  version: string;
  acceptedAt: string;
  purpose: ViewingPurpose;
  purposeAccepted?: boolean;
  ownerRuleAccepted?: boolean;
  legalConsequencesAccepted?: boolean;
  legalNoticeViewed?: boolean;
}

export interface AbuseReportRecord {
  id: string;
  reporterId: string;
  propertyId?: string;
  viewingId?: string;
  targetUserId?: string;
  reasonCode: string;
  reason: string;
  details?: string;
  moderationStatus: "PENDING_MODERATION" | "WARNING_ISSUED" | "TEMP_RESTRICTED" | "EXTENDED_RESTRICTED" | "SUSPENDED" | "DISMISSED";
  moderatorDecision?: string;
  moderatorNote?: string;
  decidedAt?: string;
  createdAt: string;
}

export interface ModerationLogOverview {
  reports: AbuseReportRecord[];
  spamSignals: Array<{
    id: string;
    userId: string;
    propertyId?: string;
    signalType: string;
    details: string;
    score: number;
    createdAt: string;
  }>;
  userRecords: Array<{
    userId: string;
    restrictionLevel: ModerationRestrictionLevel;
    warningsCount: number;
    reportsCount: number;
    restrictedUntil?: string | null;
    phoneRiskFlag?: boolean;
    updatedAt: string;
  }>;
}

export interface ExactAddress {
  country: string;
  postalCode: string;
  city: string;
  district?: string;
  neighborhood?: string;
  streetName: string;
  streetType: string;
  houseNumber: string;
  floorDoor?: string;
  parcelNumber?: string;
  latitude: number | null;
  longitude: number | null;
  showPublicStreet?: boolean;
  viewingInstructions?: string;
}

export interface PublicLocation {
  country: string;
  city: string;
  district?: string;
  neighborhood?: string;
  publicStreet?: string;
  approxLatitude: number | null;
  approxLongitude: number | null;
}

export interface PropertySpecs {
  usableAreaSqm?: number | null;
  plotAreaSqm?: number | null;
  balconyAreaSqm?: number | null;
  rooms?: number | null;
  halfRooms?: number | null;
  bathrooms?: number | null;
  toilets?: number | null;
  floor?: string;
  buildingLevels?: string;
  hasElevator?: boolean;
  ceilingHeightCm?: number | null;
  yearBuilt?: number | null;
  condition?: PropertyCondition;
  comfortLevel?: string;
  orientation?: string;
  view?: string;
  hasGardenAccess?: boolean;
  isAttic?: boolean;
  isAccessible?: boolean;
  hasAirConditioning?: boolean;
  parking?: string;
}

export interface SustainabilityInfo {
  heatingType?: string;
  avgGasConsumption?: string;
  avgElectricityConsumption?: string;
  estimatedMonthlyUtilities?: number | null;
  commonCost?: number | null;
  insulation?: string;
  energyRating?: string;
  hasSolarPanel?: boolean;
  hasHeatPump?: boolean;
  hasModernWindows?: boolean;
  otherEnergyFeatures?: string;
}

export interface RentalTerms {
  monthlyRent?: number | null;
  depositAmount?: number | null;
  minRentalMonths?: number | null;
  availableImmediately?: boolean;
  availableFromDate?: string;
  furnished?: "yes" | "partial" | "no" | "";
  equipped?: "yes" | "partial" | "no" | "";
  petsAllowed?: "yes" | "negotiable" | "no" | "";
  smokingAllowed?: "yes" | "balcony_only" | "no" | "";
  maxOccupants?: number | null;
  utilitiesIncluded?: boolean;
  commonCost?: number | null;
  parkingDetails?: string;
}

export interface PropertyPhoto {
  id: string;
  url: string;
  rotation?: number;
  caption?: string;
  order: number;
}

export interface ViewingSlot {
  id: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  durationMinutes: number;
  isBlocked: boolean;
  note?: string;
  createdAt: string;
}

export interface PropertyBillingRecord {
  id: string;
  amount: number;
  currency: string;
  status: "pending" | "paid" | "failed";
  tierLabel: string;
  periodDays?: number;
  expiresAt?: string;
  stripeCheckoutSessionId?: string;
  stripePaymentIntentId?: string;
  createdAt: string;
  paidAt?: string;
}

export interface PropertyStats {
  views: number;
  favorites: number;
  viewingRequests: number;
  approvedViewings: number;
  messages: number;
  activeDays: number;
}

export interface RealEstateProperty {
  id: string;
  ownerId: string;
  ownerName: string;
  /** Optional owner phone: ONLY visible to owner in edit/admin, and to APPROVED verified viewers if ownerPhoneShareMode === "approved_only". Never public. */
  ownerPhone?: string;
  ownerPhoneShareMode?: "none" | "approved_only";
  /** Controls whether real estate agents may contact/book viewings. Defaults to "no_agents" for private sellers. */
  agentInquiryPolicy?: AgentInquiryPolicy;
  /** Optional stricter filter: requires verified phone + verified email + complete profile. */
  verifiedBuyersOnly?: boolean;
  /** Distinguishes private sellers from future official agency partner accounts. */
  sellerAccountType?: "private" | "agency_partner";
  transactionType: TransactionType;
  category: PropertyCategory;
  subtype: string;
  title: string;
  description: string;
  price: number;
  currency: "HUF";
  listingFee: number;
  listingFeeTier: string;
  status: PropertyStatus;
  publicLocation: PublicLocation;
  /** ONLY present when requesting user is the owner. Never exposed publicly. */
  exactAddress?: ExactAddress;
  specs: PropertySpecs;
  sustainability: SustainabilityInfo;
  rentalTerms?: RentalTerms;
  photos: PropertyPhoto[];
  floorPlans: PropertyPhoto[];
  videoUrl?: string;
  viewingSlots: ViewingSlot[];
  stats: PropertyStats;
  billing?: PropertyBillingRecord[];
  isOwner?: boolean;
  isFavorited?: boolean;
  activatedAt?: string;
  expiresAt?: string;
  daysRemaining?: number;
  createdAt: string;
  updatedAt: string;
}

export interface ViewingRequest {
  id: string;
  propertyId: string;
  propertyTitle: string;
  propertyPublicLocation: string;
  propertyCoverImage?: string;
  propertyPrice: number;
  propertyTransactionType: TransactionType;
  ownerId: string;
  ownerName: string;
  requesterId: string;
  requesterName: string;
  requesterPhoneVerified: boolean;
  viewingPurpose?: ViewingPurpose;
  declarationLog?: ViewingDeclarationLog;
  requesterTrustProfile?: RequesterTrustProfile;
  slotId: string;
  date: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  message?: string;
  status: ViewingStatus;
  proposedDate?: string;
  proposedStartTime?: string;
  proposedEndTime?: string;
  proposedNote?: string;
  ownerResponseNote?: string;
  approvedAt?: string;
  addressUnlockedAt?: string;
  reminder24hEnabled: boolean;
  reminder2hEnabled: boolean;
  reminder24hDue?: boolean;
  reminder2hDue?: boolean;
  role?: "owner" | "requester";
  createdAt: string;
  updatedAt: string;
}

export interface ApprovedViewingDetails {
  viewingId: string;
  propertyId: string;
  propertyTitle: string;
  date: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  exactAddress: ExactAddress;
  ownerName: string;
  /** Present ONLY if the owner explicitly enabled ownerPhoneShareMode === "approved_only". */
  ownerPhone?: string | null;
  approvedAt: string;
  addressUnlockedAt: string;
}

export interface AuditLogEntry {
  id: string;
  propertyId: string;
  action:
    | "VIEWING_REQUESTED"
    | "VIEWING_APPROVED"
    | "VIEWING_PROPOSED_NEW_TIME"
    | "VIEWING_REJECTED"
    | "VIEWING_REVOKED_BY_OWNER"
    | "VIEWING_CANCELLED_BY_REQUESTER"
    | "ADDRESS_UNLOCKED"
    | "ADDRESS_ACCESSED"
    | "USER_BLOCKED"
    | "USER_UNBLOCKED"
    | "ABUSE_REPORTED"
    | "SUSPICIOUS_ACTIVITY";
  actorId: string;
  actorName?: string;
  targetUserId?: string;
  viewingId?: string;
  slotSummary?: string;
  details?: string;
  timestamp: string;
}

export interface PropertyMessage {
  id: string;
  propertyId: string;
  senderId: string;
  senderName: string;
  recipientId: string;
  body: string;
  createdAt: string;
}

export interface PhoneVerificationStatus {
  phoneVerified: boolean;
  phoneMasked?: string;
  verifiedAt?: string;
  lockedUntil?: string;
  remainingCooldownSec?: number;
}

export interface RealEstateNotification {
  id: string;
  type:
    | "VIEWING_REQUEST"
    | "VIEWING_APPROVED"
    | "VIEWING_PROPOSED"
    | "VIEWING_REJECTED"
    | "VIEWING_REVOKED"
    | "VIEWING_CANCELLED"
    | "REMINDER_24H"
    | "REMINDER_2H"
    | "MESSAGE";
  title: string;
  body: string;
  propertyId?: string;
  viewingId?: string;
  read: boolean;
  createdAt: string;
}
