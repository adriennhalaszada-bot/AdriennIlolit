import { CAR_BRANDS_DATA } from "@/data/carData";
import type {
  CustomCatalogEntry,
  DriveType,
  FuelCategory,
  TransmissionType,
  VehicleCategory,
} from "./types";

export interface EngineSpecEntry {
  engineVariant: string;
  engineCode?: string;
  displacementCc?: number | null;
  powerKw: number;
  powerHp: number;
  /** For full/plug-in hybrids: combined system power */
  systemPowerKw?: number;
  systemPowerHp?: number;
  fuelType: FuelCategory;
  transmissions: TransmissionType[];
  drives: DriveType[];
  trims?: string[];
  yearFrom?: number;
  yearTo?: number | null;
}

export interface TypeGenerationEntry {
  typeName: string;
  generation?: string;
  yearFrom: number;
  yearTo: number | null;
  bodyTypes?: string[];
  factoryDesignations?: string[];
  allowedFuels?: FuelCategory[];
  engines?: EngineSpecEntry[];
}

export interface ModelCatalogEntry {
  model: string;
  types?: TypeGenerationEntry[];
  allowedFuels?: FuelCategory[];
}

export interface BrandCatalogEntry {
  brand: string;
  manufacturer: string;
  categories: VehicleCategory[];
  aliases?: string[];
  modelsByCategory: Partial<Record<VehicleCategory, ModelCatalogEntry[]>>;
  allowedFuels?: FuelCategory[];
  dataSource: string;
  verifiedAt: string;
  usageRights: string;
}

const VERIFIED_DATE = "2026-11-25";
const SRC_EXISTING_AND_HU = "ILOLIT meglévő carData.ts törzs + magyar gyártói műszaki adatlapok";
const SRC_HU_CATALOG = "Magyar gyártói és márkaképviseleti műszaki katalógusok (önálló szerkesztésű törzsadat)";
const RIGHTS_OWN = "Saját szerkesztésű, nyilvános gyári műszaki tényadatokon alapuló törzsadat";

/**
 * Search aliases unifying accented/unaccented, abbreviated, and historical names.
 */
export const BRAND_ALIASES: Record<string, string> = {
  vw: "Volkswagen",
  "volkswagen": "Volkswagen",
  skoda: "Škoda",
  "škoda": "Škoda",
  citroen: "Citroën",
  "citroën": "Citroën",
  "mercedes benz": "Mercedes-Benz",
  mercedes: "Mercedes-Benz",
  "mercedes-benz": "Mercedes-Benz",
  "mercedes amg": "Mercedes-AMG",
  "mercedes maybach": "Mercedes-Maybach",
  "ssang yong": "SsangYong",
  ssangyong: "SsangYong",
  kgm: "KGM (SsangYong)",
  "kgm ssangyong": "KGM (SsangYong)",
  "dodge ram": "RAM",
  ram: "RAM",
  pannonia: "Pannónia",
  "pannónia": "Pannónia",
  "alfa": "Alfa Romeo",
  "landrover": "Land Rover",
  "rolls royce": "Rolls-Royce",
  "harley": "Harley-Davidson",
  "moto guzzi": "Moto Guzzi",
  "royal enfield": "Royal Enfield",
  "polski": "Polski Fiat",
  "cupra": "CUPRA",
  "byd": "BYD",
  "mg": "MG",
  "mini": "MINI",
  "seat": "SEAT",
  "ds": "DS",
  "bmw": "BMW",
  "uaz": "UAZ",
  "gaz": "GAZ",
  "zaz": "ZAZ",
  "mtz": "MTZ",
  "jcb": "JCB",
  "daf": "DAF",
  "man": "MAN",
  "ktm": "KTM",
  "mz": "MZ",
};

export function normalizeBrandSearch(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ");
}

export function resolveBrandAlias(input: string): string {
  const norm = normalizeBrandSearch(input);
  if (BRAND_ALIASES[norm]) return BRAND_ALIASES[norm];
  return input.trim();
}

function makeSimpleModels(names: string[], allowedFuels?: FuelCategory[]): ModelCatalogEntry[] {
  return names.map((m) => ({ model: m, allowedFuels }));
}

// ============================================================================
// 1. RICH PASSENGER CAR MODELS & GENERATIONS / ENGINES (Section III, #6-#8)
// ============================================================================

const RICH_PASSENGER_OVERRIDES: Record<
  string,
  {
    manufacturer?: string;
    aliases?: string[];
    allowedFuels?: FuelCategory[];
    models: ModelCatalogEntry[];
  }
