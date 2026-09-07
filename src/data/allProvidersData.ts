export interface ProviderCategory {
  id: string;
  name: string;
  subcategories: string[];
}

export const ALL_PROVIDER_CATEGORIES: ProviderCategory[] = [
  {
    id: "metal",
    name: "Acél- és fémipar",
    subcategories: [
      "Acél- és lakatos", "Csiszoló", "Hegesztő", "Késes", "Kovács", 
      "Lakatos", "Polírozó", "Szerszámkészítő"
    ]
  },
  {
    id: "pets",
    name: "Állattartás",
    subcategories: [
      "Állatbelgyógyász", "Állatbőrgyógyász", "Állatfodrász", "Állatfogorvos", "Állatgyógytornász", 
      "Állatháziorvos", "Állatkardiológus", "Állatorvos (haszonállat)", "Állatorvos (kisállat)", "Állatorvos (ló)", 
      "Állatorvosi dietetikus", "Állatorvosi képalkotó specialista", "Állatorvosi sebész", "Állatpatológus", 
      "Állatvédelmi hatósági állatorvos", "Élelmiszerlánc-felügyelő állatorvos", "Kutya-fizioterapeuta", 
      "Kutya- és macskapanzió", "Kutyakiképző", "Kutyakozmetikus", "Kutyasétáltató", "Lóápoló", 
      "Macskakozmetikus", "Madár- és halgondozó", "Madár- és hüllőorvos", "Patkolókovács"
    ]
  },
  {
    id: "furniture_wood",
    name: "Bútor- és faipar",
    subcategories: [
      "Antik bútor restaurátor", "Asztalos", "Bútorasztalos", "Bútorösszeszerelő", "Épületasztalos", 
      "Fakereskedő", "Famegmunkáló", "Hajóasztalos", "Hordókészítő", "Játékasztalos", "Kárpitozó", "Lépcsőgyártó"
    ]
  },
  {
    id: "shoe_leather",
    name: "Cipő- és bőripar",
    subcategories: [
      "Bőrdíszműves", "Bőrszabó", "Cipész", "Cipőfestő", "Cipőfelsőrész-készítő", 
      "Nyeregkészítő", "Orthopéd cipész", "Sportcipő-szerviz", "Táskajavító"
    ]
  },
  {
    id: "health",
    name: "Egészségügy",
    subcategories: [
      "Allergológus", "Belgyógyász", "Diabetológus", "Endokrinológus", "Gasztroenterológus", "Háziorvos", 
      "Hematológus", "Immunológus", "Infektológus", "Kardiológus", "Nefrológus", "Pulmonológus", 
      "Rehabilitációs szakorvos", "Reumatológus", "Bőrgyógyász", "Kozmetológus bőrgyógyász", "Fogorvos (alapellátás)", 
      "Fogszabályozó szakorvos", "Parodontológus", "Gyermekorvos (házi gyermekorvos)", "Logopédus", 
      "Neurológus", "Pszichiáter", "Pszichoterapeuta", "Csontkovács", "Fizioterapeuta", "Gyógytornász", 
      "Masszázsterapeuta", "Táplálkozási tanácsadó", "Szülész-nőgyógyász", "Ortopéd szakorvos", "Szemész"
    ]
  },
  {
    id: "food_catering",
    name: "Élelmiszer- és vendéglátás",
    subcategories: [
      "Baromfifeldolgozó", "Borász", "Cukrász", "Halárus", "Hentes", "Kolbászkészítő", 
      "Méhész", "Mészáros", "Pálinkafőző", "Pék", "Sajtkészítő", "Séf", "Sörfőző"
    ]
  },
  {
    id: "construction",
    name: "Építőipar",
    subcategories: [
      "Acél- és lakatos", "Alapozó", "Ács", "Állványozó", "Bádogos", "Betonozó", "Bontó", "Burkoló", 
      "Cserépkályha-készítő", "Díszítőfestő", "Energetikai tanúsító", "Építési vállalkozó", "Epoxi padló szakember", 
      "Festő-mázoló", "Földmunkagép-kezelő", "Fűtésszerelő", "Gázszerelő", "Gáztervező", "Hegesztő", 
      "Kandalló szerelő", "Kéménybélelő", "Kéményseprő", "Kőműves", "Kútfúró", "Műemléki felújító", 
      "Nyílászáró szerelő", "Parkettás", "Redőnyös", "Szárazépítő", "Szigetelő", "Tapétázó", "Tetőfedő", 
      "Üvegező", "Vakoló", "Villanyszerelő", "Vízvezeték-szerelő"
    ]
  },
  {
    id: "appliances_electronics",
    name: "Háztartási gépek és elektronika",
    subcategories: [
      "Bojler szerelő", "Hűtőszekrény-szerelő", "Kávéfőző szerviz", "Klímaszerelő", "Konyhai gép szerviz", 
      "Laptop szerviz", "Légtechnikus", "Mikrohullámú szerelő", "Mosogatógép-szerelő", "Mosógép-szerelő", 
      "Nyomtató szerviz", "Porszívó szerviz", "Sütő- és tűzhelyszerelő", "Telefon- és tabletszerviz", "TV-szerelő"
    ]
  },
  {
    id: "real_estate",
    name: "Ingatlan és lakhatás",
    subcategories: [
      "Belsőépítész", "Home staging tanácsadó", "Ingatlan értékbecslő", "Ingatlanügynök", "Lakberendező"
    ]
  },
  {
    id: "it_digital",
    name: "IT és digitális szolgáltatások",
    subcategories: [
      "Adatrögzítő", "Fotós", "Grafikus", "IT biztonsági tanácsadó", "Szoftvertelepítő", 
      "Számítógép-szerelő", "Tartalomgyártó", "Videószerkesztő", "Virtuális asszisztens", "Weboldal készítő"
    ]
  },
  {
    id: "automotive",
    name: "Járműipar",
    subcategories: [
      "Adásvételi szakértő", "Autófényező", "Autóklíma szerviz", "Autókozmetikus", "Autószerelő", 
      "Autóvillamossági szerelő", "Elektromos roller szerviz", "Futóműállító", "Gépjármű műszaki vizsgáztató", 
      "Gumiszerviz", "Hajó- és csónakmotor-szerelő", "Járműüveges", "Karosszérialakatos", "Kerékpárműhely", 
      "Kipufogó szerviz", "Motorkerékpár-szerelő", "Olajcsere szerviz", "Traktorszerelő"
    ]
  },
  {
    id: "legal",
    name: "Jogi szolgáltatók",
    subcategories: [
      "Cégbírósági ügyintéző", "Jogi szakfordító", "Jogi tanácsadó", "Követeléskezelő", "Közjegyző", 
      "Mediátor", "Szakjogász (adójogász)", "Szakjogász (büntetőjogász)", "Szakjogász (családjogász)", 
      "Szakjogász (építési jogász)", "Szakjogász (ingatlanjogász)", "Szakjogász (munkajogász)", 
      "Szakjogász (szellemi tulajdonjogász)", "Szakjogász (társasági jogász)", "Választottbíró", "Végrehajtó", "Ügyvéd"
    ]
  },
  {
    id: "garden_outdoor",
    name: "Kert és szabadtér",
    subcategories: [
      "Fakivágó", "Fanyeső", "Fűnyíró-szerviz", "Kerti tó építő", "Kertész", "Kerttervező", 
      "Medenceépítő", "Medencekarbantartó", "Öntözőrendszer-szerelő", "Pergola építő", "Permetező", 
      "Sövényvágó", "Télikertépítő", "Teraszburkoló", "Tereprendező"
    ]
  },
  {
    id: "logistics_transport",
    name: "Logisztika és szállítás",
    subcategories: [
      "Dupla utánfutós szállító", "Futár", "Költöztető", "Lomtalanító", "Targoncás", "Teherfuvarozó"
    ]
  },
  {
    id: "education",
    name: "Oktatás",
    subcategories: [
      "Énektanár", "Főzőtanfolyam vezető", "Íjászedző", "Kreatív írás tanácsadó", 
      "Magántanár", "Nyelvtanár", "Zeneoktató"
    ]
  },
  {
    id: "finance",
    name: "Pénzügyi szolgáltatók",
    subcategories: [
      "Adótanácsadó", "Biztosítási tanácsadó", "Ingatlanügyintéző", "Könyvelő", "Nyugdíj szakértő", "Pénzügyi tanácsadó"
    ]
  },
  {
    id: "sports_leisure",
    name: "Sport és szabadidő",
    subcategories: [
      "Fallabda edző", "Futóedző", "Golftanár", "Jógatanár", "Pilates oktató", 
      "Sportmasszőr", "Személyi edző", "Tánctanár", "Teniszedző", "Túravezető", "Úszásoktató"
    ]
  },
  {
    id: "beauty_health",
    name: "Szépség- és egészségipar",
    subcategories: [
      "Bodypiercer", "Borbély", "Dietetikus", "Fizioterapeuta", "Fodrász", "Gyógymasszőr", 
      "Kozmetikus", "Lifestyle coach", "Manikűrös", "Masszőr", "Műkörmös", "Pedikűrös", 
      "Szempilla-stylist", "Tattoo artist", "Tetőtatuáló"
    ]
  },
  {
    id: "cleaning_household",
    name: "Takarítás és háztartás",
    subcategories: [
      "Ablaktisztító", "Fal- és mennyezetmosás", "Gyermekfelügyelő", "Háztartási segítség", "Házvezetőnő", 
      "Kárpit- és matractisztító", "Kőpadló polírozó", "Ózonos fertőtlenítő", "Szőnyegtisztító", "Takarítónő"
    ]
  },
  {
    id: "auditors_inspectors",
    name: "Tanúsítók, felülvizsgálók és ellenőrök",
    subcategories: [
      "Beépített anyagok ellenőre", "Építéshatósági ügyintéző", "Építésügyi műszaki ellenőr", 
      "Érintésvédelmi felülvizsgáló", "Energetikai tanúsító", "Felelős műszaki vezető", "Földhivatali ügyintéző", 
      "Geodéta", "Hatósági tanúsító", "Hulladékgazdálkodási szakértő", "Kéménybélelési tanúsító", 
      "Környezetvédelmi felülvizsgáló", "Környezetvédelmi tanúsító", "Levegőtisztaság-védelmi szakértő", 
      "Munkavédelmi képviselő", "Munkavédelmi szakértő", "Statikus", "Talajmechanikai szakértő", 
      "Tartószerkezeti szakértő", "Tűzvédelmi felülvizsgáló", "Tűzvédelmi szakértő", "Villamosbiztonsági felülvizsgáló", 
      "Vízvédelmi szakértő", "Zaj- és rezgésvédelmi szakértő", "Örökségvédelmi szakértő"
    ]
  },
  {
    id: "textile_clothing",
    name: "Textil- és ruházat",
    subcategories: [
      "Cipész", "Denim szakértő", "Esküvőiruha-készítő", "Gombkötő", "Gyermekruha-készítő", "Hímző", 
      "Horgoló", "Kalapos", "Kötöttáru készítő", "Mosoda", "Női szabó", "Prémes", "Szabó", 
      "Színfogó specialista", "Varrónő", "Vasalónő", "Vegytisztító"
    ]
  },
  {
    id: "glass_doors_windows",
    name: "Üveg, ajtó, ablak",
    subcategories: [
      "Ajtó- és ablakbeállító", "Biztonsági fóliázó", "Redőny automatika szerelő", "Üveges"
    ]
  },
  {
    id: "other_useful",
    name: "Egyéb hasznos szolgáltatók",
    subcategories: [
      "Csipkeverő", "Erdész", "Ékszerész", "Fényképész", "Gyöngyfűző", "Halőr", "Hangszerész", 
      "Intarziakészítő", "Karbantartó", "Képkeretező", "Keramikus", "Kosárfonó", "Könyvkötő", 
      "Lektor", "Lombfűrészes", "Mézeskalács készítő", "Órás", "Restaurátor", "Szövő", "Üvegműves", 
      "Vadgazda", "Zongorahangoló"
    ]
  }
];

