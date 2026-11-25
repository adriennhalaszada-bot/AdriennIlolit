export type VehicleCategory =
  | "passenger_car"
  | "motorcycle_quad"
  | "light_commercial"
  | "heavy_commercial"
  | "machinery"
  | "agricultural"
  | "camper_caravan"
  | "trailer"
  | "watercraft"
  | "other_vehicle";

export type VehicleCollectionFilter =
  | "new"
  | "used"
  | "electric"
  | "hybrid"
  | "showroom"
  | "demo"
  | "veteran"
  | "warranty"
  | "damaged"
  | "rentable";

export type PassengerBodyType =
  | "ferdehatu"
  | "lepcsoshatu"
  | "limuzin"
  | "kombi"
  | "kupe"
  | "kabrio"
  | "roadster"
  | "egyteru"
  | "kisbusz"
  | "terepjaro"
  | "varosi_terepjaro"
  | "pickup"
  | "mopedauto"
  | "egyeb";

export type FuelCategory =
  | "benzin"
  | "dizel"
  | "benzin_gaz"
  | "lpg"
  | "cng"
  | "dizel_gaz"
  | "hibrid_benzin"
  | "hibrid_dizel"
  | "enyhe_hibrid"
  | "teljes_hibrid"
  | "plug_in_hibrid"
  | "elektromos"
  | "hidrogen"
  | "etanol"
  | "biodizel"
  | "egyeb";

export type PowertrainSystem =
  | "belsoegesu"
  | "enyhe_hibrid"
  | "teljes_hibrid"
  | "plug_in_hibrid"
  | "tisztan_elektromos"
  | "uzemanyagcellas"
  | "kettos_uzemu";

export type TransmissionType =
  | "manualis"
  | "automata"
  | "felautomata"
  | "robotizalt"
  | "fokozatmentes"
  | "duplakuplungos"
  | "egyeb";

export type DriveType =
  | "elso"
  | "hatso"
  | "osszkerek"
  | "kapcsolhato_osszkerek";

export type ClimateType =
  | "nincs"
  | "manualis"
  | "automata"
  | "ketzonas"
  | "haromzonas"
  | "negyzonas";

export type VehicleCondition =
  | "uj"
  | "ujszeru"
  | "kituno"
  | "megkimelt"
  | "normal"
  | "felujitott"
  | "felujitando"
  | "serult"
  | "motorhibas"
  | "valtohibas"
  | "uzemkeptelen"
  | "restauralando";

export type DocumentStatus =
  | "ervenyes_magyar"
  | "lejart_magyar"
  | "ervenyes_kulfoldi"
  | "lejart_kulfoldi"
  | "okmanyok_nelkul";

export type VehicleListingStatus =
  | "DRAFT"
  | "PAYMENT_PENDING"
  | "ACTIVE"
  | "PAUSED"
  | "SOLD"
  | "EXPIRED"
  | "DELETED";

export type SellerAccountType = "private" | "dealer" | "verified_business";

export interface VehiclePhoto {
  id: string;
  url: string;
  rotation?: number;
  caption?: string;
  isCover?: boolean;
  order: number;
}

export interface VehicleDocument {
  id: string;
  name: string;
  docType: "jszp" | "szervizkonyv" | "allapotfelmeres" | "akku_felmeres" | "egyeb";
  url: string;
  uploadedAt: string;
}

export interface VehiclePriceHistoryEntry {
  price: number;
  changedAt: string;
}

export interface VehicleLocation {
  country: string;
  postalCode: string;
  city: string;
  district?: string;
  neighborhood?: string;
  approxLatitude: number | null;
  approxLongitude: number | null;
  /** Only shown publicly if seller is a dealer with a public showroom address */
  publicDealershipAddress?: string;
}

export interface VehicleProtectedLocation {
  exactAddress: string;
  meetingPlace?: string;
  instructions?: string;
  latitude?: number | null;
  longitude?: number | null;
}

