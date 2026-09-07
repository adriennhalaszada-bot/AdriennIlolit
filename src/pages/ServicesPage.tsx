import { Layout } from "@/components/layout/Layout";
import { useState } from "react";
import { UnifiedModuleHeader } from "@/components/shared/UnifiedModuleHeader";
import { Button } from "@/components/ui/button";
import {
  Wrench, Building, Heart, Car, Cpu, Scale, Truck, BookOpen,
  DollarSign, Shield, Sparkles, Check, ChevronDown, ChevronUp, Search
} from "lucide-react";

const RAW_SERVICES = [
  {
    category: "Acél- és fémipar",
    icon: Wrench,
    items: [
      { title: "Acél- és lakatos", desc: "fém szerkezetek, korlátok, kapuk" },
      { title: "Csiszoló", desc: "fémfelületek megmunkálása" },
      { title: "Hegesztő", desc: "vasszerkezet, alumínium, rozsdamentes hegesztés" },
      { title: "Késes", desc: "kések, ollók élezése, javítása" },
      { title: "Kovács", desc: "díszkovácsolás, kapuk, kerítések" },
      { title: "Lakatos", desc: "biztonsági zárak, rácsok, rosta" },
    ]
  },
  {
    category: "Építőipar & Felújítás",
    icon: Building,
    items: [
      { title: "Ács & Tetőfedő", desc: "tetőszerkezet, fa szerkezetek, cserépfedés" },
      { title: "Bádogos", desc: "ereszcsatorna, lemezfedés" },
      { title: "Burkoló", desc: "csempe, járólap, kőlap rakása" },
      { title: "Festő-mázoló", desc: "falak és mennyezetek festése" },
      { title: "Fűtésszerelő & Gázszerelő", desc: "radiátor, kazán, padlófűtés" },
      { title: "Kőműves", desc: "falazás, téglázás, válaszfalak" },
      { title: "Villanyszerelő", desc: "elektromos hálózat, biztosítéktábla" },
      { title: "Vízvezeték-szerelő", desc: "csövek, csaptelepek, szerelvények" }
    ]
  },
  {
    category: "Bútor- és faipar",
    icon: Wrench,
    items: [
      { title: "Asztalos", desc: "egyedi bútorok, szekrények, konyhabútor" },
      { title: "Bútorösszeszerelő", desc: "konyha, gardrób összeszerelése" },
      { title: "Kárpitozó", desc: "kanapé, szék, autóülés újrahúzása" },
      { title: "Lépcsőgyártó", desc: "fa- és kombinált lépcsők készítése" }
    ]
  },
  {
    category: "Egészségügy & Állatgondozás",
    icon: Heart,
    items: [
      { title: "Állatorvos & Fizioterapeuta", desc: "kisállat, kutya, macska ellátása" },
      { title: "Bőrgyógyász & Allergológus", desc: "szakorvosi vizsgálatok" },
      { title: "Gyógytornász", desc: "rehabilitáció, mozgásterápia" },
      { title: "Kardiológus & Belgyógyász", desc: "szakrendelések és diagnosztika" }
    ]
  },
  {
    category: "IT és digitális szolgáltatások",
    icon: Cpu,
    items: [
      { title: "Weboldal & Webshop fejlesztő", desc: "egyedi honlapok, webáruházak" },
      { title: "Grafikus & Arculattervező", desc: "logó, kiadványok, arculat" },
      { title: "IT Biztonsági szakértő", desc: "hálózatvédelem, vírusirtás" },
      { title: "Fotós & Videós", desc: "rendezvény, termék, esküvői fotózás" }
    ]
  },
  {
    category: "Járműipar & Szerviz",
    icon: Car,
    items: [
      { title: "Autószerelő & Diagnosztika", desc: "motor, futómű, fékek javítása" },
      { title: "Autófényező & Karosszérialakatos", desc: "fényezés, polírozás" },
      { title: "Gumiszerviz", desc: "gumicsere, kerék-kiegyensúlyozás" },
      { title: "Autókozmetika", desc: "belső takarítás, ózonos kezelés" }
    ]
  },
  {
    category: "Jogi & Pénzügyi szolgáltatók",
    icon: Scale,
    items: [
      { title: "Ügyvéd & Jogi tanácsadó", desc: "jogi képviselet, szerződések" },
      { title: "Könyvelő & Adótanácsadó", desc: "könyvelés, adóbevallás" },
      { title: "Közjegyző", desc: "hivatalos okiratok hitelesítése" },
      { title: "Biztosítási tanácsadó", desc: "vagyon- és felelősségbiztosítás" }
    ]
  },
  {
    category: "Logisztika és szállítás",
    icon: Truck,
    items: [
      { title: "Költöztető & Fuvarozó", desc: "bútorok, áruk professzionális mozgatása" },
      { title: "Teherfuvarozó", desc: "építőanyag és gép szállítás" },
      { title: "Lomtalanító", desc: "felesleges tárgyak elszállítása" }
    ]
  }
];