> = {
  Abarth: {
    manufacturer: "Stellantis / Abarth",
    allowedFuels: ["benzin", "elektromos"],
    models: makeSimpleModels(["500", "595", "695", "500e", "600e", "Grande Punto", "Punto Evo", "124 Spider"]),
  },
  Aixam: {
    manufacturer: "Aixam-Mega",
    allowedFuels: ["dizel", "elektromos"],
    models: makeSimpleModels(["City", "Coupé", "Crossline", "Crossover", "Minauto", "e-City", "e-Coupé", "Mega"]),
  },
  "Alfa Romeo": {
    manufacturer: "Stellantis / Alfa Romeo",
    allowedFuels: ["benzin", "dizel", "enyhe_hibrid", "plug_in_hibrid", "elektromos"],
    models: makeSimpleModels([
      "33", "75", "90", "145", "146", "147", "155", "156", "159", "164", "166", "4C", "8C",
      "Alfasud", "Alfetta", "Brera", "Giulia", "Giulietta", "GT", "GTV", "Junior", "MiTo", "Spider", "Stelvio", "Tonale",
    ]),
  },
  Alpine: {
    manufacturer: "Renault Group / Alpine",
    allowedFuels: ["benzin", "elektromos"],
    models: makeSimpleModels(["A110", "A290", "A310", "A390", "A610"]),
  },
  ARO: {
    manufacturer: "ARO Câmpulung",
    allowedFuels: ["benzin", "dizel"],
    models: makeSimpleModels(["10", "240", "243", "244", "320"]),
  },
  Asia: {
    manufacturer: "Asia Motors",
    allowedFuels: ["benzin", "dizel"],
    models: makeSimpleModels(["Rocsta", "Topic"]),
  },
  "Aston Martin": {
    manufacturer: "Aston Martin Lagonda",
    allowedFuels: ["benzin"],
    models: makeSimpleModels(["DB7", "DB9", "DB11", "DB12", "DBS", "DBX", "Rapide", "Vantage", "Vanquish", "Virage"]),
  },
  Audi: {
    manufacturer: "Audi AG",
    allowedFuels: ["benzin", "dizel", "enyhe_hibrid", "plug_in_hibrid", "elektromos", "cng"],
    models: [
      ...makeSimpleModels([
        "50", "80", "90", "100", "200", "A1", "A2", "A3", "A4 Allroad", "A5", "A6", "A6 Allroad",
        "A7", "A8", "Cabriolet", "Coupé", "e-tron", "e-tron GT", "Q2", "Q3", "Q4 e-tron", "Q5",
        "Q6 e-tron", "Q7", "Q8", "Q8 e-tron", "Quattro", "R8", "TT", "TTS", "V8",
        "S1", "S2", "S3", "S4", "S5", "S6", "S7", "S8", "SQ2", "SQ5", "SQ7", "SQ8",
        "RS2", "RS3", "RS4", "RS5", "RS6", "RS7", "RS Q3", "RS Q8", "TT RS",
      ]),
      {
        model: "A4",
        types: [
          {
            typeName: "A4 (B8)",
            generation: "B8",
            yearFrom: 2007,
            yearTo: 2015,
            bodyTypes: ["Limuzin", "Kombi"],
            factoryDesignations: ["Avant", "quattro", "S tronic"],
            engines: [
              { engineVariant: "2.0 TDI", displacementCc: 1968, powerKw: 105, powerHp: 143, fuelType: "dizel", transmissions: ["manualis", "automata"], drives: ["elso", "osszkerek"] },
              { engineVariant: "2.0 TDI", displacementCc: 1968, powerKw: 110, powerHp: 150, fuelType: "dizel", transmissions: ["manualis", "automata"], drives: ["elso", "osszkerek"] },
              { engineVariant: "1.8 TFSI", displacementCc: 1798, powerKw: 118, powerHp: 160, fuelType: "benzin", transmissions: ["manualis", "automata"], drives: ["elso"] },
            ],
          },
          {
            typeName: "A4 (B9)",
            generation: "B9",
            yearFrom: 2015,
            yearTo: 2024,
            bodyTypes: ["Limuzin", "Kombi"],
            factoryDesignations: ["Avant", "quattro", "S tronic"],
            engines: [
              { engineVariant: "2.0 TDI (35 TDI)", displacementCc: 1968, powerKw: 110, powerHp: 150, fuelType: "dizel", transmissions: ["manualis", "duplakuplungos"], drives: ["elso"] },
              { engineVariant: "2.0 TDI (40 TDI)", displacementCc: 1968, powerKw: 140, powerHp: 190, fuelType: "dizel", transmissions: ["duplakuplungos"], drives: ["elso", "osszkerek"] },
              { engineVariant: "2.0 TFSI (40 TFSI)", displacementCc: 1984, powerKw: 140, powerHp: 190, fuelType: "benzin", transmissions: ["duplakuplungos"], drives: ["elso", "osszkerek"] },
            ],
          },
        ],
      },
    ],
  },
  Austin: {
    manufacturer: "British Leyland / Austin",
    allowedFuels: ["benzin", "dizel"],
    models: makeSimpleModels(["Allegro", "Maestro", "Metro", "Mini", "Montego"]),
  },
  BAIC: {
    manufacturer: "BAIC Group",
    allowedFuels: ["benzin", "elektromos"],
    models: makeSimpleModels(["X35", "X55", "X7", "BJ40", "EU5"]),
  },
  Barkas: {
    manufacturer: "VEB Barkas-Werke",
    allowedFuels: ["benzin"],
    models: makeSimpleModels(["B 1000", "B 1000-1"]),
  },
  BAW: {
    manufacturer: "Beijing Automobile Works",
    allowedFuels: ["benzin", "elektromos"],
    models: makeSimpleModels(["Pony", "212", "Calorie"]),
  },
  Bentley: {
    manufacturer: "Bentley Motors",
    allowedFuels: ["benzin", "dizel", "plug_in_hibrid"],
    models: makeSimpleModels(["Arnage", "Azure", "Bentayga", "Continental", "Continental GT", "Continental GTC", "Flying Spur", "Mulsanne"]),
  },
  BMW: {
    manufacturer: "BMW AG",
    allowedFuels: ["benzin", "dizel", "enyhe_hibrid", "plug_in_hibrid", "elektromos"],
    models: [
      {
        model: "1-es sorozat",
        types: [
          { typeName: "114i / 116i / 118i / 120i / 125i / 130i / 135i / 140i", generation: "E87/F20/F40/F70", yearFrom: 2004, yearTo: null, bodyTypes: ["Ferdehátú", "Kupé", "Kabrió"] },
          { typeName: "114d / 116d / 118d / 120d / 123d / 125d", generation: "E87/F20/F40/F70", yearFrom: 2004, yearTo: null, bodyTypes: ["Ferdehátú"] },
        ],
      },
      {
        model: "2-es sorozat",
        types: [
          { typeName: "214 / 216 / 218 / 220 / 223 / 225 / 228 / 230 / M235i / M240i", generation: "F22/F45/G42/U06", yearFrom: 2013, yearTo: null, bodyTypes: ["Kupé", "Kabrió", "Egyterű", "Limuzin"], factoryDesignations: ["Gran Coupé", "Active Tourer", "Gran Tourer"] },
        ],
      },
      {
        model: "3-as sorozat",
        types: [
          {
            typeName: "315 / 316 / 318 / 320 / 323 / 324 / 325 / 328 / 330 / 335",
            generation: "E30/E36/E46/E90",
            yearFrom: 1982,
            yearTo: 2012,
            bodyTypes: ["Limuzin", "Kombi", "Kupé", "Kabrió"],
            factoryDesignations: ["Touring"],
            engines: [
              { engineVariant: "320d", engineCode: "N47D20", displacementCc: 1995, powerKw: 130, powerHp: 177, fuelType: "dizel", transmissions: ["manualis", "automata"], drives: ["hatso", "osszkerek"] },
              { engineVariant: "318i", displacementCc: 1995, powerKw: 105, powerHp: 143, fuelType: "benzin", transmissions: ["manualis", "automata"], drives: ["hatso"] },
            ],
          },
          {
            typeName: "320",
            generation: "F30",
            yearFrom: 2011,
            yearTo: 2019,
            bodyTypes: ["Limuzin", "Kombi", "Ferdehátú"],
            factoryDesignations: ["Touring", "Gran Turismo"],
            engines: [
              { engineVariant: "320d", engineCode: "N47D20 / B47D20", displacementCc: 1995, powerKw: 135, powerHp: 184, fuelType: "dizel", transmissions: ["manualis", "automata"], drives: ["hatso", "osszkerek"], trims: ["Advantage", "Sport Line", "Luxury Line", "M Sport"] },
              { engineVariant: "320d (190 LE)", engineCode: "B47D20", displacementCc: 1995, powerKw: 140, powerHp: 190, fuelType: "dizel", transmissions: ["manualis", "automata"], drives: ["hatso", "osszkerek"], yearFrom: 2015, yearTo: 2019 },
              { engineVariant: "320i", engineCode: "N20B20 / B48B20", displacementCc: 1998, powerKw: 135, powerHp: 184, fuelType: "benzin", transmissions: ["manualis", "automata"], drives: ["hatso", "osszkerek"] },
            ],
          },
          {
            typeName: "320 / 330 / 340",
            generation: "G20",
            yearFrom: 2019,
            yearTo: null,
            bodyTypes: ["Limuzin", "Kombi"],
            factoryDesignations: ["Touring"],
            engines: [
              { engineVariant: "320d", engineCode: "B47D20", displacementCc: 1995, powerKw: 140, powerHp: 190, fuelType: "dizel", transmissions: ["automata"], drives: ["hatso", "osszkerek"] },
              { engineVariant: "320i", engineCode: "B48B20", displacementCc: 1998, powerKw: 135, powerHp: 184, fuelType: "benzin", transmissions: ["automata"], drives: ["hatso", "osszkerek"] },
              { engineVariant: "320e", displacementCc: 1998, powerKw: 120, powerHp: 163, systemPowerKw: 150, systemPowerHp: 204, fuelType: "plug_in_hibrid", transmissions: ["automata"], drives: ["hatso", "osszkerek"] },
              { engineVariant: "330i", displacementCc: 1998, powerKw: 190, powerHp: 258, fuelType: "benzin", transmissions: ["automata"], drives: ["hatso", "osszkerek"] },
              { engineVariant: "330d", displacementCc: 2993, powerKw: 195, powerHp: 265, fuelType: "dizel", transmissions: ["automata"], drives: ["hatso", "osszkerek"] },
              { engineVariant: "330e", displacementCc: 1998, powerKw: 135, powerHp: 184, systemPowerKw: 215, systemPowerHp: 292, fuelType: "plug_in_hibrid", transmissions: ["automata"], drives: ["hatso", "osszkerek"] },
              { engineVariant: "M340i", displacementCc: 2998, powerKw: 275, powerHp: 374, fuelType: "benzin", transmissions: ["automata"], drives: ["osszkerek"] },
              { engineVariant: "M340d", displacementCc: 2993, powerKw: 250, powerHp: 340, fuelType: "dizel", transmissions: ["automata"], drives: ["osszkerek"] },
            ],
          },
        ],
      },
      {
        model: "4-es sorozat",
        types: [
          { typeName: "418 / 420 / 425 / 428 / 430 / 435 / 440", generation: "F32/G22", yearFrom: 2013, yearTo: null, bodyTypes: ["Kupé", "Kabrió", "Ferdehátú"], factoryDesignations: ["Gran Coupé"] },
        ],
      },
      {
        model: "5-ös sorozat",
        types: [
          {
            typeName: "518 / 520 / 523 / 524 / 525 / 528 / 530 / 535 / 540 / 545 / 550",
            generation: "E39/E60/F10/G30/G60",
            yearFrom: 1995,
            yearTo: null,
            bodyTypes: ["Limuzin", "Kombi"],
            factoryDesignations: ["Touring"],
            engines: [
              { engineVariant: "520i", displacementCc: 1998, powerKw: 135, powerHp: 184, fuelType: "benzin", transmissions: ["automata"], drives: ["hatso"] },
              { engineVariant: "520d", displacementCc: 1995, powerKw: 140, powerHp: 190, fuelType: "dizel", transmissions: ["automata"], drives: ["hatso", "osszkerek"] },
              { engineVariant: "530d", displacementCc: 2993, powerKw: 195, powerHp: 265, fuelType: "dizel", transmissions: ["automata"], drives: ["hatso", "osszkerek"] },
              { engineVariant: "530e", displacementCc: 1998, powerKw: 135, powerHp: 184, systemPowerKw: 215, systemPowerHp: 292, fuelType: "plug_in_hibrid", transmissions: ["automata"], drives: ["hatso", "osszkerek"] },
              { engineVariant: "540i", displacementCc: 2998, powerKw: 250, powerHp: 340, fuelType: "benzin", transmissions: ["automata"], drives: ["osszkerek"] },
              { engineVariant: "540d", displacementCc: 2993, powerKw: 235, powerHp: 320, fuelType: "dizel", transmissions: ["automata"], drives: ["osszkerek"] },
            ],
          },
        ],
      },
      { model: "6-os sorozat", types: [{ typeName: "628 / 630 / 633 / 635 / 640 / 645 / 650", yearFrom: 1976, yearTo: 2023, bodyTypes: ["Kupé", "Kabrió", "Ferdehátú"] }] },
      { model: "7-es sorozat", types: [{ typeName: "725 / 728 / 730 / 732 / 735 / 740 / 745 / 750 / 760", yearFrom: 1977, yearTo: null, bodyTypes: ["Limuzin"] }] },
      { model: "8-as sorozat", types: [{ typeName: "840 / 850", yearFrom: 1989, yearTo: null, bodyTypes: ["Kupé", "Kabrió", "Limuzin"] }] },
      { model: "X sorozat", types: ["X1", "X2", "X3", "X4", "X5", "X6", "X7", "XM"].map((t) => ({ typeName: t, yearFrom: 1999, yearTo: null, bodyTypes: ["Városi terepjáró", "Terepjáró"] })) },
      { model: "Z sorozat", types: ["Z1", "Z3", "Z4", "Z8"].map((t) => ({ typeName: t, yearFrom: 1989, yearTo: null, bodyTypes: ["Roadster", "Kupé"] })) },
      {
        model: "i sorozat",
        allowedFuels: ["elektromos", "plug_in_hibrid"],
        types: ["i3", "i4", "i5", "i7", "i8", "iX", "iX1", "iX2", "iX3"].map((t) => ({
          typeName: t,
          yearFrom: 2013,
          yearTo: null,
          allowedFuels: t === "i8" ? ["plug_in_hibrid"] : ["elektromos"],
        })),
      },
      { model: "M sorozat", types: ["M1", "M2", "M3", "M4", "M5", "M6", "M8"].map((t) => ({ typeName: t, yearFrom: 1978, yearTo: null, allowedFuels: ["benzin", "plug_in_hibrid"] })) },
    ],
  },
  Borgward: {
    manufacturer: "Borgward",
    allowedFuels: ["benzin"],
    models: makeSimpleModels(["Isabella", "BX5", "BX7"]),
  },
  BYD: {
    manufacturer: "BYD Auto",
    allowedFuels: ["elektromos", "plug_in_hibrid"],
    models: [
      { model: "Atto 2", allowedFuels: ["elektromos"] },
      { model: "Atto 3", allowedFuels: ["elektromos"] },
      { model: "Dolphin", allowedFuels: ["elektromos"] },
      { model: "Dolphin Surf", allowedFuels: ["elektromos"] },
      { model: "Han", allowedFuels: ["elektromos"] },
      {
        model: "Seal",
        allowedFuels: ["elektromos"],
        types: [
          {
            typeName: "Seal Design (RWD)",
            generation: "I",
            yearFrom: 2023,
            yearTo: null,
            bodyTypes: ["Limuzin"],
            allowedFuels: ["elektromos"],
            engines: [
              { engineVariant: "82,5 kWh RWD", powerKw: 230, powerHp: 313, fuelType: "elektromos", transmissions: ["automata"], drives: ["hatso"], trims: ["Design"] },
            ],
          },
          {
            typeName: "Seal Excellence (AWD)",
            generation: "I",
            yearFrom: 2023,
            yearTo: null,
            bodyTypes: ["Limuzin"],
            allowedFuels: ["elektromos"],
            engines: [
              { engineVariant: "82,5 kWh AWD", powerKw: 390, powerHp: 530, fuelType: "elektromos", transmissions: ["automata"], drives: ["osszkerek"], trims: ["Excellence"] },
            ],
          },
        ],
      },
      { model: "Seal U", allowedFuels: ["elektromos", "plug_in_hibrid"] },
      { model: "Sealion 7", allowedFuels: ["elektromos"] },
      { model: "Tang", allowedFuels: ["elektromos"] },
    ],
  },
  Cadillac: {
    manufacturer: "General Motors / Cadillac",
    allowedFuels: ["benzin", "dizel", "elektromos"],
    models: makeSimpleModels(["ATS", "BLS", "CTS", "CT4", "CT5", "CT6", "DeVille", "Eldorado", "Escalade", "Seville", "SRX", "STS", "XT4", "XT5", "XT6", "Lyriq"]),
  },
  Chery: {
    manufacturer: "Chery Automobile",
    allowedFuels: ["benzin", "plug_in_hibrid", "elektromos"],
    models: makeSimpleModels(["Tiggo 4", "Tiggo 7", "Tiggo 8", "Arrizo 8"]),
  },
  Chevrolet: {
    manufacturer: "General Motors / Chevrolet",
    allowedFuels: ["benzin", "dizel", "lpg", "plug_in_hibrid"],
    models: makeSimpleModels(["Aveo", "Blazer", "Camaro", "Captiva", "Corvette", "Cruze", "Epica", "Evanda", "HHR", "Kalos", "Lacetti", "Malibu", "Matiz", "Nubira", "Orlando", "Spark", "Suburban", "Tahoe", "Trailblazer", "Trax", "Volt"]),
  },
  Chrysler: {
    manufacturer: "Stellantis / Chrysler",
    allowedFuels: ["benzin", "dizel", "plug_in_hibrid"],
    models: makeSimpleModels(["200", "300", "300C", "Crossfire", "Grand Voyager", "Neon", "Pacifica", "PT Cruiser", "Sebring", "Stratus", "Voyager"]),
  },
  Citroën: {
    manufacturer: "Stellantis / Citroën",
    aliases: ["Citroen"],
    allowedFuels: ["benzin", "dizel", "enyhe_hibrid", "plug_in_hibrid", "elektromos"],
    models: makeSimpleModels([
      "2CV", "Ami", "AX", "BX", "CX", "C1", "C2", "C3", "C3 Aircross", "C3 Picasso", "C3 Pluriel",
      "C4", "C4 Cactus", "C4 Aircross", "C4 Picasso", "Grand C4 Picasso", "C4 SpaceTourer", "C4 X",
      "C5", "C5 Aircross", "C5 X", "C6", "C8", "DS3", "DS4", "DS5", "GS", "Méhari", "Saxo",
      "Visa", "Xantia", "XM", "Xsara", "Xsara Picasso", "Berlingo", "Jumpy", "Jumper", "SpaceTourer",
    ]),
  },
  CUPRA: {
    manufacturer: "SEAT / CUPRA",
    allowedFuels: ["benzin", "enyhe_hibrid", "plug_in_hibrid", "elektromos"],
    models: [
      { model: "Ateca", allowedFuels: ["benzin"] },
      { model: "Born", allowedFuels: ["elektromos"] },
      { model: "Formentor", allowedFuels: ["benzin", "enyhe_hibrid", "plug_in_hibrid", "dizel"] },
      { model: "Leon", allowedFuels: ["benzin", "enyhe_hibrid", "plug_in_hibrid"] },
      { model: "Leon Sportstourer", allowedFuels: ["benzin", "enyhe_hibrid", "plug_in_hibrid"] },
      { model: "Tavascan", allowedFuels: ["elektromos"] },
      { model: "Terramar", allowedFuels: ["benzin", "enyhe_hibrid", "plug_in_hibrid"] },
    ],
  },
  Dacia: {
    manufacturer: "Renault Group / Dacia",
    allowedFuels: ["benzin", "dizel", "lpg", "benzin_gaz", "teljes_hibrid", "enyhe_hibrid", "elektromos"],
    models: makeSimpleModels([
      "1100", "1300", "1310", "1410", "Nova", "Solenza", "SuperNova",
      "Dokker", "Duster", "Jogger", "Lodgy", "Logan", "Logan MCV",
      "Sandero", "Sandero Stepway", "Spring", "Bigster",
    ]),
  },
  Daewoo: {
    manufacturer: "Daewoo Motors",
    allowedFuels: ["benzin", "lpg"],
    models: makeSimpleModels(["Espero", "Evanda", "Kalos", "Lacetti", "Lanos", "Leganza", "Matiz", "Nexia", "Nubira", "Tacuma", "Tico"]),
  },
  Daihatsu: {
    manufacturer: "Daihatsu Motor Co.",
    allowedFuels: ["benzin", "dizel"],
    models: makeSimpleModels(["Applause", "Charade", "Copen", "Cuore", "Feroza", "Gran Move", "Materia", "Move", "Rocky", "Sirion", "Terios", "YRV"]),
  },
  Dodge: {
    manufacturer: "Stellantis / Dodge",
    aliases: ["Dodge RAM"],
    allowedFuels: ["benzin", "dizel", "lpg"],
    models: makeSimpleModels(["Avenger", "Caliber", "Challenger", "Charger", "Dakota", "Durango", "Grand Caravan", "Journey", "Magnum", "Neon", "Nitro", "RAM", "Viper"]),
  },
  "Dongfeng (DFSK)": {
    manufacturer: "Dongfeng Motor",
    aliases: ["Dongfeng", "DFSK"],
    allowedFuels: ["benzin", "teljes_hibrid", "plug_in_hibrid", "elektromos"],
    models: makeSimpleModels(["Box", "Glory 500", "Glory 580", "Fengon 5", "Mage", "Shine", "T5 EVO", "U-Tour", "Seres 3"]),
  },
  DS: {
    manufacturer: "Stellantis / DS Automobiles",
    allowedFuels: ["benzin", "dizel", "enyhe_hibrid", "plug_in_hibrid", "elektromos"],
    models: makeSimpleModels(["DS 3", "DS 3 Crossback", "DS 4", "DS 4 Crossback", "DS 5", "DS 7", "DS 7 Crossback", "DS 9"]),
  },
  Eveasy: {
    manufacturer: "JMEV / Eveasy",
    allowedFuels: ["elektromos"],
    models: makeSimpleModels(["Limo"]),
  },
  Ferrari: {
    manufacturer: "Ferrari S.p.A.",
    allowedFuels: ["benzin", "plug_in_hibrid"],
    models: makeSimpleModels(["308", "328", "348", "355", "360", "430", "456", "458", "488", "550 Maranello", "575M", "599", "612", "812 Superfast", "California", "F8 Tributo", "FF", "GTC4Lusso", "Portofino", "Roma", "SF90", "296 GTB", "296 GTS", "Purosangue", "F40", "F50", "Enzo", "LaFerrari"]),
  },
  Fiat: {
    manufacturer: "Stellantis / Fiat",
    allowedFuels: ["benzin", "dizel", "enyhe_hibrid", "elektromos", "lpg", "cng"],
    models: makeSimpleModels([
      "124", "125", "126", "127", "128", "131", "132", "500", "500C", "500e", "500L", "500X", "600", "850",
      "Barchetta", "Brava", "Bravo", "Cinquecento", "Coupé", "Croma", "Doblò", "Fiorino", "Freemont",
      "Fullback", "Grande Punto", "Idea", "Linea", "Marea", "Multipla", "Palio", "Panda", "Punto",
      "Punto Evo", "Qubo", "Regata", "Ritmo", "Sedici", "Seicento", "Siena", "Stilo", "Strada", "Tempra", "Tipo", "Ulysse", "Uno",
    ]),
  },
  Fisker: {
    manufacturer: "Fisker Inc.",
    allowedFuels: ["elektromos", "plug_in_hibrid"],
    models: makeSimpleModels(["Ocean", "Karma"]),
  },
  Ford: {
    manufacturer: "Ford Motor Company",
    allowedFuels: ["benzin", "dizel", "enyhe_hibrid", "teljes_hibrid", "plug_in_hibrid", "elektromos", "lpg"],
    models: [
      ...makeSimpleModels([
        "Anglia", "Bronco", "C-Max", "Grand C-Max", "Capri", "Cortina", "EcoSport", "Edge", "Escort",
        "Explorer", "F-150", "Fiesta", "Fusion", "Galaxy", "Granada", "Ka", "Ka+", "Kuga", "Maverick",
        "Mondeo", "Mustang", "Mustang Mach-E", "Orion", "Puma", "Ranger", "Scorpio", "Sierra", "S-Max",
        "Taunus", "Thunderbird", "Tourneo Connect", "Tourneo Courier", "Tourneo Custom",
        "Transit", "Transit Connect", "Transit Courier", "Transit Custom",
      ]),
      {
        model: "Focus",
        types: [
          { typeName: "Focus I", generation: "Mk1", yearFrom: 1998, yearTo: 2004, bodyTypes: ["Ferdehátú", "Kombi", "Lépcsőshátú"] },
          { typeName: "Focus II", generation: "Mk2", yearFrom: 2004, yearTo: 2011, bodyTypes: ["Ferdehátú", "Kombi", "Lépcsőshátú", "Kabrió"] },
          { typeName: "Focus III", generation: "Mk3", yearFrom: 2011, yearTo: 2018, bodyTypes: ["Ferdehátú", "Kombi", "Lépcsőshátú"] },
          {
            typeName: "Focus IV",
            generation: "Mk4",
            yearFrom: 2018,
            yearTo: null,
            bodyTypes: ["Ferdehátú", "Kombi"],
            engines: [
              { engineVariant: "1.0 EcoBoost", displacementCc: 999, powerKw: 92, powerHp: 125, fuelType: "benzin", transmissions: ["manualis", "automata"], drives: ["elso"], trims: ["Trend", "Titanium", "ST-Line", "Active", "Vignale"] },
              { engineVariant: "1.5 EcoBlue", displacementCc: 1499, powerKw: 88, powerHp: 120, fuelType: "dizel", transmissions: ["manualis", "automata"], drives: ["elso"], trims: ["Trend", "Titanium", "ST-Line"] },
            ],
          },
        ],
      },
    ],
  },
  Forthing: {
    manufacturer: "Dongfeng Liuzhou / Forthing",
    allowedFuels: ["benzin", "teljes_hibrid", "elektromos"],
    models: makeSimpleModels(["T5 EVO", "U-Tour", "Friday", "S7"]),
  },
  GAZ: {
    manufacturer: "GAZ",
    allowedFuels: ["benzin", "dizel"],
    models: makeSimpleModels(["21", "24", "69", "3102", "3110", "M20 Pobeda"]),
  },
  Geely: {
    manufacturer: "Geely Auto",
    allowedFuels: ["benzin", "elektromos", "plug_in_hibrid"],
    models: makeSimpleModels(["Coolray", "Starray", "EX5", "Geometry C"]),
  },
  Genesis: {
    manufacturer: "Hyundai Motor Group / Genesis",
    allowedFuels: ["benzin", "dizel", "elektromos"],
    models: makeSimpleModels(["G70", "G80", "G90", "GV60", "GV70", "GV80"]),
  },
  GMC: {
    manufacturer: "General Motors / GMC",
    allowedFuels: ["benzin", "dizel", "elektromos"],
    models: makeSimpleModels(["Acadia", "Canyon", "Hummer EV", "Sierra", "Terrain", "Yukon"]),
  },
  "Great Wall": {
    manufacturer: "Great Wall Motors",
    allowedFuels: ["benzin", "dizel", "elektromos"],
    models: makeSimpleModels(["Hover", "Steed", "Poer", "Wey 03", "Wey 05", "Ora 03"]),
  },
  Haval: {
    manufacturer: "Great Wall Motors / Haval",
    allowedFuels: ["benzin", "teljes_hibrid"],
    models: makeSimpleModels(["H2", "H6", "Jolion", "Dargo"]),
  },
  Honda: {
    manufacturer: "Honda Motor Co.",
    allowedFuels: ["benzin", "dizel", "teljes_hibrid", "plug_in_hibrid", "elektromos"],
    models: makeSimpleModels(["Accord", "Civic", "Civic Type R", "CR-V", "CR-X", "CR-Z", "e", "e:Ny1", "FR-V", "HR-V", "Insight", "Integra", "Jazz", "Legend", "Logo", "NSX", "Odyssey", "Prelude", "S2000", "Shuttle", "Stream", "ZR-V"]),
  },
  Hummer: {
    manufacturer: "General Motors / Hummer",
    allowedFuels: ["benzin", "dizel", "elektromos"],
    models: makeSimpleModels(["H1", "H2", "H3", "EV"]),
  },
  Hyundai: {
    manufacturer: "Hyundai Motor Company",
    allowedFuels: ["benzin", "dizel", "enyhe_hibrid", "teljes_hibrid", "plug_in_hibrid", "elektromos", "hidrogen"],
    models: makeSimpleModels(["Accent", "Atos", "Bayon", "Coupé", "Elantra", "Galloper", "Genesis", "Getz", "Grandeur", "H-1", "i10", "i20", "i30", "i40", "Ioniq", "Ioniq 5", "Ioniq 6", "Inster", "ix20", "ix35", "ix55", "Kona", "Matrix", "Nexo", "Santa Fe", "Sonata", "Staria", "Terracan", "Trajet", "Tucson", "Veloster"]),
  },
  Ineos: {
    manufacturer: "INEOS Automotive",
    allowedFuels: ["benzin", "dizel"],
    models: makeSimpleModels(["Grenadier", "Grenadier Quartermaster"]),
  },
  Infiniti: {
    manufacturer: "Nissan / Infiniti",
    allowedFuels: ["benzin", "dizel", "hibrid_benzin"],
    models: makeSimpleModels(["EX", "FX", "G", "M", "Q30", "Q50", "Q60", "Q70", "QX30", "QX50", "QX55", "QX60", "QX70", "QX80"]),
  },
  Isuzu: {
    manufacturer: "Isuzu Motors",
    allowedFuels: ["dizel", "benzin"],
    models: makeSimpleModels(["D-Max", "MU-X", "Rodeo", "Trooper"]),
  },
  Jaecoo: {
    manufacturer: "Chery / Jaecoo",
    allowedFuels: ["benzin", "plug_in_hibrid", "elektromos"],
    models: makeSimpleModels(["J5", "J7", "J8"]),
  },
  Jaguar: {
    manufacturer: "Jaguar Land Rover",
    allowedFuels: ["benzin", "dizel", "enyhe_hibrid", "plug_in_hibrid", "elektromos"],
    models: makeSimpleModels(["E-Type", "E-Pace", "F-Pace", "F-Type", "I-Pace", "S-Type", "X-Type", "XE", "XF", "XJ", "XJS", "XK"]),
  },
  Jeep: {
    manufacturer: "Stellantis / Jeep",
    allowedFuels: ["benzin", "dizel", "enyhe_hibrid", "plug_in_hibrid", "elektromos"],
    models: makeSimpleModels(["Avenger", "Cherokee", "Commander", "Compass", "Gladiator", "Grand Cherokee", "Patriot", "Renegade", "Wrangler", "Wagoneer"]),
  },
  "KGM (SsangYong)": {
    manufacturer: "KG Mobility (korábban SsangYong)",
    aliases: ["KGM", "SsangYong", "Ssang Yong"],
    allowedFuels: ["benzin", "dizel", "elektromos"],
    models: makeSimpleModels(["Actyon", "Actyon Sports", "Chairman", "Korando", "Kyron", "Musso", "Musso Grand", "Rexton", "Rodius", "Tivoli", "Tivoli Grand", "Torres", "Torres EVX"]),
  },
  SsangYong: {
    manufacturer: "SsangYong Motor (történeti márkanév -> KGM)",
    aliases: ["Ssang Yong", "KGM"],
    allowedFuels: ["benzin", "dizel", "elektromos"],
    models: makeSimpleModels(["Actyon", "Actyon Sports", "Chairman", "Korando", "Kyron", "Musso", "Musso Grand", "Rexton", "Rodius", "Tivoli", "Tivoli Grand", "Torres", "XLV"]),
  },
  Kia: {
    manufacturer: "Kia Corporation",
    allowedFuels: ["benzin", "dizel", "enyhe_hibrid", "teljes_hibrid", "plug_in_hibrid", "elektromos"],
    models: makeSimpleModels(["Carens", "Carnival", "Ceed", "Cerato", "Clarus", "EV3", "EV4", "EV5", "EV6", "EV9", "Magentis", "Niro", "Opirus", "Optima", "Picanto", "Pride", "ProCeed", "Rio", "Sephia", "Shuma", "Sorento", "Soul", "Sportage", "Stinger", "Stonic", "Venga", "XCeed"]),
  },
  Lada: {
    manufacturer: "AvtoVAZ / Lada",
    allowedFuels: ["benzin", "lpg", "dizel"],
    models: makeSimpleModels(["1200", "1300", "1500", "1600", "2101", "2102", "2103", "2104", "2105", "2106", "2107", "2108", "2109", "21099", "2110", "2111", "2112", "Granta", "Kalina", "Niva", "Priora", "Samara", "Vesta"]),
  },
  Lamborghini: {
    manufacturer: "Automobili Lamborghini",
    allowedFuels: ["benzin", "plug_in_hibrid"],
    models: makeSimpleModels(["Countach", "Diablo", "Gallardo", "Huracán", "Murciélago", "Aventador", "Urus", "Revuelto", "Temerario", "Miura", "LM002"]),
  },
  Lancia: {
    manufacturer: "Stellantis / Lancia",
    allowedFuels: ["benzin", "dizel", "enyhe_hibrid", "elektromos"],
    models: makeSimpleModels(["A112", "Beta", "Dedra", "Delta", "Fulvia", "Kappa", "Lybra", "Musa", "Phedra", "Prisma", "Thema", "Thesis", "Y", "Ypsilon", "Zeta"]),
  },
  "Land Rover": {
    manufacturer: "Jaguar Land Rover",
    allowedFuels: ["benzin", "dizel", "enyhe_hibrid", "plug_in_hibrid"],
    models: makeSimpleModels(["Defender", "Discovery", "Discovery Sport", "Freelander", "Range Rover", "Range Rover Evoque", "Range Rover Sport", "Range Rover Velar"]),
  },
  Leapmotor: {
    manufacturer: "Leapmotor / Stellantis",
    allowedFuels: ["elektromos", "plug_in_hibrid"],
    models: makeSimpleModels(["T03", "C10", "B10"]),
  },
  LEVC: {
    manufacturer: "London EV Company",
    allowedFuels: ["plug_in_hibrid", "elektromos"],
    models: makeSimpleModels(["TX", "VN5"]),
  },
  Lexus: {
    manufacturer: "Toyota Motor Corp. / Lexus",
    allowedFuels: ["teljes_hibrid", "hibrid_benzin", "plug_in_hibrid", "benzin", "dizel", "elektromos"],
    models: [
      { model: "CT", types: [{ typeName: "CT 200h", yearFrom: 2011, yearTo: 2020, allowedFuels: ["teljes_hibrid", "hibrid_benzin"] }] },
      { model: "IS", types: [{ typeName: "IS 250 / IS 300h", yearFrom: 1999, yearTo: null }] },
      { model: "NX", types: [{ typeName: "NX 300h / NX 350h / NX 450h+", yearFrom: 2014, yearTo: null }] },
      { model: "RX", types: [{ typeName: "RX 350 / RX 450h / RX 500h", yearFrom: 1998, yearTo: null }] },
      ...makeSimpleModels(["ES", "GS", "GX", "LC", "LFA", "LM", "LS", "LX", "RC", "RZ", "SC", "UX", "LBX"]),
    ],
  },
  Ligier: {
    manufacturer: "Ligier Group",
    allowedFuels: ["dizel", "elektromos"],
    models: makeSimpleModels(["JS50", "JS60", "Myli", "IXO", "X-Too"]),
  },
  Lincoln: {
    manufacturer: "Ford Motor Company / Lincoln",
    allowedFuels: ["benzin", "teljes_hibrid"],
    models: makeSimpleModels(["Aviator", "Continental", "Corsair", "MKZ", "Nautilus", "Navigator", "Town Car"]),
  },
  Lotus: {
    manufacturer: "Group Lotus",
    allowedFuels: ["benzin", "elektromos"],
    models: makeSimpleModels(["Elise", "Exige", "Evora", "Emira", "Eletre", "Emeya", "Esprit"]),
  },
  Mahindra: {
    manufacturer: "Mahindra & Mahindra",
    allowedFuels: ["benzin", "dizel"],
    models: makeSimpleModels(["Goa", "KUV100", "XUV300", "XUV500", "Thar"]),
  },
  Maruti: {
    manufacturer: "Maruti Suzuki",
    allowedFuels: ["benzin"],
    models: makeSimpleModels(["800", "Alto", "Zen"]),
  },
  Maserati: {
    manufacturer: "Stellantis / Maserati",
    allowedFuels: ["benzin", "dizel", "enyhe_hibrid", "elektromos"],
    models: makeSimpleModels(["Ghibli", "GranCabrio", "GranSport", "GranTurismo", "Grecale", "Levante", "Quattroporte", "MC12", "MC20", "Biturbo"]),
  },
  Mazda: {
    manufacturer: "Mazda Motor Corporation",
    allowedFuels: ["benzin", "dizel", "enyhe_hibrid", "plug_in_hibrid", "elektromos"],
    models: makeSimpleModels(["121", "323", "626", "929", "Mazda2", "Mazda3", "Mazda5", "Mazda6", "CX-3", "CX-30", "CX-5", "CX-7", "CX-9", "CX-60", "CX-80", "Demio", "MPV", "MX-3", "MX-5", "MX-6", "MX-30", "Premacy", "RX-7", "RX-8", "Xedos 6", "Xedos 9", "BT-50"]),
  },
  "Mercedes-Benz": {
    manufacturer: "Mercedes-Benz Group AG",
    aliases: ["Mercedes", "Mercedes Benz"],
    allowedFuels: ["benzin", "dizel", "enyhe_hibrid", "plug_in_hibrid", "elektromos", "cng"],
    models: [
      { model: "A-osztály", types: [{ typeName: "A 160 / A 180 / A 180 CDI / A 200 / A 220", generation: "W168/W169/W176/W177", yearFrom: 1997, yearTo: null }] },
      { model: "B-osztály", types: [{ typeName: "B 180 / B 200 / B 220", generation: "W245/W246/W247", yearFrom: 2005, yearTo: null }] },
      {
        model: "C-osztály",
        types: [
          {
            typeName: "C 180 / C 200 / C 220 CDI / C 220 d / C 250 / C 300 / C 300 e",
            generation: "W203/W204/W205/W206",
            yearFrom: 2000,
            yearTo: null,
            bodyTypes: ["Limuzin", "Kombi", "Kupé", "Kabrió"],
          },
        ],
      },
      {
        model: "E-osztály",
        types: [
          {
            typeName: "E 220 d",
            generation: "W213",
            yearFrom: 2016,
            yearTo: 2023,
            bodyTypes: ["Limuzin", "Kombi", "Kupé", "Kabrió"],
            engines: [
              { engineVariant: "E 220 d (OM654)", engineCode: "OM654", displacementCc: 1950, powerKw: 143, powerHp: 194, fuelType: "dizel", transmissions: ["automata"], drives: ["hatso", "osszkerek"], trims: ["Avantgarde", "Exclusive", "AMG Line"] },
              { engineVariant: "E 220 d 4MATIC", engineCode: "OM654", displacementCc: 1950, powerKw: 147, powerHp: 200, fuelType: "enyhe_hibrid", transmissions: ["automata"], drives: ["osszkerek"], yearFrom: 2021, yearTo: 2023 },
            ],
          },
          {
            typeName: "E 200 / E 220 CDI / E 250 / E 300 / E 350 / E 400 / E 450",
            generation: "W210/W211/W212/W213/W214",
            yearFrom: 1995,
            yearTo: null,
            bodyTypes: ["Limuzin", "Kombi"],
          },
        ],
      },
      { model: "S-osztály", types: [{ typeName: "S 350 / S 400 / S 500", generation: "W220/W221/W222/W223", yearFrom: 1998, yearTo: null }] },
      { model: "GLC-osztály", types: [{ typeName: "GLC 220 d / GLC 300", yearFrom: 2015, yearTo: null }] },
      { model: "GLE-osztály", types: [{ typeName: "GLE 350 d / GLE 400 d / GLE 450", yearFrom: 2015, yearTo: null }] },
      ...makeSimpleModels([
        "G-osztály", "R-osztály", "V-osztály", "X-osztály", "CLA-osztály", "CLE-osztály", "CLK-osztály",
        "CLS-osztály", "CL-osztály", "SL-osztály", "SLC-osztály", "SLK-osztály", "GLA-osztály",
        "GLB-osztály", "GLS-osztály", "GL-osztály", "GLK-osztály", "M-osztály",
        "EQA", "EQB", "EQC", "EQE", "EQS", "EQV", "Citan", "T-osztály", "Vaneo", "Viano", "Vito", "Sprinter", "SLR", "SLS",
        "190", "200", "220", "230", "240", "250", "260", "280", "300", "350", "380", "420", "450", "500", "560", "600",
      ]),
    ],
  },
  "Mercedes-AMG": {
    manufacturer: "Mercedes-AMG GmbH",
    allowedFuels: ["benzin", "plug_in_hibrid", "elektromos"],
    models: makeSimpleModels(["GT", "GT 4-Door Coupé", "A 35", "A 45", "C 43", "C 63", "E 53", "E 63", "G 63", "GLE 53", "GLE 63", "SL 55", "SL 63", "EQE 43", "EQS 53"]),
  },
  "Mercedes-Maybach": {
    manufacturer: "Mercedes-Benz / Maybach",
    allowedFuels: ["benzin", "plug_in_hibrid", "elektromos"],
    models: makeSimpleModels(["S 580", "S 680", "GLS 600", "EQS 680 SUV", "SL 680"]),
  },
  MG: {
    manufacturer: "SAIC Motor / MG",
    allowedFuels: ["benzin", "teljes_hibrid", "plug_in_hibrid", "elektromos"],
    models: makeSimpleModels(["MG3", "MG4", "MG5", "MG ZS", "MG ZS EV", "MG HS", "MG EHS", "Marvel R", "Cyberster", "MGF", "TF", "ZR", "ZT", "MGB", "MGA"]),
  },
  MINI: {
    manufacturer: "BMW Group / MINI",
    allowedFuels: ["benzin", "dizel", "plug_in_hibrid", "elektromos"],
    models: makeSimpleModels(["One", "Cooper", "Cooper S", "Cooper SE", "Clubman", "Countryman", "Paceman", "Coupé", "Roadster", "Cabrio", "Aceman", "John Cooper Works"]),
  },
  Mitsubishi: {
    manufacturer: "Mitsubishi Motors",
    allowedFuels: ["benzin", "dizel", "teljes_hibrid", "plug_in_hibrid", "elektromos"],
    models: makeSimpleModels(["3000GT", "ASX", "Carisma", "Colt", "Eclipse", "Eclipse Cross", "Galant", "Grandis", "i-MiEV", "L200", "L300", "L400", "Lancer", "Lancer Evolution", "Outlander", "Pajero", "Pajero Pinin", "Pajero Sport", "Space Star", "Space Runner", "Space Wagon", "Sigma"]),
  },
  Moszkvics: {
    manufacturer: "AZLK / Moszkvics",
    allowedFuels: ["benzin"],
    models: makeSimpleModels(["400", "401", "402", "403", "407", "408", "412", "2140", "2141"]),
  },
  NIO: {
    manufacturer: "NIO Inc.",
    allowedFuels: ["elektromos"],
    models: makeSimpleModels(["EL6", "EL7", "EL8", "ET5", "ET5 Touring", "ET7"]),
  },
  Nissan: {
    manufacturer: "Nissan Motor Co.",
    allowedFuels: ["benzin", "dizel", "teljes_hibrid", "enyhe_hibrid", "elektromos"],
    models: makeSimpleModels(["100NX", "200SX", "300ZX", "350Z", "370Z", "Almera", "Almera Tino", "Ariya", "Bluebird", "Cube", "GT-R", "Juke", "Leaf", "Maxima", "Micra", "Murano", "Navara", "Note", "Pathfinder", "Patrol", "Pixo", "Primera", "Pulsar", "Qashqai", "Qashqai+2", "Skyline", "Sunny", "Terrano", "Tiida", "X-Trail", "Townstar", "Primastar", "Interstar"]),
  },
  Oltcit: {
    manufacturer: "Oltcit Craiova",
    allowedFuels: ["benzin"],
    models: makeSimpleModels(["Club 11", "Club 12 TRS", "Special"]),
  },
  Omoda: {
    manufacturer: "Chery / Omoda",
    allowedFuels: ["benzin", "elektromos"],
    models: makeSimpleModels(["Omoda 5", "Omoda E5", "Omoda 9"]),
  },
  Opel: {
    manufacturer: "Stellantis / Opel",
    allowedFuels: ["benzin", "dizel", "enyhe_hibrid", "plug_in_hibrid", "elektromos", "lpg", "cng"],
    models: [
      {
        model: "Astra",
        types: [
          { typeName: "Astra F", generation: "F", yearFrom: 1991, yearTo: 1998, bodyTypes: ["Ferdehátú", "Kombi", "Lépcsőshátú", "Kabrió"] },
          { typeName: "Astra G", generation: "G", yearFrom: 1998, yearTo: 2009, bodyTypes: ["Ferdehátú", "Kombi", "Lépcsőshátú", "Kupé", "Kabrió"] },
          {
            typeName: "Astra H",
            generation: "H",
            yearFrom: 2004,
            yearTo: 2014,
            bodyTypes: ["Ferdehátú", "Kombi", "Lépcsőshátú", "Kupé", "Kabrió"],
            factoryDesignations: ["Caravan", "GTC", "TwinTop"],
            engines: [
              { engineVariant: "1.4", engineCode: "Z14XEP", displacementCc: 1364, powerKw: 66, powerHp: 90, fuelType: "benzin", transmissions: ["manualis"], drives: ["elso"], trims: ["Essentia", "Enjoy", "Cosmo"] },
              { engineVariant: "1.6", engineCode: "Z16XEP / Z16XER", displacementCc: 1598, powerKw: 85, powerHp: 115, fuelType: "benzin", transmissions: ["manualis", "robotizalt"], drives: ["elso"], trims: ["Essentia", "Enjoy", "Cosmo"] },
              { engineVariant: "1.7 CDTI", engineCode: "Z17DTH / Z17DTR", displacementCc: 1686, powerKw: 74, powerHp: 101, fuelType: "dizel", transmissions: ["manualis"], drives: ["elso"] },
              { engineVariant: "1.9 CDTI", engineCode: "Z19DTH", displacementCc: 1910, powerKw: 110, powerHp: 150, fuelType: "dizel", transmissions: ["manualis", "automata"], drives: ["elso"] },
            ],
          },
          { typeName: "Astra J", generation: "J", yearFrom: 2009, yearTo: 2015, bodyTypes: ["Ferdehátú", "Kombi", "Lépcsőshátú", "Kupé"], factoryDesignations: ["Sports Tourer", "GTC"] },
          { typeName: "Astra K", generation: "K", yearFrom: 2015, yearTo: 2021, bodyTypes: ["Ferdehátú", "Kombi"], factoryDesignations: ["Sports Tourer"] },
          { typeName: "Astra L", generation: "L", yearFrom: 2021, yearTo: null, bodyTypes: ["Ferdehátú", "Kombi"], factoryDesignations: ["Sports Tourer", "GSe"] },
        ],
      },
      {
        model: "Corsa",
        types: [
          { typeName: "Corsa A", generation: "A", yearFrom: 1982, yearTo: 1993 },
          { typeName: "Corsa B", generation: "B", yearFrom: 1993, yearTo: 2000 },
          { typeName: "Corsa C", generation: "C", yearFrom: 2000, yearTo: 2006 },
          { typeName: "Corsa D", generation: "D", yearFrom: 2006, yearTo: 2014 },
          { typeName: "Corsa E", generation: "E", yearFrom: 2014, yearTo: 2019 },
          { typeName: "Corsa F", generation: "F", yearFrom: 2019, yearTo: null },
        ],
      },
      {
        model: "Vectra",
        types: [
          { typeName: "Vectra A", generation: "A", yearFrom: 1988, yearTo: 1995 },
          { typeName: "Vectra B", generation: "B", yearFrom: 1995, yearTo: 2002 },
          { typeName: "Vectra C", generation: "C", yearFrom: 2002, yearTo: 2008 },
        ],
      },
      {
        model: "Zafira",
        types: [
          { typeName: "Zafira A", generation: "A", yearFrom: 1999, yearTo: 2005 },
          { typeName: "Zafira B", generation: "B", yearFrom: 2005, yearTo: 2014 },
          { typeName: "Zafira C / Tourer", generation: "C", yearFrom: 2011, yearTo: 2019 },
          { typeName: "Zafira Life", generation: "Life", yearFrom: 2019, yearTo: null },
        ],
      },
      {
        model: "Meriva",
        types: [
          { typeName: "Meriva A", generation: "A", yearFrom: 2003, yearTo: 2010 },
          { typeName: "Meriva B", generation: "B", yearFrom: 2010, yearTo: 2017 },
        ],
      },
      {
        model: "Kadett",
        types: [
          { typeName: "Kadett B", generation: "B", yearFrom: 1965, yearTo: 1973 },
          { typeName: "Kadett C", generation: "C", yearFrom: 1973, yearTo: 1979 },
          { typeName: "Kadett D", generation: "D", yearFrom: 1979, yearTo: 1984 },
          { typeName: "Kadett E", generation: "E", yearFrom: 1984, yearTo: 1991 },
        ],
      },
      {
        model: "Omega",
        types: [
          { typeName: "Omega A", generation: "A", yearFrom: 1986, yearTo: 1993 },
          { typeName: "Omega B", generation: "B", yearFrom: 1994, yearTo: 2003 },
        ],
      },
      ...makeSimpleModels([
        "Adam", "Agila", "Ampera", "Ampera-e", "Antara", "Ascona", "Calibra", "Cascada", "Campo",
        "Combo", "Commodore", "Crossland", "Crossland X", "Frontera", "Grandland", "Grandland X",
        "GT", "Insignia", "Karl", "Manta", "Mokka", "Mokka X", "Monterey", "Monza", "Movano",
        "Olympia", "Rekord", "Senator", "Signum", "Sintra", "Speedster", "Tigra", "Vivaro", "Zafira Life",
      ]),
    ],
  },
  Peugeot: {
    manufacturer: "Stellantis / Peugeot",
    allowedFuels: ["benzin", "dizel", "enyhe_hibrid", "plug_in_hibrid", "elektromos"],
    models: makeSimpleModels([
      "104", "106", "107", "108", "204", "205", "206", "206 CC", "207", "207 CC", "208", "e-208",
      "304", "305", "306", "307", "307 CC", "308", "308 CC", "e-308", "309", "404", "405", "406",
      "407", "408", "504", "505", "508", "604", "605", "607", "806", "807", "1007",
      "2008", "e-2008", "3008", "e-3008", "4007", "4008", "5008", "e-5008",
      "Bipper", "Partner", "Rifter", "Expert", "Traveller", "Boxer", "RCZ", "iOn",
    ]),
  },
  "Polski Fiat": {
    manufacturer: "FSM / FSO Polski Fiat",
    allowedFuels: ["benzin"],
    models: makeSimpleModels(["125p", "126p"]),
  },
  Polonez: {
    manufacturer: "FSO Polonez",
    allowedFuels: ["benzin", "dizel"],
    models: makeSimpleModels(["1500", "Caro", "Atu", "Truck"]),
  },
  Porsche: {
    manufacturer: "Dr. Ing. h.c. F. Porsche AG",
    allowedFuels: ["benzin", "dizel", "plug_in_hibrid", "elektromos"],
    models: [
      {
        model: "911",
        types: [
          { typeName: "911 Carrera / Carrera S / Carrera 4S", generation: "964/993/996/997/991/992", yearFrom: 1963, yearTo: null, bodyTypes: ["Kupé", "Kabrió"] },
          { typeName: "911 Turbo / Turbo S", generation: "930/964/993/996/997/991/992", yearFrom: 1975, yearTo: null, bodyTypes: ["Kupé", "Kabrió"] },
          { typeName: "911 Targa", yearFrom: 1967, yearTo: null, bodyTypes: ["Kabrió", "Kupé"] },
          { typeName: "911 GT3 / GT3 RS", yearFrom: 1999, yearTo: null, bodyTypes: ["Kupé"] },
        ],
      },
      ...makeSimpleModels(["356", "912", "914", "924", "928", "944", "968", "Boxster", "Cayman", "718 Boxster", "718 Cayman", "Cayenne", "Macan", "Panamera", "Taycan", "Carrera GT", "918 Spyder"]),
    ],
  },
  Proton: {
    manufacturer: "Proton Holdings",
    allowedFuels: ["benzin"],
    models: makeSimpleModels(["313", "315", "415", "416", "418", "Persona", "Satria", "Wira"]),
  },
  RAM: {
    manufacturer: "Stellantis / RAM Trucks",
    aliases: ["Dodge RAM"],
    allowedFuels: ["benzin", "dizel", "lpg"],
    models: makeSimpleModels(["1500", "2500", "3500", "TRX"]),
  },
  Renault: {
    manufacturer: "Renault Group",
    allowedFuels: ["benzin", "dizel", "enyhe_hibrid", "teljes_hibrid", "plug_in_hibrid", "elektromos", "lpg"],
    models: [
      {
        model: "Clio",
        types: [
          { typeName: "Clio I", generation: "I", yearFrom: 1990, yearTo: 1998 },
          { typeName: "Clio II", generation: "II", yearFrom: 1998, yearTo: 2012 },
          { typeName: "Clio III", generation: "III", yearFrom: 2005, yearTo: 2014 },
          { typeName: "Clio IV", generation: "IV", yearFrom: 2012, yearTo: 2020 },
          { typeName: "Clio V / E-Tech", generation: "V", yearFrom: 2019, yearTo: null },
        ],
      },
      {
        model: "Mégane",
        types: [
          { typeName: "Mégane I", generation: "I", yearFrom: 1995, yearTo: 2003 },
          { typeName: "Mégane II", generation: "II", yearFrom: 2002, yearTo: 2009 },
          { typeName: "Mégane III", generation: "III", yearFrom: 2008, yearTo: 2016 },
          { typeName: "Mégane IV / E-Tech Plug-in", generation: "IV", yearFrom: 2016, yearTo: 2024 },
          { typeName: "Mégane E-Tech Electric", generation: "V", yearFrom: 2022, yearTo: null, allowedFuels: ["elektromos"] },
        ],
      },
      ...makeSimpleModels([
        "4 CV", "R4", "R5", "R8", "R9", "R11", "R12", "R14", "R15", "R16", "R18", "R19", "R20", "R21", "R25", "R30",
        "Arkana", "Austral", "Avantime", "Captur", "Espace", "Grand Espace", "Express", "Fluence", "Fuego",
        "Kadjar", "Kangoo", "Koleos", "Laguna", "Latitude", "Master", "Modus", "Grand Modus", "Rafale",
        "Safrane", "Scénic", "Grand Scénic", "Scénic Xmod", "Symbioz", "Talisman", "Thalia", "Trafic",
        "Twingo", "Twizy", "Vel Satis", "Wind", "Zoe",
      ]),
    ],
  },
  "Rolls-Royce": {
    manufacturer: "Rolls-Royce Motor Cars",
    allowedFuels: ["benzin", "elektromos"],
    models: makeSimpleModels(["Cullinan", "Dawn", "Ghost", "Phantom", "Silver Shadow", "Silver Spirit", "Silver Spur", "Spectre", "Wraith", "Corniche"]),
  },
  Rover: {
    manufacturer: "MG Rover",
    allowedFuels: ["benzin", "dizel"],
    models: makeSimpleModels(["25", "45", "75", "100", "200", "400", "600", "800", "CityRover", "Metro", "Mini", "Streetwise"]),
  },
  Saab: {
    manufacturer: "Saab Automobile",
    allowedFuels: ["benzin", "dizel", "etanol"],
    models: makeSimpleModels(["90", "92", "93", "95", "96", "99", "900", "9000", "9-3", "9-5", "9-7X"]),
  },
  SEAT: {
    manufacturer: "SEAT S.A.",
    allowedFuels: ["benzin", "dizel", "enyhe_hibrid", "plug_in_hibrid", "cng", "elektromos"],
    models: makeSimpleModels(["127", "133", "Alhambra", "Altea", "Altea XL", "Arona", "Arosa", "Ateca", "Cordoba", "Exeo", "Ibiza", "Inca", "Leon", "Malaga", "Marbella", "Mii", "Ronda", "Tarraco", "Toledo"]),
  },
  Škoda: {
    manufacturer: "Škoda Auto",
    aliases: ["Skoda"],
    allowedFuels: ["benzin", "dizel", "enyhe_hibrid", "plug_in_hibrid", "elektromos", "cng"],
    models: [
      {
        model: "Fabia",
        types: [
          { typeName: "Fabia I", generation: "I", yearFrom: 1999, yearTo: 2007, bodyTypes: ["Ferdehátú", "Kombi", "Lépcsőshátú"], factoryDesignations: ["Combi", "RS"] },
          { typeName: "Fabia II", generation: "II", yearFrom: 2007, yearTo: 2014, bodyTypes: ["Ferdehátú", "Kombi"], factoryDesignations: ["Combi", "Scout", "RS"] },
          { typeName: "Fabia III", generation: "III", yearFrom: 2014, yearTo: 2021, bodyTypes: ["Ferdehátú", "Kombi"], factoryDesignations: ["Combi"] },
          { typeName: "Fabia IV", generation: "IV", yearFrom: 2021, yearTo: null, bodyTypes: ["Ferdehátú"] },
        ],
      },
      {
        model: "Octavia",
        types: [
          { typeName: "Octavia I", generation: "I (1U)", yearFrom: 1996, yearTo: 2010, bodyTypes: ["Ferdehátú", "Kombi"], factoryDesignations: ["Combi", "RS", "4x4"] },
          { typeName: "Octavia II", generation: "II (1Z)", yearFrom: 2004, yearTo: 2013, bodyTypes: ["Ferdehátú", "Kombi"], factoryDesignations: ["Combi", "Scout", "RS", "4x4"] },
          {
            typeName: "Octavia III",
            generation: "III (5E)",
            yearFrom: 2013,
            yearTo: 2020,
            bodyTypes: ["Ferdehátú", "Kombi"],
            factoryDesignations: ["Combi", "Scout", "RS", "4x4"],
            engines: [
              { engineVariant: "1.6 TDI", displacementCc: 1598, powerKw: 85, powerHp: 115, fuelType: "dizel", transmissions: ["manualis", "duplakuplungos"], drives: ["elso", "osszkerek"] },
              { engineVariant: "2.0 TDI", displacementCc: 1968, powerKw: 110, powerHp: 150, fuelType: "dizel", transmissions: ["manualis", "duplakuplungos"], drives: ["elso", "osszkerek"] },
              { engineVariant: "1.4 TSI", displacementCc: 1395, powerKw: 110, powerHp: 150, fuelType: "benzin", transmissions: ["manualis", "duplakuplungos"], drives: ["elso"] },
            ],
          },
          {
            typeName: "Octavia IV",
            generation: "IV (NX)",
            yearFrom: 2020,
            yearTo: null,
            bodyTypes: ["Ferdehátú", "Kombi"],
            factoryDesignations: ["Combi", "Scout", "RS", "4x4", "iV"],
            engines: [
              { engineVariant: "1.5 TSI", displacementCc: 1498, powerKw: 110, powerHp: 150, fuelType: "benzin", transmissions: ["manualis", "duplakuplungos"], drives: ["elso"] },
              { engineVariant: "2.0 TDI", displacementCc: 1968, powerKw: 110, powerHp: 150, fuelType: "dizel", transmissions: ["manualis", "duplakuplungos"], drives: ["elso", "osszkerek"] },
              { engineVariant: "1.4 TSI iV", displacementCc: 1395, powerKw: 110, powerHp: 150, systemPowerKw: 150, systemPowerHp: 204, fuelType: "plug_in_hibrid", transmissions: ["duplakuplungos"], drives: ["elso"] },
            ],
          },
        ],
      },
      {
        model: "Superb",
        types: [
          { typeName: "Superb I", generation: "I", yearFrom: 2001, yearTo: 2008 },
          { typeName: "Superb II", generation: "II", yearFrom: 2008, yearTo: 2015, factoryDesignations: ["Combi", "4x4"] },
          { typeName: "Superb III", generation: "III", yearFrom: 2015, yearTo: 2024, factoryDesignations: ["Combi", "Scout", "4x4", "iV"] },
          { typeName: "Superb IV", generation: "IV", yearFrom: 2024, yearTo: null, factoryDesignations: ["Combi", "4x4", "iV"] },
        ],
      },
      ...makeSimpleModels(["100", "105", "110", "120", "125", "130", "135", "136", "Favorit", "Forman", "Felicia", "Citigo", "Rapid", "Roomster", "Scala", "Yeti", "Kamiq", "Karoq", "Kodiaq", "Enyaq", "Enyaq Coupé", "Elroq"]),
    ],
  },
  Skywell: {
    manufacturer: "Skyworth / Skywell",
    allowedFuels: ["elektromos"],
    models: makeSimpleModels(["ET5", "BE11"]),
  },
  Smart: {
    manufacturer: "Smart Automobile",
    allowedFuels: ["benzin", "dizel", "elektromos"],
    models: makeSimpleModels(["City-Coupé", "Fortwo", "Forfour", "Roadster", "Crossblade", "EQ Fortwo", "EQ Forfour", "#1", "#3", "#5"]),
  },
  Subaru: {
    manufacturer: "Subaru Corporation",
    allowedFuels: ["benzin", "dizel", "enyhe_hibrid", "elektromos"],
    models: makeSimpleModels(["Baja", "BRZ", "Forester", "Impreza", "Justy", "Legacy", "Levorg", "Outback", "Solterra", "Tribeca", "Vivio", "WRX", "XV", "Crosstrek"]),
  },
  Suzuki: {
    manufacturer: "Suzuki Motor Corporation",
    allowedFuels: ["benzin", "dizel", "enyhe_hibrid", "teljes_hibrid", "plug_in_hibrid", "elektromos"],
    models: [
      {
        model: "Swift",
        types: [
          { typeName: "Swift II (EA/MA)", generation: "II", yearFrom: 1989, yearTo: 2003, bodyTypes: ["Ferdehátú", "Lépcsőshátú", "Kabrió"] },
          {
            typeName: "Swift III (MZ/EZ)",
            generation: "III",
            yearFrom: 2005,
            yearTo: 2010,
            bodyTypes: ["Ferdehátú"],
            engines: [
              { engineVariant: "1.3 GLX", engineCode: "M13A", displacementCc: 1328, powerKw: 68, powerHp: 92, fuelType: "benzin", transmissions: ["manualis"], drives: ["elso", "osszkerek"], trims: ["GA", "GC", "GL", "GLX", "GS"] },
              { engineVariant: "1.5 GS", engineCode: "M15A", displacementCc: 1490, powerKw: 75, powerHp: 102, fuelType: "benzin", transmissions: ["manualis", "automata"], drives: ["elso"], trims: ["GLX", "GS"] },
            ],
          },
          {
            typeName: "Swift IV (FZ/NZ)",
            generation: "IV",
            yearFrom: 2010,
            yearTo: 2017,
            bodyTypes: ["Ferdehátú"],
            engines: [
              { engineVariant: "1.2", engineCode: "K12B", displacementCc: 1242, powerKw: 69, powerHp: 94, fuelType: "benzin", transmissions: ["manualis", "automata"], drives: ["elso", "osszkerek"], trims: ["GA", "GL", "GLX", "GS"] },
            ],
          },
          {
            typeName: "Swift V (AZ)",
            generation: "V",
            yearFrom: 2017,
            yearTo: 2024,
            bodyTypes: ["Ferdehátú"],
            engines: [
              { engineVariant: "1.2 DualJet Mild Hybrid", engineCode: "K12D", displacementCc: 1197, powerKw: 61, powerHp: 83, fuelType: "enyhe_hibrid", transmissions: ["manualis", "fokozatmentes"], drives: ["elso", "osszkerek"], trims: ["GL", "GL+", "GLX"] },
              { engineVariant: "1.2 DualJet", engineCode: "K12C", displacementCc: 1242, powerKw: 66, powerHp: 90, fuelType: "benzin", transmissions: ["manualis"], drives: ["elso"], trims: ["GL", "GL+", "GLX"] },
            ],
          },
          {
            typeName: "Swift VI (Mild Hybrid)",
            generation: "VI",
            yearFrom: 2024,
            yearTo: null,
            bodyTypes: ["Ferdehátú"],
            engines: [
              { engineVariant: "1.2 Mild Hybrid", engineCode: "Z12E", displacementCc: 1197, powerKw: 61, powerHp: 82, fuelType: "enyhe_hibrid", transmissions: ["manualis", "fokozatmentes"], drives: ["elso", "osszkerek"], trims: ["GL", "GL+", "GLX"] },
            ],
          },
        ],
      },
      { model: "Swift Sport", types: [{ typeName: "Swift Sport 1.6 / 1.4 BoosterJet", yearFrom: 2006, yearTo: null }] },
      { model: "SX4", types: [{ typeName: "SX4 (2006–2014)", yearFrom: 2006, yearTo: 2014, trims: ["GC", "GL", "GLX", "GS"] } as any] },
      { model: "SX4 S-Cross", types: [{ typeName: "SX4 S-Cross", yearFrom: 2013, yearTo: 2021 }] },
      { model: "S-Cross", types: [{ typeName: "S-Cross Mild Hybrid / Full Hybrid", yearFrom: 2021, yearTo: null }] },
      {
        model: "Vitara",
        types: [
          { typeName: "Vitara (1988–2005)", yearFrom: 1988, yearTo: 2005 },
          {
            typeName: "Vitara (LY) 1.6 / 1.4 BoosterJet / Mild Hybrid / Full Hybrid",
            generation: "LY",
            yearFrom: 2015,
            yearTo: null,
            bodyTypes: ["Városi terepjáró"],
            engines: [
              { engineVariant: "1.4 BoosterJet Mild Hybrid", displacementCc: 1373, powerKw: 95, powerHp: 129, fuelType: "enyhe_hibrid", transmissions: ["manualis", "automata"], drives: ["elso", "osszkerek"], trims: ["GL", "GL+", "GLX"] },
              { engineVariant: "1.5 Full Hybrid", displacementCc: 1462, powerKw: 75, powerHp: 102, systemPowerKw: 85, systemPowerHp: 115, fuelType: "teljes_hibrid", transmissions: ["robotizalt"], drives: ["elso", "osszkerek"], trims: ["GL+", "GLX"] },
            ],
          },
        ],
      },
      ...makeSimpleModels(["Across", "Alto", "Baleno", "Carry", "Celerio", "Grand Vitara", "Ignis", "Jimny", "Kizashi", "Liana", "Samurai", "Splash", "Swace", "Wagon R+", "X-90"]),
    ],
  },
  Talbot: {
    manufacturer: "PSA / Talbot",
    allowedFuels: ["benzin", "dizel"],
    models: makeSimpleModels(["Horizon", "Samba", "Solara", "Tagora", "Matra Murena"]),
  },
  Tata: {
    manufacturer: "Tata Motors",
    allowedFuels: ["benzin", "dizel"],
    models: makeSimpleModels(["Indica", "Indigo", "Safari", "Xenon", "Telcoline"]),
  },
  Tesla: {
    manufacturer: "Tesla, Inc.",
    allowedFuels: ["elektromos"],
    models: [
      {
        model: "Model 3",
        allowedFuels: ["elektromos"],
        types: [
          {
            typeName: "Standard Range / Rear-Wheel Drive",
            generation: "I / Highland",
            yearFrom: 2017,
            yearTo: null,
            bodyTypes: ["Limuzin"],
            allowedFuels: ["elektromos"],
            engines: [
              { engineVariant: "Rear-Wheel Drive (LFP)", powerKw: 208, powerHp: 283, fuelType: "elektromos", transmissions: ["automata"], drives: ["hatso"], trims: ["Standard Range", "Rear-Wheel Drive"] },
            ],
          },
          {
            typeName: "Long Range",
            generation: "I / Highland",
            yearFrom: 2017,
            yearTo: null,
            bodyTypes: ["Limuzin"],
            allowedFuels: ["elektromos"],
            engines: [
              { engineVariant: "Long Range Dual Motor AWD", powerKw: 366, powerHp: 498, fuelType: "elektromos", transmissions: ["automata"], drives: ["osszkerek"], trims: ["Long Range"] },
            ],
          },
          {
            typeName: "Performance",
            generation: "I / Highland",
            yearFrom: 2018,
            yearTo: null,
            bodyTypes: ["Limuzin"],
            allowedFuels: ["elektromos"],
            engines: [
              { engineVariant: "Performance Dual Motor AWD", powerKw: 393, powerHp: 534, fuelType: "elektromos", transmissions: ["automata"], drives: ["osszkerek"], trims: ["Performance"] },
            ],
          },
        ],
      },
      {
        model: "Model Y",
        allowedFuels: ["elektromos"],
        types: [
          { typeName: "Rear-Wheel Drive", yearFrom: 2020, yearTo: null, bodyTypes: ["Városi terepjáró"], allowedFuels: ["elektromos"] },
          { typeName: "Long Range", yearFrom: 2020, yearTo: null, bodyTypes: ["Városi terepjáró"], allowedFuels: ["elektromos"] },
          { typeName: "Performance", yearFrom: 2020, yearTo: null, bodyTypes: ["Városi terepjáró"], allowedFuels: ["elektromos"] },
        ],
      },
      {
        model: "Model S",
        allowedFuels: ["elektromos"],
        types: [
          { typeName: "Long Range / Plaid", yearFrom: 2012, yearTo: null, bodyTypes: ["Ferdehátú", "Limuzin"], allowedFuels: ["elektromos"] },
        ],
      },
      {
        model: "Model X",
        allowedFuels: ["elektromos"],
        types: [
          { typeName: "Long Range / Plaid", yearFrom: 2015, yearTo: null, bodyTypes: ["Városi terepjáró"], allowedFuels: ["elektromos"] },
        ],
      },
      { model: "Roadster", allowedFuels: ["elektromos"] },
      { model: "Cybertruck", allowedFuels: ["elektromos"] },
    ],
  },
  Toyota: {
    manufacturer: "Toyota Motor Corporation",
    allowedFuels: ["benzin", "dizel", "teljes_hibrid", "hibrid_benzin", "plug_in_hibrid", "elektromos", "hidrogen"],
    models: [
      {
        model: "Corolla",
        types: [
          { typeName: "Corolla (E110/E120/E150/E170)", yearFrom: 1995, yearTo: 2018, bodyTypes: ["Ferdehátú", "Lépcsőshátú", "Kombi"] },
          {
            typeName: "Corolla Hybrid (E210)",
            generation: "XII (E210)",
            yearFrom: 2019,
            yearTo: null,
            bodyTypes: ["Ferdehátú", "Lépcsőshátú", "Kombi"],
            factoryDesignations: ["Touring Sports"],
            engines: [
              { engineVariant: "1.8 Hybrid (122 LE)", engineCode: "2ZR-FXE", displacementCc: 1798, powerKw: 72, powerHp: 98, systemPowerKw: 90, systemPowerHp: 122, fuelType: "teljes_hibrid", transmissions: ["fokozatmentes"], drives: ["elso"], trims: ["Active", "Comfort", "Executive", "GR Sport"] },
              { engineVariant: "1.8 Hybrid (140 LE)", engineCode: "2ZR-FXE", displacementCc: 1798, powerKw: 72, powerHp: 98, systemPowerKw: 103, systemPowerHp: 140, fuelType: "teljes_hibrid", transmissions: ["fokozatmentes"], drives: ["elso"], yearFrom: 2023, yearTo: null },
              { engineVariant: "2.0 Hybrid (184 / 196 LE)", engineCode: "M20A-FXS", displacementCc: 1987, powerKw: 112, powerHp: 152, systemPowerKw: 144, systemPowerHp: 196, fuelType: "teljes_hibrid", transmissions: ["fokozatmentes"], drives: ["elso"] },
            ],
          },
        ],
      },
      ...makeSimpleModels([
        "4Runner", "Auris", "Avalon", "Avensis", "Avensis Verso", "Aygo", "Aygo X", "bZ4X", "C-HR",
        "Camry", "Carina", "Celica", "Corolla Cross", "Corolla Verso", "FJ Cruiser", "GR86", "GR Yaris",
        "GT86", "Hiace", "Highlander", "Hilux", "iQ", "Land Cruiser", "MR2", "Paseo", "Picnic",
        "Previa", "Prius", "Prius+", "Prius Plug-in", "Proace", "Proace City", "RAV4", "Sienna",
        "Starlet", "Supra", "Tacoma", "Tercel", "Tundra", "Urban Cruiser", "Verso", "Verso-S",
        "Yaris", "Yaris Cross", "Yaris Verso",
      ]),
    ],
  },
  Trabant: {
    manufacturer: "VEB Sachsenring / Trabant",
    allowedFuels: ["benzin"],
    models: [
      { model: "500", types: [{ typeName: "P50 / 500", yearFrom: 1957, yearTo: 1962, allowedFuels: ["benzin"] }] },
      { model: "600", types: [{ typeName: "P60 / 600", yearFrom: 1962, yearTo: 1965, allowedFuels: ["benzin"] }] },
      {
        model: "601",
        types: [
          {
            typeName: "601 Limousine / Universal",
            generation: "601",
            yearFrom: 1964,
            yearTo: 1990,
            bodyTypes: ["Limuzin", "Kombi"],
            allowedFuels: ["benzin"],
            engines: [
              { engineVariant: "0.6 kétütemű", engineCode: "P63/P65", displacementCc: 594, powerKw: 19, powerHp: 26, fuelType: "benzin", transmissions: ["manualis"], drives: ["elso"], trims: ["Standard", "S", "S de Luxe"] },
            ],
          },
        ],
      },
      { model: "1.1", types: [{ typeName: "1.1 Limousine / Universal", yearFrom: 1990, yearTo: 1991, allowedFuels: ["benzin"] }] },
    ],
  },
  Triumph: {
    manufacturer: "Triumph Motor Company",
    allowedFuels: ["benzin"],
    models: makeSimpleModels(["Spitfire", "TR6", "TR7", "Stag", "Herald", "Acclaim"]),
  },
  UAZ: {
    manufacturer: "UAZ",
    allowedFuels: ["benzin", "dizel"],
    models: makeSimpleModels(["452", "469", "3151", "Hunter", "Patriot"]),
  },
  Vauxhall: {
    manufacturer: "Stellantis / Vauxhall",
    allowedFuels: ["benzin", "dizel", "elektromos"],
    models: makeSimpleModels(["Astra", "Corsa", "Insignia", "Mokka", "Vectra", "Zafira"]),
  },
  Volga: {
    manufacturer: "GAZ / Volga",
    allowedFuels: ["benzin"],
    models: makeSimpleModels(["M21", "GAZ-24", "3102", "3110"]),
  },
  Volkswagen: {
    manufacturer: "Volkswagen AG",
    aliases: ["VW"],
    allowedFuels: ["benzin", "dizel", "enyhe_hibrid", "plug_in_hibrid", "elektromos", "cng"],
    models: [
      {
        model: "Golf",
        types: [
          { typeName: "Golf I", generation: "I", yearFrom: 1974, yearTo: 1983, bodyTypes: ["Ferdehátú", "Kabrió"], factoryDesignations: ["GTI"] },
          { typeName: "Golf II", generation: "II", yearFrom: 1983, yearTo: 1992, bodyTypes: ["Ferdehátú"], factoryDesignations: ["GTI", "GTD"] },
          { typeName: "Golf III", generation: "III", yearFrom: 1991, yearTo: 1999, bodyTypes: ["Ferdehátú", "Kombi", "Kabrió"], factoryDesignations: ["Variant", "GTI"] },
          { typeName: "Golf IV", generation: "IV", yearFrom: 1997, yearTo: 2006, bodyTypes: ["Ferdehátú", "Kombi", "Kabrió"], factoryDesignations: ["Variant", "GTI", "R32", "4Motion"] },
          { typeName: "Golf V", generation: "V", yearFrom: 2003, yearTo: 2009, bodyTypes: ["Ferdehátú", "Kombi"], factoryDesignations: ["Variant", "GTI", "R32", "4Motion"] },
          { typeName: "Golf VI", generation: "VI", yearFrom: 2008, yearTo: 2013, bodyTypes: ["Ferdehátú", "Kombi", "Kabrió"], factoryDesignations: ["Variant", "GTI", "GTD", "R", "4Motion"] },
          {
            typeName: "Golf VII",
            generation: "VII",
            yearFrom: 2012,
            yearTo: 2020,
            bodyTypes: ["Ferdehátú", "Kombi"],
            factoryDesignations: ["Variant", "Alltrack", "GTI", "GTD", "GTE", "R", "4Motion"],
            engines: [
              { engineVariant: "1.4 TSI", engineCode: "CZDA", displacementCc: 1395, powerKw: 110, powerHp: 150, fuelType: "benzin", transmissions: ["manualis", "duplakuplungos"], drives: ["elso"], trims: ["Trendline", "Comfortline", "Highline", "R-Line"] },
              { engineVariant: "1.6 TDI", engineCode: "CLHA / DDYA", displacementCc: 1598, powerKw: 85, powerHp: 115, fuelType: "dizel", transmissions: ["manualis", "duplakuplungos"], drives: ["elso"], trims: ["Trendline", "Comfortline", "Highline"] },
              { engineVariant: "2.0 TDI", engineCode: "CRLB / DFGA", displacementCc: 1968, powerKw: 110, powerHp: 150, fuelType: "dizel", transmissions: ["manualis", "duplakuplungos", "automata"], drives: ["elso", "osszkerek"], trims: ["Comfortline", "Highline", "Alltrack", "R-Line"] },
              { engineVariant: "2.0 TSI GTI", displacementCc: 1984, powerKw: 169, powerHp: 230, fuelType: "benzin", transmissions: ["manualis", "duplakuplungos"], drives: ["elso"], trims: ["GTI", "GTI Performance"] },
              { engineVariant: "1.4 TSI GTE", displacementCc: 1395, powerKw: 110, powerHp: 150, systemPowerKw: 150, systemPowerHp: 204, fuelType: "plug_in_hibrid", transmissions: ["duplakuplungos"], drives: ["elso"], trims: ["GTE"] },
              { engineVariant: "e-Golf", powerKw: 100, powerHp: 136, fuelType: "elektromos", transmissions: ["automata"], drives: ["elso"] },
            ],
          },
          {
            typeName: "Golf VIII",
            generation: "VIII",
            yearFrom: 2019,
            yearTo: null,
            bodyTypes: ["Ferdehátú", "Kombi"],
            factoryDesignations: ["Variant", "Alltrack", "GTI", "GTD", "GTE", "R", "4Motion"],
            engines: [
              { engineVariant: "1.5 eTSI", displacementCc: 1498, powerKw: 110, powerHp: 150, fuelType: "enyhe_hibrid", transmissions: ["duplakuplungos"], drives: ["elso"], trims: ["Life", "Style", "R-Line"] },
              { engineVariant: "2.0 TDI", displacementCc: 1968, powerKw: 110, powerHp: 150, fuelType: "dizel", transmissions: ["duplakuplungos"], drives: ["elso", "osszkerek"], trims: ["Life", "Style", "R-Line"] },
            ],
          },
        ],
      },
      {
        model: "Passat",
        types: [
          { typeName: "Passat I (B1)", generation: "B1", yearFrom: 1973, yearTo: 1980 },
          { typeName: "Passat II (B2)", generation: "B2", yearFrom: 1980, yearTo: 1988 },
          { typeName: "Passat III (B3)", generation: "B3", yearFrom: 1988, yearTo: 1993 },
          { typeName: "Passat IV (B4)", generation: "B4", yearFrom: 1993, yearTo: 1997 },
          { typeName: "Passat V (B5)", generation: "B5", yearFrom: 1996, yearTo: 2005 },
          { typeName: "Passat VI (B6)", generation: "B6", yearFrom: 2005, yearTo: 2010 },
          { typeName: "Passat VII (B7)", generation: "B7", yearFrom: 2010, yearTo: 2014, factoryDesignations: ["Variant", "Alltrack"] },
          { typeName: "Passat VIII (B8)", generation: "B8", yearFrom: 2014, yearTo: 2023, factoryDesignations: ["Variant", "Alltrack", "GTE", "4Motion"] },
          { typeName: "Passat IX (B9)", generation: "B9", yearFrom: 2023, yearTo: null, bodyTypes: ["Kombi"], factoryDesignations: ["Variant", "eHybrid"] },
        ],
      },
      {
        model: "Polo",
        types: [
          { typeName: "Polo I", generation: "I", yearFrom: 1975, yearTo: 1981 },
          { typeName: "Polo II", generation: "II", yearFrom: 1981, yearTo: 1994 },
          { typeName: "Polo III", generation: "III", yearFrom: 1994, yearTo: 2001 },
          { typeName: "Polo IV", generation: "IV", yearFrom: 2001, yearTo: 2009 },
          { typeName: "Polo V", generation: "V", yearFrom: 2009, yearTo: 2017 },
          { typeName: "Polo VI", generation: "VI", yearFrom: 2017, yearTo: null },
        ],
      },
      {
        model: "Jetta",
        types: [
          { typeName: "Jetta I", generation: "I", yearFrom: 1979, yearTo: 1984 },
          { typeName: "Jetta II", generation: "II", yearFrom: 1984, yearTo: 1992 },
          { typeName: "Jetta III / Vento", generation: "III", yearFrom: 1992, yearTo: 1998 },
          { typeName: "Jetta IV / Bora", generation: "IV", yearFrom: 1998, yearTo: 2005 },
          { typeName: "Jetta V", generation: "V", yearFrom: 2005, yearTo: 2010 },
          { typeName: "Jetta VI", generation: "VI", yearFrom: 2010, yearTo: 2018 },
        ],
      },
      {
        model: "Transporter",
        types: [
          { typeName: "Transporter T1", generation: "T1", yearFrom: 1950, yearTo: 1967 },
          { typeName: "Transporter T2", generation: "T2", yearFrom: 1967, yearTo: 1979 },
          { typeName: "Transporter T3", generation: "T3", yearFrom: 1979, yearTo: 1992 },
          { typeName: "Transporter T4", generation: "T4", yearFrom: 1990, yearTo: 2003 },
          { typeName: "Transporter T5", generation: "T5", yearFrom: 2003, yearTo: 2015 },
          { typeName: "Transporter T6", generation: "T6", yearFrom: 2015, yearTo: 2019 },
          { typeName: "Transporter T6.1", generation: "T6.1", yearFrom: 2019, yearTo: 2024 },
          { typeName: "Transporter T7", generation: "T7", yearFrom: 2024, yearTo: null },
        ],
      },
      ...makeSimpleModels([
        "1200", "1300", "1302", "1303", "Amarok", "Arteon", "Beetle", "Bora", "Caddy", "Caddy Life",
        "Caddy Maxi", "California", "Caravelle", "CC", "Corrado", "Crafter", "Eos", "Fox", "Golf Plus",
        "Golf Sportsvan", "ID.3", "ID.4", "ID.5", "ID.7", "ID. Buzz", "Iltis", "Karmann Ghia", "LT",
        "Lupo", "Multivan", "New Beetle", "Passat CC", "Passat Alltrack", "Phaeton", "Routan",
        "Santana", "Scirocco", "Sharan", "T-Cross", "T-Roc", "Taigo", "Tayron", "Tiguan",
        "Tiguan Allspace", "Touareg", "Touran", "up!", "Vento",
      ]),
    ],
  },
  Volvo: {
    manufacturer: "Volvo Cars",
    allowedFuels: ["benzin", "dizel", "enyhe_hibrid", "plug_in_hibrid", "elektromos"],
    models: makeSimpleModels([
      "140", "164", "240", "260", "340", "360", "440", "460", "480", "740", "760", "780", "850",
      "940", "960", "C30", "C40", "C70", "S40", "S60", "S70", "S80", "S90", "V40", "V50", "V60",
      "V70", "V90", "XC40", "XC60", "XC70", "XC90", "EX30", "EX40", "EX60", "EX90", "EC40",
      "ES90", "EM90", "Amazon", "P1800",
    ]),
  },
  Voyah: {
    manufacturer: "Dongfeng / Voyah",
    allowedFuels: ["elektromos", "plug_in_hibrid"],
    models: makeSimpleModels(["Free", "Dream", "Passion", "Courage"]),
  },
  Wartburg: {
    manufacturer: "Automobilwerk Eisenach / Wartburg",
    allowedFuels: ["benzin"],
    models: makeSimpleModels(["311", "312", "313", "353", "1.3"]),
  },
  XPeng: {
    manufacturer: "XPeng Motors",
    allowedFuels: ["elektromos"],
    models: makeSimpleModels(["G6", "G9", "P7", "P7+"]),
  },
  Yugo: {
    manufacturer: "Zastava / Yugo",
    allowedFuels: ["benzin"],
    models: makeSimpleModels(["45", "55", "65", "Koral", "Florida", "Sana"]),
  },
  Zastava: {
    manufacturer: "Zastava Automobili",
    allowedFuels: ["benzin"],
    models: makeSimpleModels(["750", "101", "128", "Florida", "Koral", "Yugo"]),
  },
  ZAZ: {
    manufacturer: "Zaporizhia Automobile Building Plant",
    allowedFuels: ["benzin"],
    models: makeSimpleModels(["965", "966", "968", "968M", "Tavria"]),
  },
};

