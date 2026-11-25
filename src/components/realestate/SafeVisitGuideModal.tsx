import React, { useState } from "react";
import {
  ShieldCheck,
  X,
  ChevronDown,
  ChevronUp,
  UserCheck,
  IdCard,
  ShieldOff,
  Lock,
  AlertTriangle,
  CheckCircle2,
  Scale,
} from "lucide-react";

interface GuideChapter {
  id: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  content: React.ReactNode;
}

const GUIDE_CHAPTERS: GuideChapter[] = [
  {
    id: "what-to-ask",
    title: "1. Mit kérhetsz az érdeklődőtől?",
    icon: UserCheck,
    content: (
      <div className="space-y-2.5 text-sm text-slate-700 leading-relaxed">
        <p>Magánhirdetőként előre meghatározhatod a megtekintés feltételeit. Kérheted például:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>a teljes név megadását;</li>
          <li>az ellenőrzött telefonszámon keresztüli időpontfoglalást;</li>
          <li>az érkezők és kísérők létszámának előzetes megadását;</li>
          <li>az ILOLIT rendszerben generált egyedi megtekintési kód bemutatását;</li>
          <li>érkezéskor érvényes fényképes igazolvány bemutatását szemrevételezés céljából.</li>
        </ul>
        <p className="text-slate-600">
          Fontos, hogy ezeket a feltételeket előre, egyértelműen jelezd az érdeklődők felé. Az ILOLIT ebben beépített
          megtekintési beállításokkal segít.
        </p>
      </div>
    ),
  },
  {
    id: "how-to-check-id",
    title: "2. Hogyan ellenőrizheted a személyazonosságát?",
    icon: IdCard,
    content: (
      <div className="space-y-2.5 text-sm text-slate-700 leading-relaxed">
        <p>
          Ha a hirdetésedben előre jelezted, érkezéskor kérheted, hogy az érdeklődő személyazonosságának igazolása
          érdekében mutasson be egy érvényes fényképes igazolványt.
        </p>
        <p className="font-semibold text-slate-900">Milyen igazolvány bemutatását kérheted?</p>
        <p>Elfogadható például:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>személyazonosító igazolvány;</li>
          <li>útlevél;</li>
          <li>kártyaformátumú vezetői engedély.</li>
        </ul>
        <p>
          Az ellenőrzés célja kizárólag annak megállapítása, hogy valóban a foglalásban szereplő személy érkezett meg.
          Ehhez elegendő a fénykép és a név szemrevételezéses összevetése.
        </p>
      </div>
    ),
  },
  {
    id: "when-to-refuse",
    title: "3. Mikor tagadhatod meg a belépést?",
    icon: ShieldOff,
    content: (
      <div className="space-y-2.5 text-sm text-slate-700 leading-relaxed">
        <p>Magánterületre senki nem köteles beengedni olyan személyt, akiben nem bízik.</p>
        <p>Jogod van megtagadni a belépést vagy megszakítani a megtekintést különösen akkor, ha:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>az érdeklődő nem tudja bemutatni a megtekintési kódját;</li>
          <li>az előzetesen közölt feltétel ellenére nem mutat be érvényes fényképes igazolványt;</li>
          <li>a bemutatott igazolványon szereplő név vagy arckép nem egyezik a megjelent személlyel;</li>
          <li>előzetesen nem egyeztetett személyek érkeznek;</li>
          <li>a helyszínen kiderül, hogy ingatlanközvetítőként vagy üzletszerzési céllal érkezett;</li>
          <li>az érkező viselkedése bizalmatlanságot kelt vagy biztonsági aggályt vet fel.</li>
        </ul>
        <p className="font-medium text-slate-800">
          Nem vagy köteles indokolni, ha úgy döntesz, hogy nem engeded be az ingatlanba.
        </p>
      </div>
    ),
  },
  {
    id: "privacy-donts",
    title: "4. Mit ne tegyél adatvédelmi szempontból?",
    icon: Lock,
    content: (
      <div className="space-y-2.5 text-sm text-slate-700 leading-relaxed">
        <p>
          Az érdeklődők személyes adatainak védelme érdekében tartsd be az alábbi szabályokat:
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Ne fotózd le az igazolványt!</li>
          <li>Ne készíts róla másolatot!</li>
          <li>Ne kérd el az igazolvány számát, a születési adatokat, az anyja nevét vagy a lakcímet!</li>
          <li>Ne kérd előre, e-mailben vagy üzenetben az igazolvány képének elküldését!</li>
          <li>Ne tárolj okmányadatokat a telefonodon, számítógépeden vagy papíron!</li>
        </ul>
        <div className="rounded-lg bg-slate-50 border border-slate-200 px-3 py-2 text-xs text-slate-700">
          Az ILOLIT kizárólag a helyszíni, szemrevételezéses ellenőrzést támogatja. A rendszer nem kér és nem tárol
          igazolványképet vagy okmányszámot.
        </div>
      </div>
    ),
  },
  {
    id: "unwanted-agents",
    title: "5. Mit tehetsz kéretlen ingatlanközvetítői megkeresés esetén?",
    icon: AlertTriangle,
    content: (
      <div className="space-y-2.5 text-sm text-slate-700 leading-relaxed">
        <p>
          Ha megjelölted, hogy nem kérsz ingatlanközvetítői megkeresést, akkor az érdeklődő a foglalás előtt külön
          nyilatkozatban vállalta, hogy nem közvetítői vagy üzletszerzési céllal érkezik.
        </p>
        <p>Ha ennek ellenére mégis ingatlanközvetítőként próbál kapcsolatba lépni veled vagy megbízást szerezni:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>udvariasan, de határozottan szakítsd meg a megtekintést vagy ne engedd be az ingatlanba;</li>
          <li>jelentsd az esetet az ILOLIT felületén a „Visszaélés jelentése” funkcióval;</li>
          <li>szükség esetén blokkold a felhasználót a fiókodban.</li>
        </ul>
        <p className="text-slate-600">
          A bejelentett visszaéléseket az ILOLIT kivizsgálja, és megalapozott esetben a szabályzat megsértése miatt a
          felhasználót korlátozhatja vagy véglegesen kizárhatja a platformról.
        </p>
      </div>
    ),
  },
  {
    id: "extra-tips",
    title: "6. További biztonsági tanácsok",
    icon: CheckCircle2,
    content: (
      <div className="space-y-2.5 text-sm text-slate-700 leading-relaxed">
        <ul className="list-disc pl-5 space-y-1">
          <li>Lehetőség szerint ne egyedül mutasd meg az ingatlant, kérj meg családtagot vagy ismerőst, hogy legyen jelen.</li>
          <li>Értesíts valakit arról, mikor érkezik érdeklődő.</li>
          <li>A megtekintés előtt tedd el láthatatlan helyre az értéktárgyakat, iratokat, kulcsokat és személyes dokumentumokat.</li>
          <li>A megtekintés során maradj az érdeklődővel együtt, ne hagyd felügyelet nélkül a helyiségekben.</li>
          <li>Az egyeztetéseket lehetőség szerint az ILOLIT rendszerén belül folytasd, így minden időpont és visszaigazolás visszakereshető marad.</li>
        </ul>
      </div>
    ),
  },
  {
    id: "legal-background",
    title: "7. Jogi és adatvédelmi háttér",
    icon: Scale,
    content: (
      <div className="space-y-2.5 text-sm text-slate-700 leading-relaxed">
        <p>
          Az ingatlan személyes megtekintésének feltételeit a tulajdonos vagy jogosult hirdető határozza meg. A
          személyazonosság helyszíni ellenőrzése önkéntes alapon, előzetes tájékoztatás mellett történhet. Az
          érdeklődő nem köteles bemutatni az igazolványát, ugyanakkor a hirdető sem köteles biztosítani a belépést.
        </p>
        <p>
          Az ILOLIT kizárólag a foglalási folyamatot, a visszaigazolást, az egyedi megtekintési kód kiállítását és a
          visszaélések bejelentését biztosítja. A helyszíni ellenőrzésért és a belépés engedélyezéséért minden esetben
          a hirdető felel.
        </p>
        <p className="text-slate-600">
          Az adatkezelés az adatminimalizálás elve szerint történik. A rendszer nem tárol fényképes igazolványokról
          készült másolatokat vagy okmányadatokat.
        </p>
      </div>
    ),
  },
];

