import { useEffect, useState } from "react";
import { Link } from "wouter";
import { useUnifiedAppointments } from "@/context/UnifiedAppointmentsContext";
import { appointmentsApi } from "@/lib/appointments/api";
import {
  APPOINTMENT_STATUS_META,
  formatHuDate,
  type UnifiedAppointment,
  type UnifiedAppointmentDetails,
} from "@/lib/appointments/types";
import { formatPrice } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  Bell,
  Calendar,
  Car,
  CheckCircle2,
  Clock,
  ExternalLink,
  Info,
  Loader2,
  Lock,
  MapPin,
  MessageSquare,
  Navigation,
  Phone,
  ShieldCheck,
  Trash2,
  User,
  XCircle,
} from "lucide-react";

interface VehicleViewingsSectionProps {
  highlightAppointmentId?: string;
  bookingKindFilter?: "VIEWING" | "TEST_DRIVE";
}

function downloadIcsFile(a: UnifiedAppointment, exactLocation?: string) {
  const startClean = `${a.date.replace(/-/g, "")}T${a.start_time.replace(":", "")}00`;
  const endClean = `${a.date.replace(/-/g, "")}T${(a.end_time || a.start_time).replace(":", "")}00`;
  const kindLabel = a.booking_kind === "TEST_DRIVE" ? "Tesztvezetés" : "Járműmegtekintés";
  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//ILOLIT//Jarmuvek//HU",
    "BEGIN:VEVENT",
    `UID:${a.appointment_id}@ilolit.com`,
    `DTSTART:${startClean}`,
    `DTEND:${endClean}`,
    `SUMMARY:${kindLabel}: ${a.title.replace(/[\r\n,;]/g, " ")}`,
    `LOCATION:${(exactLocation || a.city || "Magyarország").replace(/[\r\n,;]/g, " ")}`,
    `DESCRIPTION:ILOLIT ${kindLabel} – Hirdető: ${a.seller_name}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `ilolit-${a.booking_kind === "TEST_DRIVE" ? "tesztvezetes" : "jarmumegtekintes"}-${a.date}.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function VehicleViewingsSection({
  highlightAppointmentId,
  bookingKindFilter,
}: VehicleViewingsSectionProps) {
  const { appointments, loading, refreshAll } = useUnifiedAppointments();
  const { toast } = useToast();

  const [roleView, setRoleView] = useState<"buyer" | "seller">("buyer");
  const [openDetailsId, setOpenDetailsId] = useState<string | null>(highlightAppointmentId || null);
  const [detailsCache, setDetailsCache] = useState<Record<string, UnifiedAppointmentDetails>>({});
  const [loadingDetailsId, setLoadingDetailsId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  // Buyer counter-proposal state
  const [counterId, setCounterId] = useState<string | null>(null);
  const [counterDate, setCounterDate] = useState("");
  const [counterTime, setCounterTime] = useState("15:00");
  const [counterNote, setCounterNote] = useState("");

  // Seller approval / proposal state
  const [sellerApproveId, setSellerApproveId] = useState<string | null>(null);
  const [exactMeetingPlace, setExactMeetingPlace] = useState("");
  const [sellerInstructions, setSellerInstructions] = useState("");
  const [sellerPhoneOpt, setSellerPhoneOpt] = useState("");

  const [sellerProposeId, setSellerProposeId] = useState<string | null>(null);
  const [proposeDate, setProposeDate] = useState("");
  const [proposeTime, setProposeTime] = useState("16:00");
  const [proposeNote, setProposeNote] = useState("");

  const matchesKind = (a: UnifiedAppointment) => {
    if (!bookingKindFilter) return true;
    const kind = a.booking_kind || "VIEWING";
    return kind === bookingKindFilter;
  };

  const buyerViewings = appointments.filter(
    (a) => a.appointment_type === "VEHICLE_VIEWING" && a.role === "buyer" && matchesKind(a),
  );
  const sellerViewings = appointments.filter(
    (a) => a.appointment_type === "VEHICLE_VIEWING" && a.role === "seller" && matchesKind(a),
  );

  useEffect(() => {
    if (!highlightAppointmentId) return;
    const match = buyerViewings.find((v) => v.appointment_id === highlightAppointmentId);
    if (match && match.status === "CONFIRMED" && !detailsCache[highlightAppointmentId]) {
      void handleToggleDetails(highlightAppointmentId, true);
    }
  }, [highlightAppointmentId, buyerViewings.length]);

  const handleToggleDetails = async (id: string, forceOpen = false) => {
    if (!forceOpen && openDetailsId === id) {
      setOpenDetailsId(null);
      return;
    }
    if (detailsCache[id]) {
      setOpenDetailsId(id);
      return;
    }
    setLoadingDetailsId(id);
    try {
      const details = await appointmentsApi.getAppointmentDetails(id);
      setDetailsCache((prev) => ({ ...prev, [id]: details }));
      setOpenDetailsId(id);
    } catch (err: any) {
      toast({
        title: "A találkozási hely nem nyitható meg",
        description: err?.message || "A hirdető visszaigazolása szükséges.",
        variant: "destructive",
      });
    } finally {
      setLoadingDetailsId(null);
    }
  };

  const handleAcceptProposal = async (a: UnifiedAppointment) => {
    setBusyId(a.appointment_id);
    try {
      await appointmentsApi.acceptProposal(a.appointment_id);
      await refreshAll();
      toast({ title: "Új időpont elfogadva – a járműmegtekintés visszaigazolva" });
    } catch (err: any) {
      toast({ title: err?.message || "Nem sikerült elfogadni.", variant: "destructive" });
    } finally {
      setBusyId(null);
    }
  };

  const handleRequestOtherTime = async (a: UnifiedAppointment) => {
    if (!counterDate || !counterTime) return;
    setBusyId(a.appointment_id);
    try {
      await appointmentsApi.requestOtherTime(a.appointment_id, {
        date: counterDate,
        start_time: counterTime,
        note: counterNote.trim() || undefined,
      });
      setCounterId(null);
      await refreshAll();
      toast({ title: "Új időpont iránti kérelem elküldve" });
    } catch (err: any) {
      toast({ title: err?.message || "Nem sikerült elküldeni.", variant: "destructive" });
    } finally {
      setBusyId(null);
    }
  };

  const handleCancel = async (a: UnifiedAppointment) => {
    if (!window.confirm("Biztosan lemondod a járműmegtekintést?")) return;
    setBusyId(a.appointment_id);
    try {
      await appointmentsApi.cancelAppointment(a.appointment_id);
      await refreshAll();
      toast({ title: "Járműmegtekintés lemondva" });
    } catch (err: any) {
      toast({ title: err?.message || "Nem sikerült lemondani.", variant: "destructive" });
    } finally {
      setBusyId(null);
    }
  };

  const handleSellerConfirm = async (a: UnifiedAppointment) => {
    if (!exactMeetingPlace.trim()) {
      toast({ title: "Add meg a megtekintés pontos helyszínét", variant: "destructive" });
      return;
    }
    setBusyId(a.appointment_id);
    try {
      await appointmentsApi.respondToAppointment(a.appointment_id, {
        action: "CONFIRM",
        exact_location: exactMeetingPlace.trim(),
        instructions: sellerInstructions.trim() || undefined,
        note: sellerInstructions.trim() || undefined,
        seller_phone: sellerPhoneOpt.trim() || undefined,
      });
      setSellerApproveId(null);
      setExactMeetingPlace("");
      setSellerInstructions("");
      setSellerPhoneOpt("");
      await refreshAll();
      toast({ title: "Járműmegtekintés visszaigazolva – az érdeklődő értesítést kapott" });
    } catch (err: any) {
      toast({ title: err?.message || "Nem sikerült visszaigazolni.", variant: "destructive" });
    } finally {
      setBusyId(null);
    }
  };

  const handleSellerPropose = async (a: UnifiedAppointment) => {
    if (!proposeDate || !proposeTime) return;
    setBusyId(a.appointment_id);
    try {
      await appointmentsApi.respondToAppointment(a.appointment_id, {
        action: "PROPOSE_NEW_TIME",
        proposed_date: proposeDate,
        proposed_start_time: proposeTime,
        note: proposeNote.trim() || undefined,
      });
      setSellerProposeId(null);
      await refreshAll();
      toast({ title: "Új időpont javasolva az érdeklődőnek" });
    } catch (err: any) {
      toast({ title: err?.message || "Nem sikerült javasolni.", variant: "destructive" });
    } finally {
      setBusyId(null);
    }
  };

  const handleSellerReject = async (a: UnifiedAppointment) => {
    if (!window.confirm("Biztosan elutasítod ezt a megtekintési kérelmet?")) return;
    setBusyId(a.appointment_id);
    try {
      await appointmentsApi.respondToAppointment(a.appointment_id, { action: "REJECT" });
      await refreshAll();
      toast({ title: "Kérelem elutasítva" });
    } catch (err: any) {
      toast({ title: err?.message || "Hiba történt.", variant: "destructive" });
    } finally {
      setBusyId(null);
    }
  };

  const todayIso = new Date().toISOString().slice(0, 10);
  const canDelete = (a: UnifiedAppointment) =>
    ["REJECTED", "CANCELLED", "COMPLETED", "NO_SHOW"].includes(a.status) || (Boolean(a.date) && a.date < todayIso);

  const handleDelete = async (a: UnifiedAppointment) => {
    if (!window.confirm("Biztosan törlöd ezt a régi/lezárt foglalást?")) return;
    setBusyId(a.appointment_id);
    try {
      await appointmentsApi.deleteAppointment(a.appointment_id);
      await refreshAll();
      toast({ title: "Törölve a listából" });
    } catch (err: any) {
      toast({ title: err?.message || "Nem sikerült törölni.", variant: "destructive" });
    } finally {
      setBusyId(null);
    }
  };

  const list = roleView === "buyer" ? buyerViewings : sellerViewings;
  const isTestDriveView = bookingKindFilter === "TEST_DRIVE";

  return (
    <div className="space-y-5">
      <div className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-black text-slate-950">
            <Car className="h-5 w-5 text-emerald-600" />
            {isTestDriveView ? "Tesztvezetéseim" : "Jármű megtekintéseim"}
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            {isTestDriveView
              ? "Előre egyeztetett, jogosítványhoz és jogi nyilatkozathoz kötött tesztvezetési foglalásaid."
              : "Személyautó és jármű megtekintési kérelmeid. A pontos találkozási hely és navigáció a hirdető visszaigazolása után nyílik meg."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild size="sm" variant="outline" className="rounded-xl border-slate-200 text-xs font-bold">
            <Link href="/vehicles/admin">Saját Járműadmin</Link>
          </Button>
          <Button asChild size="sm" variant="outline" className="rounded-xl border-slate-200 text-xs font-bold">
            <Link href="/vehicles">Járművek böngészése</Link>
          </Button>
        </div>
      </div>

      {/* Role switcher (Buyer viewings + Incoming seller viewings if any) */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setRoleView("buyer")}
          className={`rounded-xl border px-3.5 py-1.5 text-xs font-bold transition ${
            roleView === "buyer"
              ? "border-emerald-600 bg-emerald-600 text-white"
              : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
          }`}
        >
          Saját megtekintéseim ({buyerViewings.length})
        </button>
        {sellerViewings.length > 0 && (
          <button
            type="button"
            onClick={() => setRoleView("seller")}
            className={`rounded-xl border px-3.5 py-1.5 text-xs font-bold transition ${
              roleView === "seller"
                ? "border-emerald-600 bg-emerald-600 text-white"
                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            Beérkezett jármű érdeklődések ({sellerViewings.length})
          </button>
        )}
      </div>

      {loading && list.length === 0 ? (
        <div className="flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white py-12 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />
          Jármű megtekintések betöltése...
        </div>
      ) : list.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-10 text-center">
          <Car className="mx-auto h-9 w-9 text-slate-300" />
          <p className="mt-3 text-sm font-bold text-slate-900">Még nincs járműmegtekintési kérelmed</p>
          <p className="mt-1 text-xs text-slate-500">
            Böngéssz az aktív járműhirdetések között és kérj ellenőrzött megtekintési időpontot.
          </p>
          <Button asChild size="sm" className="mt-4 rounded-xl bg-emerald-600 text-xs font-bold text-white hover:bg-emerald-700">
            <Link href="/vehicles">Járművek megtekintése</Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {list.map((a) => {
            const badge = APPOINTMENT_STATUS_META[a.status];
            const details = detailsCache[a.appointment_id];
            const isOpen = openDetailsId === a.appointment_id && Boolean(details);
            const isActive = ["PENDING", "CONFIRMED", "PROPOSED_NEW_TIME"].includes(a.status);
            const isHighlighted = highlightAppointmentId === a.appointment_id;

            return (
              <div
                key={a.appointment_id}
                className={`overflow-hidden rounded-2xl border bg-white transition ${
                  isHighlighted ? "border-emerald-500 ring-2 ring-emerald-500/20" : "border-slate-200"
                }`}
              >
                {(a.reminder_2h_due || a.reminder_24h_due) && roleView === "buyer" && (
                  <div className="flex items-center gap-2 border-b border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-semibold text-emerald-900">
                    <Bell className="h-3.5 w-3.5 text-emerald-700" />
                    {a.reminder_2h_due
                      ? `2 órán belül kezdődik a járműmegtekintésed (${a.start_time} – ${a.city})`
                      : `Holnap járműmegtekintésed lesz (${a.start_time} – ${a.city})`}
                  </div>
                )}

                <div className="p-4 sm:p-5">
                  <div className="flex flex-col gap-4 sm:flex-row">
                    <Link
                      href={a.source === "vehicle_module" ? `/vehicles/${a.listing_id}` : `/product/${a.listing_id}`}
                      className="flex h-36 w-full shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-100 sm:h-32 sm:w-44"
                    >
                      {a.cover_image ? (
                        <img src={a.cover_image} alt={a.title} className="h-full w-full object-cover" />
                      ) : (
                        <Car className="h-8 w-8 text-slate-300" />
                      )}
                    </Link>

                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span
                            className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${(badge || APPOINTMENT_STATUS_META.PENDING).className}`}
                          >
                            {a.status === "PROPOSED_NEW_TIME" ? badge.shortLabel : (badge || APPOINTMENT_STATUS_META.PENDING).label}
                          </span>
                          {a.booking_kind === "TEST_DRIVE" && (
                            <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800">
                              Tesztvezetés
                            </span>
                          )}
                        </div>
                        {a.price > 0 && (
                          <span className="text-sm font-black text-slate-900">{formatPrice(a.price)}</span>
                        )}
                      </div>

                      <Link
                        href={a.source === "vehicle_module" ? `/vehicles/${a.listing_id}` : `/product/${a.listing_id}`}
                        className="block text-base font-bold text-slate-950 hover:text-emerald-700"
                      >
                        {a.title}
                      </Link>

                      {/* Brand / Model / Year / City chips */}
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600">
                        {a.vehicle_brand && (
                          <span>
                            <strong className="text-slate-800">Márka:</strong> {a.vehicle_brand}
                          </span>
                        )}
                        {a.vehicle_model && (
                          <span>
                            <strong className="text-slate-800">Modell:</strong> {a.vehicle_model}
                          </span>
                        )}
                        {a.vehicle_year && (
                          <span>
                            <strong className="text-slate-800">Évjárat:</strong> {a.vehicle_year}
                          </span>
                        )}
                        <span className="inline-flex items-center gap-1 font-medium">
                          <MapPin className="h-3.5 w-3.5 text-emerald-600" />
                          {a.city || a.approx_location}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 pt-1 text-xs">
                        <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 font-bold text-slate-900">
                          <Calendar className="h-3.5 w-3.5 text-emerald-600" />
                          {formatHuDate(a.date)}
                        </span>
                        <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 font-bold text-slate-900">
                          <Clock className="h-3.5 w-3.5 text-emerald-600" />
                          {a.start_time} – {a.end_time}
                        </span>
                        <span className="inline-flex items-center gap-1 text-slate-600">
                          <User className="h-3.5 w-3.5 text-slate-400" />
                          {roleView === "buyer" ? `Hirdető: ${a.seller_name}` : `Érdeklődő: ${a.requester_name}`}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Buyer response to proposed time */}
                  {roleView === "buyer" && a.status === "PROPOSED_NEW_TIME" && a.proposed_date && (
                    <div className="mt-4 rounded-xl border border-slate-300 bg-slate-50 p-4 text-xs">
                      <p className="font-bold text-slate-900">A hirdető új időpontot javasolt:</p>
                      <p className="mt-1 text-sm font-black text-slate-950">
                        {formatHuDate(a.proposed_date)} · {a.proposed_start_time} – {a.proposed_end_time}
                      </p>
                      {a.proposed_note && <p className="mt-1 text-slate-600">{a.proposed_note}</p>}
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Button
                          type="button"
                          size="sm"
                          disabled={busyId === a.appointment_id}
                          onClick={() => handleAcceptProposal(a)}
                          className="rounded-xl bg-emerald-600 text-xs font-bold text-white hover:bg-emerald-700"
                        >
                          <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                          Elfogadom
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setCounterId(counterId === a.appointment_id ? null : a.appointment_id);
                            setCounterDate(a.proposed_date || a.date);
                            setCounterTime(a.proposed_start_time || "15:00");
                          }}
                          className="rounded-xl border-slate-300 text-xs font-bold"
                        >
                          Másik időpontot kérek
                        </Button>
                      </div>
                      {counterId === a.appointment_id && (
                        <div className="mt-3 grid grid-cols-1 gap-2 rounded-xl border border-slate-200 bg-white p-3 sm:grid-cols-3">
                          <Input
                            type="date"
                            min={todayIso}
                            value={counterDate}
                            onChange={(e) => setCounterDate(e.target.value)}
                            className="h-9 text-xs"
                          />
                          <Input
                            type="time"
                            value={counterTime}
                            onChange={(e) => setCounterTime(e.target.value)}
                            className="h-9 text-xs"
                          />
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => handleRequestOtherTime(a)}
                            className="h-9 bg-emerald-600 text-xs font-bold text-white hover:bg-emerald-700"
                          >
                            Küldés
                          </Button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Seller approval / reschedule controls */}
                  {roleView === "seller" && a.status === "PENDING" && (
                    <div className="mt-4 space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 font-bold text-emerald-800">
                          <ShieldCheck className="h-3.5 w-3.5" />
                          Ellenőrzött telefonszámú érdeklődő
                        </span>
                        {a.buyer_message && <span className="text-slate-600">Üzenet: „{a.buyer_message}”</span>}
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => {
                            setSellerApproveId(sellerApproveId === a.appointment_id ? null : a.appointment_id);
                            setSellerProposeId(null);
                            setExactMeetingPlace(a.city || "");
                          }}
                          className="rounded-xl bg-emerald-600 text-xs font-bold text-white hover:bg-emerald-700"
                        >
                          <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                          Elfogadás &amp; helyszín megadása
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSellerProposeId(sellerProposeId === a.appointment_id ? null : a.appointment_id);
                            setSellerApproveId(null);
                            setProposeDate(a.date);
                            setProposeTime(a.start_time);
                          }}
                          className="rounded-xl text-xs font-bold"
                        >
                          Másik időpont javaslása
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => handleSellerReject(a)}
                          className="rounded-xl border-rose-200 text-xs font-bold text-rose-700 hover:bg-rose-50"
                        >
                          Elutasítás
                        </Button>
                      </div>

                      {sellerApproveId === a.appointment_id && (
                        <div className="space-y-2.5 rounded-xl border border-emerald-200 bg-white p-3.5">
                          <label className="block text-xs font-bold text-slate-800">
                            Megtekintés pontos helye *
                            <Input
                              value={exactMeetingPlace}
                              onChange={(e) => setExactMeetingPlace(e.target.value)}
                              placeholder="Pl. Budapest XIII. Váci út 120. parkoló"
                              className="mt-1 h-9 text-xs"
                            />
                          </label>
                          <label className="block text-xs font-bold text-slate-800">
                            Instrukció / megjegyzés (opcionális)
                            <Input
                              value={sellerInstructions}
                              onChange={(e) => setSellerInstructions(e.target.value)}
                              placeholder="Pl. A főbejárat melletti parkolóban várlak."
                              className="mt-1 h-9 text-xs"
                            />
                          </label>
                          <label className="block text-xs font-bold text-slate-800">
                            Telefonszám csak visszaigazolt érdeklődőnek (opcionális)
                            <Input
                              value={sellerPhoneOpt}
                              onChange={(e) => setSellerPhoneOpt(e.target.value)}
                              placeholder="+36 30 ..."
                              className="mt-1 h-9 text-xs"
                            />
                          </label>
                          <Button
                            type="button"
                            size="sm"
                            disabled={busyId === a.appointment_id}
                            onClick={() => handleSellerConfirm(a)}
                            className="rounded-xl bg-emerald-600 text-xs font-bold text-white hover:bg-emerald-700"
                          >
                            Visszaigazolás küldése
                          </Button>
                        </div>
                      )}

                      {sellerProposeId === a.appointment_id && (
                        <div className="grid grid-cols-1 gap-2 rounded-xl border border-slate-200 bg-white p-3 sm:grid-cols-3">
                          <Input
                            type="date"
                            min={todayIso}
                            value={proposeDate}
                            onChange={(e) => setProposeDate(e.target.value)}
                            className="h-9 text-xs"
                          />
                          <Input
                            type="time"
                            value={proposeTime}
                            onChange={(e) => setProposeTime(e.target.value)}
                            className="h-9 text-xs"
                          />
                          <Button
                            type="button"
                            size="sm"
                            disabled={busyId === a.appointment_id}
                            onClick={() => handleSellerPropose(a)}
                            className="h-9 bg-emerald-600 text-xs font-bold text-white"
                          >
                            Javaslat küldése
                          </Button>
                          <Input
                            value={proposeNote}
                            onChange={(e) => setProposeNote(e.target.value)}
                            placeholder="Megjegyzés (opcionális)"
                            className="h-9 text-xs sm:col-span-3"
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {/* Footer actions */}
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3.5">
                    <div className="flex flex-wrap items-center gap-2">
                      {a.status === "CONFIRMED" ? (
                        <Button
                          type="button"
                          size="sm"
                          disabled={loadingDetailsId === a.appointment_id}
                          onClick={() => handleToggleDetails(a.appointment_id)}
                          className="rounded-xl bg-emerald-600 text-xs font-bold text-white hover:bg-emerald-700"
                        >
                          {loadingDetailsId === a.appointment_id ? (
                            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <ShieldCheck className="mr-1.5 h-3.5 w-3.5" />
                          )}
                          {isOpen ? "Részletek elrejtése" : "Megtekintés részletei"}
                        </Button>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
                          <Lock className="h-3.5 w-3.5" />
                          Pontos helyszín visszaigazolás után nyílik meg
                        </span>
                      )}

                      <Button
                        asChild
                        size="sm"
                        variant="outline"
                        className="rounded-xl border-slate-200 text-xs font-semibold text-slate-700"
                      >
                        <Link href={`/messages/new?listingId=${a.listing_id}`}>
                          <MessageSquare className="mr-1.5 h-3.5 w-3.5" />
                          Üzenet
                        </Link>
                      </Button>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {isActive && (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={busyId === a.appointment_id}
                          onClick={() => handleCancel(a)}
                          className="rounded-xl border-rose-200 text-xs font-bold text-rose-700 hover:bg-rose-50"
                        >
                          <XCircle className="mr-1.5 h-3.5 w-3.5" />
                          Lemondás
                        </Button>
                      )}
                      {canDelete(a) && (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={busyId === a.appointment_id}
                          onClick={() => handleDelete(a)}
                          className="rounded-xl border-slate-200 text-xs font-semibold text-slate-600 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700"
                        >
                          <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                          Törlés
                        </Button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Confirmed Vehicle Viewing Exact Details Drawer */}
                {isOpen && details && (
                  <div className="space-y-4 border-t border-emerald-200 bg-emerald-50/40 p-4 sm:p-5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="flex items-center gap-2 text-sm font-bold text-emerald-950">
                        <CheckCircle2 className="h-4 w-4 text-emerald-700" />
                        Visszaigazolt járműmegtekintés részletei
                      </h3>
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => downloadIcsFile(a, details.exact_address_text)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-800 hover:bg-slate-50"
                        >
                          <Calendar className="h-3.5 w-3.5 text-emerald-600" />
                          Naptárhoz adás (.ics)
                        </button>
                        {details.navigation_url && (
                          <a
                            href={details.navigation_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700"
                          >
                            <Navigation className="h-3.5 w-3.5" />
                            Navigáció indítása
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                        {details.seller_phone && (
                          <a
                            href={`tel:${details.seller_phone}`}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-white px-3 py-1.5 text-xs font-bold text-emerald-800 hover:bg-emerald-50"
                          >
                            <Phone className="h-3.5 w-3.5" />
                            {details.seller_phone}
                          </a>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-3 rounded-xl border border-emerald-200 bg-white p-4 text-sm sm:grid-cols-2">
                      <div>
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                          Megtekintés pontos helye
                        </span>
                        <p className="mt-1 font-bold text-slate-950">{details.exact_address_text}</p>
                      </div>
                      <div>
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                          Dátum és időpont
                        </span>
                        <p className="mt-1 font-bold text-slate-950">
                          {formatHuDate(details.date)} · {details.start_time} – {details.end_time}
                        </p>
                      </div>
                    </div>

                    {details.vehicle_basics && (
                      <div className="grid grid-cols-2 gap-2 rounded-xl border border-slate-200 bg-white p-3.5 text-xs sm:grid-cols-4">
                        <div>
                          <span className="text-slate-400">Márka</span>
                          <p className="font-bold text-slate-900">{details.vehicle_basics.brand || "—"}</p>
                        </div>
                        <div>
                          <span className="text-slate-400">Modell</span>
                          <p className="font-bold text-slate-900">{details.vehicle_basics.model || "—"}</p>
                        </div>
                        <div>
                          <span className="text-slate-400">Évjárat</span>
                          <p className="font-bold text-slate-900">{details.vehicle_basics.year || "—"}</p>
                        </div>
                        <div>
                          <span className="text-slate-400">Ár</span>
                          <p className="font-bold text-slate-900">
                            {details.vehicle_basics.price > 0 ? formatPrice(details.vehicle_basics.price) : "—"}
                          </p>
                        </div>
                      </div>
                    )}

                    {(details.instructions || details.seller_message) && (
                      <div className="flex items-start gap-2.5 rounded-xl border border-slate-200 bg-white p-3.5 text-xs text-slate-700">
                        <Info className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                        <div>
                          <strong className="block text-slate-900">Hirdető instrukciója:</strong>
                          {details.instructions || details.seller_message}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