// ============================================================================
// 2. NON-PASSENGER CATEGORY BRANDS (Sections V - VIII, #12 - #20)
// ============================================================================

const MOTO_BRANDS: Record<string, string[]> = {
  Aprilia: ["RS 125", "RS 660", "RSV4", "Tuono 660", "Tuono V4", "Shiver 750", "Dorsoduro 900", "Tuareg 660", "Scarabeo", "SR 50"],
  "Arctic Cat": ["Alterra 450", "Alterra 600", "Alterra 700", "Wildcat"],
  AJS: ["Cadwell 125", "Tempest", "Modena"],
  Babetta: ["207", "210", "225"],
  Bajaj: ["Pulsar", "Dominar 400"],
  Benelli: ["TRK 502", "TRK 702", "Leoncino 500", "Leoncino 800", "BN 125", "BN 302", "TNT 125"],
  Beta: ["RR 125", "RR 250", "RR 300", "RR 350", "Xtrainer 300", "Evo"],
  Bimota: ["KB4", "Tesi H2", "DB8"],
  BMW: ["R 1250 GS", "R 1300 GS", "R nineT", "R 1250 RT", "F 750 GS", "F 850 GS", "F 900 R", "F 900 XR", "G 310 R", "G 310 GS", "K 1600 GT", "S 1000 RR", "S 1000 XR", "CE 04"],
  Bombardier: ["Outlander", "DS 650", "Traxter"],
  Brixton: ["Cromwell 125", "Felsberg 125", "Crossfire 500", "Cromwell 1200"],
  Buell: ["XB9", "XB12", "1125R"],
  "Can-Am": ["Outlander 570", "Outlander 1000", "Renegade", "Maverick", "Spyder", "Ryker"],
  CFMOTO: ["300NK", "450NK", "800NK", "450MT", "650MT", "800MT", "450SR", "700CL-X", "CFORCE 450", "CFORCE 520", "CFORCE 850", "CFORCE 1000"],
  Csepel: ["125", "250", "D-Csepel"],
  Danuvia: ["125", "D-125"],
  Derbi: ["Senda 50", "GPR 50", "GPR 125", "Boulevard"],
  Ducati: ["Monster", "Multistrada V2", "Multistrada V4", "Panigale V2", "Panigale V4", "Scrambler", "Diavel V4", "DesertX", "Hypermotard"],
  Fantic: ["Caballero 500", "XE 125", "XEF 250", "XEF 450"],
  GasGas: ["EC 250", "EC 300", "EC 350F", "MC 250", "SM 700", "ES 700"],
  Gilera: ["Runner 50", "Runner 125", "Nexus 500", "GP 800"],
  "Harley-Davidson": ["Sportster 883", "Sportster 1200", "Sportster S", "Softail", "Fat Boy", "Road King", "Street Glide", "Road Glide", "Pan America 1250"],
  Honda: ["CB 500 F", "CB 650 R", "CB 750 Hornet", "CB 1000 R", "CBR 125 R", "CBR 500 R", "CBR 600 F", "CBR 600 RR", "CBR 1000 RR", "CRF 250", "CRF 300 L", "CRF 450", "NC 750 X", "VFR 800", "Africa Twin CRF 1100 L", "Transalp XL 750", "Gold Wing", "PCX 125", "Forza 125", "Forza 350", "TRX 420", "TRX 520"],
  Husqvarna: ["TE 250", "TE 300", "FE 350", "FE 450", "TC 125", "TC 250", "FC 250", "FC 450", "Svartpilen 401", "Vitpilen 401", "Norden 901"],
  Hyosung: ["GT 125", "GT 250", "GT 650", "GV 125 Aquila", "GV 650"],
  Jawa: ["50 Mustang", "250", "350", "350 Californian"],
  Kawasaki: ["Ninja 400", "Ninja 650", "Ninja ZX-6R", "Ninja ZX-10R", "Z 650", "Z 900", "Z 1000", "Versys 650", "Versys 1000", "Vulcan S", "KLX 230", "KX 250", "KX 450", "Brute Force 750"],
  Keeway: ["RKR 125", "Superlight 125", "K-Light 125", "Fact 50"],
  Kreidler: ["Florett", "Dice 125"],
  KTM: ["125 Duke", "390 Duke", "790 Duke", "890 Duke", "1290 Super Duke", "390 Adventure", "790 Adventure", "890 Adventure", "1290 Super Adventure", "EXC 250", "EXC 300", "EXC-F 350", "EXC-F 450", "SX 125", "SX-F 250", "SX-F 450", "RC 390"],
  Kymco: ["Agility 50", "Agility 125", "Like 125", "Downtown 350", "People S", "MXU 550", "MXU 700"],
  Lambretta: ["V125 Special", "G350", "X300"],
  Laverda: ["750 SF", "1000 Jota"],
  Linhai: ["M550L", "500 Promax", "LH 300", "T-Boss 550"],
  Malaguti: ["Madison 300", "Dune 125", "Phantom F12"],
  Mash: ["Seventy 125", "Black Seven 125", "Five Hundred 400"],
  "Moto Guzzi": ["V7", "V9", "V85 TT", "Stelvio", "California", "V100 Mandello"],
  "MV Agusta": ["Brutale 800", "Dragster", "F3 800", "Turismo Veloce"],
  MZ: ["ES 125/150", "ES 250", "ETS 250", "TS 125", "TS 150", "TS 250", "ETZ 125", "ETZ 150", "ETZ 250", "ETZ 251"],
  Norton: ["Commando 961", "V4SV"],
  Pannónia: ["T1", "T5", "P10", "P12", "P20", "P21"],
  Peugeot: ["Speedfight 50", "Kisbee 50", "Django 125", "Metropolis 400", "XP400"],
  Piaggio: ["Beverly 300", "Beverly 400", "Liberty 125", "MP3 300", "MP3 530", "Zip 50", "Medley 125"],
  Polaris: ["Sportsman 570", "Sportsman 850", "Sportsman 1000", "Scrambler", "RZR"],
  QJMotor: ["SRT 700", "SRT 800", "SRK 400", "SRV 550"],
  Rieju: ["MRT 50", "MR 300", "Aventura 500"],
  Romet: ["Ogar", "Chart", "Adv 125"],
  "Royal Enfield": ["Classic 350", "Bullet 350", "Himalayan 450", "Meteor 350", "Interceptor 650", "Continental GT 650"],
  Sachs: ["MadAss 50", "Roadster 650"],
  Sherco: ["SE 250", "SE 300", "SEF 300"],
  Simson: ["S50", "S51", "S51 B", "S51 Enduro", "S53", "SR50", "Schwalbe KR51", "Star"],
  Suzuki: ["GS 500", "GSX-R 600", "GSX-R 750", "GSX-R 1000", "GSX-S 750", "GSX-S 1000", "DL 650 V-Strom", "DL 1050 V-Strom", "SV 650", "DR-Z 400", "RM-Z 250", "RM-Z 450", "Burgman 400", "Burgman 650", "Hayabusa", "KingQuad 750"],
  SWM: ["SM 125 R", "SM 500 R", "Six Days 500"],
  SYM: ["Jet 14", "Symphony 125", "Cruisym 300", "Maxsym TL 508"],
  TGB: ["Blade 550", "Blade 600", "Blade 1000", "Target 600"],
  Triumph: ["Bonneville T100", "Bonneville T120", "Tiger 660", "Tiger 900", "Tiger 1200", "Street Triple 765", "Speed Triple 1200", "Rocket 3"],
  Ural: ["Ranger", "Tourist", "Sportsman"],
  Vespa: ["Primavera 50", "Primavera 125", "Sprint 125", "GTS 300", "LX 50", "PX 125"],
  Voge: ["300 Rally", "525DSX", "900DSX"],
  Yamaha: ["MT-07", "MT-09", "MT-10", "MT-125", "YZF-R1", "YZF-R6", "YZF-R7", "FZ6", "XJ6", "XVS 650 DragStar", "XVS 1100", "XT 660", "WR 250 F", "WR 450 F", "YZ 125", "YZ 250 F", "Tracer 7", "Tracer 9", "Ténéré 700", "TMAX 560", "XMAX 300", "NMAX 125", "Grizzly 700", "Kodiak 700", "Raptor 700"],
  Zontes: ["310T", "350T", "350GK"],
  Zündapp: ["KS 50", "CS 25", "GTS 50"],
};

