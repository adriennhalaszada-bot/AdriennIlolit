import type {
  ClimateType,
  DocumentStatus,
  DriveType,
  FuelCategory,
  PassengerBodyType,
  PowertrainSystem,
  TransmissionType,
  VehicleBookingStatus,
  VehicleCategory,
  VehicleCollectionFilter,
  VehicleCondition,
  VehicleListingStatus,
} from "./types";

export const VEHICLE_LEGAL_DECLARATION_VERSION = "2026-11-v1-vehicles";

export const VEHICLE_CATEGORIES: Array<{
  value: VehicleCategory;
  label: string;
  shortLabel: string;
  description: string;
  seoSlug: string;
}> = [
  {
    value: "passenger_car",
    label: "Személyautó",
    shortLabel: "Személyautó",
    description: "Új és használt személygépkocsik",
    seoSlug: "szemelyautok",
  },
  {
    value: "motorcycle_quad",
    label: "Motorkerékpár, quad",
    shortLabel: "Motor, quad",
    description: "Motorkerékpárok, robogók, quadok",
    seoSlug: "motorkerekparok",
  },
  {
    value: "light_commercial",
    label: "Kishaszongépjármű",
    shortLabel: "Kishaszon",
    description: "Furgonok, kisteherautók, áruszállítók",
    seoSlug: "kishaszonjarmuvek",
  },
  {
    value: "heavy_commercial",
    label: "Haszongépjármű",
    shortLabel: "Haszonjármű",
    description: "Teherautók, nyergesvontatók, autóbuszok",
    seoSlug: "haszonjarmuvek",
  },
  {
    value: "machinery",
    label: "Munkagép",
    shortLabel: "Munkagép",
    description: "Építőipari, ipari és útépítő gépek",
    seoSlug: "munkagepek",
  },
  {
    value: "agricultural",
    label: "Mezőgazdasági gép",
    shortLabel: "Mezőgazdasági",
    description: "Traktorok, kombájnok, mezőgazdasági gépek",
    seoSlug: "mezogazdasagi-gepek",
  },
  {
    value: "camper_caravan",
    label: "Lakóautó, lakókocsi",
    shortLabel: "Lakójármű",
    description: "Önjáró és vontatható lakójárművek",
    seoSlug: "lakoautok",
  },
  {
    value: "trailer",
    label: "Utánfutó, pótkocsi",
    shortLabel: "Utánfutó",
    description: "Könnyű és nehéz pótkocsik",
    seoSlug: "utanfutok",
  },
  {
    value: "watercraft",
    label: "Vízi jármű",
    shortLabel: "Vízi jármű",
    description: "Hajók, motorcsónakok, vízi sportjárművek",
    seoSlug: "vizi-jarmuvek",
  },
  {
    value: "other_vehicle",
    label: "Egyéb jármű",
    shortLabel: "Egyéb",
    description: "Más kategóriába nem sorolható járművek",
    seoSlug: "egyeb-jarmuvek",
  },
];

export const VEHICLE_COLLECTIONS: Array<{
  value: VehicleCollectionFilter;
  label: string;
  seoSlug: string;
}> = [
  { value: "new", label: "Új autók", seoSlug: "uj-autok" },
  { value: "used", label: "Használt autók", seoSlug: "hasznalt-autok" },
  { value: "electric", label: "Elektromos autók", seoSlug: "elektromos-autok" },
  { value: "hybrid", label: "Hibrid autók", seoSlug: "hibrid-autok" },
  { value: "showroom", label: "Szalonautók", seoSlug: "szalonautok" },
  { value: "demo", label: "Bemutatóautók", seoSlug: "bemutatoautok" },
  { value: "veteran", label: "Veterán járművek", seoSlug: "veteran-jarmuvek" },
  { value: "warranty", label: "Garanciális járművek", seoSlug: "garancialis-jarmuvek" },
  { value: "damaged", label: "Sérült járművek", seoSlug: "serult-jarmuvek" },
  { value: "rentable", label: "Bérelhető járművek", seoSlug: "berelheto-jarmuvek" },
];