export const SafeVisitGuideContent: React.FC<{ defaultOpenAll?: boolean }> = ({ defaultOpenAll = false }) => {
  const [openIds, setOpenIds] = useState<Set<string>>(
    () => new Set(defaultOpenAll ? GUIDE_CHAPTERS.map((c) => c.id) : ["what-to-ask", "how-to-check-id"]),
  );

  const toggle = (id: string) => {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const allOpen = openIds.size === GUIDE_CHAPTERS.length;

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 space-y-2">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-700 shrink-0" />
            <h3 className="text-base font-bold text-slate-900">
              ILOLIT SafeVisit – Hirdetői biztonsági kisokos
            </h3>
          </div>
          <span className="text-[11px] font-semibold uppercase tracking-wide px-2.5 py-0.5 rounded-full bg-white text-emerald-800 border border-emerald-200">
            Alapdíj része · Külön díj nélkül
          </span>
        </div>
        <p className="text-sm font-semibold text-slate-900">Te döntöd el, kit engedsz be az ingatlanodba.</p>
        <p className="text-sm text-slate-700 leading-relaxed">
          Az ingatlan személyes megtekintése bizalmi helyzet. Tulajdonosként, illetve az ingatlan használatára jogosult
          személyként személy- és vagyonbiztonsági okokból észszerű, jogszerű és előzetesen közölt feltételekhez
          kötheted a személyes megtekintést.
        </p>
        <p className="text-sm text-slate-700 leading-relaxed">
          Az ILOLIT az ellenőrzött elérhetőség, a kötelező érdeklődői nyilatkozat, a hirdetői jóváhagyás és az egyedi
          megtekintési kód segítségével támogatja a biztonságosabb ingatlanmegtekintést.
        </p>
        <p className="text-xs font-medium text-emerald-900 pt-1">
          Ellenőrzött elérhetőség. Hirdetői jóváhagyás. Visszaélés elleni védelem.
        </p>
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={() =>
            setOpenIds(allOpen ? new Set() : new Set(GUIDE_CHAPTERS.map((c) => c.id)))
          }
          className="text-xs font-medium text-slate-600 hover:text-slate-900 underline underline-offset-2"
        >
          {allOpen ? "Összes fejezet bezárása" : "Összes fejezet megnyitása"}
        </button>
      </div>

      <div className="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white overflow-hidden">
        {GUIDE_CHAPTERS.map((ch) => {
          const Icon = ch.icon;
          const isOpen = openIds.has(ch.id);
          return (
            <div key={ch.id}>
              <button
                type="button"
                onClick={() => toggle(ch.id)}
                className="w-full flex items-center justify-between gap-3 px-4 py-3.5 text-left hover:bg-slate-50 transition-colors"
                aria-expanded={isOpen}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Icon className="w-4 h-4 text-emerald-700 shrink-0" />
                  <span className="text-sm font-semibold text-slate-900">{ch.title}</span>
                </div>
                {isOpen ? (
                  <ChevronUp className="w-4 h-4 text-slate-500 shrink-0" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-500 shrink-0" />
                )}
              </button>
              {isOpen && <div className="px-4 pb-4 pt-1 border-t border-slate-100">{ch.content}</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
};

interface SafeVisitGuideModalProps {
  open: boolean;
  onClose: () => void;
  onOpenSettings?: () => void;
}

export const SafeVisitGuideModal: React.FC<SafeVisitGuideModalProps> = ({
  open,
  onClose,
  onOpenSettings,
}) => {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/55 backdrop-blur-[2px] p-3 sm:p-5"
      role="dialog"
      aria-modal="true"
      aria-labelledby="safevisit-guide-modal-title"
    >
      <div className="relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl bg-white border border-slate-200 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 px-5 py-4 border-b border-slate-200 bg-slate-50">
          <div className="space-y-1 pr-4">
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
              <ShieldCheck className="w-4 h-4" />
              ILOLIT SafeVisit – Biztonságosabb ingatlanmegtekintés
            </div>
            <h2 id="safevisit-guide-modal-title" className="text-lg sm:text-xl font-bold text-slate-900">
              Hirdetésed sikeresen megjelent!
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Az ingatlanod védelme számunkra is fontos. Ismerd meg, milyen lehetőségeid vannak a személyes
              megtekintések biztonságosabb lebonyolítására és a kéretlen ingatlanközvetítői megkeresések kezelésére.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Bezárás"
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-200/70 transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto px-5 py-4 flex-1">
          <SafeVisitGuideContent />
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
          <p className="text-xs text-slate-500">
            A kisokost bármikor újra megnyithatod a „Biztonság és megtekintési feltételek” menüpontban.
          </p>
          <div className="flex items-center gap-2 shrink-0">
            {onOpenSettings && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenSettings();
                }}
                className="px-3.5 py-2 rounded-lg text-xs font-semibold border border-slate-300 bg-white text-slate-800 hover:bg-slate-100 transition-colors"
              >
                Biztonsági beállítások
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
            >
              Megértettem
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SafeVisitGuideModal;
