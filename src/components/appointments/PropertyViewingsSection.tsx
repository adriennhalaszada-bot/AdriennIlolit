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
import { formatHuf } from "@/lib/realEstate/config";
import { ApproximateLocationMap } from "@/components/realestate/ApproximateLocationMap";
import { SafeVisitPassCard } from "@/components/realestate/SafeVisitPassCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  Bell,
  Building2,
  Calendar,
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

interface PropertyViewingsSectionProps {
  highlightAppointmentId?: string;
}

export function PropertyViewingsSection({ highlightAppointmentId }: PropertyViewingsSectionProps) {
  const { appointments, loading, refreshAll } = useUnifiedAppointments();
  const { toast } = useToast();

  const [filter, setFilter] = useState<"all" | "active" | "confirmed" | "closed">("all");
  const [openDetailsId, setOpenDetailsId] = useState<string | null>(highlightAppointmentId || null);
  const [detailsCache, setDetailsCache] = useState<Record<string, UnifiedAppointmentDetails>>({});
  const [loadingDetailsId, setLoadingDetailsId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  // "Másik időpontot kérek" inline form state
  const [counterId, setCounterId] = useState<string | null>(null);
  const [counterDate, setCounterDate] = useState("");
  const [counterTime, setCounterTime] = useState("16:00");
  const [counterNote, setCounterNote] = useState("");

  const propertyViewings = appointments.filter(
    (a) => a.appointment_type === "PROPERTY_VIEWING" && a.role === "buyer",
  );

  const filtered = propertyViewings.filter((a) => {
    if (filter === "active") return ["PENDING", "CONFIRMED", "PROPOSED_NEW_TIME"].includes(a.status);
    if (filter === "confirmed") return a.status === "CONFIRMED";
    if (filter === "closed") return ["REJECTED", "CANCELLED", "COMPLETED"].includes(a.status);
    return true;
  });

  // Auto-load exact address when navigated via deep link to a confirmed property viewing
  useEffect(() => {
    if (!highlightAppointmentId) return;
    const match = propertyViewings.find((v) => v.appointment_id === highlightAppointmentId);
    if (match && match.status === "CONFIRMED" && !detailsCache[highlightAppointmentId]) {
      void handleToggleDetails(highlightAppointmentId, true);
    }
  }, [highlightAppointmentId, propertyViewings.length]);

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
        title: "A pontos cím nem nyitható meg",
        description: err?.message || "A hirdető visszaigazolása és ellenőrzött telefonszám szükséges.",
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
      toast({ title: "Új időpont elfogadva – a megtekintés visszaigazolva" });
    } catch (err: any) {
      toast({ title: err?.message || "Nem sikerült elfogadni az új időpontot.", variant: "destructive" });
    } finally {
      setBusyId(null);
    }
  };

  const handleRequestOtherTime = async (a: UnifiedAppointment) => {
    if (!counterDate || !counterTime) {
      toast({ title: "Adj meg új dátumot és időpontot", variant: "destructive" });
      return;
    }
    setBusyId(a.appointment_id);
    try {
      await appointmentsApi.requestOtherTime(a.appointment_id, {
        date: counterDate,
        start_time: counterTime,
        note: counterNote.trim() || undefined,
      });
      setCounterId(null);
      setCounterDate("");
      setCounterNote("");
      await refreshAll();
      toast({ title: "Másik időpont iránti kérelem elküldve a hirdetőnek" });
    } catch (err: any) {
      toast({ title: err?.message || "Nem sikerült elküldeni a kérést.", variant: "destructive" });
    } finally {
      setBusyId(null);
    }
  };

  const handleCancel = async (a: UnifiedAppointment) => {
    if (!window.confirm("Biztosan lemondod az ingatlanmegtekintést? Az időpont automatikusan felszabadul.")) return;
    setBusyId(a.appointment_id);
    try {
      await appointmentsApi.cancelAppointment(a.appointment_id);
      await refreshAll();
      toast({ title: "Megtekintés lemondva" });
    } catch (err: any) {
      toast({ title: err?.message || "Nem sikerült lemondani.", variant: "destructive" });
    } finally {
      setBusyId(null);
    }
  };

  const handleToggleReminder = async (a: UnifiedAppointment, which: "24h" | "2h") => {
    const r24 = which === "24h" ? !a.reminder_24h_enabled : a.reminder_24h_enabled;
    const r2 = which === "2h" ? !a.reminder_2h_enabled : a.reminder_2h_enabled;
    try {
      await appointmentsApi.updateReminders(a.appointment_id, r24, r2);
      await refreshAll();
    } catch (err: any) {
      toast({ title: err?.message || "Nem sikerült menteni az emlékeztetőt.", variant: "destructive" });
    }
  };

  const todayIso = new Date().toISOString().slice(0, 10);
  const canDelete = (a: UnifiedAppointment) =>
    ["REJECTED", "CANCELLED", "COMPLETED"].includes(a.status) || (Boolean(a.date) && a.date < todayIso);

  const handleDelete = async (a: UnifiedAppointment) => {
    if (!window.confirm("Biztosan törlöd ezt a régi/lezárt megtekintést a listádból?")) return;
    setBusyId(a.appointment_id);
    try {
      await appointmentsApi.deleteAppointment(a.appointment_id);
      await refreshAll();
      toast({ title: "Megtekintés törölve a listából" });
    } catch (err: any) {
      toast({ title: err?.message || "Nem sikerült törölni.", variant: "destructive" });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-black text-slate-950">
            <Building2 className="h-5 w-5 text-emerald-600" />
            Ingatlan megtekintéseim
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Minden ingatlanmegtekintési kérelmed és visszaigazolt időpontod egy helyen. A pontos lakcím kizárólag
            visszaigazolás után válik elérhetővé.
          </p>
        </div>
        <Button asChild size="sm" variant="outline" className="rounded-xl border-slate-200 text-xs font-bold">
          <Link href="/real-estate">Ingatlanok böngészése</Link>
        </Button>
      </div>

      {/* Filter pills */}
      <div className="flex flex-wrap gap-2">
        {[
          { id: "all", label: `Összes (${propertyViewings.length})` },
          {
            id: "active",
            label: `Aktív (${propertyViewings.filter((a) => ["PENDING", "CONFIRMED", "PROPOSED_NEW_TIME"].includes(a.status)).length})`,
          },
          {
            id: "confirmed",
            label: `Visszaigazolva (${propertyViewings.filter((a) => a.status === "CONFIRMED").length})`,
          },
          {
            id: "closed",
            label: `Lezárt (${propertyViewings.filter((a) => ["REJECTED", "CANCELLED", "COMPLETED"].includes(a.status)).length})`,
          },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setFilter(tab.id as any)}
            className={`rounded-xl border px-3.5 py-1.5 text-xs font-bold transition ${
              filter === tab.id
                ? "border-emerald-600 bg-emerald-600 text-white"
                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading && propertyViewings.length === 0 ? (
        <div className="flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white py-12 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />
          Ingatlan megtekintések betöltése...
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-10 text-center">
          <Building2 className="mx-auto h-9 w-9 text-slate-300" />
          <p className="mt-3 text-sm font-bold text-slate-900">Nincs megjeleníthető ingatlanmegtekintés</p>
          <p className="mt-1 text-xs text-slate-500">
            Válassz egy aktív ingatlant és foglalj biztonságos megtekintési időpontot.
          </p>
          <Button asChild size="sm" className="mt-4 rounded-xl bg-emerald-600 text-xs font-bold text-white hover:bg-emerald-700">
            <Link href="/real-estate">Ingatlanok megtekintése</Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((a) => {
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
                {/* Automatic 24h / 2h reminder strip */}
                {(a.reminder_2h_due || a.reminder_24h_due) && (
                  <div className="flex items-center justify-between gap-2 border-b border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-semibold text-emerald-900">
                    <span className="flex items-center gap-2">
                      <Bell className="h-3.5 w-3.5 text-emerald-700" />
                      {a.reminder_2h_due
                        ? `2 órán belül kezdődik az ingatlanmegtekintésed (${a.start_time} – ${a.approx_location})`
                        : `Holnap ingatlanmegtekintésed lesz (${a.start_time} – ${a.approx_location})`}
                    </span>
                  </div>
                )}

                <div className="p-4 sm:p-5">
                  <div className="flex flex-col gap-4 sm:flex-row">
                    {/* Property Cover Photo */}
                    <Link
                      href={`/real-estate/${a.listing_id}`}
                      className="flex h-36 w-full shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-100 sm:h-32 sm:w-44"
                    >
                      {a.cover_image ? (
                        <img src={a.cover_image} alt={a.title} className="h-full w-full object-cover" />
                      ) : (
                        <Building2 className="h-8 w-8 text-slate-300" />
                      )}
                    </Link>

                    {/* Core metadata */}
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span
                          className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${badge.className}`}
                        >
                          {a.status === "PROPOSED_NEW_TIME" ? badge.shortLabel : badge.label}
                        </span>
                        {a.price > 0 && (
                          <span className="text-sm font-black text-slate-900">
                            {formatHuf(a.price)}
                            {a.transaction_type === "rent" ? " / hó" : ""}
                          </span>
                        )}
                      </div>

                      <Link
                        href={`/real-estate/${a.listing_id}`}
                        className="block text-base font-bold text-slate-950 hover:text-emerald-700"
                      >
                        {a.title}
                      </Link>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
                        <span className="inline-flex items-center gap-1.5 font-medium">
                          <MapPin className="h-3.5 w-3.5 text-emerald-600" />
                          {a.approx_location || a.city}
                        </span>
                        <span className="inline-flex items-center gap-1.5 font-medium">
                          <User className="h-3.5 w-3.5 text-slate-400" />
                          Hirdető: {a.seller_name}
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
                      </div>
                    </div>
                  </div>

                  {/* Proposed new time interactive response */}
                  {a.status === "PROPOSED_NEW_TIME" && a.proposed_date && (
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
                          disabled={busyId === a.appointment_id}
                          onClick={() => {
                            setCounterId(counterId === a.appointment_id ? null : a.appointment_id);
                            setCounterDate(a.proposed_date || a.date);
                            setCounterTime(a.proposed_start_time || "16:00");
                          }}
                          className="rounded-xl border-slate-300 text-xs font-bold text-slate-700"
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
                            className="h-9 rounded-lg text-xs"
                          />
                          <Input
                            type="time"
                            value={counterTime}
                            onChange={(e) => setCounterTime(e.target.value)}
                            className="h-9 rounded-lg text-xs"
                          />
                          <Button
                            type="button"
                            size="sm"
                            disabled={busyId === a.appointment_id}
                            onClick={() => handleRequestOtherTime(a)}
                            className="h-9 rounded-lg bg-emerald-600 text-xs font-bold text-white hover:bg-emerald-700"
                          >
                            Kérés küldése
                          </Button>
                          <Input
                            value={counterNote}
                            onChange={(e) => setCounterNote(e.target.value)}
                            placeholder="Rövid megjegyzés a hirdetőnek (opcionális)"
                            className="h-9 rounded-lg text-xs sm:col-span-3"
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {a.seller_message && a.status !== "PROPOSED_NEW_TIME" && (
                    <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-700">
                      <strong className="text-slate-900">Hirdető üzenete:</strong> {a.seller_message}
                    </div>
                  )}

                  {/* Action footer */}
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
                          Pontos cím csak visszaigazolás után érhető el
                        </span>
                      )}

                      <Button
                        asChild
                        size="sm"
                        variant="outline"
                        className="rounded-xl border-slate-200 text-xs font-semibold text-slate-700"
                      >
                        <Link href={`/real-estate/${a.listing_id}`}>
                          <MessageSquare className="mr-1.5 h-3.5 w-3.5" />
                          Kapcsolat / Hirdetés
                        </Link>
                      </Button>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      {a.status === "CONFIRMED" && (
                        <div className="flex items-center gap-3 text-[11px] font-medium text-slate-600">
                          <label className="flex cursor-pointer items-center gap-1">
                            <input
                              type="checkbox"
                              checked={a.reminder_24h_enabled}
                              onChange={() => handleToggleReminder(a, "24h")}
                              className="accent-emerald-600"
                            />
                            24 órás
                          </label>
                          <label className="flex cursor-pointer items-center gap-1">
                            <input
                              type="checkbox"
                              checked={a.reminder_2h_enabled}
                              onChange={() => handleToggleReminder(a, "2h")}
                              className="accent-emerald-600"
                            />
                            2 órás
                          </label>
                        </div>
                      )}

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

                {/* Server-verified Exact Address & Navigation Drawer */}
                {isOpen && details && (
                  <div className="space-y-4 border-t border-emerald-200 bg-emerald-50/40 p-4 sm:p-5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="flex items-center gap-2 text-sm font-bold text-emerald-950">
                        <CheckCircle2 className="h-4 w-4 text-emerald-700" />
                        Visszaigazolt megtekintés részletei
                      </h3>
                      <div className="flex flex-wrap items-center gap-2">
                        {details.navigation_url && (
                          <a
                            href={details.navigation_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700"
                          >
                            <Navigation className="h-3.5 w-3.5" />
                            Térképes navigáció
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

                    {details.safe_visit_pass && (
                      <SafeVisitPassCard
                        pass={details.safe_visit_pass}
                        propertyTitle={a.title}
                        coverImage={a.cover_image}
                        exactAddressText={details.exact_address_text}
                        date={details.date}
                        startTime={details.start_time}
                        endTime={details.end_time}
                      />
                    )}

                    <div className="grid grid-cols-1 gap-3 rounded-xl border border-emerald-200 bg-white p-4 text-sm sm:grid-cols-2">
                      <div>
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                          Pontos cím
                        </span>
                        <p className="mt-1 font-bold text-slate-950">{details.exact_address_text}</p>
                        {details.exact_address?.parcelNumber && (
                          <p className="mt-0.5 text-xs text-slate-500">
                            Helyrajzi szám: {details.exact_address.parcelNumber}
                          </p>
                        )}
                      </div>
                      <div>
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                          Dátum és időpont
                        </span>
                        <p className="mt-1 font-bold text-slate-950">
                          {formatHuDate(details.date)} · {details.start_time} – {details.end_time}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-500">Hirdető: {details.seller_name}</p>
                      </div>
                    </div>

                    {(details.instructions || details.seller_message) && (
                      <div className="flex items-start gap-2.5 rounded-xl border border-slate-200 bg-white p-3.5 text-xs text-slate-700">
                        <Info className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                        <div>
                          <strong className="block text-slate-900">Hirdető megjegyzése / instrukció:</strong>
                          {details.instructions || details.seller_message}
                        </div>
                      </div>
                    )}

                    <ApproximateLocationMap
                      mode="exact"
                      latitude={details.latitude ?? null}
                      longitude={details.longitude ?? null}
                      label={details.exact_address_text}
                    />
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
