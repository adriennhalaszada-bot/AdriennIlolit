import { useState } from "react";
import { X, Calendar as CalendarIcon, Clock, Check, ShieldCheck, CreditCard, ArrowLeft, ArrowRight, Sparkles, BellRing, Smartphone, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { formatPrice } from "@/lib/constants";
import { useToast } from "@/hooks/use-toast";

export interface BeautyBookingWizardProps {
  isOpen: boolean;
  onClose: () => void;
  provider: {
    id: string;
    displayName: string;
    address?: string;
    phone?: string;
  };
  service: {
    id: string;
    name: string;
    description?: string;
    price: number;
    durationMinutes: number;
    requiresDeposit?: boolean;
    depositPercentage?: number;
  };
}

export function BeautyBookingWizard({ isOpen, onClose, provider, service }: BeautyBookingWizardProps) {
  const { toast } = useToast();
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);

  // Booking Form State
  const [selectedDate, setSelectedDate] = useState<string>("2026-08-30");
  const [selectedSlot, setSelectedSlot] = useState<string>("14:00 - 16:00");
  const [customerName, setCustomerName] = useState<string>("Kiss János");
  const [customerPhone, setCustomerPhone] = useState<string>("+36 30 123 4567");
  const [customerEmail, setCustomerEmail] = useState<string>("janos.kiss@example.com");
  const [notes, setNotes] = useState<string>("Sötét barna festést szeretnék, természetes kinézetre...");
  const [termsAccepted, setTermsAccepted] = useState<boolean>(true);
  const [paymentMethod, setPaymentMethod] = useState<"card" | "paypal" | "applepay" | "googlepay">("card");

  if (!isOpen) return null;

  const hasDeposit = service.requiresDeposit === true || (service.depositPercentage !== undefined && service.depositPercentage > 0);
  const depositPercent = hasDeposit ? (service.depositPercentage || 50) : 0;
  const depositAmount = hasDeposit ? Math.round((service.price * depositPercent) / 100) : 0;
  const remainingBalance = service.price - depositAmount;

  const availableSlots = [
    { time: "09:00 - 11:00", recommended: false },
    { time: "10:00 - 12:00", recommended: true, tag: "Legközelebbi szabad" },
    { time: "14:00 - 16:00", recommended: false },
    { time: "15:00 - 17:00", recommended: false },
    { time: "16:00 - 18:00", recommended: false },
  ];

  const handleCompleteBooking = () => {
    if (!termsAccepted) {
      toast({ title: "Kérjük fogadd el az Általános Szerződési Feltételeket!", variant: "destructive" });
      return;
    }
    setStep(5); // Success screen
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 border rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="p-5 border-b bg-slate-50 dark:bg-slate-950 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-950 text-emerald-700 flex items-center justify-center font-extrabold text-lg">
              💇
            </div>
            <div>
              <h3 className="font-extrabold text-base text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <span>{provider.displayName}</span>
              </h3>
              <p className="text-xs text-slate-500 font-medium">Időpontfoglalás · {service.name}</p>
            </div>
          </div>

          <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Indicator (Only if step < 5) */}
        {step < 5 && (
          <div className="px-6 py-3 bg-slate-100 dark:bg-slate-800/60 border-b flex items-center justify-between text-xs font-extrabold text-slate-600 dark:text-slate-300">
            <span className={step === 1 ? "text-emerald-600 underline" : ""}>1️⃣ Szolgáltatás</span>
            <span>➔</span>
            <span className={step === 2 ? "text-emerald-600 underline" : ""}>2️⃣ Időpont</span>
            <span>➔</span>
            <span className={step === 3 ? "text-emerald-600 underline" : ""}>3️⃣ Adatok</span>
            <span>➔</span>
            <span className={step === 4 ? "text-emerald-600 underline" : ""}>4️⃣ Fizetés & Zárolás</span>
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* STEP 1: SZOLGÁLTATÁS KIVÁLASZTÁSA */}
          {step === 1 && (
            <div className="space-y-5">
              <div className="text-center space-y-1">
                <Badge className="bg-emerald-100 text-emerald-800 font-extrabold">1. Lépés</Badge>
                <h4 className="text-xl font-black text-slate-900 dark:text-slate-100">Kiválasztott Szolgáltatás</h4>
              </div>

              <div className="p-5 rounded-3xl border-2 border-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/30 space-y-4">
                <div className="flex items-center justify-between">
                  <h5 className="font-black text-lg text-slate-900 dark:text-slate-100">{service.name}</h5>
                  <span className="text-xl font-black text-emerald-600">{formatPrice(service.price)}</span>
                </div>
                {service.description && (
                  <p className="text-xs text-slate-600 dark:text-slate-300">{service.description}</p>
                )}
                <div className="flex flex-wrap gap-3 text-xs font-bold text-slate-600 dark:text-slate-300 pt-2 border-t border-emerald-200">
                  <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5 text-emerald-600" /> {service.durationMinutes} perc</span>
                  {hasDeposit ? (
                    <span className="flex items-center gap-1 text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-lg font-black">
                      💳 Előleg: {depositPercent}% ({formatPrice(depositAmount)}) – Csak megerősítéskor kerül levonásra!
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-emerald-900 bg-emerald-100/80 px-2.5 py-0.5 rounded-lg font-extrabold">
                      ✅ Nincs előleg fizetés · Teljes összeget a helyszínen fizeted!
                    </span>
                  )}
                </div>
              </div>

              <Button onClick={() => setStep(2)} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-2xl py-6 text-base shadow-md">
                Tovább az Időpont Kiválasztásához ➔
              </Button>
            </div>
          )}

          {/* STEP 2: IDŐPONT KIVÁLASZTÁSA */}
          {step === 2 && (
            <div className="space-y-5">
              <div className="text-center space-y-1">
                <Badge className="bg-emerald-100 text-emerald-800 font-extrabold">2. Lépés</Badge>
                <h4 className="text-xl font-black text-slate-900 dark:text-slate-100">Dátum & Óra Kiválasztása</h4>
                <p className="text-xs text-slate-500">{service.name} · {service.durationMinutes} perc</p>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700">Dátum Kiválasztása</label>
                <Input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="rounded-xl font-bold" />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700">Elérhető Időpontok ({selectedDate})</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {availableSlots.map((slot) => (
                    <button
                      key={slot.time}
                      onClick={() => setSelectedSlot(slot.time)}
                      className={`p-3 rounded-2xl border text-xs font-extrabold flex items-center justify-between transition-all ${
                        selectedSlot === slot.time
                          ? "border-emerald-600 bg-emerald-600 text-white shadow-md"
                          : "border-slate-200 hover:border-emerald-400 text-slate-700 dark:text-slate-300"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{slot.time}</span>
                      </div>
                      {slot.recommended && (
                        <span className={`text-[9px] px-2 py-0.5 rounded-full ${selectedSlot === slot.time ? "bg-white text-emerald-800" : "bg-emerald-100 text-emerald-800"}`}>
                          AJÁNLOTT
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t">
                <Button variant="outline" onClick={() => setStep(1)} className="rounded-2xl font-bold py-6 px-6">
                  Vissza
                </Button>
                <Button onClick={() => setStep(3)} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-2xl py-6 text-base shadow-md">
                  Tovább a Személyes Adatokhoz ➔
                </Button>
              </div>
            </div>
          )}

          {/* STEP 3: SZEMÉLYES ADATOK */}
          {step === 3 && (
            <div className="space-y-5">
              <div className="text-center space-y-1">
                <Badge className="bg-emerald-100 text-emerald-800 font-extrabold">3. Lépés</Badge>
                <h4 className="text-xl font-black text-slate-900 dark:text-slate-100">Személyes Adatok & Megjegyzés</h4>
                <p className="text-xs text-slate-500">🗓️ {selectedDate} @ {selectedSlot}</p>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-xs font-bold text-slate-700">Név (kötelező)</label>
                  <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} className="rounded-xl" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-700">Telefonszám (kötelező)</label>
                    <Input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} className="rounded-xl" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700">E-mail (kötelező)</label>
                    <Input value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} className="rounded-xl" />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700">Megjegyzés a Szolgáltatónak (opcionális)</label>
                  <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="rounded-xl min-h-[80px]" />
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="checkbox"
                    id="terms"
                    checked={termsAccepted}
                    onChange={(e) => setTermsAccepted(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-600"
                  />
                  <label htmlFor="terms" className="text-xs text-slate-600 font-medium">
                    Elfogadom az ILOLIT Általános Szerződési Feltételeit és Adatkezelési Tájékoztatóját.
                  </label>
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t">
                <Button variant="outline" onClick={() => setStep(2)} className="rounded-2xl font-bold py-6 px-6">
                  Vissza
                </Button>
                <Button onClick={() => setStep(4)} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-2xl py-6 text-base shadow-md">
                  Tovább a Fizetéshez & Megerősítéshez ➔
                </Button>
              </div>
            </div>
          )}

          {/* STEP 4: MEGERŐSÍTÉS & FIZETÉS / ZÁROLÁS */}
          {step === 4 && (
            <div className="space-y-5">
              <div className="text-center space-y-1">
                <Badge className="bg-emerald-100 text-emerald-800 font-extrabold">4. Lépés</Badge>
                <h4 className="text-xl font-black text-slate-900 dark:text-slate-100">Foglalás Összesítése & Előleg Zárolás</h4>
              </div>

              <div className="p-4 rounded-3xl bg-slate-50 dark:bg-slate-800/50 border space-y-2 text-xs">
                <div className="flex justify-between font-bold">
                  <span className="text-slate-500">Szolgáltatás:</span>
                  <span className="text-slate-900 dark:text-slate-100">{service.name} ({service.durationMinutes} perc)</span>
                </div>
                <div className="flex justify-between font-bold">
                  <span className="text-slate-500">Szolgáltató:</span>
                  <span className="text-slate-900 dark:text-slate-100">{provider.displayName}</span>
                </div>
                <div className="flex justify-between font-bold">
                  <span className="text-slate-500">Időpont:</span>
                  <span className="text-emerald-700 font-black">{selectedDate} ({selectedSlot})</span>
                </div>
              </div>

              {/* Price Breakdown */}
              <div className="p-4 rounded-3xl border border-emerald-200 bg-emerald-50/50 dark:bg-emerald-950/40 space-y-2 text-xs font-bold">
                <div className="flex justify-between">
                  <span>Teljes ár:</span>
                  <span>{formatPrice(service.price)}</span>
                </div>
                {hasDeposit ? (
                  <>
                    <div className="flex justify-between text-emerald-800 font-black text-sm">
                      <span>Visszaigazoláskor levonandó előleg ({depositPercent}%):</span>
                      <span>{formatPrice(depositAmount)}</span>
                    </div>
                    <div className="flex justify-between text-slate-500 pt-1 border-t">
                      <span>Helyszínen fizetendő hátralék:</span>
                      <span>{formatPrice(remainingBalance)}</span>
                    </div>
                  </>
                ) : (
                  <div className="flex justify-between text-emerald-800 font-black text-sm pt-1 border-t">
                    <span>Előleg fizetési kötelezettség:</span>
                    <span className="bg-emerald-200/80 text-emerald-900 px-2 py-0.5 rounded-lg">0 Ft (Nincs előleg)</span>
                  </div>
                )}
              </div>

              {/* Payment Method Selector if deposit applies */}
              {hasDeposit && (
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700">Fizetési Kártya Megadása (Előzetes Zárolás)</label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: "card", label: "Bankkártya", icon: CreditCard },
                      { id: "paypal", label: "PayPal", icon: ShieldCheck },
                      { id: "applepay", label: "Apple Pay", icon: Smartphone },
                      { id: "googlepay", label: "Google Pay", icon: Smartphone },
                    ].map((pm) => (
                      <button
                        key={pm.id}
                        onClick={() => setPaymentMethod(pm.id as typeof paymentMethod)}
                        className={`p-3 rounded-2xl border text-xs font-extrabold flex items-center gap-2 transition-all ${
                          paymentMethod === pm.id
                            ? "border-emerald-600 bg-emerald-50 text-emerald-900 font-black ring-1 ring-emerald-600"
                            : "border-slate-200 text-slate-600 hover:border-slate-300"
                        }`}
                      >
                        <pm.icon className="w-4 h-4 text-emerald-600" />
                        <span>{pm.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Notice Box about Pre-authorization */}
              <div className="p-3.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 text-[11px] text-indigo-900 dark:text-indigo-200 font-medium flex items-start gap-2.5">
                <Info className="w-4 h-4 text-indigo-600 flex-shrink-0 mt-0.5" />
                <div>
                  <strong className="block font-black text-indigo-950 dark:text-indigo-100">🔒 Biztonsági zárolási szabály:</strong>
                  {hasDeposit ? (
                    <span>A rendszer most még <strong>NEM vonja le</strong> az előleget ({formatPrice(depositAmount)}) a kártyádról, csak előzetesen zárolja. A tényleges levonás kizárólag akkor történik meg, ha a szolgáltató visszaigazolja a foglalást. Elutasítás esetén a zárolás azonnal feloldódik!</span>
                  ) : (
                    <span>Ez a szolgáltató nem kér előleget. A foglalás elküldése után a teljes összeget ({formatPrice(service.price)}) a helyszínen fizeted a szolgáltatónak.</span>
                  )}
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <Button variant="outline" onClick={() => setStep(3)} className="rounded-2xl font-bold py-6 px-6">
                  Vissza
                </Button>
                <Button onClick={handleCompleteBooking} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-2xl py-6 text-base shadow-md">
                  {hasDeposit ? `🔒 Kártya Zárolása & Foglalás Kérése ➔` : `✅ Foglalás Véglegesítése (0 Ft) ➔`}
                </Button>
              </div>
            </div>
          )}

          {/* STEP 5: SIKER KÉPERNYŐ */}
          {step === 5 && (
            <div className="space-y-6 text-center py-4">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto border-2 border-emerald-500 animate-bounce">
                <Check className="w-8 h-8" />
              </div>

              <div className="space-y-2">
                <Badge className="bg-emerald-600 text-white font-black">BK-2026-08-30-001</Badge>
                <h4 className="text-2xl font-black text-slate-900 dark:text-slate-100">Foglalási Kérelmed Elküldve!</h4>
                {hasDeposit ? (
                  <p className="text-xs text-slate-600 dark:text-slate-300 max-w-md mx-auto">
                    Az előleg (<strong className="text-emerald-700">{formatPrice(depositAmount)}</strong>) <strong>előzetesen zárolva</strong> lett a kártyádon. Levonás kizárólag a szolgáltatói megerősítéskor történik!
                  </p>
                ) : (
                  <p className="text-xs text-slate-600 dark:text-slate-300 max-w-md mx-auto">
                    A foglalási kérelem megérkezett a szolgáltatóhoz. Nincs előleg fizetési kötelezettség, a fizetés a helyszínen történik.
                  </p>
                )}
              </div>

              <div className="p-4 rounded-3xl bg-slate-50 dark:bg-slate-800/60 border text-left space-y-3 text-xs">
                <h5 className="font-extrabold text-slate-800 dark:text-slate-200 border-b pb-2 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-600" /> Mi történik most?
                </h5>
                <ol className="space-y-2 text-slate-600 dark:text-slate-300 font-medium">
                  <li className="flex items-start gap-2">
                    <span className="font-bold text-emerald-600">1.</span>
                    <span><strong>{provider.displayName}</strong> megkapta az értesítést a foglalási kérelmedről.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-bold text-emerald-600">2.</span>
                    <span>A szolgáltató visszaigazolja vagy elutasítja a foglalást.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-bold text-emerald-600">3.</span>
                    <span>{hasDeposit ? "✅ Megerősítéskor megtörténik az előleg tényleges levonása." : "✅ Megerősítéskor a helyszíni időpontod zárolásra kerül."}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-bold text-emerald-600">4.</span>
                    <span>❌ Elutasítás esetén az előleg zárolása <strong>azonnal feloldódik</strong>, számládat nem érheti levonás.</span>
                  </li>
                </ol>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <Button variant="outline" onClick={onClose} className="flex-1 rounded-2xl font-bold py-6">
                  Vissza a kereséshez
                </Button>
                <Button onClick={() => { onClose(); window.location.href = "/beauty/bookings"; }} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-2xl py-6">
                  📋 Foglalásaim Megtekintése ➔
                </Button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
