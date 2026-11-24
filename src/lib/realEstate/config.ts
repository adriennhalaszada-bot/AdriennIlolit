import type {
  ModerationRestrictionLevel,
  PropertyCategory,
  PropertyCondition,
  PropertyStatus,
  PublicLocation,
  TransactionType,
  ViewingPurpose,
  ViewingStatus,
} from "./types";

export const VIEWING_DECLARATION_VERSION = "2026-11-v1";

export const VIEWING_DECLARATION_TEXT =
  "Kijelentem, hogy a megtekintést valódi vevői vagy bérlői érdeklődés céljából kérem, és nem ingatlanközvetítői megbízás megszerzése, szolgáltatás értékesítése vagy más üzletszerzési célból.";

export const REAL_ESTATE_COMMUNITY_RULE_TEXT =
  "Az ingatlanmegtekintési rendszer nem használható kéretlen ingatlanközvetítői megbízásszerzésre, szolgáltatásértékesítésre, tömeges üzletszerzésre vagy más, a hirdető által nem kért kereskedelmi megkeresésre.";

export const VIEWING_PURPOSE_OPTIONS: Array<{
  value: ViewingPurpose;
  label: string;
  description: string;
}> = [
  {
    value: "own_purchase",
    label: "Saját célra szeretném megvásárolni",
    description: "Magánvásárlóként saját vagy családi használatra érdeklődöm.",
  },
  {
    value: "own_rent",
    label: "Saját célra szeretném kibérelni",
    description: "Bérlőként saját lakhatási vagy használati célra érdeklődöm.",
  },
  {
    value: "family_friend",
    label: "Családtag / ismerős részére keresek",
    description: "Közvetlen hozzátartozó vagy ismerős megbízásából nézem meg.",
  },
  {
    value: "buyer_representative",
    label: "Megbízott vevő/bérlő képviseletében járok el",
    description: "Konkrét, azonosított vevő vagy bérlő képviseletében érkezem.",
  },
  {
    value: "real_estate_agent",
    label: "Ingatlanközvetítőként járok el",
    description: "Ingatlanközvetítői vagy üzletszerzési céllal jelentkezem.",
  },
];

export const VIEWING_PURPOSE_LABELS: Record<ViewingPurpose, string> = {
  own_purchase: "Saját célra történő vásárlás",
  own_rent: "Saját célra történő bérlés",
  family_friend: "Családtag / ismerős részére",
  buyer_representative: "Megbízott vevő/bérlő képviselete",
  real_estate_agent: "Ingatlanközvetítői megkeresés",
};

export const ABUSE_REPORT_REASONS: Array<{ code: string; label: string }> = [
  { code: "unsolicited_agent", label: "Kéretlen ingatlanközvetítői / üzletszerzési megkeresés" },
  { code: "no_show", label: "Nem jelent meg" },
  { code: "misleading_profile", label: "Megtévesztő profil" },
  { code: "harassment", label: "Zaklató viselkedés" },
  { code: "fake_data", label: "Hamis adat" },
  { code: "spam", label: "Spam" },
  { code: "other", label: "Egyéb" },
];

export const RESTRICTION_LEVEL_LABELS: Record<
  ModerationRestrictionLevel,
  { label: string; className: string }
> = {
  none: { label: "Nincs korlátozás", className: "border-emerald-200 bg-emerald-50 text-emerald-800" },
  warning: { label: "Figyelmeztetés rögzítve", className: "border-amber-200 bg-amber-50 text-amber-800" },
  temp_restricted: { label: "Ideiglenes foglalási korlátozás", className: "border-amber-300 bg-amber-50 text-amber-900" },
  extended_restricted: { label: "Hosszabb idejű korlátozás", className: "border-rose-200 bg-rose-50 text-rose-700" },
  suspended: { label: "Felfüggesztett fiók", className: "border-rose-300 bg-rose-100 text-rose-800" },
};

/**
 * Separate, configurable fee configuration for rental properties.
 * Never coupled with the sale-price tier table.
 */