export const PASSENGER_BODY_TYPES: Array<{ value: PassengerBodyType; label: string }> = [
  { value: "ferdehatu", label: "Ferdehátú" },
  { value: "lepcsoshatu", label: "Lépcsőshátú" },
  { value: "limuzin", label: "Limuzin" },
  { value: "kombi", label: "Kombi" },
  { value: "kupe", label: "Kupé" },
  { value: "kabrio", label: "Kabrió" },
  { value: "roadster", label: "Roadster" },
  { value: "egyteru", label: "Egyterű" },
  { value: "kisbusz", label: "Kisbusz" },
  { value: "terepjaro", label: "Terepjáró" },
  { value: "varosi_terepjaro", label: "Városi terepjáró" },
  { value: "pickup", label: "Pickup" },
  { value: "mopedauto", label: "Mopedautó" },
  { value: "egyeb", label: "Egyéb" },
];

export const CATEGORY_BODY_TYPES: Record<VehicleCategory, string[]> = {
  passenger_car: PASSENGER_BODY_TYPES.map((b) => b.label),
  motorcycle_quad: [
    "Robogó",
    "Segédmotoros kerékpár",
    "Sportmotor",
    "Túramotor",
    "Sport-túramotor",
    "Csupasz motorkerékpár",
    "Túraenduró",
    "Enduro",
    "Motocross",
    "Supermoto",
    "Chopper",
    "Cruiser",
    "Trial",
    "Oldalkocsis motorkerékpár",
    "Elektromos motorkerékpár",
    "Veterán motorkerékpár",
    "Quad",
    "Egyéb",
  ],
  light_commercial: [
    "Zárt áruszállító",
    "Dobozos",
    "Platós",
    "Ponyvás",
    "Billencs",
    "Hűtős",
    "Duplakabinos",
    "Személyszállító",
    "Autószállító",
    "Emelőhátfalas",
    "Pickup",
    "Egyéb",
  ],
  heavy_commercial: [
    "Tehergépkocsi",
    "Nyergesvontató",
    "Billencs",
    "Platós",
    "Ponyvás",
    "Hűtős",
    "Dobozos",
    "Tartálykocsi",
    "Darus tehergépkocsi",
    "Autószállító",
    "Kommunális jármű",
    "Autóbusz",
    "Egyéb",
  ],
  machinery: [
    "Kotró",
    "Minikotró",
    "Kotró-rakodó",
    "Homlokrakodó",
    "Teleszkópos rakodó",
    "Lánctalpas rakodó",
    "Targonca",
    "Dózer",
    "Gréder",
    "Úthenger",
    "Aszfaltfiniser",
    "Daru",
    "Emelőkosaras gép",
    "Útépítő gép",
    "Kommunális munkagép",
  ],
  agricultural: [
    "Traktor",
    "Kombájn",
    "Önjáró betakarítógép",
    "Permetezőgép",
    "Rakodógép",
    "Mezőgazdasági pótkocsi",
    "Vetőgép",
    "Talajművelő gép",
    "Egyéb",
  ],
  camper_caravan: [
    "Alkóvos lakóautó",
    "Félintegrált lakóautó",
    "Integrált lakóautó",
    "Lakófurgon",
    "Lakókocsi",
    "Egyéb",
  ],
  trailer: [
    "Egytengelyes",
    "Kéttengelyes",
    "Háromtengelyes",
    "Platós",
    "Zárt",
    "Ponyvás",
    "Autószállító",
    "Motorszállító",
    "Hajószállító",
    "Lószállító",
    "Billenőplatós",
    "Nyerges félpótkocsi",
    "Egyedi",
  ],
  watercraft: [
    "Motorcsónak",
    "Vitorlás",
    "Jacht",
    "Gumicsónak",
    "Horgászcsónak",
    "Katamarán",
    "Vízi robogó",
    "Elektromos hajó",
  ],
  other_vehicle: ["Egyéb jármű"],
};

export const FACTORY_BODY_DESIGNATIONS = [
  "Sportback",
  "Grand Coupé",
  "Gran Coupé",
  "Variant",
  "Touring",
  "Avant",
  "Combi",
  "Alltrack",
  "Allroad",
  "Shooting Brake",
  "Sportstourer",
  "SW",
  "Estate",
  "Fastback",
  "GT",
  "Stepway",
  "Scout",
  "Cross",
];

