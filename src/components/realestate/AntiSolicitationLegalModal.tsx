import { useEffect, useState } from "react";
import { AlertTriangle, ChevronDown, ChevronUp, Loader2, Scale, ShieldAlert, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface LegalDeclarationAcceptPayload {
  declarationPurposeAccepted: boolean;
  declarationOwnerRuleAccepted: boolean;
  declarationLegalConsequencesAccepted: boolean;
  legalNoticeViewed: boolean;
}

interface AntiSolicitationLegalModalProps {
  isOpen: boolean;
  submitting?: boolean;
  onClose: () => void;
  onConfirm: (payload: LegalDeclarationAcceptPayload) => void;
}

export function AntiSolicitationLegalModal({
  isOpen,
  submitting = false,
  onClose,
  onConfirm,
}: AntiSolicitationLegalModalProps) {
  const [checkPurpose, setCheckPurpose] = useState(false);
  const [checkOwnerRule, setCheckOwnerRule] = useState(false);
  const [checkLegalConsequences, setCheckLegalConsequences] = useState(false);
  const [legalExpanded, setLegalExpanded] = useState(false);
  const [legalNoticeViewed, setLegalNoticeViewed] = useState(false);

  // Never pre-check any checkbox: reset cleanly every time the modal opens
  useEffect(() => {
    if (isOpen) {
      setCheckPurpose(false);
      setCheckOwnerRule(false);
      setCheckLegalConsequences(false);
      setLegalExpanded(false);
      setLegalNoticeViewed(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const allChecked = checkPurpose && checkOwnerRule && checkLegalConsequences;

  const handleToggleLegal = () => {
    const next = !legalExpanded;
    setLegalExpanded(next);
    if (next) setLegalNoticeViewed(true);
  };

  const handleConfirm = () => {
    if (!allChecked || submitting) return;
    onConfirm({
      declarationPurposeAccepted: true,
      declarationOwnerRuleAccepted: true,
      declarationLegalConsequencesAccepted: true,
      legalNoticeViewed,
    });
  };

  return (
    <div
      className="fixed inset-0 z-[130] flex items-center justify-center bg-slate-950/60 p-3 backdrop-blur-[2px] sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="ilolit-legal-declaration-title"
    >
      <div className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-rose-200 bg-rose-50/80 px-5 py-4 sm:px-6">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-rose-200 bg-white text-rose-700">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div>
              <h2
                id="ilolit-legal-declaration-title"
                className="text-base font-black tracking-tight text-rose-950 sm:text-lg"
              >
                INGATLANKÖZVETÍTŐI MEGKERESÉS NEM ENGEDÉLYEZETT
              </h2>
              <p className="mt-0.5 text-xs font-semibold text-rose-800">
                A megtekintési kérelem elküldéséhez mindhárom kötelező nyilatkozat elfogadása szükséges.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            aria-label="Ablak bezárása"
            className="rounded-lg p-1.5 text-slate-500 transition hover:bg-white hover:text-slate-900"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Legal Body */}
        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5 text-xs leading-relaxed text-slate-700 sm:px-6 sm:text-sm">
          <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs leading-relaxed text-slate-800 sm:text-[13px]">
            <p className="font-bold text-slate-950">Tisztelt Érdeklődő!</p>
            <p>
              A hirdető kifejezetten úgy rendelkezett, hogy ingatlanközvetítői, ügyfélszerzési vagy egyéb
              üzletszerzési célú megkereséseket nem fogad, és ilyen célból az ingatlanában személyes megtekintést nem
              engedélyez.
            </p>
            <p>Az ILOLIT megtekintési funkciója kizárólag valós vásárlási vagy bérlési szándék esetén használható.</p>
            <p>
              Tilos a megtekintési funkciót ingatlanközvetítői megbízás megszerzésére, közvetítői szolgáltatás
              felajánlására, ügyfélszerzésre, kéretlen üzletszerzésre, marketingtevékenységre vagy egyéb kereskedelmi
              célú kapcsolatfelvételre felhasználni.
            </p>
            <p>
              A valós vásárlási vagy bérlési szándék színlelésével történő időpontfoglalás, valamint az ingatlan ilyen
              módon történő felkeresése az ILOLIT felhasználási feltételeinek súlyos megsértésének minősül.
            </p>
            <p className="rounded-xl border border-rose-200 bg-rose-50/80 p-3 font-bold text-rose-950">
              A valótlan nyilatkozattétel, a hirdető kifejezett rendelkezésének megsértése, valamint a megtekintés
              során megszerzett személyes adatok jogosulatlan üzletszerzési célú felhasználása az ILOLIT platformról
              történő azonnali kizárást, továbbá polgári jogi, adatvédelmi, illetve a törvényi feltételek fennállása esetén
              büntetőjogi következményeket vonhat maga után.
            </p>
          </div>

          {/* 3 Mandatory Separate Checkboxes (#5) */}
          <div className="space-y-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">
              Kötelező nyilatkozatok (mindhárom elfogadása szükséges)
            </h3>

            {/* 1. nyilatkozat */}
            <label
              className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-3.5 transition ${
                checkPurpose
                  ? "border-emerald-500 bg-emerald-50/40"
                  : "border-slate-200 bg-white hover:border-slate-300"
              }`}
            >
              <input
                type="checkbox"
                checked={checkPurpose}
                onChange={(e) => setCheckPurpose(e.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 accent-emerald-600"
              />
              <span className="space-y-1 text-xs leading-relaxed">
                <span className="block text-[11px] font-bold uppercase tracking-wide text-slate-500">
                  Első nyilatkozat – A megtekintés célja *
                </span>
                <span className="block font-bold text-slate-900">
                  Kijelentem, hogy az ingatlan megtekintését kizárólag valós vásárlási vagy bérlési szándékkal kérem,
                  és a jelen megtekintés során nem ingatlanközvetítőként, közvetítői megbízás megszerzése,
                  ügyfélszerzés vagy egyéb üzletszerzési célból járok el.
                </span>
              </span>
            </label>

            {/* 2. nyilatkozat */}
            <label
              className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-3.5 transition ${
                checkOwnerRule
                  ? "border-emerald-500 bg-emerald-50/40"
                  : "border-slate-200 bg-white hover:border-slate-300"
              }`}
            >
              <input
                type="checkbox"
                checked={checkOwnerRule}
                onChange={(e) => setCheckOwnerRule(e.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 accent-emerald-600"
              />
              <span className="space-y-1 text-xs leading-relaxed">
                <span className="block text-[11px] font-bold uppercase tracking-wide text-slate-500">
                  Második nyilatkozat – A hirdető rendelkezésének elfogadása *
                </span>
                <span className="block font-bold text-slate-900">
                  Tudomásul veszem, hogy a hirdető kifejezetten kizárja az ingatlanközvetítői megkereséseket, és ilyen
                  célból az ingatlanában személyes megtekintést nem engedélyez. Vállalom, hogy a hirdető ezen
                  rendelkezését tiszteletben tartom.
                </span>
              </span>
            </label>

            {/* 3. nyilatkozat */}
            <label
              className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-3.5 transition ${
                checkLegalConsequences
                  ? "border-emerald-500 bg-emerald-50/40"
                  : "border-slate-200 bg-white hover:border-slate-300"
              }`}
            >
              <input
                type="checkbox"
                checked={checkLegalConsequences}
                onChange={(e) => setCheckLegalConsequences(e.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 accent-emerald-600"
              />
              <span className="space-y-1 text-xs leading-relaxed">
                <span className="block text-[11px] font-bold uppercase tracking-wide text-slate-500">
                  Harmadik nyilatkozat – Jogi következmények *
                </span>
                <span className="block font-bold text-slate-900">
                  Tudomásul veszem, hogy a valótlan nyilatkozattétel, a hirdető rendelkezésének megsértése, illetve a
                  megtekintési funkció jogosulatlan üzletszerzési célú használata az ILOLIT platformról történő
                  azonnali kizárást, valamint további jogi következményeket vonhat maga után.
                </span>
              </span>
            </label>
          </div>

          {/* Expandable Detailed Legal & Data Protection Notice (#6) */}
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <button
              type="button"
              onClick={handleToggleLegal}
              aria-expanded={legalExpanded}
              className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left text-xs font-bold text-slate-900 transition hover:bg-slate-50"
            >
              <span className="flex items-center gap-2">
                <Scale className="h-4 w-4 text-emerald-700" />
                Jogi és adatvédelmi tájékoztatás
              </span>
              {legalExpanded ? (
                <ChevronUp className="h-4 w-4 text-slate-500" />
              ) : (
                <ChevronDown className="h-4 w-4 text-slate-500" />
              )}
            </button>

            {legalExpanded && (
              <div className="space-y-3 border-t border-slate-200 bg-slate-50/70 p-4 text-xs leading-relaxed text-slate-700">
                <p>
                  Az ingatlanmegtekintési folyamat során megismert személyes adatok – így különösen a hirdető neve,
                  telefonszáma, kapcsolattartási adatai, lakcíme és az ingatlan pontos címe – kizárólag jogszerű célból
                  és megfelelő jogalap fennállása esetén kezelhetők.
                </p>
                <p>
                  Az adatok megismerése nem jelent hozzájárulást azok üzletszerzési, marketing-, ingatlanközvetítői vagy
                  egyéb kereskedelmi célú felhasználásához.
                </p>
                <p className="font-semibold text-slate-900">
                  A személyes adatok kezelésére különösen az alábbi jogszabályok rendelkezései irányadóak:
                </p>
                <ul className="list-disc space-y-1.5 pl-5 text-slate-700">
                  <li>
                    Az Európai Parlament és a Tanács (EU) 2016/679 rendelete (GDPR), különösen az 5. cikk szerinti
                    célhoz kötöttség, a 6. cikk szerinti jogszerű adatkezelés és a 21. cikk szerinti tiltakozási jog.
                  </li>
                  <li>
                    Az információs önrendelkezési jogról és az információszabadságról szóló 2011. évi CXII. törvény
                    (Infotv.).
                  </li>
                  <li>
                    A Polgári Törvénykönyvről szóló 2013. évi V. törvény, különösen a 2:42–2:43. §-ban meghatározott
                    személyiségi jogok, a magánélet, a magánlakás és a személyes adatok védelme.
                  </li>
                  <li>
                    A gazdasági reklámtevékenység alapvető feltételeiről és egyes korlátairól szóló 2008. évi XLVIII.
                    törvény közvetlen üzletszerzésre vonatkozó rendelkezései.
                  </li>
                </ul>
                <p className="font-bold text-slate-900">
                  A fenti szabályok megsértése az eset körülményeitől függően polgári jogi, adatvédelmi, reklámjogi és
                  egyéb hatósági következményeket vonhat maga után. Amennyiben a tanúsított magatartás valamely
                  bűncselekmény törvényi tényállását is megvalósítja, büntetőjogi felelősség megállapítására is sor
                  kerülhet.
                </p>
                <p>
                  Az ILOLIT fenntartja a jogot arra, hogy az ÁSZF-ben meghatározott feltételek szerint a visszaéléseket
                  kivizsgálja, a szabálysértő felhasználó hozzáférését korlátozza, felfüggessze vagy megszüntesse,
                  valamint a dokumentált nyilatkozatokat és naplóadatokat jogszabályi keretek között megőrizze.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer CTA */}
        <div className="flex flex-col-reverse gap-2.5 border-t border-slate-200 bg-slate-50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex items-center gap-2 text-[11px] font-medium text-slate-500">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-slate-400" />
            <span>A nyilatkozat elfogadása időbélyeggel dokumentálásra kerül.</span>
          </div>
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              disabled={submitting}
              onClick={onClose}
              className="h-10 rounded-xl border-slate-300 px-4 text-xs font-bold text-slate-700"
            >
              Mégse
            </Button>
            <Button
              type="button"
              disabled={!allChecked || submitting}
              onClick={handleConfirm}
              className="h-10 rounded-xl bg-emerald-600 px-5 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {submitting ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
              Nyilatkozat elfogadása és kérelem küldése
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