export const REAL_ESTATE_CONFIG = {
  rental_listing_fee: 499,
  listingDurationDays: 30,
  recommendedMinPhotos: 5,
  maxPhotos: 25,
  maxFloorPlans: 5,
  defaultViewingDurationMinutes: 30,
} as const;

export interface ListingFeeCalculation {
  fee: number;
  tierLabel: string;
  isRentalConfig: boolean;
}

/**
 * Computes the mandatory ILOLIT Real Estate listing fee automatically from the
 * transaction type and listing price. Users cannot override or pick another tier.
 */
export function calculateRealEstateListingFee(
  transactionType: TransactionType,
  price: number,
): ListingFeeCalculation {
  if (transactionType === "rent") {
    return {
      fee: REAL_ESTATE_CONFIG.rental_listing_fee,
      tierLabel: "Kiadó ingatlan hirdetési díj (külön díjszabás)",
      isRentalConfig: true,
    };
  }

  const safePrice = Math.max(0, Math.round(Number(price) || 0));
  if (safePrice <= 10_000_000) {
    return { fee: 499, tierLabel: "10 000 000 Ft-ig", isRentalConfig: false };
  }
  if (safePrice <= 30_000_000) {
    return { fee: 699, tierLabel: "10 000 001 – 30 000 000 Ft", isRentalConfig: false };
  }
  if (safePrice <= 60_000_000) {
    return { fee: 999, tierLabel: "30 000 001 – 60 000 000 Ft", isRentalConfig: false };
  }
  return { fee: 1299, tierLabel: "60 000 001 Ft felett", isRentalConfig: false };
}

export const SALE_FEE_TIERS = [
  { range: "10 000 000 Ft-ig", fee: 499 },
  { range: "10 000 001 – 30 000 000 Ft", fee: 699 },
  { range: "30 000 001 – 60 000 000 Ft", fee: 999 },
  { range: "60 000 001 Ft felett", fee: 1299 },
] as const;

