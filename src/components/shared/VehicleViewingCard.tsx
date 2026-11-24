import { useState } from "react";
import { Link } from "wouter";
import { useUser } from "@clerk/react";
import { useQuery } from "@tanstack/react-query";
import { realEstateApi } from "@/lib/realEstate/api";
import { appointmentsApi } from "@/lib/appointments/api";
import { useUnifiedAppointments } from "@/context/UnifiedAppointmentsContext";
import { APPOINTMENT_STATUS_META, formatHuDate } from "@/lib/appointments/types";
import { PhoneVerificationModal } from "@/components/realestate/PhoneVerificationModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Calendar, Car, CheckCircle2, Clock, ShieldCheck } from "lucide-react";

interface VehicleViewingCardProps {
  listingId: string;
  listingTitle: string;
  isOwner: boolean;
}

export function VehicleViewingCard({ listingId, listingTitle, isOwner }: VehicleViewingCardProps) {
  const { isSignedIn, user } = useUser();
  const { toast } = useToast();
  const { appointments, refreshAll } = useUnifiedAppointments();

  const tomorrow = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
  const [date, setDate] = useState(tomorrow);
  const [startTime, setStartTime] = useState("15:00");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [phoneModalOpen, setPhoneModalOpen] = useState(false);

  const { data: phoneStatus, refetch: refetchPhone } = useQuery({
    queryKey: ["real-estate-phone-status"],
    queryFn: () => realEstateApi.getPhoneStatus(),
    enabled: Boolean(isSignedIn),
  });

  const existing = appointments.find(
    (a) =>
      a.appointment_type === "VEHICLE_VIEWING" &&
      a.listing_id === listingId &&
      a.role === "buyer" &&
      ["PENDING", "CONFIRMED", "PROPOSED_NEW_TIME"].includes(a.status),
  );

  if (isOwner) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs">
        <p className="font-bold text-slate-900">Járműmegtekintési kérelmek kezelése</p>
        <p className="mt-1 text-slate-600">
          Az érdeklődők megtekintési kérelmeit a Fiókom / Jármű megtekintéseim menüpontban hagyhatod jóvá.
        </p>
        <Button asChild size="sm" variant="outline" className="mt-3 rounded-xl text-xs font-bold">
          <Link href="/dashboard/bookings/vehicles">Jármű megtekintések megnyitása</Link>
        </Button>
      </div>
    );
  }

  const handleSubmit = async () => {
    if (!isSignedIn) {
      toast({ title: "A megtekintési kérelemhez jelentkezz be." });
      return;
    }
    if (!phoneStatus?.phoneVerified) {
      setPhoneModalOpen(true);
      return;
    }
    if (!date || !startTime) {
      toast({ title: "Add meg a kívánt dátumot és időpontot.", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      await appointmentsApi.createVehicleViewing({
        listing_id: listingId,
        date,
        start_time: startTime,
        requester_name: user?.fullName || user?.username || "ILOLIT érdeklődő",
        message: message.trim() || undefined,
      });
      await refreshAll();
      setMessage("");
      toast({
        title: "Járműmegtekintési kérelem elküldve",
        description: "Amint a hirdető visszaigazolja, azonnal értesítünk és megnyílik a pontos helyszín.",
      });
    } catch (err: any) {
      toast({
        title: "Nem sikerült elküldeni a kérelmet",
        description: err?.message || "Próbáld újra később.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 rounded-2xl border border-emerald-200 bg-white p-5 shadow-xs">
      <div className="flex items-start justify-between gap-2">
        <div>
          <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-emerald-700">
            <Car className="h-3.5 w-3.5" />
            Biztonságos járműmegtekintés
          </span>
          <h3 className="mt-1 text-base font-black text-slate-950">Megtekintési időpont kérése</h3>
        </div>
        <ShieldCheck className="h-5 w-5 shrink-0 text-emerald-600" />
      </div>

      {existing ? (
        <div className="space-y-3 rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-bold text-slate-900">Aktív megtekintési kérelmed</span>
            <span
              className={`rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${
                APPOINTMENT_STATUS_META[existing.status].className
              }`}
            >
              {APPOINTMENT_STATUS_META[existing.status].label}
            </span>
          </div>
          <p className="flex items-center gap-2 font-semibold text-slate-800">
            <Calendar className="h-3.5 w-3.5 text-emerald-600" />
            {formatHuDate(existing.date)} · {existing.start_time}
          </p>
          <Button
            asChild
            size="sm"
            className="w-full rounded-xl bg-emerald-600 text-xs font-bold text-white hover:bg-emerald-700"
          >
            <Link href={existing.web_url}>
              <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
              Megtekintés részletei
            </Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-xs leading-relaxed text-slate-600">
            Válassz javasolt időpontot a(z) <strong>{listingTitle}</strong> személyes megtekintéséhez. A pontos
            találkozási hely a hirdető visszaigazolása után válik elérhetővé.
          </p>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block text-xs font-bold text-slate-700">
              Dátum
              <Input
                type="date"
                min={new Date().toISOString().slice(0, 10)}
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="mt-1 rounded-xl"
              />
            </label>
            <label className="block text-xs font-bold text-slate-700">
              Időpont
              <div className="relative mt-1">
                <Clock className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="rounded-xl pl-9"
                />
              </div>
            </label>
          </div>

          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={2}
            placeholder="Rövid üzenet a hirdetőnek (opcionális)"
            className="rounded-xl text-xs"
          />

          {isSignedIn ? (
            <Button
              type="button"
              disabled={submitting}
              onClick={handleSubmit}
              className="h-11 w-full rounded-xl bg-emerald-600 text-sm font-bold text-white hover:bg-emerald-700"
            >
              {submitting
                ? "Küldés..."
                : phoneStatus?.phoneVerified
                  ? "Megtekintési időpont kérése"
                  : "Telefonszám igazolása és időpontkérés"}
            </Button>
          ) : (
            <Button asChild className="h-11 w-full rounded-xl bg-emerald-600 text-sm font-bold text-white hover:bg-emerald-700">
              <Link href="/auth/login">Bejelentkezés az időpontkéréshez</Link>
            </Button>
          )}
        </div>
      )}

      <PhoneVerificationModal
        isOpen={phoneModalOpen}
        onClose={() => setPhoneModalOpen(false)}
        onVerified={() => {
          setPhoneModalOpen(false);
          void refetchPhone();
        }}
      />
    </div>
  );
}