export interface VehicleEvSpecs {
  batteryCapacityKwh?: number | null;
  usableBatteryKwh?: number | null;
  batterySohPercent?: number | null;
  batteryWarranty?: string;
  wltpRangeKm?: number | null;
  highwayRangeKm?: number | null;
  winterRangeKm?: number | null;
  cityRangeKm?: number | null;
  realWorldExperienceNote?: string;
  consumptionKwhPer100km?: number | null;
  acConnector?: string;
  acPowerKw?: number | null;
  dcConnector?: string;
  dcPowerKw?: number | null;
  chargingTimeNote?: string;
  hasHeatPump?: boolean;
  hasBatteryPreconditioning?: boolean;
  chargingCableIncluded?: boolean;
  hasGreenPlate?: boolean;
  hasBatteryHealthReport?: boolean;
}

export interface VehicleCategorySpecificSpecs {
  // Motorcycle / Quad
  motoCategory?: string;
  strokeType?: "ketutemu" | "negyutemu" | "";
  coolingType?: string;
  motoDrive?: string;
  seatHeightMm?: number | null;
  operatingHours?: number | null;
  licenseCategory?: string;
  // Light commercial & Heavy commercial
  cargoLengthMm?: number | null;
  cargoWidthMm?: number | null;
  cargoHeightMm?: number | null;
  cargoVolumeM3?: number | null;
  wheelbaseMm?: number | null;
  payloadKg?: number | null;
  towingCapacityKg?: number | null;
  superstructure?: string;
  hasSideDoor?: boolean;
  hasTailLift?: boolean;
  hasRefrigeration?: boolean;
  axleCount?: number | null;
  axleConfig?: string;
  cabType?: string;
  sleeperBeds?: number | null;
  hasTachograph?: boolean;
  hasRetarder?: boolean;
  hasAirSuspension?: boolean;
  hasDiffLock?: boolean;
  hasHydraulics?: boolean;
  // Machinery & Agricultural
  machinerySubtype?: string;
  operatingWeightKg?: number | null;
  liftingCapacityKg?: number | null;
  liftingHeightM?: number | null;
  bucketCapacityM3?: number | null;
  workingWidthM?: number | null;
  diggingDepthM?: number | null;
  hydraulicOutputLpm?: number | null;
  undercarriage?: "lanctalpas" | "kerekes" | "";
  attachments?: string;
  ptoRpm?: string;
  hasCab?: boolean;
  hasGpsGuidance?: boolean;
  // Camper / Caravan
  camperSubtype?: string;
  baseVehicleBrand?: string;
  baseVehicleModel?: string;
  sleepingPlaces?: number | null;
  travelPlaces?: number | null;
  lengthMm?: number | null;
  widthMm?: number | null;
  heightMm?: number | null;
  hasKitchen?: boolean;
  hasFridge?: boolean;
  hasToilet?: boolean;
  hasShower?: boolean;
  hasHeating?: boolean;
  waterTankL?: number | null;
  hasSolarPanel?: boolean;
  hasAuxBattery?: boolean;
  hasAwning?: boolean;
  hasBikeRack?: boolean;
  // Trailer
  trailerSubtype?: string;
  braked?: "fekezett" | "fekezetlen" | "";
  // Watercraft
  watercraftSubtype?: string;
  draftCm?: number | null;
  personCapacity?: number | null;
  cabinsCount?: number | null;
  boatEngineBrand?: string;
  boatEngineModel?: string;
  hullMaterial?: string;
  harborLocation?: string;
  includesTrailer?: boolean;
}

export interface VehicleConditionDeclarations {
  damageFreeClaimed?: boolean;
  previousDamage?: boolean;
  repairedBodyPanel?: boolean;
  rustPresent?: boolean;
  hailDamage?: boolean;
  knownTechnicalFault?: boolean;
  aestheticDefect?: boolean;
  unknownHistory?: boolean;
  notes?: string;
}

export interface VehicleHistoryDocuments {
  documentStatus: DocumentStatus;
  motValidUntil?: string; // YYYY-MM
  deregistered?: boolean;
  temporarilyDeregistered?: boolean;
  firstOwner?: boolean;
  ownersCount?: number | null;
  hasServiceBook?: boolean;
  hasDigitalServiceBook?: boolean;
  hasServiceInvoices?: boolean;
  timingBeltChanged?: string;
  lastOilChange?: string;
  lastServiceDate?: string;
  lastServiceKm?: number | null;
  warranty?: string;
  keysCount?: number | null;
  vin?: string;
  vinPublicVisible?: boolean;
  financingEncumbrance?: string;
  hasJszpReport?: boolean;
  hasInspectionReport?: boolean;
}

