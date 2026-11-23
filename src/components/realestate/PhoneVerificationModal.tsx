import { useEffect, useState } from "react";
import { CheckCircle2, Loader2, Phone, ShieldCheck, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { realEstateApi } from "@/lib/realEstate/api";
import type { PhoneVerificationStatus } from "@/lib/realEstate/types";

interface PhoneVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVerified: (status: PhoneVerificationStatus) => void;
}

export function PhoneVerificationModal({
  isOpen,
  onClose,
  onVerified,
}: PhoneVerificationModalProps) {
  const [step, setStep] = useState<"phone" | "otp" | "done">("phone");
  const [phone, setPhone] = useState("+36 ");
  const [code, setCode] = useState("");
  const [masked, setMasked] = useState("");
  const [previewCode, setPreviewCode] = useState<string | undefined>(undefined);
  const [infoMessage, setInfoMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  if (!isOpen) return null;

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const res = await realEstateApi.sendPhoneOtp(phone);
      setMasked(res.phoneMasked);
      setPreviewCode(res.verificationPreviewCode);
      setInfoMessage(res.message);
      setCooldown(60);
      setStep("otp");
    } catch (err: any) {
      setError(err?.message || "Nem sikerült elküldeni az ellenőrző kódot.");
    } finally {
      setBusy(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const status = await realEstateApi.verifyPhoneOtp(code);
      setStep("done");
      onVerified(status);
    } catch (err: any) {
      setError(err?.message || "Hibás vagy lejárt kód.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
      <div className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          aria-label="Bezárás"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700">
            <Phone className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-950">Telefonszám ellenőrzése</h2>
            <p className="text-xs text-slate-500">SMS OTP megerősítés megtekintési kérelemhez</p>
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-xs leading-relaxed text-slate-600">
          <p className="flex items-start gap-2">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
            <span>
              A megtekintési időpontot ellenőrzött telefonszámmal rendelkező felhasználók kérhetik. Az ellenőrzött
              elérhetőség növeli a megtekintések biztonságát.
            </span>
          </p>
        </div>

        {step === "phone" && (
          <form onSubmit={handleSendOtp} className="mt-5 space-y-4">
            <label className="block text-xs font-bold text-slate-700">
              Mobiltelefonszám
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+36 30 123 4567"
                required
                className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-900 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/15"
              />
            </label>
            {error && <p className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700">{error}</p>}
            <Button
              type="submit"
              disabled={busy}
              className="h-11 w-full rounded-xl bg-emerald-600 font-bold text-white hover:bg-emerald-700"
            >
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              SMS ellenőrző kód küldése
            </Button>
          </form>
        )}

        {step === "otp" && (
          <form onSubmit={handleVerifyOtp} className="mt-5 space-y-4">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3 text-xs text-emerald-900">
              <p className="font-semibold">{infoMessage}</p>
              <p className="mt-1 text-emerald-800">Telefonszám: {masked}</p>
              {previewCode && (
                <p className="mt-2 rounded-lg border border-emerald-300 bg-white px-2.5 py-1.5 font-mono text-sm font-bold tracking-widest text-emerald-800">
                  Ellenőrző kód: {previewCode}
                </p>
              )}
            </div>

            <label className="block text-xs font-bold text-slate-700">
              6 jegyű megerősítő kód
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="123456"
                required
                className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-center font-mono text-lg font-bold tracking-[0.35em] text-slate-950 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/15"
              />
            </label>

            {error && <p className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700">{error}</p>}

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep("phone")}
                disabled={busy}
                className="rounded-xl border-slate-300 text-xs font-bold"
              >
                Szám módosítása
              </Button>
              <Button
                type="submit"
                disabled={busy || code.length !== 6}
                className="h-11 flex-1 rounded-xl bg-emerald-600 font-bold text-white hover:bg-emerald-700"
              >
                {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Kód megerősítése
              </Button>
            </div>

            <div className="text-center">
              <button
                type="button"
                disabled={cooldown > 0 || busy}
                onClick={handleSendOtp}
                className="text-xs font-semibold text-emerald-700 hover:underline disabled:text-slate-400"
              >
                {cooldown > 0 ? `Új kód kérhető ${cooldown} mp múlva` : "Új kód küldése"}
              </button>
            </div>
          </form>
        )}

        {step === "done" && (
          <div className="mt-5 space-y-4 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-950">Telefonszámod sikeresen igazolva</h3>
              <p className="mt-1 text-xs text-slate-600">
                Most már küldhetsz megtekintési kérelmet az ingatlanok szabad időpontjaira.
              </p>
            </div>
            <Button
              type="button"
              onClick={onClose}
              className="h-11 w-full rounded-xl bg-emerald-600 font-bold text-white hover:bg-emerald-700"
            >
              Folytatás a megtekintéshez
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