export const PROPERTY_CATEGORIES: {
  value: PropertyCategory;
  label: string;
  subtypes: { value: string; label: string }[];
  hasRooms: boolean;
  hasPlotArea: boolean;
  hasFloor: boolean;
  hasUtilities: boolean;
}[] = [
  {
    value: "apartment",
    label: "Lakás",
    subtypes: [
      { value: "tegla", label: "Tégla" },
      { value: "panel", label: "Panel" },
      { value: "csuszozsalus", label: "Csúszózsalus" },
      { value: "uj_epitesu", label: "Új építésű" },
      { value: "egyeb", label: "Egyéb" },
    ],
    hasRooms: true,
    hasPlotArea: false,
    hasFloor: true,
    hasUtilities: true,
  },
  {
    value: "house",
    label: "Ház",
    subtypes: [
      { value: "csaladi_haz", label: "Családi ház" },
      { value: "ikerhaz", label: "Ikerház" },
      { value: "sorhaz", label: "Sorház" },
      { value: "villa", label: "Villa" },
      { value: "tanya", label: "Tanya" },
      { value: "egyeb", label: "Egyéb" },
    ],
    hasRooms: true,
    hasPlotArea: true,
    hasFloor: false,
    hasUtilities: true,
  },
  {
    value: "land",
    label: "Telek",
    subtypes: [
      { value: "lakotelek", label: "Lakóövezeti építési telek" },
      { value: "udulotelek", label: "Üdülőövezeti telek" },
      { value: "ipari_telek", label: "Ipari / kereskedelmi telek" },
      { value: "zartkert", label: "Zártkert" },
      { value: "egyeb", label: "Egyéb telek" },
    ],
    hasRooms: false,
    hasPlotArea: true,
    hasFloor: false,
    hasUtilities: false,
  },
  {
    value: "holiday_home",
    label: "Nyaraló",
    subtypes: [
      { value: "nyaralohaz", label: "Nyaralóház" },
      { value: "hetvegi_haz", label: "Hétvégi ház" },
      { value: "apartman", label: "Üdülő apartman" },
      { value: "vizparti", label: "Vízparti nyaraló" },
      { value: "egyeb", label: "Egyéb" },
    ],
    hasRooms: true,
    hasPlotArea: true,
    hasFloor: false,
    hasUtilities: true,
  },
  {
    value: "garage",
    label: "Garázs",
    subtypes: [
      { value: "onallo_garazs", label: "Önálló garázs" },
      { value: "teremgarazs_beallo", label: "Teremgarázs beálló" },
      { value: "felszini_beallo", label: "Felszíni parkolóhely" },
      { value: "egyeb", label: "Egyéb" },
    ],
    hasRooms: false,
    hasPlotArea: false,
    hasFloor: true,
    hasUtilities: false,
  },
  {
    value: "retail",
    label: "Üzlethelyiség",
    subtypes: [
      { value: "utcai_bejaratos", label: "Utcai bejáratos üzlet" },
      { value: "uzletkozpont", label: "Üzletközpontban lévő" },
      { value: "vendeglato", label: "Vendéglátóhely" },
      { value: "szolgaltato", label: "Szolgáltató egység" },
      { value: "egyeb", label: "Egyéb" },
    ],
    hasRooms: true,
    hasPlotArea: false,
    hasFloor: true,
    hasUtilities: true,
  },
  {
    value: "office",
    label: "Iroda",
    subtypes: [
      { value: "irodahaz", label: "Irodaházi iroda" },
      { value: "lakasiroda", label: "Lakásiroda" },
      { value: "onallo_irodaepulet", label: "Önálló irodaépület" },
      { value: "egyeb", label: "Egyéb" },
    ],
    hasRooms: true,
    hasPlotArea: false,
    hasFloor: true,
    hasUtilities: true,
  },
  {
    value: "industrial",
    label: "Ipari ingatlan",
    subtypes: [
      { value: "raktar", label: "Raktár" },
      { value: "muhely", label: "Műhely" },
      { value: "csarnok", label: "Gyártócsarnok / logisztika" },
      { value: "telephely", label: "Telephely" },
      { value: "egyeb", label: "Egyéb" },
    ],
    hasRooms: false,
    hasPlotArea: true,
    hasFloor: false,
    hasUtilities: true,
  },
  {
    value: "agricultural",
    label: "Mezőgazdasági ingatlan",
    subtypes: [
      { value: "szanto", label: "Szántó" },
      { value: "szolo_gyumolcsos", label: "Szőlő / gyümölcsös" },
      { value: "erdo", label: "Erdő" },
      { value: "legelo_ret", label: "Legelő / rét" },
      { value: "major_gazdasag", label: "Major / gazdasági épület" },
      { value: "egyeb", label: "Egyéb" },
    ],
    hasRooms: false,
    hasPlotArea: true,
    hasFloor: false,
    hasUtilities: false,
  },
  {
    value: "other",
    label: "Egyéb ingatlan",
    subtypes: [
      { value: "pince_tarolo", label: "Pince / tároló" },
      { value: "fejlesztesi_terulet", label: "Fejlesztési terület" },
      { value: "egyeb", label: "Egyéb" },
    ],
    hasRooms: true,
    hasPlotArea: true,
    hasFloor: true,
    hasUtilities: true,
  },
];

export const PROPERTY_CONDITIONS: { value: PropertyCondition; label: string }[] = [
  { value: "new_build", label: "Új építésű" },
  { value: "like_new", label: "Újszerű" },
  { value: "renovated", label: "Felújított" },
  { value: "good", label: "Jó állapotú" },
  { value: "average", label: "Közepes állapotú" },
  { value: "needs_renovation", label: "Felújítandó" },
  { value: "unfinished", label: "Befejezetlen" },
  { value: "other", label: "Egyéb" },
];

export const COMFORT_LEVELS = [
  "Luxus",
  "Duplakomfortos",
  "Összkomfortos",
  "Komfortos",
  "Félkomfortos",
  "Komfort nélküli",
];

export const ORIENTATIONS = [
  "Észak",
  "Északkelet",
  "Kelet",
  "Délkelet",
  "Dél",
  "Délnyugat",
  "Nyugat",
  "Északnyugat",
];