export interface DemoGeneralProvider {
  id: string;
  name: string;
  profession: string;
  category: string;
  rating: number;
  reviewCount: number;
  tier: "PREMIUM" | "PRO" | "BASIC" | "FREE";
  city: string;
  address: string;
  distanceKm: number;
  availableToday: boolean;
  nextSlot: string;
  avatar: string;
  coverImage: string;
  brandColor: string;
  templateId: "template1" | "template2" | "template3" | "template4";
  fontFamily: string;
  bio: string;
  phone: string;
  email: string;
  videoUrl?: string;
  services: {
    id: string;
    name: string;
    price: number;
    durationMinutes: number;
    requiresDeposit: boolean;
    depositPercentage: number;
    description: string;
  }[];
}

export const DEMO_GENERAL_PROVIDERS: DemoGeneralProvider[] = [
  {
    id: "prov_miskolc_gen_1",
    name: "Miskolci Villanyszerelő & Épületgépészet Kft.",
    profession: "Villanyszerelő",
    category: "Építőipar",
    rating: 4.9,
    reviewCount: 78,
    tier: "PREMIUM",
    city: "Miskolc",
    address: "Kazinczy utca 24, Miskolc",
    distanceKm: 0,
    availableToday: true,
    nextSlot: "Ma 14:00",
    avatar: "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=300",
    coverImage: "https://images.unsplash.com/photo-1541888946425-d0fbb186a5b7?w=1000",
    brandColor: "#7c3aed",
    templateId: "template3",
    fontFamily: "Poppins",
    bio: "Miskolcon és vonzáskörzetében végzünk teljes körű villanyszerelést, hibaelhárítást és hálózatépítést.",
    phone: "+36 46 123 456",
    email: "info@miskolcivillany.hu",
    services: [
      { id: "s_m_elec_1", name: "Kiszállás & Hibakeresés Miskolcon", price: 12000, durationMinutes: 60, requiresDeposit: false, depositPercentage: 0, description: "Gyors hibafeltárás Miskolc egész területén." },
    ]
  },
  {
    id: "prov_debrecen_gen_1",
    name: "Debreceni Asztalos & Bútormanufaktúra",
    profession: "Asztalos",
    category: "Bútor- és faipar",
    rating: 5.0,
    reviewCount: 65,
    tier: "PRO",
    city: "Debrecen",
    address: "Piac utca 20, Debrecen",
    distanceKm: 0,
    availableToday: false,
    nextSlot: "Holnap 09:00",
    avatar: "https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=300",
    coverImage: "https://images.unsplash.com/photo-1504917599217-d4dc5ebe6122?w=1000",
    brandColor: "#d97706",
    templateId: "template2",
    fontFamily: "Roboto",
    bio: "Egyedi konyhabútorok, beépített szekrények tervezése és készítése Debrecenben.",
    phone: "+36 52 987 654",
    email: "debrecen.asztalos@gmail.com",
    services: [
      { id: "s_d_wood_1", name: "Helyszíni Felmérés Debrecenben", price: 5000, durationMinutes: 45, requiresDeposit: false, depositPercentage: 0, description: "Ingyenes felmérés és árajánlat." },
    ]
  },
  {
    id: "prov_pet_1",
    name: "MancsMűhely Kutyakozmetika",
    profession: "Kutyakozmetikus",
    category: "Állattartás",
    rating: 4.9,
    reviewCount: 94,
    tier: "PREMIUM",
    city: "Budapest",
    address: "Andrássy út 45.",
    distanceKm: 1.8,
    availableToday: true,
    nextSlot: "Ma 15:30",
    avatar: "https://images.unsplash.com/photo-1516734212186-a967f81ad0d7?w=300",
    coverImage: "https://images.unsplash.com/photo-1535294435445-d7249524ef2e?w=1000",
    brandColor: "#059669",
    templateId: "template1",
    fontFamily: "Inter",
    bio: "Professzionális kutyakozmetika Budapest belvárosában. Fürdetés, nyírás, bontás és körömvágás stresszmentes környezetben.",
    phone: "+36 30 123 4567",
    email: "info@mancsmuhely.hu",
    services: [
      { id: "s_pet_1", name: "Teljes Kutyakozmetika (Kis- és Közepes)", price: 9500, durationMinutes: 60, requiresDeposit: true, depositPercentage: 20, description: "Fürdetés, szárítás, nyírás, fülgondozás és körömvágás." },
      { id: "s_pet_2", name: "Eü. Nyírás & Körömvágás", price: 4500, durationMinutes: 30, requiresDeposit: false, depositPercentage: 0, description: "Mancsszőr nyírás és körömvágás." },
      { id: "s_pet_3", name: "Macskakozmetika (Bontás & Fürdetés)", price: 8900, durationMinutes: 45, requiresDeposit: true, depositPercentage: 30, description: "Gyengéd macskaápolás szakértő kezek által." }
    ]
  },
  {
    id: "prov_auto_1",
    name: "GarázsDoktor Autószerviz & Diagnosztika",
    profession: "Autószerelő",
    category: "Járműipar",
    rating: 4.8,
    reviewCount: 156,
    tier: "PRO",
    city: "Budapest",
    address: "Váci út 110.",
    distanceKm: 3.4,
    availableToday: true,
    nextSlot: "Ma 16:00",
    avatar: "https://images.unsplash.com/photo-1580273916550-e323be2ae537?w=300",
    coverImage: "https://images.unsplash.com/photo-1486006920555-c77dce18193b?w=1000",
    brandColor: "#2563eb",
    templateId: "template4",
    fontFamily: "Montserrat",
    bio: "Gyors és szakszerű autójavítás, olajcsere, fék- és futómű szerviz, műszaki felkészítés garanciával.",
    phone: "+36 20 987 6543",
    email: "szerviz@garazsdoktor.hu",
    services: [
      { id: "s_auto_1", name: "Számítógépes Hibakód Olvasás & Diagnosztika", price: 8000, durationMinutes: 30, requiresDeposit: false, depositPercentage: 0, description: "Teljes elektronikai hibafeltárás tesztműszerekkel." },
      { id: "s_auto_2", name: "Gyors Olajcsere & Szűrők Cseréje", price: 15000, durationMinutes: 45, requiresDeposit: true, depositPercentage: 20, description: "Motorolaj és olajszűrő, levegőszűrő csere hozott vagy gyári anyaggal." },
      { id: "s_auto_3", name: "Fékrendszer Ellenőrzés & Betét Csere", price: 18000, durationMinutes: 60, requiresDeposit: true, depositPercentage: 30, description: "Első vagy hátsó fékbetétek szakszerű cseréje." }
    ]
  },
  {
    id: "prov_metal_1",
    name: "Vasszerkezet & Lakatos Műhely",
    profession: "Acél- és lakatos",
    category: "Acél- és fémipar",
    rating: 5.0,
    reviewCount: 42,
    tier: "PRO",
    city: "Budapest",
    address: "Kerepesi út 88.",
    distanceKm: 4.1,
    availableToday: false,
    nextSlot: "Holnap 09:00",
    avatar: "https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=300",
    coverImage: "https://images.unsplash.com/photo-1504917599217-d4dc5ebe6122?w=1000",
    brandColor: "#d97706",
    templateId: "template2",
    fontFamily: "Roboto",
    bio: "Egyedi acélszerkezetek, kapuk, kerítések, korlátok tervezése, hegesztése és helyszíni szerelése.",
    phone: "+36 70 333 4444",
    email: "info@vasszerkezetek.hu",
    services: [
      { id: "s_metal_1", name: "Helyszíni Felmérés & Szaktanácsadás", price: 5000, durationMinutes: 45, requiresDeposit: false, depositPercentage: 0, description: "Helyszíni mérés és árajánlat készítés." },
      { id: "s_metal_2", name: "Kapu & Kerítés Hegesztés (Munkaóra)", price: 12000, durationMinutes: 60, requiresDeposit: true, depositPercentage: 50, description: "Professzionális CO2 és AWI hegesztés." }
    ]
  },
  {
    id: "prov_elec_1",
    name: "ElektroFix Villanyszerelés & Okosotthon",
    profession: "Villanyszerelő",
    category: "Építőipar",
    rating: 4.9,
    reviewCount: 88,
    tier: "PREMIUM",
    city: "Budapest",
    address: "Bécsi út 120.",
    distanceKm: 2.1,
    availableToday: true,
    nextSlot: "Ma 14:00",
    avatar: "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=300",
    coverImage: "https://images.unsplash.com/photo-1541888946425-d0fbb186a5b7?w=1000",
    brandColor: "#7c3aed",
    templateId: "template3",
    fontFamily: "Poppins",
    bio: "Villanyszerelés, hibaelhárítás, biztosítéktábla csere, lámpák és okoskapcsolók beépítése garanciával.",
    phone: "+36 30 555 7788",
    email: "szerviz@elektrofix.hu",
    services: [
      { id: "s_elec_1", name: "Gyors Hibaelhárítás & Sürgősségi Kiszerelés", price: 15000, durationMinutes: 45, requiresDeposit: false, depositPercentage: 0, description: "Áramkimaradás, zárlat keresés és javítás." },
      { id: "s_elec_2", name: "Biztosítéktábla Csere & Modernizálás", price: 35000, durationMinutes: 120, requiresDeposit: true, depositPercentage: 30, description: "Régi tábla cseréje kismegszakítókkal." }
    ]
  },
  {
    id: "prov_health_1",
    name: "Dr. Horváth Péter Gyógytorna & Fizioterápia",
    profession: "Gyógytornász",
    category: "Egészségügy",
    rating: 5.0,
    reviewCount: 112,
    tier: "PREMIUM",
    city: "Budapest",
    address: "Bartók Béla út 32.",
    distanceKm: 1.2,
    availableToday: true,
    nextSlot: "Ma 17:00",
    avatar: "https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=300",
    coverImage: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=1000",
    brandColor: "#0284c7",
    templateId: "template1",
    fontFamily: "Playfair Display",
    bio: "Gerinc- és ízületi panaszok, műtét utáni rehabilitáció, tartásjavítás egyéni gyógytornával.",
    phone: "+36 1 234 5678",
    email: "rendelo@drhorvathgyogytorna.hu",
    services: [
      { id: "s_h_1", name: "Egyéni Gyógytorna & Állapotfelmérés (50 perc)", price: 14000, durationMinutes: 50, requiresDeposit: true, depositPercentage: 20, description: "Részletes mozgásszervi vizsgálat és személyre szabott torna." },
      { id: "s_h_2", name: "Manuálterápia & Kinesio Taping", price: 16000, durationMinutes: 60, requiresDeposit: true, depositPercentage: 30, description: "Ízületi mobilizáció és ragasztás." }
    ]
  },
  {
    id: "prov-gen-1",
    name: "Vasszerkezet & Lakatos Műhely Kft.",
    profession: "Lakatos – biztonsági zárak, rácsok, rosta",
    category: "Acél- és fémipar",
    rating: 5.0,
    reviewCount: 42,
    tier: "PRO",
    city: "Budapest",
    address: "1037 Budapest, Bécsi út 240.",
    distanceKm: 4.1,
    availableToday: true,
    nextSlot: "Holnap 10:00",
    avatar: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=500&h=500&fit=crop",
    coverImage: "https://images.unsplash.com/photo-1504917599217-d4dc5ebe6122?w=1000",
    brandColor: "#059669",
    templateId: "template1",
    fontFamily: "Inter",
    bio: "Több mint 15 éves tapasztalattal vállaljuk lakossági és ipari fém szerkezetek, kapuk, kerítések, korlátok és biztonsági rácsok egyedi gyártását és telepítését garanciával!",
    phone: "+36 30 987 6543",
    email: "lakatos.vasszerkezet@email.hu",
    videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    services: [
      { id: "s1", name: "Biztonsági Rács Gyártása & Helyszíni Szerelése", price: 45000, durationMinutes: 120, requiresDeposit: true, depositPercentage: 20, description: "Egyedi méretre gyártott acél biztonsági rács szerelése." },
      { id: "s2", name: "Kovácsoltvas Kapu és Korlát Felmérés", price: 15000, durationMinutes: 60, requiresDeposit: true, depositPercentage: 30, description: "Helyszíni szaktanácsadás és árajánlat." },
      { id: "s3", name: "Ajtózár / Zárszerkezet Csere & Beállítás", price: 18000, durationMinutes: 45, requiresDeposit: true, depositPercentage: 30, description: "Biztonsági zárak beszerelése 1 év garanciával." }
    ]
  }
];
