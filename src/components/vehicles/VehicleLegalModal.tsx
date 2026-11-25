import React, { useState } from "react";
import { ShieldCheck, X, ChevronDown, ChevronUp, Scale } from "lucide-react";

export interface VehicleLegalAcceptPayload {
  declaration1Accepted: boolean;
  declaration2Accepted: boolean;
  legalNoticeViewed: boolean;
}

interface VehicleLegalModalProps {
  open: boolean;
  bookingKind: "VIEWING" | "TEST_DRIVE";
  vehicleTitle: string;
  onCancel: () => void;
  onAccept: (payload: VehicleLegalAcceptPayload) => void;
  submitting?: boolean;
}

export const VehicleLegalModal: React.FC<VehicleLegalModalProps> = ({
  open,
  bookingKind,
  vehicleTitle,
  onCancel,
  onAccept,
  submitting = false,
}) => {
  // Both checkboxes MUST be unchecked by default (#44)
  const [decl1, setDecl1] = useState(false);
  const [decl2, setDecl2] = useState(false);
  const [legalExpanded, setLegalExpanded] = useState(false);

  if (!open) return null;

  const canProceed = decl1 && decl2 && !submitting;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/55 backdrop-blur-[2px] p-3 sm:p-5"
      role="dialog"
      aria-modal="true"
      aria-labelledby="vehicle-legal-modal-title"
    >
      <div className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-slate-200 bg-slate-50 px-5 py-4">
          <div className="space-y-1">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700">
              <ShieldCheck className="h-4 w-4" />
              ILOLIT Járművek · {bookingKind === "TEST_DRIVE" ? "Tesztvezetés" : "Személyes megtekintés"}
            </span>
            <h2 id="vehicle-legal-modal-title" className="text-lg font-black text-slate-950">
              Járműmegtekintési feltételek
            </h2>
            <p className="text-xs text-slate-600">{vehicleTitle}</p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Bezárás"
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-200/70 hover:text-slate-900"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4 text-xs sm:text-sm text-slate-700 leading-relaxed">
          <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p>
              Az ILOLIT a hirdetők és az érdeklődők védelme érdekében a személyes megtekintést ellenőrzött
              telefonszámhoz, hirdetői jóváhagyáshoz és a következő feltételek elfogadásához köti.
            </p>
            <p>
              A megtekintési funkció kizárólag valós vásárlási vagy bérelhető jármű esetében bérlési érdeklődés
              céljából használható.
            </p>
            <p className="font-semibold text-slate-900">
              A hirdető által meg nem engedett közvetítői megbízásszerzés, bizományosi értékesítés felajánlása,
              kéretlen üzletszerzés, marketingtevékenység és szolgáltatásértékesítés tilos.
            </p>
          </div>

          {/* First mandatory checkbox */}
          <label
            className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition ${
              decl1 ? "border-emerald-600 bg-emerald-50/50" : "border-slate-200 bg-white hover:bg-slate-50"
            }`}
          >
            <input
              type="checkbox"
              checked={decl1}
              onChange={(e) => setDecl1(e.target.checked)}
              className="mt-1 h-4 w-4 shrink-0 accent-emerald-600"
            />
            <span className="space-y-1">
              <strong className="block text-xs font-bold uppercase tracking-wide text-slate-900">
                Első kötelező nyilatkozat *
              </strong>
              <span className="block text-xs text-slate-700 leading-relaxed">
                Kijelentem, hogy a jármű megtekintését valós vásárlási vagy bérlési érdeklődés céljából kérem.
                Tudomásul veszem a hirdető kereskedői és közvetítői megkeresésekre vonatkozó rendelkezéseit, és
                kijelentem, hogy a jelen megtekintés során nem járok el a hirdető által meg nem engedett közvetítői,
                bizományosi vagy egyéb üzletszerzési céllal.
              </span>
            </span>
          </label>

          {/* Second mandatory checkbox */}
          <label
            className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition ${
              decl2 ? "border-emerald-600 bg-emerald-50/50" : "border-slate-200 bg-white hover:bg-slate-50"
            }`}
          >
            <input
              type="checkbox"
              checked={decl2}
              onChange={(e) => setDecl2(e.target.checked)}
              className="mt-1 h-4 w-4 shrink-0 accent-emerald-600"
            />
            <span className="space-y-2">
              <strong className="block text-xs font-bold uppercase tracking-wide text-slate-900">
                Második kötelező nyilatkozat *
              </strong>
              <span className="block text-xs text-slate-700 leading-relaxed">
                Tudomásul veszem, hogy a valótlan nyilatkozat, a megtekintési funkció rendeltetésellenes használata, a
                megtévesztő kapcsolatfelvétel vagy a megismert személyes adatok jogellenes felhasználása az
                ILOLIT-fiókom korlátozását, felfüggesztését, illetve súlyos vagy ismétlődő visszaélés esetén a
                platformról történő végleges kizárásomat eredményezheti.
              </span>
              <span className="block text-xs text-slate-700 leading-relaxed">
                Tudomásul veszem továbbá, hogy a tanúsított magatartás a jogszabályi feltételek fennállása esetén
                polgári jogi, adatvédelmi, reklámjogi vagy más hatósági jogkövetkezménnyel járhat, továbbá valamely
                bűncselekmény törvényi tényállásának megvalósítása esetén büntetőjogi felelősséget is megalapozhat.
              </span>
            </span>
          </label>

          {/* Expandable detailed legal notice */}
          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
            <button
              type="button"
              onClick={() => setLegalExpanded((v) => !v)}
              className="flex w-full items-center justify-between px-4 py-3 text-left text-xs font-bold text-slate-900 hover:bg-slate-50"
            >
              <span className="flex items-center gap-2">
                <Scale className="h-4 w-4 text-emerald-700" />
                Részletes jogi tájékoztatás
              </span>
              {legalExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
            {legalExpanded && (
              <div className="space-y-2 border-t border-slate-100 px-4 py-3 text-xs text-slate-600 leading-relaxed">
                <p>
                  A megtekintési folyamat során megismert személyes adatok kizárólag megfelelő jogalapon, meghatározott
                  és jogszerű célból kezelhetők.
                </p>
                <p className="font-semibold text-slate-800">Különösen irányadó:</p>
                <ul className="list-disc space-y-1 pl-5">
                  <li>GDPR 5. cikk: az adatkezelés alapelvei és célhoz kötöttség;</li>
                  <li>GDPR 6. cikk: az adatkezelés jogszerűsége;</li>
                  <li>GDPR 21. cikk: tiltakozás a közvetlen üzletszerzés céljából történő adatkezeléssel szemben;</li>
                  <li>Ptk. 2:42–2:43. §: személyiségi jogok védelme;</li>
                  <li>2008. évi XLVIII. törvény: a közvetlen üzletszerzésre vonatkozó alkalmazandó rendelkezések.</li>
                </ul>
                <p className="font-medium text-slate-800">
                  A nyilatkozat elfogadása nem jelent marketingcélú adatkezelési hozzájárulást.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2.5 border-t border-slate-200 bg-slate-50 px-5 py-3.5">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100"
          >
            Mégsem
          </button>
          <button
            type="button"
            disabled={!canProceed}
            onClick={() =>
              onAccept({
                declaration1Accepted: decl1,
                declaration2Accepted: decl2,
                legalNoticeViewed: legalExpanded,
              })
            }
            className="rounded-xl bg-emerald-600 px-5 py-2 text-xs font-bold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-45"
          >
            {submitting ? "Küldés..." : "Elfogadom és továbblépek"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default VehicleLegalModal;