export const VIEWS = [
  "Utcai",
  "Udvari",
  "Kertre néző",
  "Panorámás",
  "Parkra néző",
  "Vízpartra néző",
  "Vegyes",
];

export const FLOOR_OPTIONS = [
  "Szuterén",
  "Földszint",
  "Félemelet",
  "1. emelet",
  "2. emelet",
  "3. emelet",
  "4. emelet",
  "5. emelet",
  "6. emelet",
  "7. emelet",
  "8. emelet",
  "9. emelet",
  "10. emelet vagy felette",
];

export const PARKING_OPTIONS = [
  "Saját garázs",
  "Teremgarázs beálló",
  "Udvari beálló",
  "Utcán, közterületen (ingyenes)",
  "Utcán, közterületen (fizetős)",
  "Önálló parkolóhely vásárolható / bérelhető",
  "Nincs parkolási lehetőség",
];

export const HEATING_TYPES = [
  "Gáz (cirkó)",
  "Gáz (konvektor)",
  "Házközponti egyedi méréssel",
  "Házközponti",
  "Távfűtés egyedi méréssel",
  "Távfűtés",
  "Hőszivattyú",
  "Elektromos / infrafűtés",
  "Padlófűtés / mennyezetfűtés",
  "Vegyes tüzelés / cserépkályha",
  "Geotermikus / megújuló",
  "Egyéb",
];

export const ENERGY_RATINGS = [
  "A+++",
  "A++",
  "A+",
  "A",
  "B",
  "C",
  "D",
  "E",
  "F",
  "G",
  "H",
  "I",
  "Nincs megadva",
];

export const INSULATION_OPTIONS = [
  "Nincs szigetelés",
  "5–9 cm homlokzati szigetelés",
  "10–14 cm homlokzati szigetelés",
  "15+ cm homlokzati szigetelés",
  "Tető- és homlokzati szigetelés",
  "Nincs megadva",
];

export const STREET_TYPES = [
  "utca",
  "út",
  "tér",
  "körút",
  "sugárút",
  "köz",
  "sétány",
  "fasor",
  "rakpart",
  "dűlő",
  "park",
  "lejtő",
  "sor",
  "egyéb",
];

export const BUDAPEST_DISTRICTS = [
  "I. kerület",
  "II. kerület",
  "III. kerület",
  "IV. kerület",
  "V. kerület",
  "VI. kerület",
  "VII. kerület",
  "VIII. kerület",
  "IX. kerület",
  "X. kerület",
  "XI. kerület",
  "XII. kerület",
  "XIII. kerület",
  "XIV. kerület",
  "XV. kerület",
  "XVI. kerület",
  "XVII. kerület",
  "XVIII. kerület",
  "XIX. kerület",
  "XX. kerület",
  "XXI. kerület",
  "XXII. kerület",
  "XXIII. kerület",
];

export const DESCRIPTION_GUIDANCE_TIPS = [
  { key: "kornyek", title: "Környék", hint: "Csendes mellékutca, park közelsége, lakóközösség jellege." },
  { key: "kozlekedes", title: "Közlekedés", hint: "Metró, villamos, busz, vasút, autópálya-felhajtó elérhetősége percben." },
  { key: "uzletek", title: "Üzletek és szolgáltatások", hint: "Élelmiszerbolt, gyógyszertár, orvosi rendelő, posta a közelben." },
  { key: "iskola", title: "Iskola és óvoda", hint: "Bölcsőde, óvoda, iskola, játszótér távolsága." },
  { key: "allapot", title: "Állapot és felújítás", hint: "Mikor történt elektromos, vízvezeték-, nyílászáró- vagy burkolatfelújítás." },
  { key: "tajolas", title: "Tájolás és benapozottság", hint: "Mely napszakban napfényesek a szobák, milyen a kilátás." },
  { key: "kulonleges", title: "Különleges tulajdonság", hint: "Terasz, tároló, klíma, okosotthon, alacsony fenntartás." },
  { key: "koltozhetoseg", title: "Költözhetőség", hint: "Azonnal birtokba vehető vagy mennyi idő alatt költözhető." },
];

