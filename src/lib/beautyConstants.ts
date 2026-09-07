export const HU_COUNTIES = [
  "Budapest",
  "Bács-Kiskun",
  "Baranya",
  "Békés",
  "Borsod-Abaúj-Zemplén",
  "Csongrád-Csanád",
  "Fejér",
  "Győr-Moson-Sopron",
  "Hajdú-Bihar",
  "Heves",
  "Jász-Nagykun-Szolnok",
  "Komárom-Esztergom",
  "Nógrád",
  "Pest",
  "Somogy",
  "Szabolcs-Szatmár-Bereg",
  "Tolna",
  "Vas",
  "Veszprém",
  "Zala",
];

export const HU_CITIES_BY_COUNTY: Record<string, string[]> = {
  "Budapest": ["Budapest"],
  "Bács-Kiskun": ["Kecskemét", "Baja", "Kiskunfélegyháza", "Kalocsa", "Kiskunhalas", "Kiskőrös", "Jánoshalma"],
  "Baranya": ["Pécs", "Mohács", "Komló", "Siklós", "Szigetvár", "Villány", "Sásd"],
  "Békés": ["Békéscsaba", "Gyula", "Orosháza", "Szarvas", "Mezőkovácsháza", "Sarkad", "Békés"],
  "Borsod-Abaúj-Zemplén": ["Miskolc", "Kazincbarcika", "Sátoraljaújhely", "Tiszaújváros", "Ózd", "Szerencs", "Mezőkövesd"],
  "Csongrád-Csanád": ["Szeged", "Hódmezővásárhely", "Makó", "Szentes", "Csongrád", "Kistelek"],
  "Fejér": ["Székesfehérvár", "Dunaújváros", "Bicske", "Móri", "Sárbogárd", "Martonvásár"],
  "Győr-Moson-Sopron": ["Győr", "Sopron", "Mosonmagyaróvár", "Csorna", "Kapuvár", "Pannonhalma"],
  "Hajdú-Bihar": ["Debrecen", "Hajdúböszörmény", "Berettyóújfalu", "Hajdúszoboszló", "Balmazújváros", "Nyíradony"],
  "Heves": ["Eger", "Gyöngyös", "Hatvan", "Füzesabony", "Heves", "Pétervására"],
  "Jász-Nagykun-Szolnok": ["Szolnok", "Jászberény", "Karcag", "Törökszentmiklós", "Kunszentmárton", "Mezőtúr"],
  "Komárom-Esztergom": ["Tatabánya", "Esztergom", "Komárom", "Tata", "Oroszlány", "Kisbér"],
  "Nógrád": ["Salgótarján", "Balassagyarmat", "Bátonyterenye", "Pásztó", "Rétság"],
  "Pest": ["Érd", "Szentendre", "Vác", "Gödöllő", "Cegléd", "Dunakeszi", "Budaörs", "Nagykőrös"],
  "Somogy": ["Kaposvár", "Siófok", "Marcali", "Nagyatád", "Barcs", "Fonyód"],
  "Szabolcs-Szatmár-Bereg": ["Nyíregyháza", "Kisvárda", "Mátészalka", "Nyírbátor", "Vásárosnamény", "Csenger"],
  "Tolna": ["Szekszárd", "Dombóvár", "Paks", "Bonyhád", "Tamási"],
  "Vas": ["Szombathely", "Sárvár", "Kőszeg", "Celldömölk", "Vasvár"],
  "Veszprém": ["Veszprém", "Ajka", "Pápa", "Balatonfüred", "Tapolca", "Várpalota"],
  "Zala": ["Zalaegerszeg", "Nagykanizsa", "Keszthely", "Lenti", "Hévíz"],
};

export const BEAUTY_SERVICE_TYPES = [
  { value: "korom", label: "Körömépítés / manikűr", icon: "💅" },
  { value: "pedikur", label: "Pedikűr", icon: "🦶" },
  { value: "szempilla", label: "Szempillahosszabbítás", icon: "👁️" },
  { value: "szemoldok", label: "Szemöldökformázás", icon: "✨" },
  { value: "fodraszat", label: "Fodrászat", icon: "💇" },
  { value: "smink", label: "Sminkelés", icon: "💄" },
  { value: "masszazs", label: "Masszázs", icon: "💆" },
  { value: "kozmetika", label: "Kozmetika, arckezelés", icon: "🧴" },
  { value: "tetovalas", label: "Tetoválás / Micro" as string, icon: "🖋️" },
  { value: "egyeb", label: "Egyéb szépségápolás", icon: "🌸" },
];