export const FUEL_OPTIONS: Array<{ value: FuelCategory; label: string; defaultPowertrain: PowertrainSystem }> = [
  { value: "benzin", label: "Benzin", defaultPowertrain: "belsoegesu" },
  { value: "dizel", label: "Dízel", defaultPowertrain: "belsoegesu" },
  { value: "benzin_gaz", label: "Benzin/gáz", defaultPowertrain: "kettos_uzemu" },
  { value: "lpg", label: "LPG", defaultPowertrain: "kettos_uzemu" },
  { value: "cng", label: "CNG", defaultPowertrain: "kettos_uzemu" },
  { value: "dizel_gaz", label: "Dízel/gáz", defaultPowertrain: "kettos_uzemu" },
  { value: "hibrid_benzin", label: "Hibrid, benzin", defaultPowertrain: "teljes_hibrid" },
  { value: "hibrid_dizel", label: "Hibrid, dízel", defaultPowertrain: "teljes_hibrid" },
  { value: "enyhe_hibrid", label: "Enyhe hibrid", defaultPowertrain: "enyhe_hibrid" },
  { value: "teljes_hibrid", label: "Teljes hibrid", defaultPowertrain: "teljes_hibrid" },
  { value: "plug_in_hibrid", label: "Hálózatról tölthető hibrid", defaultPowertrain: "plug_in_hibrid" },
  { value: "elektromos", label: "Tisztán elektromos", defaultPowertrain: "tisztan_elektromos" },
  { value: "hidrogen", label: "Hidrogén", defaultPowertrain: "uzemanyagcellas" },
  { value: "etanol", label: "Etanol", defaultPowertrain: "belsoegesu" },
  { value: "biodizel", label: "Biodízel", defaultPowertrain: "belsoegesu" },
  { value: "egyeb", label: "Egyéb", defaultPowertrain: "belsoegesu" },
];

export const POWERTRAIN_LABELS: Record<PowertrainSystem, string> = {
  belsoegesu: "Belsőégésű hajtásrendszer",
  enyhe_hibrid: "Enyhe hibrid (Mild Hybrid)",
  teljes_hibrid: "Teljes hibrid (Full Hybrid)",
  plug_in_hibrid: "Hálózatról tölthető hibrid (Plug-in Hybrid)",
  tisztan_elektromos: "Tisztán elektromos (BEV)",
  uzemanyagcellas: "Hidrogén üzemanyagcellás (FCEV)",
  kettos_uzemu: "Kettős üzemű (benzin/gáz)",
};

export const TRANSMISSION_OPTIONS: Array<{ value: TransmissionType; label: string }> = [
  { value: "manualis", label: "Manuális" },
  { value: "automata", label: "Automata" },
  { value: "felautomata", label: "Félautomata" },
  { value: "robotizalt", label: "Robotizált" },
  { value: "fokozatmentes", label: "Fokozatmentes (CVT)" },
  { value: "duplakuplungos", label: "Duplakuplungos (DSG / S tronic / DCT)" },
  { value: "egyeb", label: "Egyéb" },
];

export const DRIVE_OPTIONS: Array<{ value: DriveType; label: string }> = [
  { value: "elso", label: "Elsőkerék-hajtás" },
  { value: "hatso", label: "Hátsókerék-hajtás" },
  { value: "osszkerek", label: "Összkerékhajtás" },
  { value: "kapcsolhato_osszkerek", label: "Kapcsolható összkerékhajtás" },
];

export const CLIMATE_OPTIONS: Array<{ value: ClimateType; label: string }> = [
  { value: "nincs", label: "Nincs klíma" },
  { value: "manualis", label: "Manuális klíma" },
  { value: "automata", label: "Automata klíma" },
  { value: "ketzonas", label: "Kétzónás klíma" },
  { value: "haromzonas", label: "Háromzónás klíma" },
  { value: "negyzonas", label: "Négyzónás klíma" },
];

export const EURO_CLASSES = [
  "Euro 0",
  "Euro 1",
  "Euro 2",
  "Euro 3",
  "Euro 4",
  "Euro 5",
  "Euro 6",
  "Euro 6d",
  "Euro 6e",
  "Euro 7",
  "Környezetkímélő (0 kibocsátás)",
];

