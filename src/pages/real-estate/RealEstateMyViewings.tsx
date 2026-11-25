import { useState } from "react";
import { Link } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useUser } from "@clerk/react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { realEstateApi } from "@/lib/realEstate/api";
import { VIEWING_STATUS_LABELS, formatHuf } from "@/lib/realEstate/config";
import type { ApprovedViewingDetails, ViewingRequest } from "@/lib/realEstate/types";
import { ApproximateLocationMap } from "@/components/realestate/ApproximateLocationMap";
import { SafeVisitPassCard } from "@/components/realestate/SafeVisitPassCard";
import {
  ArrowLeft,
  Bell,
  Calendar,
  CheckCircle2,
  Clock,
  Info,
  Loader2,
  Lock,
  MapPin,
  Phone,
  ShieldCheck,
  Trash2,
  XCircle,
} from "lucide-react";

export default function RealEstateMyViewings() {
  const { isSignedIn } = useUser();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [openDetailsId, setOpenDetailsId] = useState<string | null>(null);
  const [detailsCache, setDetailsCache] = useState<Record<string, ApprovedViewingDetails>>({});
  const [loadingDetailsId, setLoadingDetailsId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["real-estate-my-viewings"],
    queryFn: () => realEstateApi.getMyViewings(),
    enabled: Boolean(isSignedIn),
    refetchInterval: 10000,
    refetchOnWindowFocus: true,
  });

  const requesterViewings = (data?.items || []).filter((v) => v.role === "requester");
  const respondedViewings = requesterViewings.filter((v) =>
    ["APPROVED", "PROPOSED_NEW_TIME", "REJECTED", "REVOKED_BY_OWNER"].includes(v.status),
  );

  const handleLoadExactDetails = async (viewingId: string) => {
    if (openDetailsId === viewingId) {
      setOpenDetailsId(null);
      return;
    }
    if (detailsCache[viewingId]) {
      setOpenDetailsId(viewingId);
      return;
    }
    setLoadingDetailsId(viewingId);
    try {
      const details = await realEstateApi.getApprovedViewingDetails(viewingId);
      setDetailsCache((prev) => ({ ...prev, [viewingId]: details }));
      setOpenDetailsId(viewingId);
    } catch (err: any) {
      toast({
        title: "A pontos cím nem nyitható meg",
        description: err?.message || "A hirdető jóváhagyása és ellenőrzött telefonszám szükséges.",
        variant: "destructive",
      });
    } finally {
      setLoadingDetailsId(null);
    }
  };

  const handleCancel = async (v: ViewingRequest) => {
    if (!window.confirm("Biztosan lemondod a megtekintést? Az időpont automatikusan felszabadul.")) return;
    setBusyId(v.id);
    try {
      await realEstateApi.cancelViewing(v.id);
      queryClient.invalidateQueries({ queryKey: ["real-estate-my-viewings"] });
      toast({ title: "Megtekintés lemondva – az időpont felszabadult" });
    } catch (err: any) {
      toast({ title: err?.message || "Nem sikerült lemondani.", variant: "destructive" });
    } finally {
      setBusyId(null);
    }
  };

  const handleAcceptProposal = async (v: ViewingRequest) => {
    setBusyId(v.id);
    try {
      await realEstateApi.acceptProposedTime(v.id);
      queryClient.invalidateQueries({ queryKey: ["real-estate-my-viewings"] });
      toast({ title: "Új időpont elfogadva – a megtekintés részletei megnyíltak" });
    } catch (err: any) {
      toast({ title: err?.message || "Nem sikerült elfogadni az új időpontot.", variant: "destructive" });
    } finally {
      setBusyId(null);
    }
  };

  const handleToggleReminder = async (v: ViewingRequest, field: "24h" | "2h") => {
    const next24 = field === "24h" ? !v.reminder24hEnabled : v.reminder24hEnabled;
    const next2 = field === "2h" ? !v.reminder2hEnabled : v.reminder2hEnabled;
    try {
      await realEstateApi.updateViewingReminders(v.id, next24, next2);
      queryClient.invalidateQueries({ queryKey: ["real-estate-my-viewings"] });
    } catch (err: any) {
      toast({ title: err?.message || "Nem sikerült menteni az emlékeztetőt.", variant: "destructive" });
    }
  };

  const todayIso = new Date().toISOString().slice(0, 10);
  const canDeleteViewing = (v: ViewingRequest) =>
    ["REJECTED", "REVOKED_BY_OWNER", "CANCELLED_BY_REQUESTER"].includes(v.status) || v.date < todayIso;

  const handleDeleteFromList = async (v: ViewingRequest) => {
    if (!window.confirm("Biztosan törlöd ezt a régi/lemondott megtekintést a listádból?")) return;
    setBusyId(v.id);
    try {
      await realEstateApi.deleteViewing(v.id);
      queryClient.invalidateQueries({ queryKey: ["real-estate-my-viewings"] });
      toast({ title: "Törölve a listából" });
    } catch (err: any) {
      toast({ title: err?.message || "Nem sikerült törölni.", variant: "destructive" });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Layout>
      <main className="min-h-screen bg-slate-50 pb-20">
        <div className="border-b border-slate-200 bg-white px-4 py-8 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl">
            <Link
              href="/real-estate"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-emerald-700"
            >
              <ArrowLeft className="h-4 w-4" />
              Vissza az ingatlanokhoz
            </Link>
            <h1 className="mt-3 text-2xl font-black text-slate-950 sm:text-3xl">Megtekintéseim</h1>
            <p className="mt-1 text-sm text-slate-600">
              Itt követheted a megtekintési kérelmeidet, és jóváhagyás után itt nyithatod meg a pontos lakcímet és
              útvonalat.
            </p>
          </div>
        </div>

        <div className="mx-auto max-w-5xl space-y-5 px-4 py-8 sm:px-6 lg:px-8">
          {respondedViewings.length > 0 && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4 text-xs text-emerald-950">
              <p className="flex items-center gap-2 font-bold text-emerald-900">
                <Bell className="h-4 w-4 text-emerald-700" />
                Az eladók visszajelzései ({respondedViewings.length} megválaszolt kérelem)
              </p>
              <p className="mt-1 text-emerald-900/80">
                Az állapotok automatikusan frissülnek. Jóváhagyott megtekintésnél nyisd meg lent a „Megtekintés
                részletei” gombot a pontos címhez és térképhez.
              </p>
            </div>
          )}

          {!isSignedIn ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center">
              <p className="text-sm font-bold text-slate-700">A megtekintések megtekintéséhez jelentkezz be.</p>
              <Button asChild className="mt-4 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700">
                <Link href="/auth/login">Bejelentkezés</Link>
              </Button>
            </div>
          ) : isLoading ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-sm text-slate-500">
              Megtekintések betöltése...
            </div>
          ) : requesterViewings.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center">
              <Calendar className="mx-auto h-10 w-10 text-slate-300" />
              <h2 className="mt-3 text-base font-bold text-slate-900">Még nincs megtekintési kérelmed</h2>
              <p className="mt-1 text-xs text-slate-500">
                Böngéssz az aktív ingatlanok között, és válassz szabad megtekintési időpontot.
              </p>
              <Button asChild className="mt-5 rounded-xl bg-emerald-600 text-xs font-bold text-white hover:bg-emerald-700">
                <Link href="/real-estate">Ingatlanok böngészése</Link>
              </Button>
            </div>
          ) : (
            requesterViewings.map((v) => {
              const badge = VIEWING_STATUS_LABELS[v.status];
              const details = detailsCache[v.id];
              const isOpen = openDetailsId === v.id && details;
              const isActive = ["PENDING", "APPROVED", "PROPOSED_NEW_TIME"].includes(v.status);

              return (
                <div key={v.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                  {/* Upcoming reminder alert banner */}
                  {(v.reminder2hDue || v.reminder24hDue) && (
                    <div className="flex items-center gap-2 border-b border-emerald-200 bg-emerald-50 px-5 py-2.5 text-xs font-bold text-emerald-900">
                      <Bell className="h-4 w-4 text-emerald-700" />
                      {v.reminder2hDue
                        ? "Emlékeztető: a megtekintés 2 órán belül kezdődik."
                        : "Emlékeztető: a megtekintés 24 órán belül esedékes."}
                    </div>
                  )}

                  <div className="p-5 sm:p-6">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${badge.className}`}>
                            {badge.label}
                          </span>
                          <span className="text-xs font-semibold text-slate-500">
                            {formatHuf(v.propertyPrice)}
                            {v.propertyTransactionType === "rent" ? " / hó" : ""}
                          </span>
                        </div>
                        <Link
                          href={`/real-estate/${v.propertyId}`}
                          className="block text-lg font-bold text-slate-950 hover:text-emerald-700"
                        >
                          {v.propertyTitle}
                        </Link>
                        <p className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                          <MapPin className="h-3.5 w-3.5 text-emerald-600" />
                          {v.propertyPublicLocation}
                        </p>
                      </div>

                      <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs">
                        <p className="flex items-center gap-1.5 font-bold text-slate-900">
                          <Calendar className="h-3.5 w-3.5 text-emerald-600" />
                          {v.date}
                        </p>
                        <p className="mt-1 flex items-center gap-1.5 font-semibold text-slate-600">
                          <Clock className="h-3.5 w-3.5 text-slate-400" />
                          {v.startTime} – {v.endTime} ({v.durationMinutes} perc)
                        </p>
                      </div>
                    </div>

                    {/* Proposed new time block */}
                    {v.status === "PROPOSED_NEW_TIME" && v.proposedDate && (
                      <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50/70 p-4 text-xs text-blue-950">
                        <p className="font-bold">A hirdető új időpontot javasolt:</p>
                        <p className="mt-1 text-sm font-black">
                          {v.proposedDate} · {v.proposedStartTime} – {v.proposedEndTime}
                        </p>
                        {v.proposedNote && <p className="mt-1 text-blue-900">{v.proposedNote}</p>}
                        <div className="mt-3 flex flex-wrap gap-2">
                          <Button
                            type="button"
                            size="sm"
                            disabled={busyId === v.id}
                            onClick={() => handleAcceptProposal(v)}
                            className="rounded-xl bg-emerald-600 text-xs font-bold text-white hover:bg-emerald-700"
                          >
                            <CheckCircle2 className="mr-1.5 h-4 w-4" />
                            Javasolt időpont elfogadása
                          </Button>
                        </div>
                      </div>
                    )}

                    {v.ownerResponseNote && v.status !== "PROPOSED_NEW_TIME" && (
                      <p className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
                        <strong>Hirdető üzenete:</strong> {v.ownerResponseNote}
                      </p>
                    )}

                    {/* Action buttons */}
                    <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
                      <div className="flex flex-wrap items-center gap-2">
                        {v.status === "APPROVED" ? (
                          <Button
                            type="button"
                            onClick={() => handleLoadExactDetails(v.id)}
                            disabled={loadingDetailsId === v.id}
                            className="rounded-xl bg-emerald-600 text-xs font-bold text-white hover:bg-emerald-700"
                          >
                            {loadingDetailsId === v.id ? (
                              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                            ) : (
                              <ShieldCheck className="mr-1.5 h-4 w-4" />
                            )}
                            {isOpen ? "Megtekintés részleteinek elrejtése" : "Megtekintés részletei (pontos cím)"}
                          </Button>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500">
                            <Lock className="h-3.5 w-3.5" />
                            A pontos cím a hirdető jóváhagyása után válik láthatóvá.
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-3">
                        {v.status === "APPROVED" && (
                          <div className="flex items-center gap-3 text-xs text-slate-600">
                            <label className="flex cursor-pointer items-center gap-1.5">
                              <input
                                type="checkbox"
                                checked={v.reminder24hEnabled}
                                onChange={() => handleToggleReminder(v, "24h")}
                                className="accent-emerald-600"
                              />
                              24 órás értesítés
                            </label>
                            <label className="flex cursor-pointer items-center gap-1.5">
                              <input
                                type="checkbox"
                                checked={v.reminder2hEnabled}
                                onChange={() => handleToggleReminder(v, "2h")}
                                className="accent-emerald-600"
                              />
                              2 órás értesítés
                            </label>
                          </div>
                        )}

                        {isActive && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={busyId === v.id}
                            onClick={() => handleCancel(v)}
                            className="rounded-xl border-rose-200 text-xs font-bold text-rose-700 hover:bg-rose-50"
                          >
                            <XCircle className="mr-1.5 h-4 w-4" />
                            Megtekintés lemondása
                          </Button>
                        )}

                        {canDeleteViewing(v) && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={busyId === v.id}
                            onClick={() => handleDeleteFromList(v)}
                            className="rounded-xl border-slate-200 text-xs font-bold text-slate-600 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700"
                          >
                            <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                            Törlés
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Protected "Megtekintés részletei" Drawer (only when server verified APPROVED + phone_verified) */}
                  {isOpen && details && (
                    <div className="space-y-4 border-t border-emerald-200 bg-emerald-50/40 p-5 sm:p-6">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <h3 className="flex items-center gap-2 text-base font-bold text-emerald-950">
                          <CheckCircle2 className="h-5 w-5 text-emerald-700" />
                          Megtekintés részletei
                        </h3>
                        <div className="flex flex-wrap items-center gap-3 text-xs font-semibold text-emerald-800">
                          <span>Hirdető: {details.ownerName}</span>
                          {details.ownerPhone && (
                            <a
                              href={`tel:${details.ownerPhone}`}
                              className="inline-flex items-center gap-1 rounded-lg border border-emerald-300 bg-white px-2.5 py-1 font-bold text-emerald-800 hover:bg-emerald-50"
                            >
                              <Phone className="h-3.5 w-3.5" />
                              {details.ownerPhone}
                            </a>
                          )}
                        </div>
                      </div>

                      {details.safeVisitPass && (
                        <SafeVisitPassCard
                          pass={details.safeVisitPass}
                          propertyTitle={v.propertyTitle}
                          coverImage={v.propertyCoverImage}
                          exactAddressText={`${details.exactAddress.postalCode} ${details.exactAddress.city}${details.exactAddress.district ? `, ${details.exactAddress.district}` : ""}, ${details.exactAddress.streetName} ${details.exactAddress.streetType} ${details.exactAddress.houseNumber}${details.exactAddress.floorDoor ? `, ${details.exactAddress.floorDoor}` : ""}`}
                          date={details.date}
                          startTime={details.startTime}
                          endTime={details.endTime}
                        />
                      )}

                      <div className="grid grid-cols-1 gap-4 rounded-xl border border-emerald-200 bg-white p-4 text-sm sm:grid-cols-2">
                        <div>
                          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                            Pontos cím
                          </span>
                          <p className="mt-1 font-black text-slate-950">
                            {details.exactAddress.postalCode} {details.exactAddress.city}
                            {details.exactAddress.district ? `, ${details.exactAddress.district}` : ""}
                          </p>
                          <p className="font-bold text-slate-800">
                            {details.exactAddress.streetName} {details.exactAddress.streetType}{" "}
                            {details.exactAddress.houseNumber}
                            {details.exactAddress.floorDoor ? `, ${details.exactAddress.floorDoor}` : ""}
                          </p>
                          {details.exactAddress.parcelNumber && (
                            <p className="mt-1 text-xs text-slate-500">
                              Helyrajzi szám: {details.exactAddress.parcelNumber}
                            </p>
                          )}
                        </div>
                        <div>
                          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                            Időpont
                          </span>
                          <p className="mt-1 font-black text-slate-950">
                            {details.date} · {details.startTime} – {details.endTime}
                          </p>
                          <p className="text-xs text-slate-500">Időtartam: {details.durationMinutes} perc</p>
                        </div>
                      </div>

                      {details.exactAddress.viewingInstructions && (
                        <div className="flex items-start gap-2.5 rounded-xl border border-slate-200 bg-white p-3.5 text-xs text-slate-700">
                          <Info className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                          <div>
                            <strong className="block text-slate-900">Hirdetői instrukció:</strong>
                            {details.exactAddress.viewingInstructions}
                          </div>
                        </div>
                      )}

                      <ApproximateLocationMap
                        mode="exact"
                        latitude={details.exactAddress.latitude}
                        longitude={details.exactAddress.longitude}
                        label={`${details.exactAddress.postalCode} ${details.exactAddress.city}, ${details.exactAddress.streetName} ${details.exactAddress.streetType} ${details.exactAddress.houseNumber}`}
                      />
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </main>
    </Layout>
  );
}