export interface VehiclePricingDetails {
  priceHuf: number;
  netPriceHuf?: number | null;
  grossPriceHuf?: number | null;
  vatStatus: "afa_mentes" | "afas_brutto" | "netto_plusz_afa" | "maganszemely";
  negotiable?: boolean;
  tradeInPossible?: boolean;
  exchangePossible?: boolean;
  financingAvailable?: boolean;
  warrantyMonths?: number | null;
  promotionalPriceHuf?: number | null;
  originalPriceHuf?: number | null;
  rentable?: boolean;
  dailyRentHuf?: number | null;
}

export interface VehicleInquiryPreferences {
  acceptDealerPurchaseOffers: boolean;
  acceptConsignmentOffers: boolean;
  acceptBrokerServiceOffers: boolean;
  noUnsolicitedCommercial: boolean;
}

export interface VehicleTestDriveSettings {
  enabled: boolean;
  durationMinutes: number;
  requiredLicenseCategory: string;
  sellerPresentRequired: boolean;
  licenseInspectionOnSite: boolean;
  additionalConditions?: string;
}

export interface VehicleViewingSlot {
  id: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  durationMinutes: number;
  slotKind: "VIEWING" | "TEST_DRIVE";
  isBlocked: boolean;
  note?: string;
  createdAt: string;
}

export interface VehicleListing {
  id: string;
  listingCode: string; // e.g. ILV-2026-84921
  ownerId: string;
  ownerName: string;
  sellerType: SellerAccountType;
  dealerCompanyName?: string;
  category: VehicleCategory;
  collections: VehicleCollectionFilter[];
  brand: string;
  model: string;
  typeVariant: string;
  generation?: string;
  factoryBodyDesignation?: string; // e.g. Variant, Avant, Sportback, Touring
  bodyType: string;
  trimLevel?: string;
  manufactureYear: number;
  modelYear?: number | null;
  firstRegistration?: string; // YYYY-MM
  mileageKm?: number | null;
  condition: VehicleCondition;
  doors?: number | null;
  seats?: number | null;
  exteriorColor?: string;
  interiorColor?: string;
  upholstery?: string;
  metallicPaint?: boolean;
  curbWeightKg?: number | null;
  grossWeightKg?: number | null;
  trunkVolumeL?: number | null;
  fuelTankL?: number | null;
  // Powertrain & Engine
  fuelType: FuelCategory;
  powertrainSystem: PowertrainSystem;
  engineVariant?: string;
  engineCode?: string;
  displacementCc?: number | null;
  powerKw?: number | null;
  powerHp?: number | null;
  /** For hybrids (e.g. Toyota Hybrid): ICE power vs combined system power */
  systemPowerKw?: number | null;
  systemPowerHp?: number | null;
  cylinders?: number | null;
  transmission: TransmissionType;
  gearsCount?: number | null;
  driveType?: DriveType | "";
  climateType?: ClimateType | "";
  euroClass?: string;
  factoryConsumptionL?: number | null;
  co2EmissionsGkm?: number | null;
  evSpecs?: VehicleEvSpecs;
  categorySpecs?: VehicleCategorySpecificSpecs;
  conditionDeclarations: VehicleConditionDeclarations;
  history: VehicleHistoryDocuments;
  equipment: string[]; // searchable equipment IDs
  pricing: VehiclePricingDetails;
  priceHistory: VehiclePriceHistoryEntry[];
  title: string;
  description: string;
  photos: VehiclePhoto[];
  videoUrl?: string;
  documents: VehicleDocument[];
  publicLocation: VehicleLocation;
  /** Strictly owner-only & approved-viewer-only */
  protectedLocation?: VehicleProtectedLocation;
  ownerPhoneShareMode?: "none" | "approved_only" | "public_dealer";
  ownerPhone?: string;
  inquiryPreferences: VehicleInquiryPreferences;
  testDriveSettings: VehicleTestDriveSettings;
  viewingSlots: VehicleViewingSlot[];
  isFeatured?: boolean;
  status: VehicleListingStatus;
  stats: {
    views: number;
    favorites: number;
    viewingRequests: number;
    testDriveRequests: number;
    approvedBookings: number;
    messages: number;
  };
  isOwner?: boolean;
  isFavorited?: boolean;
  createdAt: string;
  updatedAt: string;
  expiresAt?: string;
}