const LIGHT_COMMERCIAL_BRANDS: Record<string, string[]> = {
  Avia: ["D75", "D90", "D120"],
  Cenntro: ["Logistar 100", "Logistar 200", "Logistar 260", "Metro"],
  Citroën: ["Berlingo", "Jumpy", "Jumper", "Nemo"],
  Farizon: ["SV", "V6E"],
  Fiat: ["Fiorino", "Doblò", "Scudo", "Talento", "Ducato"],
  Ford: ["Transit", "Transit Custom", "Transit Connect", "Transit Courier", "Ranger"],
  Foton: ["Tunland", "View CS2", "eAumark"],
  Hyundai: ["H-1", "H350", "Staria Load"],
  Isuzu: ["D-Max", "N-Series (3,5t)"],
  Iveco: ["Daily", "eDaily"],
  Kia: ["K2500", "K2700", "PV5"],
  LDV: ["Maxus", "V80", "eDeliver 3"],
  MAN: ["TGE"],
  Maxus: ["Deliver 9", "eDeliver 3", "eDeliver 7", "eDeliver 9", "T90 EV"],
  "Mercedes-Benz": ["Citan", "Vito", "eVito", "Sprinter", "eSprinter"],
  Mitsubishi: ["L200", "L300", "L400", "Canter"],
  Multicar: ["M25", "M26", "M27", "M30 Fumo", "M31"],
  Nissan: ["NV200", "NV250", "NV300", "NV400", "Townstar", "Primastar", "Interstar", "Navara"],
  Opel: ["Combo", "Vivaro", "Movano"],
  Peugeot: ["Bipper", "Partner", "Expert", "Boxer"],
  Renault: ["Express", "Kangoo", "Trafic", "Master"],
  Toyota: ["Proace", "Proace City", "Proace Max", "Hilux", "Hiace"],
  Volkswagen: ["Caddy", "Transporter", "Crafter", "LT", "Amarok"],
};