export function ServicesPage() {
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState(true);

  const filteredCategories = RAW_SERVICES.map((cat) => {
    if (!search) return cat;
    const filteredItems = cat.items.filter(
      (item) =>
        item.title.toLowerCase().includes(search.toLowerCase()) ||
        item.desc.toLowerCase().includes(search.toLowerCase()) ||
        cat.category.toLowerCase().includes(search.toLowerCase())
    );
    return { ...cat, items: filteredItems };
  }).filter((cat) => cat.items.length > 0);

  return (
    <Layout>
      <UnifiedModuleHeader
        title="Szolgáltatások Katalógusa"
        subtitle="Böngéssz az ellenőrzött szakemberek és szolgáltatások között, kérj ajánlatot vagy foglalj időpontot közvetlenül."
        moduleKey="services"
        searchPlaceholder="Keresés szakterület vagy szolgáltatás szerint (pl. villanyszerelő, könyvelő, burkoló)"
        searchValue={search}
        onSearchChange={setSearch}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Controls Row */}
        <div className="flex items-center justify-between bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Wrench className="w-4 h-4 text-blue-500" />
            <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Szolgáltatói Szektorok ({filteredCategories.length})
            </span>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setExpanded(!expanded)}
            className="rounded-lg text-xs font-semibold border-slate-200"
          >
            {expanded ? (
              <>
                <ChevronUp className="w-3.5 h-3.5 mr-1" />
                Összecsukás
              </>
            ) : (
              <>
                <ChevronDown className="w-3.5 h-3.5 mr-1" />
                Kibontás
              </>
            )}
          </Button>
        </div>

        {/* Categories Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredCategories.map((cat, idx) => {
            const Icon = cat.icon;
            return (
              <div
                key={idx}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-600 flex items-center justify-center shrink-0 border border-blue-200 dark:border-blue-800">
                        <Icon className="w-4 h-4" />
                      </div>
                      <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                        {cat.category}
                      </h3>
                    </div>
                    <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                      {cat.items.length} szakterület
                    </span>
                  </div>

                  {expanded && (
                    <ul className="space-y-2 pt-1">
                      {cat.items.map((item, itemIdx) => (
                        <li
                          key={itemIdx}
                          className="text-xs text-slate-700 dark:text-slate-300 flex items-start gap-2"
                        >
                          <span className="text-emerald-500 font-bold">✓</span>
                          <div>
                            <span className="font-semibold text-slate-900 dark:text-slate-100">
                              {item.title}
                            </span>
                            <span className="text-slate-500 dark:text-slate-400 block text-[11px]">
                              {item.desc}
                            </span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
                  <Button
                    asChild
                    size="sm"
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-lg py-2"
                  >
                    <a href={`/providers/dashboard`}>Szakemberek böngészése</a>
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Layout>
  );
}

export default ServicesPage;