export const VIEWING_DURATION_OPTIONS = [
  { value: 15, label: "15 perc" },
  { value: 30, label: "30 perc (alapértelmezett)" },
  { value: 45, label: "45 perc" },
  { value: 60, label: "60 perc" },
];

export const STATUS_LABELS: Record<PropertyStatus, { label: string; className: string }> = {
  DRAFT: { label: "Piszkozat", className: "bg-slate-100 text-slate-700 border-slate-200" },
  PAYMENT_PENDING: { label: "Fizetésre vár", className: "bg-amber-50 text-amber-800 border-amber-200" },
  ACTIVE: { label: "Aktív", className: "bg-emerald-50 text-emerald-800 border-emerald-200" },
  PAUSED: { label: "Szüneteltetett", className: "bg-slate-100 text-slate-700 border-slate-300" },
  SOLD: { label: "Eladva", className: "bg-blue-50 text-blue-800 border-blue-200" },
  RENTED: { label: "Kiadva", className: "bg-indigo-50 text-indigo-800 border-indigo-200" },
  EXPIRED: { label: "Lejárt", className: "bg-slate-100 text-slate-600 border-slate-200" },
  DELETED: { label: "Törölt", className: "bg-rose-50 text-rose-700 border-rose-200" },
};

export const VIEWING_STATUS_LABELS: Record<ViewingStatus, { label: string; className: string }> = {
  PENDING: { label: "Jóváhagyásra vár", className: "bg-amber-50 text-amber-800 border-amber-200" },
  APPROVED: { label: "Jóváhagyva", className: "bg-emerald-50 text-emerald-800 border-emerald-200" },
  PROPOSED_NEW_TIME: { label: "Új időpont javasolva", className: "bg-blue-50 text-blue-800 border-blue-200" },
  REJECTED: { label: "Elutasítva", className: "bg-rose-50 text-rose-700 border-rose-200" },
  REVOKED_BY_OWNER: { label: "Hirdető által visszavonva", className: "bg-rose-50 text-rose-700 border-rose-200" },
  CANCELLED_BY_REQUESTER: { label: "Érdeklődő által lemondva", className: "bg-slate-100 text-slate-600 border-slate-200" },
};

export function getCategoryConfig(category: PropertyCategory) {
  return PROPERTY_CATEGORIES.find((c) => c.value === category) || PROPERTY_CATEGORIES[0];
}

export function getCategoryLabel(category: PropertyCategory): string {
  return getCategoryConfig(category).label;
}

export function getSubtypeLabel(category: PropertyCategory, subtype: string): string {
  const cfg = getCategoryConfig(category);
  return cfg.subtypes.find((s) => s.value === subtype)?.label || subtype || "";
}

export function getConditionLabel(condition?: PropertyCondition): string {
  if (!condition) return "Nincs megadva";
  return PROPERTY_CONDITIONS.find((c) => c.value === condition)?.label || condition;
}

export function formatHuf(amount?: number | null): string {
  if (amount == null || !Number.isFinite(Number(amount))) return "0 Ft";
  return `${Math.round(Number(amount)).toLocaleString("hu-HU")} Ft`;
}

export function formatPublicLocation(loc?: PublicLocation | null): string {
  if (!loc) return "Magyarország";
  const parts: string[] = [];
  if (loc.city) {
    if (loc.city.toLowerCase() === "budapest" && loc.district) {
      parts.push(`Budapest ${loc.district}`);
    } else {
      parts.push(loc.city);
      if (loc.district) parts.push(loc.district);
    }
  }
  if (loc.neighborhood) parts.push(loc.neighborhood);
  if (loc.publicStreet) parts.push(loc.publicStreet);
  return parts.filter(Boolean).join(", ") || "Magyarország";
}

export function addMinutesToTime(startTime: string, durationMinutes: number): string {
  const [hStr, mStr] = startTime.split(":");
  const total = (Number(hStr) || 0) * 60 + (Number(mStr) || 0) + durationMinutes;
  const hh = Math.floor(total / 60) % 24;
  const mm = total % 60;
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}