export type VehicleBookingKind = "VIEWING" | "TEST_DRIVE";
export type VehicleBookingStatus =
  | "PENDING"
  | "APPROVED"
  | "PROPOSED_NEW_TIME"
  | "REJECTED"
  | "REVOKED_BY_OWNER"
  | "CANCELLED_BY_REQUESTER"
  | "COMPLETED"
  | "NO_SHOW";

export interface VehicleBookingRecord {
  id: string;
  vehicleId: string;
  vehicleTitle: string;
  vehicleBrand: string;
  vehicleModel: string;
  vehicleYear: number;
  vehiclePriceHuf: number;
  vehicleCoverImage: string;
  vehiclePublicCity: string;
  bookingKind: VehicleBookingKind;
  ownerId: string;
  ownerName: string;
  requesterId: string;
  requesterName: string;
  requesterPhoneVerified: boolean;
  slotId?: string;
  date: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  message?: string;
  licenseCategoryConfirmed?: string;
  hasRequiredLicenseDeclared?: boolean;
  declarationLog: {
    version: string;
    acceptedAt: string;
    declaration1Accepted: boolean;
    declaration2Accepted: boolean;
    legalNoticeViewed: boolean;
  };
  status: VehicleBookingStatus;
  ownerResponseNote?: string;
  proposedDate?: string;
  proposedStartTime?: string;
  proposedEndTime?: string;
  proposedNote?: string;
  approvedAt?: string;
  locationUnlockedAt?: string;
  reminder24hEnabled: boolean;
  reminder2hEnabled: boolean;
  reminder24hDue?: boolean;
  reminder2hDue?: boolean;
  role?: "owner" | "requester";
  createdAt: string;
  updatedAt: string;
}

export interface ApprovedVehicleBookingDetails {
  bookingId: string;
  vehicleId: string;
  vehicleTitle: string;
  bookingKind: VehicleBookingKind;
  date: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  exactAddress: string;
  meetingPlace?: string;
  instructions?: string;
  navigationUrl: string;
  ownerName: string;
  ownerPhone?: string | null;
  testDriveConditions?: VehicleTestDriveSettings;
  approvedAt: string;
}

export interface DealerProfile {
  ownerId: string;
  companyName: string;
  taxNumber: string;
  locations: Array<{ name: string; address: string; city: string; postalCode: string; openingHours: string }>;
  contacts: Array<{ name: string; role: string; phone: string; email: string }>;
  description: string;
  verifiedBusiness: boolean;
  staffEmails: string[];
  updatedAt: string;
}

export interface PricingRuleConfig {
  enabled: boolean;
  defaultDurationDays: number;
  featuredFeeHuf: number;
  categoryBaseFees: Record<VehicleCategory, { privateFeeHuf: number; dealerFeeHuf: number }>;
  priceTiers: Array<{ maxPriceHuf: number | null; label: string; privateFeeHuf: number; dealerFeeHuf: number }>;
  updatedAt: string;
  updatedBy?: string;
}

export interface CustomCatalogEntry {
  id: string;
  category: VehicleCategory;
  brand: string;
  manufacturer?: string;
  model: string;
  typeVariant?: string;
  generation?: string;
  yearFrom?: number;
  yearTo?: number | null;
  bodyTypes?: string[];
  engineVariant?: string;
  engineCode?: string;
  displacementCc?: number | null;
  powerKw?: number | null;
  powerHp?: number | null;
  fuelType?: FuelCategory;
  driveType?: DriveType;
  transmission?: TransmissionType;
  trimLevel?: string;
  dataSource: string;
  verifiedAt: string;
  usageRights: string;
}

export interface SavedVehicleSearch {
  id: string;
  name: string;
  filters: Record<string, any>;
  notifyNewListings: boolean;
  createdAt: string;
}

export interface VehiclePriceAlert {
  vehicleId: string;
  title: string;
  coverImage: string;
  previousPriceHuf: number;
  newPriceHuf: number;
  changedAt: string;
}