const HEAVY_COMMERCIAL_BRANDS: Record<string, string[]> = {
  Avia: ["D90", "D120"],
  BMC: ["Procity", "Tugra", "Neocity"],
  BYD: ["K9", "B12"],
  Credobus: ["Econell", "Inovell", "Optinell", "Electronell"],
  Csepel: ["D-344", "D-450", "D-750"],
  DAF: ["LF", "CF", "XF", "XD", "XG", "XG+"],
  Foton: ["Auman", "Aumark"],
  Hino: ["300", "500", "700"],
  Ikarus: ["250", "256", "260", "280", "415", "E95", "120e"],
  Irisbus: ["Crossway", "Citelis", "Magelys"],
  Isuzu: ["NQR", "FVR", "Turquoise"],
  Iveco: ["EuroCargo", "Stralis", "Trakker", "S-Way", "X-Way", "T-Way", "Crossway"],
  Kamaz: ["5320", "55111", "65115", "6520"],
  LIAZ: ["110", "150", "300"],
  MAN: ["TGL", "TGM", "TGS", "TGX", "F2000", "M2000", "Lion's City", "Lion's Coach"],
  "Mercedes-Benz": ["Actros", "Atego", "Arocs", "Axor", "Econic", "Unimog", "Citaro", "Tourismo", "Intouro"],
  "Mitsubishi Fuso": ["Canter", "Fighter"],
  Neoplan: ["Tourliner", "Cityliner", "Skyliner"],
  Otokar: ["Navigo", "Kent", "Territo"],
  Rába: ["832", "F16", "H18", "S26"],
  Renault: ["Magnum", "Premium", "Midlum", "Kerax", "D", "C", "K", "T"],
  Scania: ["P sorozat", "G sorozat", "R sorozat", "S sorozat", "L sorozat", "T sorozat", "Touring", "Interlink"],
  Setra: ["S 415", "S 515 HD", "S 516 HD", "S 531 DT"],
  Solaris: ["Urbino 12", "Urbino 18", "Trollino"],
  Steyr: ["91", "19S", "1491"],
  Tatra: ["815", "Phoenix", "Force"],
  Temsa: ["Prestij", "MD9", "Maraton"],
  Ural: ["375", "4320"],
  "Van Hool": ["TX15", "TX16", "A330"],
  VDL: ["Futura", "Citea"],
  Volvo: ["FL", "FE", "FM", "FMX", "FH", "FH16", "7900", "9700", "9900"],
  Yutong: ["ZK6122", "E12", "T12"],
  ZIL: ["130", "131", "157"],
};

