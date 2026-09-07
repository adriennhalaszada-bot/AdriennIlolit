export const CATEGORIES = [
  { id: "1", name: "Női ruha", slug: "noi-ruha", icon: "👗" },
  { id: "2", name: "Férfi ruha", slug: "ferfi-ruha", icon: "👔" },
  { id: "3", name: "Gyerekruha", slug: "gyerekruha", icon: "👶" },
  { id: "4", name: "Baba felszerelés", slug: "baba-felszereles", icon: "🍼" },
  { id: "5", name: "Cipő", slug: "cipo", icon: "👟" },
  { id: "6", name: "Kézitáska és táska", slug: "kezitaska-es-taska", icon: "👜" },
  { id: "7", name: "Kiegészítők", slug: "kiegeszitok", icon: "💍" },
  { id: "8", name: "Lakberendezés", slug: "lakberendezes", icon: "🏠" },
  { id: "9", name: "Háztartási gépek", slug: "haztartasi-gepek", icon: "🔧" },
  { id: "10", name: "Sport és szabadidő", slug: "sport-es-szabadido", icon: "⚽" },
  { id: "11", name: "Hobbi, játék és könyv", slug: "hobbi-jatek-es-konyv", icon: "🎮" },
  { id: "12", name: "Elektronika", slug: "elektronika", icon: "📱" },
  { id: "13", name: "Szépségápolás", slug: "szepsegapolas", icon: "💄" },
  { id: "14", name: "Egyéb", slug: "egyeb", icon: "📦" }
];

export const CONDITIONS: Record<string, string> = {
  NEW_WITH_TAG: "Mintha új lenne",
  NEW_WITHOUT_TAG: "Újszerű",
  VERY_GOOD: "Jó állapotú",
  GOOD: "Használt",
  ACCEPTABLE: "Használható",
};

export const formatPrice = (price: number) => {
  return new Intl.NumberFormat('hu-HU', {
    style: 'currency',
    currency: 'HUF',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price).replace('HUF', 'Ft');
};
