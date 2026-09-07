import { useState } from "react";
import { Handshake, CheckCircle2, XCircle, ArrowRightLeft, X, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

interface OfferModalProps {
  isOpen: boolean;
  onClose: () => void;
  productTitle: string;
  originalPriceNum: number;
  sellerName?: string;
}

export function OfferModal({
  isOpen,
  onClose,
  productTitle,
  originalPriceNum,
  sellerName = "Eladó",
}: OfferModalProps) {
  const [offerPrice, setOfferPrice] = useState<number>(Math.round(originalPriceNum * 0.9));
  const [note, setNote] = useState("");
  const [status, setStatus] = useState<"idle" | "sent" | "accepted" | "counter" | "declined">("idle");
  const [counterPrice, setCounterPrice] = useState<number>(0);

  if (!isOpen) return null;

  const handleSendOffer = (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("sent");

    // Simulate seller reaction logic after 1.5 seconds
    setTimeout(() => {
      const ratio = offerPrice / originalPriceNum;
      if (ratio >= 0.88) {
        setStatus("accepted");
      } else if (ratio >= 0.7) {
        setCounterPrice(Math.round((originalPriceNum + offerPrice) / 2));
        setStatus("counter");
      } else {
        setStatus("declined");
      }
    }, 1500);
  };

  const resetModal = () => {
    setStatus("idle");
    setNote("");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-6 md:p-8 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
        <button
          onClick={resetModal}
          className="absolute top-4 right-4 w-9 h-9 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300 rounded-full flex items-center justify-center transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-amber-100 dark:bg-amber-950 text-amber-600 rounded-2xl">
            <Handshake className="w-6 h-6" />
          </div>
          <div>
            <div className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-amber-600">
              <Sparkles className="w-3 h-3" /> Alkuképes Hirdetés
            </div>
            <h3 className="text-lg font-black text-slate-900 dark:text-white">
              Ajánlattétel / Alkudozás
            </h3>
            <p className="text-xs text-slate-500 font-medium truncate max-w-xs">
              {productTitle}
            </p>
          </div>
        </div>

        {status === "sent" ? (
          <div className="py-12 text-center space-y-3">
            <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <h4 className="font-extrabold text-slate-800 dark:text-slate-200 text-sm">
              Ajánlat küldése az eladónak ({sellerName})...
            </h4>
            <p className="text-xs text-slate-400">Az eladó döntésének szimulációja folyamatban...</p>
          </div>
        ) : status === "accepted" ? (
          <div className="p-6 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800/60 rounded-3xl text-center space-y-3">
            <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
            <span className="inline-block px-3 py-1 bg-emerald-600 text-white font-black text-xs rounded-full">
              Elfogadom ✓
            </span>
            <h4 className="text-lg font-black text-emerald-900 dark:text-emerald-300">
              Az eladó ELFOGADTA az ajánlatodat!
            </h4>
            <p className="text-xs text-emerald-700 dark:text-emerald-400 font-semibold">
              Elfogadott ár: <strong>{offerPrice.toLocaleString()} Ft</strong> (eredeti ár: {originalPriceNum.toLocaleString()} Ft).
            </p>
            <Button
              type="button"
              onClick={resetModal}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl mt-2 w-full"
            >
              Tovább a megrendeléshez ezen az áron
            </Button>
          </div>
        ) : status === "counter" ? (
          <div className="p-6 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800/60 rounded-3xl text-center space-y-3">
            <ArrowRightLeft className="w-12 h-12 text-amber-600 mx-auto" />
            <span className="inline-block px-3 py-1 bg-amber-500 text-white font-black text-xs rounded-full">
              Ellenajánlat ↔
            </span>
            <h4 className="text-lg font-black text-amber-900 dark:text-amber-300">
              Az eladó ellenajánlatot tett!
            </h4>
            <p className="text-xs text-amber-700 dark:text-amber-400 font-medium">
              Te ajánlatod: {offerPrice.toLocaleString()} Ft • Eladó ellenajánlata: <strong className="text-sm font-black underline">{counterPrice.toLocaleString()} Ft</strong>.
            </p>
            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={resetModal}
                className="flex-1 rounded-xl text-xs font-bold"
              >
                Elutasítom
              </Button>
              <Button
                type="button"
                onClick={resetModal}
                className="flex-1 bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs rounded-xl"
              >
                Elfogadom az ellenajánlatot
              </Button>
            </div>
          </div>
        ) : status === "declined" ? (
          <div className="p-6 bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800/60 rounded-3xl text-center space-y-3">
            <XCircle className="w-12 h-12 text-rose-600 mx-auto" />
            <span className="inline-block px-3 py-1 bg-rose-600 text-white font-black text-xs rounded-full">
              Elutasítom ✕
            </span>
            <h4 className="text-lg font-black text-rose-900 dark:text-rose-300">
              Az eladó elutasította az ajánlatodat
            </h4>
            <p className="text-xs text-rose-700 dark:text-rose-400 font-medium">
              Az általad megadott {offerPrice.toLocaleString()} Ft túlságosan alacsony az eredeti {originalPriceNum.toLocaleString()} Ft-os árhoz képest.
            </p>
            <Button
              type="button"
              onClick={() => setStatus("idle")}
              className="bg-slate-800 hover:bg-slate-900 text-white font-extrabold text-xs rounded-xl mt-2 w-full"
            >
              Új ajánlat megadása
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSendOffer} className="space-y-5">
            <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500">Eredeti Kiírási Ár:</span>
              <span className="text-base font-black text-slate-800 dark:text-slate-200">
                {originalPriceNum.toLocaleString()} Ft
              </span>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs font-black text-slate-700 dark:text-slate-300">
                <span>Vevői Ajánlatod (Ft)</span>
                <span className="text-amber-600 font-extrabold text-sm">
                  {offerPrice.toLocaleString()} Ft
                </span>
              </div>
              <input
                type="number"
                min={Math.round(originalPriceNum * 0.4)}
                max={originalPriceNum}
                step={500}
                value={offerPrice}
                onChange={(e) => setOfferPrice(Number(e.target.value))}
                className="w-full p-3 border rounded-xl text-base font-black bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                required
              />
              <p className="text-[10px] text-slate-400 font-medium">
                Kedvezmény mértéke: ~{Math.round((1 - offerPrice / originalPriceNum) * 100)}% engedmény
              </p>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-slate-400">Üzenet az eladónak (Opcionális)</label>
              <textarea
                placeholder="Pl. Amennyiben ma át tudom venni, tartom ezt az ajánlatot!..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
                className="w-full p-3 border rounded-xl text-xs bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>

            <Button
              type="submit"
              className="w-full bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs rounded-2xl py-3 shadow-md shadow-amber-500/25"
            >
              Ajánlat Elküldése ({offerPrice.toLocaleString()} Ft)
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