const MACHINERY_BRANDS: Record<string, string[]> = {
  Ammann: ["AV 26", "ARX 26", "ASC 110"],
  Atlas: ["140W", "160W", "AR 65"],
  Bobcat: ["S450", "S530", "T590", "E19", "E27z", "TL38.70HF"],
  BOMAG: ["BW 120", "BW 177", "BW 213", "BF 600"],
  CASE: ["580ST", "695ST", "CX210D", "SR210"],
  Caterpillar: ["301.7", "308", "320", "323", "428F", "432F", "950M", "D6", "140M"],
  Clark: ["C25", "C30", "EPX25"],
  Develon: ["DX140W", "DX225LC", "DL280"],
  Doosan: ["DX140W", "DX190W", "DX225LC", "DL300"],
  Dynapac: ["CC1200", "CA2500", "F1250CS"],
  HAMM: ["HD 12", "HD 14", "H 13i", "3412"],
  Heli: ["CPCD25", "CPCD30", "CPD25"],
  Hitachi: ["ZX19", "ZX85", "ZX210", "ZW180"],
  Hyster: ["H2.5FT", "H3.0FT", "J2.5XN"],
  Hyundai: ["HX140", "HX220", "HL940", "25D-9"],
  JCB: ["3CX", "4CX", "1CX", "8018", "8026", "JS160W", "JS220", "535-95", "540-170", "409"],
  Jungheinrich: ["EFG 216k", "EFG 320", "TFG 320", "ETV 214"],
  Kobelco: ["SK17SR", "SK85MSR", "SK210LC"],
  Komatsu: ["PC26MR", "PC88MR", "PC210LC", "WB93R", "WA320", "D65"],
  Kramer: ["5035", "5055", "8085", "KL30.8T"],
  Kubota: ["KX019-4", "U27-4", "U55-5", "R070"],
  Liebherr: ["A 914", "A 918", "R 922", "L 538", "L 556", "LTM 1050"],
  Linde: ["H25D", "H30D", "H35D", "E20", "E25", "E30"],
  LiuGong: ["9018F", "922E", "835H", "CPCD25"],
  Manitou: ["MT 625", "MT 1440", "MT 1840", "MLT 737", "MRT 2150"],
  Mecalac: ["12MTX", "8MCR", "AS 900"],
  Merlo: ["P27.6", "TF35.7", "P40.17", "Roto 40.26"],
  "New Holland": ["B110B", "B115B", "E26C", "W130D"],
  SANY: ["SY18C", "SY80U", "SY215C"],
  Still: ["RX 20-20", "RX 60-25", "RX 70-25", "R70-30"],
  Takeuchi: ["TB216", "TB230", "TB260", "TB290"],
  Terex: ["TLB840", "TC16", "TW110"],
  Toyota: ["8FGF25", "8FD25", "8FBE20", "Traigo 48"],
  Volvo: ["EC18E", "EC220E", "EW160E", "L70H", "L90H", "A30G"],
  Vögele: ["SUPER 1300-3i", "SUPER 1800-3i"],
  "Wacker Neuson": ["ET18", "EZ26", "EW65", "WL34"],
  Wirtgen: ["W 100 CFi", "W 200 Fi"],
  XCMG: ["XE27E", "XE215C", "LW300FN"],
  Yale: ["GDP25VX", "ERP20VT", "GP30VX"],
  Yanmar: ["SV18", "ViO27", "ViO50", "V70"],
  Zoomlion: ["ZE26GU", "ZS0607DC", "ZA14J"],
};