export const CONDITION_OPTIONS: Array<{ value: VehicleCondition; label: string }> = [
  { value: "uj", label: "Új" },
  { value: "ujszeru", label: "Újszerű" },
  { value: "kituno", label: "Kitűnő" },
  { value: "megkimelt", label: "Megkímélt" },
  { value: "normal", label: "Normál" },
  { value: "felujitott", label: "Felújított" },
  { value: "felujitando", label: "Felújítandó" },
  { value: "serult", label: "Sérült" },
  { value: "motorhibas", label: "Motorhibás" },
  { value: "valtohibas", label: "Váltóhibás" },
  { value: "uzemkeptelen", label: "Üzemképtelen" },
  { value: "restauralando", label: "Restaurálandó" },
];

export const DOCUMENT_STATUS_OPTIONS: Array<{ value: DocumentStatus; label: string }> = [
  { value: "ervenyes_magyar", label: "Érvényes magyar okmányok" },
  { value: "lejart_magyar", label: "Lejárt magyar okmányok" },
  { value: "ervenyes_kulfoldi", label: "Érvényes külföldi okmányok" },
  { value: "lejart_kulfoldi", label: "Lejárt külföldi okmányok" },
  { value: "okmanyok_nelkul", label: "Okmányok nélkül" },
];

export const EXTERIOR_COLORS = [
  "Fehér",
  "Fekete",
  "Ezüst",
  "Szürke",
  "Kék",
  "Sötétkék",
  "Piros",
  "Bordó",
  "Zöld",
  "Barna",
  "Bézs",
  "Arany",
  "Sárga",
  "Narancs",
  "Lila",
  "Egyéb",
];

export const UPHOLSTERY_TYPES = [
  "Szövet",
  "Bőr",
  "Félbőr",
  "Alcantara",
  "Műbőr",
  "Plüss",
  "Vegyes",
];

