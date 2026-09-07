export interface MockBeautyService {
  id: string;
  providerId: string;
  serviceType: string;
  name: string;
  description?: string;
  price: number;
  durationMinutes: number;
}

export interface MockBeautyPortfolio {
  id: string;
  providerId: string;
  imageUrl: string;
  caption?: string;
  sortOrder: number;
}

export interface MockBeautyProvider {
  id: string;
  userId: string;
  displayName: string;
  bio?: string;
  profileImageUrl?: string;
  coverImageUrl?: string;
  region: string;
  county?: string;
  district?: string; // e.g. "5. kerület - Belváros", "13. kerület - Újlipótváros"
  address?: string;
  phone?: string;
  instagramHandle?: string;
  websiteUrl?: string;
  videoUrl?: string; // YouTube or MP4 video intro
  fontFamily?: string; // e.g. "Playfair Display", "Poppins", "Dancing Script"
  rating: number;
  totalReviews: number;
  completedBookings: number;
  isVerified?: boolean;
  isFeatured?: boolean;
  templateTheme?: string;
  templateId?: number;
  services: MockBeautyService[];
  portfolio: MockBeautyPortfolio[];
}

export const MOCK_BEAUTY_PROVIDERS: MockBeautyProvider[] = [
  {
    id: "beauty-1",
    userId: "user-beauty-1",
    displayName: "Kata Hajstúdió & Balayage Bar",
    bio: "Exkluzív fodrászat Vác belvárosában. Specialitásom a természetes hatású balayage, szőkítés és modern női hajvágás 8 év tapasztalattal.",
    profileImageUrl: "https://images.unsplash.com/photo-1562322140-8baeececf3df?q=80&w=600&auto=format&fit=crop",
    coverImageUrl: "https://images.unsplash.com/photo-1560066984-138dadb4c035?q=80&w=1200&auto=format&fit=crop",
    region: "Vác",
    county: "Pest",
    district: "Belváros",
    address: "2600 Vác, Széchenyi utca 12.",
    phone: "+36 30 111 2233",
    instagramHandle: "@kata_hajstudio_vac",
    websiteUrl: "https://katahajstudio.hu",
    videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
    fontFamily: "Playfair Display",
    rating: 4.9,
    totalReviews: 28,
    completedBookings: 142,
    isVerified: true,
    isFeatured: true,
    templateId: 2, // Elegant Serif
    templateTheme: "modern-minimal",
    services: [
      { id: "s-101", providerId: "beauty-1", serviceType: "fodraszat", name: "Női hajvágás + szárítás", description: "Mosás, személyre szabott vágás és formázás.", price: 7500, durationMinutes: 50 },
      { id: "s-102", providerId: "beauty-1", serviceType: "fodraszat", name: "Balayage festés + árnyalás", description: "Prémium OLAPLEX védőkezeléssel és színkorrekcióval.", price: 24000, durationMinutes: 150 },
      { id: "s-103", providerId: "beauty-1", serviceType: "fodraszat", name: "Keratinos hajújraépítés", description: "Mélytápláló pakolás és szerkezetregenerálás.", price: 12000, durationMinutes: 60 }
    ],
    portfolio: [
      { id: "p-101", providerId: "beauty-1", imageUrl: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?q=80&w=600&auto=format&fit=crop", caption: "Balayage szőkítés krém árnyalattal", sortOrder: 1 },
      { id: "p-102", providerId: "beauty-1", imageUrl: "https://images.unsplash.com/photo-1560066984-138dadb4c035?q=80&w=600&auto=format&fit=crop", caption: "Elegáns hullámok alkalmi frizurához", sortOrder: 2 }
    ]
  },
  {
    id: "beauty-budapest-5",
    userId: "user-beauty-bp5",
    displayName: "Lumière Beauty & Lash Boutique",
    bio: "Budapest 5. kerület belvárosában található luxus szalonunkban prémium szempillaépítéssel, szemöldöklaminálással és egyedi alkalmi sminkekkel várunk.",
    profileImageUrl: "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?q=80&w=600&auto=format&fit=crop",
    coverImageUrl: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?q=80&w=1200&auto=format&fit=crop",
    region: "Budapest",
    county: "Budapest",
    district: "5. kerület - Belváros",
    address: "1052 Budapest, Váci utca 18.",
    phone: "+36 30 777 8899",
    instagramHandle: "@lumiere_beauty_bp",
    websiteUrl: "https://lumierebeauty.hu",
    videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
    fontFamily: "Cormorant Garamond",
    rating: 5.0,
    totalReviews: 54,
    completedBookings: 320,
    isVerified: true,
    templateId: 3, // Soft Pastels
    services: [
      { id: "s-b501", providerId: "beauty-budapest-5", serviceType: "szempilla", name: "3D-4D Volume Szempilla építés", description: "Könnyű, tartós és szempillakímélő szett.", price: 16500, durationMinutes: 90 },
      { id: "s-b502", providerId: "beauty-budapest-5", serviceType: "szemoldok", name: "Szemöldök laminálás + Hibrid festés", description: "Hosszútávú dús hatás és pontos ív formázás.", price: 8900, durationMinutes: 45 },
      { id: "s-b503", providerId: "beauty-budapest-5", serviceType: "smink", name: "VIP Alkalmi & Menyasszonyi Smink", description: "Tartós fotóálló prémium smink próbasminkkel.", price: 26000, durationMinutes: 75 }
    ],
    portfolio: [
      { id: "p-b501", providerId: "beauty-budapest-5", imageUrl: "https://images.unsplash.com/photo-1583001809873-a1284d5630be?q=80&w=600&auto=format&fit=crop", caption: "Volumen műszempilla szett", sortOrder: 1 },
      { id: "p-b502", providerId: "beauty-budapest-5", imageUrl: "https://images.unsplash.com/photo-1512496015851-a90fb38ba796?q=80&w=600&auto=format&fit=crop", caption: "Szemöldök formázás és stílus", sortOrder: 2 }
    ]
  },
  {
    id: "beauty-budapest-13",
    userId: "user-beauty-bp13",
    displayName: "Újlipótváros Nail & Spa Lounge",
    bio: "Orosz manikűr, zselés körömépítés és gyógypedikűr a 13. kerületi Újlipótváros szívében, a Pozsonyi úton.",
    profileImageUrl: "https://images.unsplash.com/photo-1604654894610-df63bc536371?q=80&w=600&auto=format&fit=crop",
    coverImageUrl: "https://images.unsplash.com/photo-1632345031435-8727f6897d53?q=80&w=1200&auto=format&fit=crop",
    region: "Budapest",
    county: "Budapest",
    district: "13. kerület - Újlipótváros",
    address: "1137 Budapest, Pozsonyi út 24.",
    phone: "+36 30 888 9900",
    instagramHandle: "@ujlipot_nails_spa",
    fontFamily: "Poppins",
    rating: 4.9,
    totalReviews: 41,
    completedBookings: 230,
    isVerified: true,
    templateId: 1, // Modern Minimal
    services: [
      { id: "s-b1301", providerId: "beauty-budapest-13", serviceType: "korom", name: "Erősített Gél Lakk (Orosz manikűrrel)", description: "Precíz bőrvágás és tartós erősítés.", price: 7900, durationMinutes: 60 },
      { id: "s-b1302", providerId: "beauty-budapest-13", serviceType: "korom", name: "Épített Műköröm Zselé / Akril", description: "Egyedi formák és francia vagy színes végek.", price: 11900, durationMinutes: 90 },
      { id: "s-b1303", providerId: "beauty-budapest-13", serviceType: "pedikur", name: "Spa Pedikűr Gél Lakkozással", description: "Bőrkeményedés eltávolítás és lábápolás.", price: 9500, durationMinutes: 60 }
    ],
    portfolio: [
      { id: "p-b1301", providerId: "beauty-budapest-13", imageUrl: "https://images.unsplash.com/photo-1604654894610-df63bc536371?q=80&w=600&auto=format&fit=crop", caption: "Nude gél lakk orosz manikűrrel", sortOrder: 1 }
    ]
  },
  {
    id: "beauty-2",
    userId: "user-beauty-2",
    displayName: "Péter Barber Shop & Beard Lounge",
    bio: "Klasszikus és modern férfi hajvágás, meleg törölközős szakálligazítás Szeged szívében.",
    profileImageUrl: "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?q=80&w=600&auto=format&fit=crop",
    coverImageUrl: "https://images.unsplash.com/photo-1585747860715-2ba37e788b70?q=80&w=1200&auto=format&fit=crop",
    region: "Szeged",
    county: "Csongrád-Csanád",
    district: "Belváros",
    address: "6720 Szeged, Kárász utca 8.",
    phone: "+36 30 222 3344",
    instagramHandle: "@peter_barber_szeged",
    fontFamily: "Montserrat",
    rating: 4.8,
    totalReviews: 45,
    completedBookings: 210,
    isVerified: true,
    templateId: 5, // Dark Luxe
    templateTheme: "dark-luxe",
    services: [
      { id: "s-201", providerId: "beauty-2", serviceType: "fodraszat", name: "Férfi hajvágás (Fade / Klasszikus)", description: "Precíz gépi és ollós vágás mosással, stílustanácsadással.", price: 4900, durationMinutes: 35 },
      { id: "s-202", providerId: "beauty-2", serviceType: "fodraszat", name: "Szakállformázás & Pengés kontúr", description: "Meleg törölközős borotválás és szakállolajos ápolás.", price: 3900, durationMinutes: 25 },
      { id: "s-203", providerId: "beauty-2", serviceType: "fodraszat", name: "VIP Kombó (Hajvágás + Szakáll)", description: "Teljes átalakítás prémium haj- és szakállápoló termékekkel.", price: 7900, durationMinutes: 55 }
    ],
    portfolio: [
      { id: "p-201", providerId: "beauty-2", imageUrl: "https://images.unsplash.com/photo-1622286342621-4bd786c2447c?q=80&w=600&auto=format&fit=crop", caption: "Skin Fade átmenet", sortOrder: 1 },
      { id: "p-202", providerId: "beauty-2", imageUrl: "https://images.unsplash.com/photo-1621605815971-fbc98d665033?q=80&w=600&auto=format&fit=crop", caption: "Kontúros szakáll igazítás", sortOrder: 2 }
    ]
  },
  {
    id: "beauty-3",
    userId: "user-beauty-3",
    displayName: "Eszter Szempilla & Sminkstúdió",
    bio: "Professzionális 1D-6D szempillaépítés, alkalmi és menyasszonyi smink Pécs belvárosában.",
    profileImageUrl: "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?q=80&w=600&auto=format&fit=crop",
    coverImageUrl: "https://images.unsplash.com/photo-1512496015851-a90fb38ba796?q=80&w=1200&auto=format&fit=crop",
    region: "Pécs",
    county: "Baranya",
    district: "Belváros",
    address: "7621 Pécs, Király utca 15.",
    phone: "+36 30 333 4455",
    instagramHandle: "@eszter_lashes_pecs",
    fontFamily: "Dancing Script",
    rating: 5.0,
    totalReviews: 32,
    completedBookings: 185,
    isVerified: true,
    templateId: 4, // Botanical Green
    templateTheme: "soft-pastels",
    services: [
      { id: "s-301", providerId: "beauty-3", serviceType: "szempilla", name: "2D-3D Duplázott Szempilla szett", description: "Pillekönnyű, tartós volumen szett 4-5 hét tartóssággal.", price: 14000, durationMinutes: 100 },
      { id: "s-302", providerId: "beauty-3", serviceType: "smink", name: "Menyasszonyi smink + Próbasmink", description: "Tartós, vízálló fotókész smink prémium kozmetikumokkal.", price: 28000, durationMinutes: 120 },
      { id: "s-303", providerId: "beauty-3", serviceType: "szemoldok", name: "Szemöldök laminálás & Festés", description: "Dúsító formaigazítás és hosszantartó hibrid festés.", price: 7500, durationMinutes: 45 }
    ],
    portfolio: [
      { id: "p-301", providerId: "beauty-3", imageUrl: "https://images.unsplash.com/photo-1583001809873-a1284d5630be?q=80&w=600&auto=format&fit=crop", caption: "3D Light Volume műszempilla", sortOrder: 1 },
      { id: "p-302", providerId: "beauty-3", imageUrl: "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?q=80&w=600&auto=format&fit=crop", caption: "Alkalmi smink természetes tónusokkal", sortOrder: 2 }
    ]
  },
  {
    id: "beauty-5",
    userId: "user-beauty-5",
    displayName: "Radiance Skin Kozmetika & Arcesztétika",
    bio: "Prémium arckezelések, hyaluronos hidratálás, mikrodermabrázió és tinikezelések Székesfehérváron.",
    profileImageUrl: "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?q=80&w=600&auto=format&fit=crop",
    coverImageUrl: "https://images.unsplash.com/photo-1519823551278-64ac92734fb1?q=80&w=1200&auto=format&fit=crop",
    region: "Székesfehérvár",
    county: "Fejér",
    district: "Belváros",
    address: "8000 Székesfehérvár, Fő utca 22.",
    phone: "+36 30 555 6677",
    instagramHandle: "@radiance_skin_fehervar",
    fontFamily: "Playfair Display",
    rating: 4.9,
    totalReviews: 37,
    completedBookings: 160,
    isVerified: true,
    templateId: 4,
    templateTheme: "botanical-green",
    services: [
      { id: "s-501", providerId: "beauty-5", serviceType: "kozmetika", name: "Mélytisztító Arckezelés + UH", description: "Gőzölés, manuális tisztítás, ultrahangos hatóanyag-bevitel.", price: 11500, durationMinutes: 75 },
      { id: "s-502", providerId: "beauty-5", serviceType: "kozmetika", name: "Hyaluronos Anti-Aging Ránctalanítás", description: "Feszesítő peptid maszk és lifting arcmasszázs.", price: 16000, durationMinutes: 60 }
    ],
    portfolio: [
      { id: "p-501", providerId: "beauty-5", imageUrl: "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?q=80&w=600&auto=format&fit=crop", caption: "Ragyogó arckezelés eredménye", sortOrder: 1 }
    ]
  },
  {
    id: "beauty-6",
    userId: "user-beauty-6",
    displayName: "Harmónia Masszázs & Testkezelő Stúdió",
    bio: "Svédmasszázs, relaxációs aromaolajos kezelés és kötőszöveti zsírbontó alakformálás Debrecenben.",
    profileImageUrl: "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?q=80&w=600&auto=format&fit=crop",
    coverImageUrl: "https://images.unsplash.com/photo-1540555700478-4be289fbecef?q=80&w=1200&auto=format&fit=crop",
    region: "Debrecen",
    county: "Hajdú-Bihar",
    district: "Belváros",
    address: "4024 Debrecen, Piac utca 18.",
    phone: "+36 30 666 7788",
    fontFamily: "Inter",
    rating: 4.8,
    totalReviews: 24,
    completedBookings: 115,
    isVerified: false,
    templateId: 1,
    templateTheme: "warm-boho",
    services: [
      { id: "s-601", providerId: "beauty-6", serviceType: "masszazs", name: "Teljes Test Svédmasszázs (60 perc)", description: "Izomlazító, stresszoldó hát- és végtagmasszázs.", price: 9500, durationMinutes: 60 },
      { id: "s-602", providerId: "beauty-6", serviceType: "masszazs", name: "Aromaolajos Relaxációs Masszázs (90 perc)", description: "Kényeztető illóolajos testmasszázs fej- és talpmasszázzsal.", price: 14000, durationMinutes: 90 }
    ],
    portfolio: [
      { id: "p-601", providerId: "beauty-6", imageUrl: "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?q=80&w=600&auto=format&fit=crop", caption: "Relaxációs szoba és illóolajok", sortOrder: 1 }
    ]
  }
];