const AGRICULTURAL_BRANDS: Record<string, string[]> = {
  Belarus: ["820", "892", "952", "1025", "1221"],
  "Case IH": ["Farmall 95A", "Maxxum 125", "Maxxum 145", "Puma 165", "Puma 200", "Optum 300", "Magnum 340", "Axial-Flow 7250"],
  Claas: ["Arion 430", "Arion 650", "Axion 830", "Axion 950", "Xerion 4500", "Lexion 670", "Lexion 770", "Tucano 440", "Trion 650", "Jaguar 950"],
  "Deutz-Fahr": ["5105", "6140", "6165 Agrotron", "7250 TTV", "C6205"],
  Dutra: ["D4K", "D4K-B", "UE-28", "UE-50"],
  Fendt: ["209 Vario", "313 Vario", "516 Vario", "718 Vario", "724 Vario", "936 Vario", "1050 Vario"],
  Fortschritt: ["E 512", "E 514", "E 516", "ZT 303", "ZT 323"],
  Iseki: ["TM 3217", "TXG 237", "TG 6495"],
  "John Deere": ["5090M", "5100M", "6120M", "6155M", "6155R", "6195R", "7290R", "8320R", "8R 370", "9R 540", "W540", "T660", "S780"],
  Kioti: ["CK3510", "DK5010", "RX7330"],
  Kubota: ["B2261", "L1-452", "M5112", "M6142", "M7153"],
  Landini: ["Rex 4", "5-110", "6H-135", "7-230"],
  "Massey Ferguson": ["5S.125", "6S.155", "7S.180", "8S.265", "Beta 7360"],
  McCormick: ["X4.070", "X5.110", "X6.414", "X7.624"],
  MTZ: ["50", "80", "82", "820", "892", "952", "1025", "1221"],
  "New Holland": ["T4.75", "T5.110", "T6.160", "T6.180", "T7.210", "T7.270", "T8.410", "T9.600", "CX 7.80", "CX 8.80", "CR 9.90", "TC 5.80"],
  Rába: ["Steiger 250", "180"],
  Rostselmash: ["Acros 595", "Vector 425", "Torum 785"],
  Same: ["Dorado 90", "Explorer 115", "Virtus 135"],
  Solis: ["26", "50", "75", "90"],
  Steyr: ["4115 Multi", "4130 Expert CVT", "6150 Profi", "6240 Absolut CVT"],
  TYM: ["T265", "T503", "T754"],
  Ursus: ["C-330", "C-360", "914", "1224"],
  Valtra: ["A105", "G135", "N155", "T175", "T235", "Q305"],
  Yanmar: ["YM2000", "YM347", "YT359"],
  Zetor: ["Major 80", "Proxima 100", "Forterra 130", "Forterra HSX", "Crystal 170", "5211", "7245"],
};

const CAMPER_BRANDS: Record<string, string[]> = {
  Adria: ["Matrix", "Coral", "Sonic", "Twin", "Altea", "Adora", "Aviva"],
  Bürstner: ["Lyseo", "Ixeo", "Elegance", "Campeo", "Premio", "Averso"],
  Carado: ["T338", "T447", "A464", "I447", "CV600"],
  Carthago: ["c-tourer", "chic c-line", "chic e-line", "liner-for-two"],
  Challenger: ["Mageo", "Graphite", "X150", "Vany"],
  Chausson: ["640 Titanium", "720", "First Line", "V594"],
  Dethleffs: ["Trend", "Just Go", "Globebus", "Esprit", "Camper", "Nomad"],
  Eriba: ["Touring", "Feeling", "Nova"],
  "Fendt Caravan": ["Bianco", "Apero", "Tendenza", "Diamant"],
  Frankia: ["F-Line", "Platin", "Yucon"],
  Hobby: ["Optima", "OnTour", "De Luxe", "Excellent", "Prestige", "Vantana"],
  Hymer: ["B-Klasse ModernComfort", "B-Klasse MasterLine", "Exsis-i", "Exsis-t", "ML-T", "Grand Canyon S", "Free"],
  Kabe: ["Travel Master", "Royal", "Imperial"],
  Knaus: ["Sky TI", "Live TI", "Sun I", "BoxStar", "Südwind", "Sport"],
  Laika: ["Ecovip", "Kosmo", "Kreos"],
  Malibu: ["Van", "T 460", "I 490"],
  McLouis: ["MC4", "Nevis", "Glamys", "Menfys"],
  Morelo: ["Home", "Loft", "Palace", "Empire"],
  Pilote: ["Pacific", "Galaxy", "Evidence", "V600"],
  Pössl: ["2Win", "Summit 600", "Roadcruiser"],
  Rapido: ["696F", "8096dF", "Distinction", "V68"],
  Rimor: ["Seal", "Evo", "Kilig", "Horus"],
  "Roller Team": ["Zefiro", "Kronos", "Livingstone"],
  Sunlight: ["T68", "A70", "I68", "Cliff 600"],
  Tabbert: ["Rossini", "Da Vinci", "Puccini", "Vivaldi"],
  Weinsberg: ["CaraCompact", "CaraLoft", "CaraHome", "CaraBus", "CaraOne"],
  Westfalia: ["Columbus", "Amundsen", "Kepler", "Jules Verne"],
};

export const CAMPER_BASE_VEHICLE_BRANDS = [
  "Fiat Ducato",
  "Mercedes-Benz Sprinter",
  "Ford Transit",
  "Volkswagen Crafter",
  "Volkswagen Transporter",
  "Citroën Jumper",
  "Peugeot Boxer",
  "Iveco Daily",
  "Renault Master",
  "MAN TGE",
  "Vontatott lakókocsi (nincs alapjármű)",
  "Egyéb alapjármű",
];

const TRAILER_BRANDS: Record<string, string[]> = {
  Agados: ["Handy", "VZ 26", "VZ 30", "Atlas", "Dona"],
  Anssems: ["BSX", "GTB", "PSX", "MSX 3000", "AMT"],
  Böckmann: ["TL-EU", "HL-AL", "Comfort", "Duo", "Champion"],
  Brenderup: ["1205S", "2260S", "4260TB", "8118"],
  Eduard: ["2615", "3116", "3318", "4020", "5020"],
  Fliegl: ["SDS 350", "DHKA", "DK 180", "TPS"],
  Humbaur: ["Steely", "HA 752513", "HA 132513", "HTK", "KFT", "Xanthos", "Balios"],
  "Ifor Williams": ["GD85", "LM146", "CT177", "HB506"],
  Kögel: ["Cargo", "Mega", "Cool", "Tipper"],
  Krone: ["Profi Liner", "Mega Liner", "Cool Liner", "Box Liner"],
  Martz: ["Basic 200", "GT 260", "GT Plateau", "Builder"],
  Neptun: ["Pratik N7-202", "Pro N7-236", "Rustik", "Multi"],
  Niewiadów: ["B750", "B1300", "Jupiter", "Mars", "N126"],
  "Schmitz Cargobull": ["S.CS", "S.KO", "S.KI", "S.CF"],
  Schwarzmüller: ["S1", "J-Series", "Kippmulde", "Tieflader"],
  Stema: ["Basic 750", "Variolux", "SySTEMA", "WOM"],
  Temared: ["Eco 2012", "Pro 2612", "Carplatform", "Moto"],
  Tiki: ["CS265", "CP300", "BS750"],
  Unsinn: ["WEB 14", "GTP", "UKP", "K 2630"],
  Wielton: ["NS 3", "Curtain Master", "Weight Master"],
};

const WATERCRAFT_BRANDS: Record<string, string[]> = {
  Bavaria: ["Cruiser 34", "Cruiser 37", "Cruiser 46", "S29", "S33", "Vida 33"],
  Bayliner: ["VR5", "VR6", "Element M17", "Ciera 8", "742R"],
  Beneteau: ["Oceanis 34.1", "Oceanis 40.1", "Antares 7", "Antares 9", "Flyer 7"],
  Brig: ["Eagle 6", "Eagle 8", "Navigator 570", "Falcon 450"],
  Dufour: ["32", "37", "41", "470"],
  Fairline: ["Targa 45", "Squadron 50", "F//Line 33"],
  Hanse: ["315", "348", "388", "460"],
  Jeanneau: ["Sun Odyssey 349", "Merry Fisher 695", "Merry Fisher 795", "Cap Camarat 6.5"],
  Kawasaki: ["Jet Ski STX 160", "Jet Ski Ultra 310"],
  Lagoon: ["40", "42", "46", "51"],
  Quicksilver: ["Activ 555 Open", "Activ 605 Sundeck", "Activ 675 Weekend", "Activ 755 Cruiser"],
  "Sea Ray": ["SPX 190", "SPX 210", "SDX 250", "Sundancer 320"],
  "Sea-Doo": ["Spark", "GTI 130", "GTX 230", "RXP-X 325", "FishPro"],
  Yamaha: ["VX Cruiser", "FX Cruiser SVHO", "GP1800R", "212S", "AR250"],
  Zodiac: ["Medline 6.8", "Open 5.5", "Cadet 310"],
};

export const WATERCRAFT_ENGINE_BRANDS = [
  "Honda",
  "Mercury",
  "Suzuki",
  "Yamaha",
  "Volvo Penta",
  "Yanmar",
  "Tohatsu",
  "MerCruiser",
  "Torqeedo (elektromos)",
  "ePropulsion (elektromos)",
  "Egyéb",
];

// ============================================================================
// 3. BUILD UNIFIED CATALOG (Preserving ALL existing carData.ts entries!)
// ============================================================================

function mapLegacyFuelToCategory(raw: string): FuelCategory[] {
  const n = raw.toLowerCase();
  if (n.includes("elektromos")) return ["elektromos"];
  if (n.includes("phev")) return ["plug_in_hibrid"];
  if (n.includes("elektro-benzin") || n.includes("benzin/hibrid")) return ["hibrid_benzin", "teljes_hibrid"];
  if (n.includes("elektro-diesel")) return ["hibrid_dizel"];
  if (n.includes("dízel") || n.includes("diesel")) return ["dizel"];
  if (n.includes("benzin")) return ["benzin"];
  if (n.includes("cng") || n.includes("aardgas")) return ["cng"];
  if (n.includes("lpg")) return ["lpg"];
  if (n.includes("etanol")) return ["etanol"];
  if (n.includes("hidrogén")) return ["hidrogen"];
  return ["benzin"];
}