export const EQUIPMENT_GROUPS: Array<{
  id: string;
  label: string;
  items: Array<{ id: string; label: string }>;
}> = [
  {
    id: "safety_tech",
    label: "Műszaki felszereltség és biztonság",
    items: [
      { id: "abs", label: "ABS" },
      { id: "asr", label: "ASR" },
      { id: "esp", label: "ESP" },
      { id: "kiporgesgatlo", label: "Kipörgésgátló" },
      { id: "szervokormany", label: "Szervokormány" },
      { id: "vezeto_legzsak", label: "Vezetőoldali légzsák" },
      { id: "utas_legzsak", label: "Utasoldali légzsák" },
      { id: "oldallegzsak", label: "Oldallégzsák" },
      { id: "fuggonylegzsak", label: "Függönylégzsák" },
      { id: "terdlegzsak", label: "Térdlégzsák" },
      { id: "isofix", label: "ISOFIX" },
      { id: "inditasgatlo", label: "Indításgátló" },
      { id: "riaszto", label: "Riasztó" },
      { id: "tempomat", label: "Tempomat" },
      { id: "adaptiv_tempomat", label: "Adaptív tempomat" },
      { id: "savtarto", label: "Sávtartó asszisztens" },
      { id: "savelhagyas", label: "Sávelhagyásra figyelmeztető rendszer" },
      { id: "holtterfigyelo", label: "Holttérfigyelő" },
      { id: "veszfekezes", label: "Automatikus vészfékezés" },
      { id: "fekasszisztens", label: "Fékasszisztens" },
      { id: "faradtsagfigyelo", label: "Fáradtságfigyelő" },
      { id: "tablafelismero", label: "Táblafelismerő rendszer" },
      { id: "guminyomas", label: "Guminyomás-ellenőrző rendszer" },
      { id: "visszagurulas_gatlo", label: "Visszagurulás-gátló" },
      { id: "lejtmenetvezerlo", label: "Lejtmenetvezérlő" },
      { id: "start_stop", label: "Start-stop rendszer" },
      { id: "adaptiv_futomu", label: "Adaptív futómű" },
      { id: "sportfutomu", label: "Sportfutómű" },
      { id: "legrugozas", label: "Légrugózás" },
      { id: "differencialzar", label: "Differenciálzár" },
      { id: "felezovalto", label: "Felezőváltó" },
    ],
  },
  {
    id: "interior",
    label: "Beltér",
    items: [
      { id: "borules", label: "Bőrülés" },
      { id: "felbor_ules", label: "Félbőr ülés" },
      { id: "szovetkarpit", label: "Szövetkárpit" },
      { id: "alcantara_karpit", label: "Alcantara kárpit" },
      { id: "futheto_ules", label: "Fűthető ülés" },
      { id: "szelloztetheto_ules", label: "Szellőztethető ülés" },
      { id: "masszazsules", label: "Masszázsülés" },
      { id: "elektromos_ules", label: "Elektromosan állítható ülés" },
      { id: "memorias_ules", label: "Memóriás ülés" },
      { id: "derektamasz", label: "Deréktámasz" },
      { id: "futheto_kormany", label: "Fűthető kormány" },
      { id: "multifunkcios_kormany", label: "Multifunkciós kormány" },
      { id: "allithato_kormany", label: "Állítható kormány" },
      { id: "borkormany", label: "Bőrkormány" },
      { id: "konyoktamasz", label: "Első és hátsó könyöktámasz" },
      { id: "elektromos_ablak", label: "Elektromos ablak" },
      { id: "kozponti_zar", label: "Központi zár" },
      { id: "kulcs_nelkuli_nyitas", label: "Kulcs nélküli nyitás" },
      { id: "kulcs_nelkuli_inditas", label: "Kulcs nélküli indítás" },
      { id: "allofutes", label: "Állófűtés" },
      { id: "hangulatvilagitas", label: "Hangulatvilágítás" },
      { id: "panoramateto", label: "Panorámatető" },
      { id: "napfenyteto", label: "Napfénytető" },
      { id: "elektromos_csomagterajto", label: "Elektromos csomagtérajtó" },
      { id: "osztott_hatso_ules", label: "Osztottan dönthető hátsó ülés" },
    ],
  },
  {
    id: "exterior",
    label: "Kültér",
    items: [
      { id: "alufelni", label: "Alufelni" },
      { id: "acelfelni", label: "Acélfelni" },
      { id: "led_fenyszoro", label: "LED-fényszóró" },
      { id: "xenon_fenyszoro", label: "Xenonfényszóró" },
      { id: "bixenon_fenyszoro", label: "Bi-xenon fényszóró" },
      { id: "matrix_led", label: "Mátrix LED-fényszóró" },
      { id: "adaptiv_fenyszoro", label: "Adaptív fényszóró" },
      { id: "kodlampa", label: "Ködlámpa" },
      { id: "nappali_menetfeny", label: "Nappali menetfény" },
      { id: "automata_tavolsagi", label: "Automatikus távolsági fényszóró" },
      { id: "esoerzekelo", label: "Esőérzékelő" },
      { id: "fenyerzekelo", label: "Fényérzékelő" },
      { id: "elektromos_tukor", label: "Elektromos tükör" },
      { id: "futheto_tukor", label: "Fűthető tükör" },
      { id: "behajthato_tukor", label: "Behajtható tükör" },
      { id: "sotetitett_uveg", label: "Sötétített üveg" },
      { id: "futheto_szelvedo", label: "Fűthető szélvédő" },
      { id: "vonohorog", label: "Vonóhorog" },
      { id: "tetosin", label: "Tetősín" },
      { id: "tetocsomagtarto", label: "Tetőcsomagtartó" },
    ],
  },
  {
    id: "parking",
    label: "Parkolást segítő felszereltség",
    items: [
      { id: "elso_parkoloradar", label: "Első parkolóradar" },
      { id: "hatso_parkoloradar", label: "Hátsó parkolóradar" },
      { id: "tolatokamera", label: "Tolatókamera" },
      { id: "elso_kamera", label: "Első kamera" },
      { id: "kamera_360", label: "360 fokos kamera" },
      { id: "parkoloasszisztens", label: "Automatikus parkolóasszisztens" },
    ],
  },
  {
    id: "multimedia",
    label: "Multimédia és navigáció",
    items: [
      { id: "radio", label: "Rádió" },
      { id: "cd_lejatszo", label: "CD-lejátszó" },
      { id: "dab_radio", label: "Digitális rádió (DAB)" },
      { id: "bluetooth", label: "Bluetooth" },
      { id: "usb", label: "USB" },
      { id: "aux", label: "AUX" },
      { id: "navigacio", label: "Navigáció" },
      { id: "erintokepernyo", label: "Érintőképernyő" },
      { id: "apple_carplay", label: "Apple CarPlay" },
      { id: "android_auto", label: "Android Auto" },
      { id: "digitalis_muszeregyseg", label: "Digitális műszeregység" },
      { id: "hud", label: "Szélvédőre vetített kijelző (HUD)" },
      { id: "premium_hangrendszer", label: "Prémium hangrendszer" },
      { id: "vezetek_nelkuli_toltes", label: "Vezeték nélküli telefontöltés" },
      { id: "hangvezerles", label: "Hangvezérlés" },
      { id: "hatso_multimedia", label: "Hátsó multimédiás rendszer" },
    ],
  },
  {
    id: "other_info",
    label: "Egyéb információk",
    items: [
      { id: "nem_dohanyzo", label: "Nem dohányzó" },
      { id: "elso_tulajdonostol", label: "Első tulajdonostól" },
      { id: "masodik_tulajdonostol", label: "Második tulajdonostól" },
      { id: "magyarorszagon_ujonnan", label: "Magyarországon újonnan üzembe helyezett" },
      { id: "rendszeresen_karbantartott", label: "Rendszeresen karbantartott" },
      { id: "vezetett_szervizkonyv", label: "Vezetett szervizkönyv" },
      { id: "torzskonyv", label: "Törzskönyv rendelkezésre áll" },
      { id: "friss_muszaki", label: "Friss műszaki vizsga" },
      { id: "azonnal_elviheto", label: "Azonnal elvihető" },
      { id: "garancialis", label: "Garanciális" },
      { id: "teli_gumi", label: "Téli gumikkal" },
      { id: "nyari_gumi", label: "Nyári gumikkal" },
      { id: "ket_garnitura", label: "Két garnitúra kerékkel" },
      { id: "beszamitas", label: "Beszámítás lehetséges" },
      { id: "csere", label: "Csere lehetséges" },
    ],
  },
  {
    id: "motorcycle_extras",
    label: "Motorkerékpár-felszereltség",
    items: [
      { id: "markolatfutes", label: "Markolatfűtés" },
      { id: "gyorsvalto", label: "Gyorsváltó (Quickshifter)" },
      { id: "bukocso", label: "Bukócső" },
      { id: "szelvedo", label: "Szélvédő" },
      { id: "oldaldoboz", label: "Oldaldoboz" },
      { id: "hatso_doboz", label: "Hátsó doboz" },
      { id: "kozepallvany", label: "Középállvány" },
    ],
  },
];

