import { useState } from "react";
import { Car, Calendar, ShieldCheck, CheckCircle2, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TestDriveRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  vehicleTitle: string;
  sellerName?: string;
}

export function TestDriveRequestModal({
  isOpen,
  onClose,
  vehicleTitle,
  sellerName = "Kereskedő partner",
}: TestDriveRequestModalProps) {
  const [preferredDate, setPreferredDate] = useState("");
  const [preferredTime, setPreferredTime] = useState("14:00");
  const [hasValidLicense, setHasValidLicense] = useState(true);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setTimeout(() => {
      // Auto dismiss after success display
    }, 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-6 md:p-8 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-9 h-9 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300 rounded-full flex items-center justify-center transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-emerald-100 dark:bg-emerald-950 text-emerald-600 rounded-2xl">
            <Car className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-black text-slate-900 dark:text-white">
              Tesztvezetést Kérek
            </h3>
            <p className="text-xs text-slate-500 font-medium truncate max-w-xs">
              {vehicleTitle}
            </p>
          </div>
        </div>

        {submitted ? (
          <div className="p-6 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800/60 rounded-3xl text-center space-y-3">
            <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
            <h4 className="text-base font-extrabold text-emerald-800 dark:text-emerald-300">
              Tesztvezetési Igény Rögzítve!
            </h4>
            <p className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">
              A hirdető (<strong>{sellerName}</strong>) megkapta az igényt. Hamarosan visszahív a kapott számon: <strong>{phone}</strong> a tesztvezetés időpontjának véglegesítéséhez!
            </p>
            <Button
              type="button"
              onClick={() => {
                setSubmitted(false);
                onClose();
              }}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl mt-2"
            >
              Rendben
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400">Preferált Dátum</label>
                <input
                  type="date"
                  value={preferredDate}
                  onChange={(e) => setPreferredDate(e.target.value)}
                  className="w-full p-2.5 border rounded-xl text-xs bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-semibold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400">Preferált Idősáv</label>
                <select
                  value={preferredTime}
                  onChange={(e) => setPreferredTime(e.target.value)}
                  className="w-full p-2.5 border rounded-xl text-xs bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-semibold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  <option value="10:00">Délelőtt (10:00)</option>
                  <option value="14:00">Délután (14:00)</option>
                  <option value="16:30">Késő délután (16:30)</option>
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-slate-400">Teljes Név</label>
              <input
                type="text"
                placeholder="Pl. Nagy István"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full p-2.5 border rounded-xl text-xs bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-semibold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400">Telefonszám</label>
                <input
                  type="tel"
                  placeholder="+36 30 123 4567"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full p-2.5 border rounded-xl text-xs bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-semibold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400">E-mail Cím</label>
                <input
                  type="email"
                  placeholder="istvan@example.hu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full p-2.5 border rounded-xl text-xs bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-semibold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  required
                />
              </div>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Rendelkezem érvényes "B" kategóriás jogosítvánnyal</span>
              </div>
              <input
                type="checkbox"
                checked={hasValidLicense}
                onChange={(e) => setHasValidLicense(e.target.checked)}
                className="w-4 h-4 accent-emerald-600 rounded cursor-pointer"
                required
              />
            </div>

            <Button
              type="submit"
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-2xl py-3 shadow-md shadow-emerald-600/30 mt-2"
            >
              Tesztvezetési Igény Elküldése
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