function titleCaseLegacyBrand(upper: string): string {
  const exactMap: Record<string, string> = {
    ABARTH: "Abarth",
    "ALFA ROMEO": "Alfa Romeo",
    ALPINE: "Alpine",
    "ASIA MOTORS": "Asia",
    "ASTON MARTIN": "Aston Martin",
    AUDI: "Audi",
    AUSTIN: "Austin",
    AUTOBIANCHI: "Autobianchi",
    BENTLEY: "Bentley",
    BMW: "BMW",
    BUGATTI: "Bugatti",
    BUICK: "Buick",
    BYD: "BYD",
    CADILLAC: "Cadillac",
    CARVER: "Carver",
    CHANGAN: "Changan",
    CHERY: "Chery",
    CHEVROLET: "Chevrolet",
    CHRYSLER: "Chrysler",
    CITROEN: "Citroën",
    DONGFENG: "Dongfeng (DFSK)",
    FERRARI: "Ferrari",
    FIAT: "Fiat",
    FIREFLY: "Firefly",
    FISKER: "Fisker",
    FORD: "Ford",
    FSO: "FSO",
    GALLOPER: "Galloper",
    GEELY: "Geely",
    GENESIS: "Genesis",
    HONDA: "Honda",
    HONGQI: "Hongqi",
    HUMMER: "Hummer",
    HYUNDAI: "Hyundai",
    INFINITI: "Infiniti",
    INNOCENTI: "Innocenti",
    IVECO: "Iveco",
    JAC: "JAC",
    JAECOO: "Jaecoo",
    JAGUAR: "Jaguar",
    JEEP: "Jeep",
    JOSSE: "Josse",
    KGM: "KGM (SsangYong)",
    KIA: "Kia",
    LADA: "Lada",
    LAMBORGHINI: "Lamborghini",
    LANCIA: "Lancia",
    "LAND ROVER": "Land Rover",
    LANDWIND: "Landwind",
    LEAPMOTOR: "Leapmotor",
    LEXUS: "Lexus",
    LIGHTYEAR: "Lightyear",
    LINCOLN: "Lincoln",
    LOTUS: "Lotus",
    LUCID: "Lucid",
    "LYNK & CO": "Lynk & Co",
    MARCOS: "Marcos",
    MASERATI: "Maserati",
    MAYBACH: "Mercedes-Maybach",
    MAZDA: "Mazda",
    MCLAREN: "McLaren",
    MEGA: "Mega",
    "MERCEDES-BENZ": "Mercedes-Benz",
    MERCURY: "Mercury",
    MG: "MG",
    MHERO: "MHero",
    MINI: "MINI",
    MITSUBISHI: "Mitsubishi",
    MORGAN: "Morgan",
    MORRIS: "Morris",
    NIO: "NIO",
    NISSAN: "Nissan",
    NOBLE: "Noble",
    OMODA: "Omoda",
    OPEL: "Opel",
    PEUGEOT: "Peugeot",
    PGO: "PGO",
    POLESTAR: "Polestar",
    PONTIAC: "Pontiac",
    PORSCHE: "Porsche",
    PRINCESS: "Princess",
    RENAULT: "Renault",
    "ROLLS-ROYCE": "Rolls-Royce",
    ROVER: "Rover",
    SAAB: "Saab",
    SEAT: "SEAT",
    SERES: "Seres",
    SKODA: "Škoda",
    SMART: "Smart",
    SPECTRE: "Spectre",
    SSANGYONG: "SsangYong",
    SUBARU: "Subaru",
    SUZUKI: "Suzuki",
    TALBOT: "Talbot",
    TESLA: "Tesla",
    THINK: "Think",
    TOYOTA: "Toyota",
    TRIUMPH: "Triumph",
    TVR: "TVR",
    VINFAST: "VinFast",
    VOLKSWAGEN: "Volkswagen",
    VOLVO: "Volvo",
    VOYAH: "Voyah",
    XPENG: "XPeng",
    YUGO: "Yugo",
    ZEEKR: "Zeekr",
  };
  return exactMap[upper] || upper;
}

// Commercial-only legacy brands excluded from passenger car selector (#6)
const EXCLUDE_FROM_PASSENGER_LEGACY = new Set(["IVECO"]);

function buildBaseCatalog(): BrandCatalogEntry[] {
  const map = new Map<string, BrandCatalogEntry>();

  const ensureBrand = (brand: string, manufacturer: string, dataSource: string): BrandCatalogEntry => {
    const existing = map.get(brand);
    if (existing) return existing;
    const entry: BrandCatalogEntry = {
      brand,
      manufacturer,
      categories: [],
      modelsByCategory: {},
      dataSource,
      verifiedAt: VERIFIED_DATE,
      usageRights: RIGHTS_OWN,
    };
    map.set(brand, entry);
    return entry;
  };

  const addCategoryModels = (
    brand: string,
    category: VehicleCategory,
    models: ModelCatalogEntry[],
    opts?: { manufacturer?: string; aliases?: string[]; allowedFuels?: FuelCategory[]; dataSource?: string },
  ) => {
    const entry = ensureBrand(brand, opts?.manufacturer || brand, opts?.dataSource || SRC_HU_CATALOG);
    if (!entry.categories.includes(category)) entry.categories.push(category);
    if (opts?.aliases) {
      entry.aliases = Array.from(new Set([...(entry.aliases || []), ...opts.aliases]));
    }
    if (opts?.allowedFuels) {
      entry.allowedFuels = Array.from(new Set([...(entry.allowedFuels || []), ...opts.allowedFuels]));
    }
    const existingModels = entry.modelsByCategory[category] || [];
    const byName = new Map<string, ModelCatalogEntry>();
    for (const m of existingModels) byName.set(m.model.toLowerCase(), m);
    for (const m of models) {
      const k = m.model.toLowerCase();
      const prev = byName.get(k);
      if (!prev || (m.types && m.types.length > (prev.types?.length || 0))) {
        byName.set(k, m);
      }
    }
    entry.modelsByCategory[category] = Array.from(byName.values());
  };

  // A. Ingest existing CAR_BRANDS_DATA (preserving all 106 existing brands!)
  for (const [rawKey, legacy] of Object.entries(CAR_BRANDS_DATA)) {
    if (EXCLUDE_FROM_PASSENGER_LEGACY.has(rawKey.toUpperCase())) continue;
    const brandName = titleCaseLegacyBrand(rawKey.toUpperCase());
    const mappedFuels = Array.from(new Set(legacy.fuels.flatMap(mapLegacyFuelToCategory)));
    addCategoryModels(brandName, "passenger_car", makeSimpleModels(legacy.models), {
      allowedFuels: mappedFuels,
      dataSource: SRC_EXISTING_AND_HU,
    });
  }

  // B. Apply rich passenger car overrides & Hungarian-market brands/generations
  for (const [brand, cfg] of Object.entries(RICH_PASSENGER_OVERRIDES)) {
    addCategoryModels(brand, "passenger_car", cfg.models, {
      manufacturer: cfg.manufacturer,
      aliases: cfg.aliases,
      allowedFuels: cfg.allowedFuels,
      dataSource: SRC_EXISTING_AND_HU,
    });
  }

  // C. Non-passenger categories (strictly category-scoped!)
  const addSimpleMap = (source: Record<string, string[]>, category: VehicleCategory, fuels?: FuelCategory[]) => {
    for (const [brand, models] of Object.entries(source)) {
      addCategoryModels(brand, category, makeSimpleModels(models), {
        allowedFuels: fuels,
        dataSource: SRC_HU_CATALOG,
      });
    }
  };

  addSimpleMap(MOTO_BRANDS, "motorcycle_quad", ["benzin", "elektromos"]);
  addSimpleMap(LIGHT_COMMERCIAL_BRANDS, "light_commercial", ["dizel", "benzin", "elektromos", "cng", "plug_in_hibrid"]);
  addSimpleMap(HEAVY_COMMERCIAL_BRANDS, "heavy_commercial", ["dizel", "cng", "elektromos", "hidrogen"]);
  addSimpleMap(MACHINERY_BRANDS, "machinery", ["dizel", "elektromos", "lpg", "benzin"]);
  addSimpleMap(AGRICULTURAL_BRANDS, "agricultural", ["dizel", "benzin"]);
  addSimpleMap(CAMPER_BRANDS, "camper_caravan", ["dizel", "benzin", "elektromos", "egyeb"]);
  addSimpleMap(TRAILER_BRANDS, "trailer", ["egyeb"]);
  addSimpleMap(WATERCRAFT_BRANDS, "watercraft", ["benzin", "dizel", "elektromos", "egyeb"]);

  return Array.from(map.values()).sort((a, b) => a.brand.localeCompare(b.brand, "hu"));
}

export const BASE_VEHICLE_CATALOG: BrandCatalogEntry[] = buildBaseCatalog();

export function mergeCustomCatalogEntries(customEntries: CustomCatalogEntry[] = []): BrandCatalogEntry[] {
  if (!customEntries || customEntries.length === 0) return BASE_VEHICLE_CATALOG;
  const cloned = new Map<string, BrandCatalogEntry>(
    BASE_VEHICLE_CATALOG.map((b) => [
      b.brand.toLowerCase(),
      {
        ...b,
        categories: [...b.categories],
        modelsByCategory: Object.fromEntries(
          Object.entries(b.modelsByCategory).map(([cat, list]) => [cat, [...(list || [])]]),
        ),
      },
    ]),
  );

  for (const ce of customEntries) {
    const key = ce.brand.trim().toLowerCase();
    let entry = cloned.get(key);
    if (!entry) {
      entry = {
        brand: ce.brand.trim(),
        manufacturer: ce.manufacturer?.trim() || ce.brand.trim(),
        categories: [ce.category],
        modelsByCategory: { [ce.category]: [] },
        dataSource: ce.dataSource || "ILOLIT adminisztrátori törzsadat",
        verifiedAt: ce.verifiedAt || VERIFIED_DATE,
        usageRights: ce.usageRights || RIGHTS_OWN,
      };
      cloned.set(key, entry);
    }
    if (!entry.categories.includes(ce.category)) entry.categories.push(ce.category);
    const list = entry.modelsByCategory[ce.category] || [];
    let modelObj = list.find((m) => m.model.toLowerCase() === ce.model.trim().toLowerCase());
    if (!modelObj) {
      modelObj = { model: ce.model.trim(), types: [] };
      list.push(modelObj);
    }
    if (ce.typeVariant) {
      const types = modelObj.types ? [...modelObj.types] : [];
      let typeObj = types.find((t) => t.typeName.toLowerCase() === ce.typeVariant!.trim().toLowerCase());
      if (!typeObj) {
        typeObj = {
          typeName: ce.typeVariant.trim(),
          generation: ce.generation,
          yearFrom: ce.yearFrom || 1950,
          yearTo: ce.yearTo ?? null,
          bodyTypes: ce.bodyTypes,
          engines: [],
        };
        types.push(typeObj);
      }
      if (ce.engineVariant && (ce.powerKw || ce.powerHp)) {
        const kw = ce.powerKw || Math.round((ce.powerHp || 0) / 1.35962);
        const hp = ce.powerHp || Math.round((ce.powerKw || 0) * 1.35962);
        typeObj.engines = [
          ...(typeObj.engines || []),
          {
            engineVariant: ce.engineVariant,
            engineCode: ce.engineCode,
            displacementCc: ce.displacementCc,
            powerKw: kw,
            powerHp: hp,
            fuelType: ce.fuelType || "benzin",
            transmissions: ce.transmission ? [ce.transmission] : ["manualis", "automata"],
            drives: ce.driveType ? [ce.driveType] : ["elso"],
            trims: ce.trimLevel ? [ce.trimLevel] : undefined,
          },
        ];
      }
      modelObj.types = types;
    }
    entry.modelsByCategory[ce.category] = list;
  }

  return Array.from(cloned.values()).sort((a, b) => a.brand.localeCompare(b.brand, "hu"));
}

export function getBrandsForCategory(
  category: VehicleCategory,
  catalog: BrandCatalogEntry[] = BASE_VEHICLE_CATALOG,
): BrandCatalogEntry[] {
  if (category === "other_vehicle") return catalog;
  return catalog.filter((b) => b.categories.includes(category));
}

export function findBrandEntry(
  brandInput: string,
  catalog: BrandCatalogEntry[] = BASE_VEHICLE_CATALOG,
): BrandCatalogEntry | undefined {
  const resolved = resolveBrandAlias(brandInput);
  const norm = normalizeBrandSearch(resolved);
  return catalog.find(
    (b) =>
      normalizeBrandSearch(b.brand) === norm ||
      (b.aliases || []).some((a) => normalizeBrandSearch(a) === norm),
  );
}

export function getModelsForCategoryAndBrand(
  category: VehicleCategory,
  brandInput: string,
  catalog: BrandCatalogEntry[] = BASE_VEHICLE_CATALOG,
): ModelCatalogEntry[] {
  const entry = findBrandEntry(brandInput, catalog);
  if (!entry) return [];
  if (category === "other_vehicle") {
    return Object.values(entry.modelsByCategory).flat().filter(Boolean) as ModelCatalogEntry[];
  }
  return (entry.modelsByCategory[category] || []).slice().sort((a, b) => a.model.localeCompare(b.model, "hu"));
}

/**
 * Prevents invalid factory combinations (e.g. 2005 Golf VIII, diesel Tesla Model 3).
 */
export function validateVehicleCombination(params: {
  category: VehicleCategory;
  brand: string;
  model: string;
  typeVariant?: string;
  manufactureYear?: number;
  fuelType?: FuelCategory;
  catalog?: BrandCatalogEntry[];
}): { valid: boolean; error?: string } {
  const catalog = params.catalog || BASE_VEHICLE_CATALOG;
  const brandEntry = findBrandEntry(params.brand, catalog);
  if (!brandEntry) {
    // Allow manual entry for rare/uncataloged brands ("Egyéb márka")
    return { valid: true };
  }
  if (params.category !== "other_vehicle" && !brandEntry.categories.includes(params.category)) {
    return {
      valid: false,
      error: `A(z) ${brandEntry.brand} márka nem tartozik a kiválasztott járműkategóriába.`,
    };
  }

  const models = getModelsForCategoryAndBrand(params.category, brandEntry.brand, catalog);
  const modelEntry = models.find(
    (m) => normalizeBrandSearch(m.model) === normalizeBrandSearch(params.model || ""),
  );

  // Check brand-level EV-only restriction (e.g. Tesla, NIO, XPeng, Zeekr, Lucid)
  const effectiveFuels = modelEntry?.allowedFuels || brandEntry.allowedFuels;
  if (
    params.fuelType &&
    effectiveFuels &&
    effectiveFuels.length > 0 &&
    !effectiveFuels.includes(params.fuelType) &&
    params.category === "passenger_car"
  ) {
    // Strictly block impossible EV-only brand + diesel/petrol combos (like diesel Tesla Model 3)
    const isEvOnly = effectiveFuels.every((f) => f === "elektromos");
    if (isEvOnly && params.fuelType !== "elektromos") {
      return {
        valid: false,
        error: `A(z) ${brandEntry.brand} ${params.model} kizárólag tisztán elektromos hajtással létezik – más üzemanyag nem választható.`,
      };
    }
  }

  // Check generation / type year range (e.g. 2005 Golf VIII is impossible!)
  if (modelEntry?.types && params.typeVariant) {
    const typeObj = modelEntry.types.find(
      (t) => normalizeBrandSearch(t.typeName) === normalizeBrandSearch(params.typeVariant || ""),
    );
    if (typeObj) {
      if (params.manufactureYear) {
        if (params.manufactureYear < typeObj.yearFrom) {
          return {
            valid: false,
            error: `A(z) ${brandEntry.brand} ${typeObj.typeName} gyártása ${typeObj.yearFrom}-ben kezdődött, így ${params.manufactureYear}-es évjárattal nem hirdethető meg.`,
          };
        }
        if (typeObj.yearTo && params.manufactureYear > typeObj.yearTo + 1) {
          return {
            valid: false,
            error: `A(z) ${brandEntry.brand} ${typeObj.typeName} gyártása ${typeObj.yearTo}-ben lezárult.`,
          };
        }
      }
      if (
        params.fuelType &&
        typeObj.allowedFuels &&
        typeObj.allowedFuels.length > 0 &&
        !typeObj.allowedFuels.includes(params.fuelType)
      ) {
        return {
          valid: false,
          error: `A(z) ${brandEntry.brand} ${typeObj.typeName} típusváltozat nem létezik a kiválasztott üzemanyaggal.`,
        };
      }
    }
  }

  return { valid: true };
}

/**
 * Exact, programmatically computed catalog statistics (zero fabricated numbers).
 */
export function getCatalogStats(catalog: BrandCatalogEntry[] = BASE_VEHICLE_CATALOG) {
  let totalModels = 0;
  let totalTypes = 0;
  let totalGenerations = 0;
  let totalEngines = 0;
  const brandsPerCategory: Record<VehicleCategory, number> = {
    passenger_car: 0,
    motorcycle_quad: 0,
    light_commercial: 0,
    heavy_commercial: 0,
    machinery: 0,
    agricultural: 0,
    camper_caravan: 0,
    trailer: 0,
    watercraft: 0,
    other_vehicle: 0,
  };

  for (const b of catalog) {
    for (const cat of b.categories) {
      brandsPerCategory[cat] += 1;
    }
    for (const models of Object.values(b.modelsByCategory)) {
      if (!models) continue;
      totalModels += models.length;
      for (const m of models) {
        if (m.types && m.types.length > 0) {
          totalTypes += m.types.length;
          for (const t of m.types) {
            if (t.generation) totalGenerations += 1;
            if (t.engines) totalEngines += t.engines.length;
          }
        }
      }
    }
  }

  return {
    totalBrands: catalog.length,
    totalModels,
    totalTypes,
    totalGenerations,
    totalEngines,
    brandsPerCategory,
    existingLegacyBrandsPreserved: Object.keys(CAR_BRANDS_DATA).length,
    verifiedAt: VERIFIED_DATE,
  };
}
