import { useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { ChevronDown, ChevronUp } from "lucide-react";

interface FAQItem {
  q: string;
  a: string;
}

interface FAQSection {
  title: string;
  icon: string;
  items: FAQItem[];
}

const FAQ_SECTIONS: FAQSection[] = [
  {
    title: "Regisztráció és fiók",
    icon: "👤",
    items: [
      { q: "Hogyan regisztrálhatok a Lolitra?", a: "Kattints a jobb felső sarokban lévő 'Regisztráció' gombra, majd add meg az e-mail címed és válassz jelszót. Google fiókkal is be tudsz lépni egyetlen kattintással." },
      { q: "Elfelejtettük a jelszavam, mit tegyek?", a: "A bejelentkezési oldalon kattints az 'Elfelejtett jelszó' linkre. Az e-mail címedre küldünk egy visszaállítási linket." },
      { q: "Hogyan változtathatom meg a becenevemet?", a: "A Profil → Beállítások menüben tudod módosítani a becenevedet. Figyelj arra, hogy a becenév egyedi kell legyen a platformon." },
      { q: "Törölhetem a fiókomat?", a: "Igen, a Profil → Beállítások → Fiók törlése menüpontban kezdeményezheted a fiók törlését. Ez az összes hirdetésedet és üzenetedet is törli." },
    ],
  },
  {
    title: "Vásárlás",
    icon: "🛍️",
    items: [
      { q: "Hogyan vásárolhatok egy terméket?", a: "Keresd meg a kívánt terméket, kattints rá, majd a 'Megveszem' gombbal kezdeményezd a vásárlást. Fix áras terméknél azonnal fizethetsz, aukciósnál licitálhatsz, Lolit Deal terméknél ajánlatot tehetsz." },
      { q: "Milyen fizetési módok vannak?", a: "Bankkártyás fizetést fogadunk el (Visa, Mastercard) a biztonságos Stripe rendszerén keresztül. A fizetés kizárólag a Lolit platformon belül zajlik." },
      { q: "Mennyi a szállítási díj?", a: "A szállítási díj a választott módtól függ: Lolit Foxpost (csomagautomata): 990–1290 Ft, Lolit GLS (házhoz): 1590 Ft, Lolit Magyar Posta: 890–1190 Ft. Személyes átvétel esetén nincs szállítási díj." },
      { q: "Meddig tart a szállítás?", a: "Általában 1–3 munkanap, szállítási módtól függően. Az eladónak 3 napja van feladni a csomagot az eladás után." },
    ],
  },
  {
    title: "Eladás",
    icon: "📦",
    items: [
      { q: "Hogyan adhatok el egy terméket?", a: "Kattints az alsó sávban a + (Hirdet) ikonra, töltsd fel a képeket, add meg az alapadatokat (cím, leírás, állapot, kategória), a részleteket (márka, méret, szín), majd állítsd be az árat és a szállítási módot." },
      { q: "Milyen állapotokat adhatok meg?", a: "'Mintha új lenne' – tökéletes állapot, szinte nem használt. 'Jó állapotú' – enyhén viselt, jó állapotban. 'Használt' – látható jelei vannak a használatnak. 'Használható' – apró hibák lehetnek, de funkcionálisan működik." },
      { q: "Hogyan emelhetem ki a termékem? (Lolit Top)", a: "A termék feladása után lehetőséged van Lolit Top kiemelésre: 1 nap 199 Ft, 7 nap 990 Ft. A kiemelt termékek jobban láthatók a keresési találatok és a hírfolyam között." },
      { q: "Mikor kapok ingyenes szállítást?", a: "Minden 10 sikeres eladás után 1 ingyenes szállítási lehetőséget kapsz (S méretű csomagnál). A számlálót a profilodban tudod követni." },
    ],
  },
  {
    title: "Szállítás",
    icon: "🚚",
    items: [
      { q: "Milyen szállítási módok vannak?", a: "Lolit Foxpost (csomagautomata), Lolit GLS (házhoz szállítás), Lolit Magyar Posta (postai feladás) és személyes átvétel." },
      { q: "Hogyan adom fel a csomagot?", a: "Az eladás visszaigazolása után e-mailben küldjük a feladólapot és az utasításokat. 3 napod van feladni a csomagot, különben az eladás automatikusan törlődik." },
      { q: "Hogyan követem a csomagom?", a: "A Profil → Korábbi megrendeléseim menüben megtalálod a rendelés állapotát és a nyomkövetési számot (ha van)." },
    ],
  },
  {
    title: "Egyéb",
    icon: "❓",
    items: [
      { q: "Mi az Ilolit vevővédelem?", a: "Az Ilolit az összes vásárlásra vonatkozó vevővédelmi program. Ha a termék nem felel meg a leírásnak, vagy nem érkezik meg, az Ilolit segítségével visszakapod a pénzed." },
      { q: "Van visszamondási lehetőség?", a: "Igen! A vásárlástól számított 1 órán belül visszamondhatod a rendelést. Ezt a Korábbi megrendeléseim fülön tudod megtenni. 1 óra elteltével a tranzakció végleges." },
      { q: "Hogyan működik a Hirdetésfigyelő?", a: "A Profil → Hirdetésfigyelő fülön beállíthatod, hogy milyen termékre keresel (kategória, kulcsszó, ár, méret). Amint valaki ilyet tölt fel, azonnal értesítünk." },
      { q: "Hogyan jelenthetek egy problémás felhasználót?", a: "Minden profiloldalon és termékoldalon találsz egy 'Jelentés' gombot. A bejelentéseket 24 órán belül kivizsgáljuk." },
    ],
  },
];

function FAQItem({ q, a }: FAQItem) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-border last:border-0">
      <button
        type="button"
        className="w-full flex items-center justify-between py-4 text-left gap-4 hover:text-primary transition-colors"
        onClick={() => setOpen((o) => !o)}
      >
        <span className="font-medium text-sm">{q}</span>
        {open ? <ChevronUp className="w-4 h-4 flex-shrink-0 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 flex-shrink-0 text-muted-foreground" />}
      </button>
      {open && (
        <p className="text-sm text-muted-foreground pb-4 leading-relaxed">{a}</p>
      )}
    </div>
  );
}

export function FAQ() {
  return (
    <Layout>
      <div className="container mx-auto px-4 py-10 max-w-3xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Gyakran ismételt kérdések</h1>
          <p className="text-muted-foreground">Megválaszoljuk a leggyakoribb kérdéseket a Lolit használatával kapcsolatban.</p>
        </div>

        <div className="space-y-6">
          {FAQ_SECTIONS.map((section) => (
            <div key={section.title} className="bg-card border border-border rounded-2xl p-6">
              <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
                <span>{section.icon}</span>
                {section.title}
              </h2>
              <div>
                {section.items.map((item) => (
                  <FAQItem key={item.q} {...item} />
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-10 p-6 bg-primary/5 border border-primary/20 rounded-2xl text-center">
          <p className="font-semibold mb-1">Nem találtad meg a választ?</p>
          <p className="text-sm text-muted-foreground">Írj nekünk az üzenetrendszeren keresztül, és hamarosan válaszolunk!</p>
        </div>
      </div>
    </Layout>
  );
}