export const EQUIPMENT_LABEL_MAP: Record<string, string> = Object.fromEntries(
  EQUIPMENT_GROUPS.flatMap((g) => g.items.map((i) => [i.id, i.label])),
);

export const TOTAL_EQUIPMENT_COUNT = Object.keys(EQUIPMENT_LABEL_MAP).length;

export const VEHICLE_ABUSE_REPORT_REASONS: Array<{ code: string; label: string }> = [
  { code: "fake_listing", label: "Hamis hirdetés" },
  { code: "false_technical_data", label: "Valótlan műszaki adat" },
  { code: "misleading_price", label: "Megtévesztő vételár" },
  { code: "mileage_tampering", label: "Valótlan kilométeróra-állás" },
  { code: "fraud_suspicion", label: "Csalásgyanú" },
  { code: "unauthorized_photos", label: "Jogosulatlan képhasználat" },
  { code: "unsolicited_commercial", label: "Kéretlen üzletszerzés" },
  { code: "false_viewing_declaration", label: "Valótlan megtekintési nyilatkozat" },
  { code: "harassment", label: "Zaklatás" },
  { code: "no_show", label: "Megtekintésen való meg nem jelenés" },
  { code: "other", label: "Egyéb" },
];

export const VEHICLE_STATUS_LABELS: Record<VehicleListingStatus, { label: string; className: string }> = {
  DRAFT: { label: "Piszkozat", className: "border-slate-200 bg-slate-100 text-slate-700" },
  PAYMENT_PENDING: { label: "Fizetésre vár", className: "border-amber-200 bg-amber-50 text-amber-800" },
  ACTIVE: { label: "Aktív", className: "border-emerald-200 bg-emerald-50 text-emerald-800" },
  PAUSED: { label: "Szüneteltetve", className: "border-slate-200 bg-slate-100 text-slate-700" },
  SOLD: { label: "Eladva", className: "border-slate-300 bg-slate-100 text-slate-800" },
  EXPIRED: { label: "Lejárt", className: "border-rose-200 bg-rose-50 text-rose-700" },
  DELETED: { label: "Törölve", className: "border-slate-200 bg-slate-100 text-slate-500" },
};