export const BEAUTY_SERVICE_TYPE_LABELS: Record<string, string> = Object.fromEntries(
  BEAUTY_SERVICE_TYPES.map((s) => [s.value, s.label]),
);

export const BOOKING_STATUS_LABELS: Record<string, string> = {
  PENDING: "Függőben",
  CONFIRMED: "Visszaigazolva",
  REJECTED: "Elutasítva",
  CANCELLED: "Lemondva",
  COMPLETED: "Teljesítve",
  NO_SHOW: "Nem jelent meg",
};

export const BOOKING_STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-700",
  CONFIRMED: "bg-green-100 text-green-700",
  REJECTED: "bg-red-100 text-red-700",
  CANCELLED: "bg-muted text-muted-foreground",
  COMPLETED: "bg-blue-100 text-blue-700",
  NO_SHOW: "bg-red-100 text-red-700",
};

export const DAY_LABELS = ["Vasárnap", "Hétfő", "Kedd", "Szerda", "Csütörtök", "Péntek", "Szombat"];

export const FONT_OPTIONS = [
  { value: "Inter", label: "Inter (modern, letisztult)" },
  { value: "Playfair Display", label: "Playfair Display (elegáns, szerif)" },
  { value: "Poppins", label: "Poppins (kerekded, barátságos)" },
  { value: "Montserrat", label: "Montserrat (határozott, geometrikus)" },
  { value: "Cormorant Garamond", label: "Cormorant Garamond (finom, luxus)" },
  { value: "Dancing Script", label: "Dancing Script (kézírásos, játékos)" },
];

export function createGoogleCalendarUrl(params: {
  title: string;
  details: string;
  location: string;
  dateStr: string;
  timeStr: string;
  durationMinutes: number;
}): string {
  try {
    const [y, m, d] = (params.dateStr || "2026-01-01").split("-").map(Number);
    const [hh, mm] = (params.timeStr || "10:00").split(":").map(Number);

    const startDate = new Date(Date.UTC(y, (m || 1) - 1, d || 1, hh || 0, mm || 0));
    const endDate = new Date(startDate.getTime() + (params.durationMinutes || 60) * 60 * 1000);

    const formatUtc = (date: Date) => date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";

    const datesParam = `${formatUtc(startDate)}/${formatUtc(endDate)}`;

    const url = new URL("https://calendar.google.com/calendar/render");
    url.searchParams.set("action", "TEMPLATE");
    url.searchParams.set("text", params.title);
    url.searchParams.set("details", params.details);
    url.searchParams.set("location", params.location);
    url.searchParams.set("dates", datesParam);

    return url.toString();
  } catch (e) {
    return "https://calendar.google.com";
  }
}

export function downloadICalFile(params: {
  id: string;
  title: string;
  details: string;
  location: string;
  dateStr: string;
  timeStr: string;
  durationMinutes: number;
}) {
  try {
    const [y, m, d] = (params.dateStr || "2026-01-01").split("-").map(Number);
    const [hh, mm] = (params.timeStr || "10:00").split(":").map(Number);

    const startDate = new Date(Date.UTC(y, (m || 1) - 1, d || 1, hh || 0, mm || 0));
    const endDate = new Date(startDate.getTime() + (params.durationMinutes || 60) * 60 * 1000);

    const formatUtc = (date: Date) => date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";

    const icsContent = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Beauty Lolit//NONSGML v1.0//HU",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      "BEGIN:VEVENT",
      `UID:beauty-${params.id}@ilolit.hu`,
      `DTSTAMP:${formatUtc(new Date())}`,
      `DTSTART:${formatUtc(startDate)}`,
      `DTEND:${formatUtc(endDate)}`,
      `SUMMARY:${params.title}`,
      `DESCRIPTION:${params.details}`,
      `LOCATION:${params.location}`,
      "STATUS:CONFIRMED",
      "END:VEVENT",
      "END:VCALENDAR"
    ].join("\r\n");

    const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
    const link = document.createElement("a");
    link.href = window.URL.createObjectURL(blob);
    link.setAttribute("download", `foglalas-${params.dateStr}-${params.id}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (e) {
    console.error("iCal generation error:", e);
  }
}