export const VEHICLE_BOOKING_STATUS_LABELS: Record<VehicleBookingStatus, { label: string; className: string }> = {
  PENDING: { label: "Visszaigazolásra vár", className: "border-amber-200 bg-amber-50 text-amber-800" },
  APPROVED: { label: "Visszaigazolva", className: "border-emerald-200 bg-emerald-50 text-emerald-800" },
  PROPOSED_NEW_TIME: { label: "Másik időpont javasolva", className: "border-sky-200 bg-sky-50 text-sky-800" },
  REJECTED: { label: "Elutasítva", className: "border-rose-200 bg-rose-50 text-rose-700" },
  REVOKED_BY_OWNER: { label: "Lemondva", className: "border-slate-200 bg-slate-100 text-slate-700" },
  CANCELLED_BY_REQUESTER: { label: "Lemondva", className: "border-slate-200 bg-slate-100 text-slate-700" },
  COMPLETED: { label: "Teljesítve", className: "border-emerald-200 bg-white text-emerald-800" },
  NO_SHOW: { label: "Nem jelent meg", className: "border-rose-200 bg-rose-50 text-rose-700" },
};

export const PHOTO_GUIDE_SHOTS = [
  "Elölnézet (enyhén srégen)",
  "Hátulnézet",
  "Bal és jobb oldalnézet",
  "Utastér és ülések",
  "Műszerfal és kormány",
  "Kilométeróra (gyújtás ráadásával)",
  "Motortér",
  "Csomagtartó / raktér",
  "Kerekek és gumik állapota",
  "Ismert sérülések, esztétikai hibák",
];

export const DISTANCE_PRESETS_KM = [5, 10, 25, 50, 100, 200] as const;

export function formatHuf(amount?: number | null): string {
  if (amount === undefined || amount === null || !Number.isFinite(Number(amount))) return "—";
  return `${Math.round(Number(amount)).toLocaleString("hu-HU")} Ft`;
}

export function formatKm(km?: number | null): string {
  if (km === undefined || km === null || !Number.isFinite(Number(km))) return "—";
  return `${Math.round(Number(km)).toLocaleString("hu-HU")} km`;
}

export function formatPower(kw?: number | null, hp?: number | null): string {
  const k = kw ? Math.round(kw) : hp ? Math.round(hp / 1.35962) : null;
  const h = hp ? Math.round(hp) : kw ? Math.round(kw * 1.35962) : null;
  if (!k && !h) return "—";
  return `${k} kW / ${h} LE`;
}

export function formatHuDateDot(dateIso?: string): string {
  if (!dateIso) return "—";
  const m = dateIso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return dateIso;
  const months = [
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
  const monthIdx = Number(m[2]) - 1;
  const day = Number(m[3]);
  return `${m[1]}. ${months[monthIdx] || m[2]} ${day}.`;
}

export function getCategoryLabel(cat: VehicleCategory): string {
  return VEHICLE_CATEGORIES.find((c) => c.value === cat)?.label || "Jármű";
}

export function getFuelLabel(fuel: string): string {
  return FUEL_OPTIONS.find((f) => f.value === fuel)?.label || fuel;
}

export function getTransmissionLabel(t: string): string {
  return TRANSMISSION_OPTIONS.find((o) => o.value === t)?.label || t;
}

export function getDriveLabel(d?: string): string {
  return DRIVE_OPTIONS.find((o) => o.value === d)?.label || "—";
}

export function getConditionLabel(c: string): string {
  return CONDITION_OPTIONS.find((o) => o.value === c)?.label || c;
}

export function getDocumentStatusLabel(d: string): string {
  return DOCUMENT_STATUS_OPTIONS.find((o) => o.value === d)?.label || d;
}

export function getClimateLabel(c?: string): string {
  return CLIMATE_OPTIONS.find((o) => o.value === c)?.label || "—";
}

export function slugifyHu(str: string): string {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
