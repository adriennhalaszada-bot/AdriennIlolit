import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useUser } from "@clerk/react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { vehiclesApi } from "@/lib/vehicles/api";
import { realEstateApi } from "@/lib/realEstate/api";
import {
  EQUIPMENT_GROUPS,
  POWERTRAIN_LABELS,
  VEHICLE_ABUSE_REPORT_REASONS,
  VEHICLE_LEGAL_DECLARATION_VERSION,
  formatHuf,
  formatHuDateDot,
  formatKm,
  formatPower,
  getCategoryLabel,
  getClimateLabel,
  getConditionLabel,
  getDocumentStatusLabel,
  getDriveLabel,
  getFuelLabel,
  getTransmissionLabel,
} from "@/lib/vehicles/config";
import type { ApprovedVehicleBookingDetails, VehicleBookingKind } from "@/lib/vehicles/types";
import { PhoneVerificationModal } from "@/components/realestate/PhoneVerificationModal";
import { VehicleLegalModal, type VehicleLegalAcceptPayload } from "@/components/vehicles/VehicleLegalModal";
import {
  AlertTriangle,
  ArrowLeft,
  Calendar,
  Car,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  ExternalLink,
  FileText,
  Flag,
  Heart,
  Loader2,
  Lock,
  MapPin,
  MessageSquare,
  Navigation,
  Phone,
  Scale,
  Send,
  ShieldCheck,
} from "lucide-react";

export default function VehicleDetail() {
  const { id } = useParams<{ id: string }>();
  const { isSignedIn, user } = useUser();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [photoIdx, setPhotoIdx] = useState(0);
  const [bookingKind, setBookingKind] = useState<VehicleBookingKind>("VIEWING");
  const [selectedSlotId, setSelectedSlotId] = useState("");
  const [customDate, setCustomDate] = useState(() => new Date(Date.now() + 86_400_000).toISOString().slice(0, 10));
  const [customTime, setCustomTime] = useState("16:00");
  const [requesterName, setRequesterName] = useState("");
  const [bookingMessage, setBookingMessage] = useState("");
  const [hasLicenseDeclared, setHasLicenseDeclared] = useState(false);
  const [phoneModalOpen, setPhoneModalOpen] = useState(false);
  const [legalModalOpen, setLegalModalOpen] = useState(false);
  const [submittingBooking, setSubmittingBooking] = useState(false);
  const [approvedDetails, setApprovedDetails] = useState<ApprovedVehicleBookingDetails | null>(null);

  // Direct message & abuse report
  const [msgText, setMsgText] = useState("");
  const [sendingMsg, setSendingMsg] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportCode, setReportCode] = useState(VEHICLE_ABUSE_REPORT_REASONS[0].code);
  const [reportDetails, setReportDetails] = useState("");
  const [sendingReport, setSendingReport] = useState(false);

  const { data: vehicle, isLoading, isError, refetch } = useQuery({
    queryKey: ["vehicle-detail", id],
    queryFn: () => vehiclesApi.getVehicle(id || ""),
    enabled: Boolean(id),
  });

  const { data: phoneStatus, refetch: refetchPhone } = useQuery({
    queryKey: ["real-estate-phone-status"],
    queryFn: () => realEstateApi.getPhoneStatus(),
    enabled: Boolean(isSignedIn),
  });

  const { data: myBookingsData, refetch: refetchBookings } = useQuery({
    queryKey: ["vehicle-my-bookings", id],
    queryFn: () => vehiclesApi.getMyBookings(id),
    enabled: Boolean(isSignedIn && id),
    refetchInterval: 10000,
  });

  const { data: similarData } = useQuery({
    queryKey: ["vehicle-similar", vehicle?.category, vehicle?.brand],
    queryFn: () => vehiclesApi.listVehicles({ category: vehicle!.category }),
    enabled: Boolean(vehicle?.category),
  });

  // Record in recently viewed (#52)
  useEffect(() => {
    if (!id) return;
    try {
      const prev: string[] = JSON.parse(localStorage.getItem("ilolit_recent_vehicles") || "[]");
      const next = [id, ...prev.filter((x) => x !== id)].slice(0, 12);
      localStorage.setItem("ilolit_recent_vehicles", JSON.stringify(next));
    } catch {
      // ignore
    }
  }, [id]);

  // Dynamic Hungarian title (#58)
  useEffect(() => {
    if (!vehicle) return;
    document.title = `${vehicle.brand} ${vehicle.model} ${vehicle.typeVariant || ""} (${vehicle.manufactureYear}) | ILOLIT Járművek`;
  }, [vehicle]);

  const myBooking = useMemo(
    () => (myBookingsData?.items || []).find((b) => b.role === "requester") || null,
    [myBookingsData],
  );

  const similarVehicles = useMemo(
    () => (similarData?.items || []).filter((v) => v.id !== id).slice(0, 4),
    [similarData, id],
  );

  const openSlotsForKind = useMemo(() => {
    if (!vehicle) return [];
    return (vehicle.viewingSlots || []).filter((s) => !s.slotKind || s.slotKind === bookingKind);
  }, [vehicle, bookingKind]);

  const handleOpenBookingFlow = (kind: VehicleBookingKind) => {
    setBookingKind(kind);
    if (!isSignedIn) {
      toast({ title: "A megtekintési vagy tesztvezetési kérelemhez jelentkezz be.", variant: "destructive" });
      return;
    }
    if (kind === "TEST_DRIVE" && !hasLicenseDeclared) {
      toast({
        title: `A tesztvezetéshez erősítsd meg, hogy rendelkezel érvényes ${vehicle?.testDriveSettings?.requiredLicenseCategory || "B"} kategóriás jogosítvánnyal.`,
        variant: "destructive",
      });
      return;
    }
    if (!phoneStatus?.phoneVerified) {
      setPhoneModalOpen(true);
      return;
    }
    setLegalModalOpen(true);
  };

  const submitBookingWithLegal = async (legal: VehicleLegalAcceptPayload) => {
    if (!vehicle) return;
    setSubmittingBooking(true);
    try {
      await vehiclesApi.createBooking({
        vehicleId: vehicle.id,
        bookingKind,
        slotId: selectedSlotId || undefined,
        date: selectedSlotId ? undefined : customDate,
        startTime: selectedSlotId ? undefined : customTime,
        requesterName: requesterName.trim() || user?.fullName || user?.username || "Érdeklődő",
        message: bookingMessage.trim() || undefined,
        declaration1Accepted: legal.declaration1Accepted,
        declaration2Accepted: legal.declaration2Accepted,
        legalNoticeViewed: legal.legalNoticeViewed,
        declarationVersion: VEHICLE_LEGAL_DECLARATION_VERSION,
        licenseCategoryConfirmed:
          bookingKind === "TEST_DRIVE" ? vehicle.testDriveSettings?.requiredLicenseCategory || "B" : undefined,
        hasRequiredLicenseDeclared: bookingKind === "TEST_DRIVE" ? hasLicenseDeclared : undefined,
      });
      setLegalModalOpen(false);
      setBookingMessage("");
      await refetchBookings();
      queryClient.invalidateQueries({ queryKey: ["unified-appointments"] });
      toast({
        title: bookingKind === "TEST_DRIVE" ? "Tesztvezetési kérelem elküldve" : "Megtekintési kérelem elküldve",
        description: "A hirdető visszaigazolása után azonnal értesítést kapsz.",
      });
    } catch (err: any) {
      toast({ title: err?.message || "Nem sikerült elküldeni a kérelmet.", variant: "destructive" });
    } finally {
      setSubmittingBooking(false);
    }
  };

  const handleLoadApprovedDetails = async (bookingId: string) => {
    try {
      const det = await vehiclesApi.getApprovedBookingDetails(bookingId);
      setApprovedDetails(det);
    } catch (err: any) {
      toast({ title: err?.message || "A pontos helyszín még nem nyitható meg.", variant: "destructive" });
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vehicle || !msgText.trim()) return;
    setSendingMsg(true);
    try {
      await vehiclesApi.sendMessage(vehicle.id, msgText.trim(), vehicle.ownerId, user?.fullName || "Érdeklődő");
      setMsgText("");
      toast({ title: "Üzenet elküldve a hirdetőnek." });
    } catch (err: any) {
      toast({ title: err?.message || "Nem sikerült elküldeni.", variant: "destructive" });
    } finally {
      setSendingMsg(false);
    }
  };

  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vehicle) return;
    const chosen = VEHICLE_ABUSE_REPORT_REASONS.find((r) => r.code === reportCode) || VEHICLE_ABUSE_REPORT_REASONS[0];
    setSendingReport(true);
    try {
      await vehiclesApi.reportAbuse({
        vehicleId: vehicle.id,
        targetUserId: vehicle.ownerId,
        reasonCode: chosen.code,
        reason: chosen.label,
        details: reportDetails.trim() || undefined,
      });
      setReportOpen(false);
      setReportDetails("");
      toast({ title: "Bejelentés rögzítve moderációra." });
    } catch (err: any) {
      toast({ title: err?.message || "Hiba a bejelentés során.", variant: "destructive" });
    } finally {
      setSendingReport(false);
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="mx-auto max-w-6xl px-4 py-20 text-center text-sm text-slate-500 flex items-center justify-center gap-2">
          <Loader2 className="h-5 w-5 animate-spin text-emerald-600" />
          Jármű adatlapjának betöltése...
        </div>
      </Layout>
    );
  }

  if (isError || !vehicle) {
    return (
      <Layout>
        <div className="mx-auto max-w-lg px-4 py-20 text-center space-y-4">
          <Car className="mx-auto h-10 w-10 text-slate-300" />
          <h1 className="text-xl font-black text-slate-900">A járműhirdetés nem található</h1>
          <Button asChild className="rounded-xl bg-emerald-600 text-white">
            <Link href="/vehicles">Vissza a Járművekhez</Link>
          </Button>
        </div>
      </Layout>
    );
  }

  const photos = vehicle.photos || [];
  const activePhoto = photos[photoIdx] || photos[0];
  const eqSet = new Set(vehicle.equipment || []);

  return (
    <Layout>
      <main className="min-h-screen bg-slate-50 pb-20">
        {/* Top breadcrumb */}
        <div className="border-b border-slate-200 bg-white px-4 py-3 sm:px-6 lg:px-8">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 text-slate-600">
              <Link href="/vehicles" className="inline-flex items-center gap-1 font-bold hover:text-emerald-700">
                <ArrowLeft className="h-3.5 w-3.5" />
                Járművek
              </Link>
              <span>/</span>
              <span>{getCategoryLabel(vehicle.category)}</span>
              <span>/</span>
              <span className="font-bold text-slate-900">{vehicle.brand} {vehicle.model}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-400 font-semibold">Azonosító: {vehicle.listingCode}</span>
              {isSignedIn && !vehicle.isOwner && (
                <button
                  type="button"
                  onClick={() => setReportOpen(true)}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 font-bold text-slate-600 hover:text-rose-600"
                >
                  <Flag className="h-3.5 w-3.5" />
                  Jelentés
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-7 px-4 py-7 sm:px-6 lg:grid-cols-12 lg:px-8">
          {/* LEFT 8 COLS: 1..11 Structured Hungarian Technical Sheet (#40) */}
          <div className="space-y-6 lg:col-span-8">
            {/* 1. Full name & 3. Price Header */}
            <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-bold">
                    <span className="rounded-md bg-emerald-50 px-2.5 py-0.5 text-emerald-800">{getCategoryLabel(vehicle.category)}</span>
                    <span className="rounded-md bg-slate-100 px-2.5 py-0.5 text-slate-700">{getConditionLabel(vehicle.condition)}</span>
                    {vehicle.factoryBodyDesignation && (
                      <span className="rounded-md bg-slate-100 px-2.5 py-0.5 text-slate-700">{vehicle.factoryBodyDesignation}</span>
                    )}
                  </div>
                  <h1 className="text-2xl font-black text-slate-950 sm:text-3xl">
                    {vehicle.brand} {vehicle.model} {vehicle.typeVariant || ""}
                  </h1>
                  <p className="text-sm text-slate-600">{vehicle.title}</p>
                  <p className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                    <MapPin className="h-4 w-4 text-emerald-600" />
                    {vehicle.publicLocation?.city || "Magyarország"}
                    {vehicle.publicLocation?.district ? `, ${vehicle.publicLocation.district}` : ""}
                    {vehicle.publicLocation?.publicDealershipAddress ? ` · ${vehicle.publicLocation.publicDealershipAddress}` : ""}
                  </p>
                </div>

                <div className="text-left sm:text-right">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Vételár</p>
                  <p className="text-3xl font-black text-emerald-700">{formatHuf(vehicle.pricing?.priceHuf)}</p>
                  <div className="mt-1 flex flex-wrap sm:justify-end gap-1.5 text-[11px] font-semibold text-slate-500">
                    {vehicle.pricing?.negotiable && <span>Alkuképes</span>}
                    {vehicle.pricing?.financingAvailable && <span>· Finanszírozható</span>}
                    {vehicle.pricing?.tradeInPossible && <span>· Beszámítás</span>}
                  </div>
                </div>
              </div>
            </section>

            {/* 2. Large Photo Gallery */}
            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
              <div className="relative aspect-[16/10] bg-slate-100">
                {activePhoto?.url ? (
                  <img
                    src={activePhoto.url}
                    alt={activePhoto.caption || vehicle.title}
                    style={{ transform: `rotate(${activePhoto.rotation || 0}deg)` }}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-slate-300">
                    <Car className="h-16 w-16" />
                  </div>
                )}
                {photos.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={() => setPhotoIdx((i) => (i - 1 + photos.length) % photos.length)}
                      className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 shadow"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setPhotoIdx((i) => (i + 1) % photos.length)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 shadow"
                    >
                      <ChevronRight className="h-5 w-5" />
                    </button>
                    <span className="absolute bottom-3 right-3 rounded-lg bg-slate-900/75 px-2.5 py-1 text-xs font-bold text-white">
                      {photoIdx + 1} / {photos.length}
                    </span>
                  </>
                )}
              </div>
              {photos.length > 1 && (
                <div className="flex gap-2 overflow-x-auto border-t border-slate-100 p-3">
                  {photos.map((p, i) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setPhotoIdx(i)}
                      className={`h-16 w-24 shrink-0 overflow-hidden rounded-lg border-2 ${
                        i === photoIdx ? "border-emerald-600" : "border-transparent opacity-70"
                      }`}
                    >
                      <img src={p.url} alt="" className="h-full w-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </section>

            {/* 4 & 5 & 6. General, Vehicle & Engine Technical Tables */}
            <section className="rounded-2xl border border-slate-200 bg-white p-6 space-y-6">
              <div>
                <h2 className="text-base font-black text-slate-950 mb-3">Általános adatok és járműadatok</h2>
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2 text-xs">
                  {[
                    ["Márka", vehicle.brand],
                    ["Modell", vehicle.model],
                    ["Típus / generáció", [vehicle.typeVariant, vehicle.generation].filter(Boolean).join(" · ") || "—"],
                    ["Kivitel", vehicle.bodyType],
                    ["Gyártási év", vehicle.manufactureYear],
                    ["Első forgalomba helyezés", vehicle.firstRegistration || "—"],
                    ["Kilométeróra-állás", formatKm(vehicle.mileageKm)],
                    ["Állapot", getConditionLabel(vehicle.condition)],
                    ["Ajtók / Ülőhelyek", `${vehicle.doors || "—"} ajtó / ${vehicle.seats || "—"} fő`],
                    ["Külső szín", `${vehicle.exteriorColor || "—"}${vehicle.metallicPaint ? " (metál)" : ""}`],
                    ["Kárpit", [vehicle.upholstery, vehicle.interiorColor].filter(Boolean).join(", ") || "—"],
                    ["Saját / Össztömeg", `${vehicle.curbWeightKg ? `${vehicle.curbWeightKg} kg` : "—"} / ${vehicle.grossWeightKg ? `${vehicle.grossWeightKg} kg` : "—"}`],
                    ["Csomagtartó", vehicle.trunkVolumeL ? `${vehicle.trunkVolumeL} l` : "—"],
                    ["Felszereltségi szint", vehicle.trimLevel || "—"],
                  ].map(([k, v]) => (
                    <div key={String(k)} className="flex justify-between border-b border-slate-100 py-1.5">
                      <dt className="text-slate-500">{k}</dt>
                      <dd className="font-bold text-slate-900">{String(v)}</dd>
                    </div>
                  ))}
                </dl>
              </div>

              <div className="border-t border-slate-100 pt-5">
                <h2 className="text-base font-black text-slate-950 mb-3">Motoradatok és hajtáslánc</h2>
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2 text-xs">
                  {[
                    ["Üzemanyag", getFuelLabel(vehicle.fuelType)],
                    ["Hajtásrendszer", POWERTRAIN_LABELS[vehicle.powertrainSystem] || "—"],
                    ["Hengerűrtartalom", vehicle.displacementCc ? `${vehicle.displacementCc} cm³` : "—"],
                    ["Motor teljesítménye", formatPower(vehicle.powerKw, vehicle.powerHp)],
                    ...(vehicle.systemPowerHp
                      ? [["Hibrid rendszerteljesítmény", formatPower(vehicle.systemPowerKw, vehicle.systemPowerHp)]]
                      : []),
                    ["Sebességváltó", `${getTransmissionLabel(vehicle.transmission)}${vehicle.gearsCount ? ` (${vehicle.gearsCount} fokozat)` : ""}`],
                    ["Hajtás", getDriveLabel(vehicle.driveType)],
                    ["Klíma fajtája", getClimateLabel(vehicle.climateType)],
                    ["Környezetvédelmi osztály", vehicle.euroClass || "—"],
                    ["Gyári fogyasztás", vehicle.factoryConsumptionL ? `${vehicle.factoryConsumptionL} l/100 km` : "—"],
                    ["CO₂-kibocsátás", vehicle.co2EmissionsGkm ? `${vehicle.co2EmissionsGkm} g/km` : "—"],
                    ["Motorkód", vehicle.engineCode || "—"],
                  ].map(([k, v]) => (
                    <div key={String(k)} className="flex justify-between border-b border-slate-100 py-1.5">
                      <dt className="text-slate-500">{k}</dt>
                      <dd className="font-bold text-slate-900">{String(v)}</dd>
                    </div>
                  ))}
                </dl>
              </div>

              {/* EV / PHEV Block */}
              {vehicle.evSpecs && (
                <div className="border-t border-slate-100 pt-5">
                  <h2 className="text-base font-black text-emerald-900 mb-3">Elektromos és tölthető hibrid műszaki adatok</h2>
                  <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2 text-xs">
                    {[
                      ["Akkumulátorkapacitás", vehicle.evSpecs.batteryCapacityKwh ? `${vehicle.evSpecs.batteryCapacityKwh} kWh` : "—"],
                      ["Akkumulátor állapota (SoH)", vehicle.evSpecs.batterySohPercent ? `${vehicle.evSpecs.batterySohPercent}%` : "—"],
                      ["Gyári WLTP hatótáv", vehicle.evSpecs.wltpRangeKm ? `${vehicle.evSpecs.wltpRangeKm} km` : "—"],
                      ["Tapasztalati autópályás hatótáv (hirdetői adat)", vehicle.evSpecs.highwayRangeKm ? `${vehicle.evSpecs.highwayRangeKm} km` : "—"],
                      ["Tapasztalati téli / városi hatótáv", `${vehicle.evSpecs.winterRangeKm || "—"} / ${vehicle.evSpecs.cityRangeKm || "—"} km`],
                      ["Elektromos fogyasztás", vehicle.evSpecs.consumptionKwhPer100km ? `${vehicle.evSpecs.consumptionKwhPer100km} kWh/100 km` : "—"],
                      ["AC töltés", vehicle.evSpecs.acPowerKw ? `${vehicle.evSpecs.acConnector || "Type 2"} · ${vehicle.evSpecs.acPowerKw} kW` : "—"],
                      ["DC gyorstöltés", vehicle.evSpecs.dcPowerKw ? `${vehicle.evSpecs.dcConnector || "CCS"} · ${vehicle.evSpecs.dcPowerKw} kW` : "—"],
                    ].map(([k, v]) => (
                      <div key={String(k)} className="flex justify-between border-b border-slate-100 py-1.5">
                        <dt className="text-slate-500">{k}</dt>
                        <dd className="font-bold text-slate-900">{String(v)}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              )}
            </section>

            {/* 7 & 8. Condition, History & Documents */}
            <section className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4">
              <h2 className="text-base font-black text-slate-950">Állapot, okmányok és előélet</h2>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2 text-xs">
                {[
                  ["Okmányok jellege", getDocumentStatusLabel(vehicle.history?.documentStatus || "ervenyes_magyar")],
                  ["Műszaki vizsga érvényessége", vehicle.history?.motValidUntil || "—"],
                  ["Tulajdonosok száma", vehicle.history?.firstOwner ? "Első tulajdonos" : vehicle.history?.ownersCount || "—"],
                  ["Szervizkönyv", vehicle.history?.hasDigitalServiceBook ? "Digitális szervizkönyv" : vehicle.history?.hasServiceBook ? "Vezetett szervizkönyv" : "—"],
                  ["Utolsó szerviz", vehicle.history?.lastServiceDate ? `${vehicle.history.lastServiceDate}${vehicle.history.lastServiceKm ? ` (${formatKm(vehicle.history.lastServiceKm)})` : ""}` : "—"],
                  ["Kulcsok száma", vehicle.history?.keysCount || "—"],
                  ...(vehicle.history?.vin ? [["Alvázszám (VIN)", vehicle.history.vin]] : []),
                ].map(([k, v]) => (
                  <div key={String(k)} className="flex justify-between border-b border-slate-100 py-1.5">
                    <dt className="text-slate-500">{k}</dt>
                    <dd className="font-bold text-slate-900">{String(v)}</dd>
                  </div>
                ))}
              </dl>

              {vehicle.conditionDeclarations?.damageFreeClaimed && (
                <p className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs text-slate-700">
                  <strong>Hirdetői nyilatkozat:</strong> a hirdető sérülésmentesként jelölte meg a járművet (hirdetői
                  nyilatkozat, nem független műszaki vizsgálat).
                </p>
              )}

              {/* 11. Documents (JSZP / Inspection) */}
              {vehicle.documents && vehicle.documents.length > 0 && (
                <div className="space-y-2 pt-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Feltöltött dokumentumok</h3>
                  <div className="flex flex-wrap gap-2">
                    {vehicle.documents.map((doc) => (
                      <a
                        key={doc.id}
                        href={doc.url}
                        download={doc.name}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-800 hover:border-emerald-400"
                      >
                        <FileText className="h-4 w-4 text-emerald-600" />
                        {doc.name}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </section>

            {/* 9. Structured Equipment */}
            <section className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4">
              <h2 className="text-base font-black text-slate-950">Felszereltség ({vehicle.equipment?.length || 0} tétel)</h2>
              <div className="space-y-4">
                {EQUIPMENT_GROUPS.map((grp) => {
                  const present = grp.items.filter((i) => eqSet.has(i.id));
                  if (present.length === 0) return null;
                  return (
                    <div key={grp.id} className="space-y-1.5">
                      <h3 className="text-xs font-bold text-slate-600">{grp.label}</h3>
                      <div className="flex flex-wrap gap-1.5">
                        {present.map((it) => (
                          <span key={it.id} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-800">
                            <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                            {it.label}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* 10. Description */}
            {vehicle.description && (
              <section className="rounded-2xl border border-slate-200 bg-white p-6 space-y-2">
                <h2 className="text-base font-black text-slate-950">Hirdetői leírás</h2>
                <p className="whitespace-pre-line text-sm leading-relaxed text-slate-700">{vehicle.description}</p>
              </section>
            )}

            {/* 15. Similar vehicles */}
            {similarVehicles.length > 0 && (
              <section className="rounded-2xl border border-slate-200 bg-white p-6 space-y-3">
                <h2 className="text-base font-black text-slate-950">Hasonló járművek</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {similarVehicles.map((sv) => (
                    <Link key={sv.id} href={`/vehicles/${sv.id}`} className="flex items-center gap-3 rounded-xl border border-slate-200 p-2.5 hover:border-emerald-400">
                      <div className="h-16 w-24 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                        {sv.photos?.[0]?.url && <img src={sv.photos[0].url} alt="" className="h-full w-full object-cover" />}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-black text-slate-950 truncate">{sv.brand} {sv.model}</p>
                        <p className="text-xs font-bold text-emerald-700">{formatHuf(sv.pricing?.priceHuf)}</p>
                        <p className="text-[11px] text-slate-500">{sv.manufactureYear} · {formatKm(sv.mileageKm)}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* RIGHT 4 COLS: 12. Seller, 13. Viewing Booking, 14. Test Drive & Direct Message — ZERO Cart/Shipping! */}
          <div className="space-y-5 lg:col-span-4">
            <div className="sticky top-24 space-y-5">
              {/* Seller Summary Card */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-slate-500">Hirdető</p>
                    <p className="text-base font-black text-slate-950">{vehicle.dealerCompanyName || vehicle.ownerName}</p>
                  </div>
                  <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800">
                    {vehicle.sellerType === "private" ? "Magánszemély" : vehicle.sellerType === "verified_business" ? "Ellenőrzött vállalkozás" : "Kereskedő"}
                  </span>
                </div>

                {vehicle.inquiryPreferences?.noUnsolicitedCommercial && (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700 flex items-start gap-2">
                    <ShieldCheck className="h-4 w-4 text-emerald-700 shrink-0 mt-0.5" />
                    <span>A hirdető nem kér üzletszerzési célú megkereséseket. Valós vásárlói érdeklődés fogadott.</span>
                  </div>
                )}

                {/* Existing buyer booking status banner */}
                {myBooking && (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-xs space-y-2">
                    <p className="font-bold text-emerald-950">
                      {myBooking.bookingKind === "TEST_DRIVE" ? "Tesztvezetési foglalásod" : "Megtekintési foglalásod"}:{" "}
                      {formatHuDateDot(myBooking.date)} {myBooking.startTime}
                    </p>
                    <p className="font-semibold text-emerald-800">
                      Státusz: {myBooking.status === "APPROVED" ? "Visszaigazolva" : myBooking.status === "PENDING" ? "Visszaigazolásra vár" : myBooking.status}
                    </p>
                    {myBooking.status === "APPROVED" && !approvedDetails && (
                      <Button type="button" size="sm" onClick={() => handleLoadApprovedDetails(myBooking.id)} className="w-full rounded-xl bg-emerald-600 text-xs font-bold text-white">
                        <MapPin className="mr-1.5 h-3.5 w-3.5" />
                        Pontos találkozási hely megnyitása
                      </Button>
                    )}
                    {approvedDetails && (
                      <div className="rounded-lg bg-white border border-emerald-200 p-3 space-y-1 text-slate-800">
                        <p className="font-bold text-slate-950">{approvedDetails.exactAddress}</p>
                        {approvedDetails.meetingPlace && <p>Találkozási pont: {approvedDetails.meetingPlace}</p>}
                        {approvedDetails.ownerPhone && (
                          <p className="font-bold text-emerald-800 flex items-center gap-1">
                            <Phone className="h-3.5 w-3.5" /> {approvedDetails.ownerPhone}
                          </p>
                        )}
                        <a href={approvedDetails.navigationUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-bold text-emerald-700 underline pt-1">
                          <Navigation className="h-3.5 w-3.5" /> Navigáció megnyitása <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    )}
                  </div>
                )}

                {/* Viewing & Test Drive Booking Card (#40, #44, #47) */}
                {vehicle.isOwner ? (
                  <Button asChild className="w-full rounded-xl bg-emerald-600 text-xs font-bold text-white hover:bg-emerald-700">
                    <Link href={`/vehicles/admin/${vehicle.id}`}>Saját Járműadmin megnyitása</Link>
                  </Button>
                ) : (
                  <div className="space-y-3 border-t border-slate-100 pt-3 text-xs">
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setBookingKind("VIEWING");
                          setSelectedSlotId("");
                        }}
                        className={`rounded-xl border py-2 font-bold ${
                          bookingKind === "VIEWING" ? "border-emerald-600 bg-emerald-50 text-emerald-900" : "border-slate-200 text-slate-600"
                        }`}
                      >
                        Megtekintés
                      </button>
                      <button
                        type="button"
                        disabled={!vehicle.testDriveSettings?.enabled}
                        onClick={() => {
                          setBookingKind("TEST_DRIVE");
                          setSelectedSlotId("");
                        }}
                        className={`rounded-xl border py-2 font-bold disabled:opacity-40 ${
                          bookingKind === "TEST_DRIVE" ? "border-emerald-600 bg-emerald-50 text-emerald-900" : "border-slate-200 text-slate-600"
                        }`}
                      >
                        Tesztvezetés
                      </button>
                    </div>

                    {openSlotsForKind.length > 0 ? (
                      <div className="space-y-1.5">
                        <span className="font-bold text-slate-700">Szabad idősávok</span>
                        <div className="grid grid-cols-2 gap-1.5 max-h-36 overflow-y-auto">
                          {openSlotsForKind.map((s) => (
                            <button
                              key={s.id}
                              type="button"
                              onClick={() => setSelectedSlotId(s.id)}
                              className={`rounded-xl border p-2 text-left text-[11px] font-bold ${
                                selectedSlotId === s.id ? "border-emerald-600 bg-emerald-50 text-emerald-900" : "border-slate-200 text-slate-700"
                              }`}
                            >
                              <div>{s.date}</div>
                              <div className="text-slate-500">{s.startTime}–{s.endTime}</div>
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-2">
                        <label className="font-bold text-slate-700">
                          Kívánt dátum
                          <input type="date" value={customDate} onChange={(e) => setCustomDate(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 px-2.5 py-2" />
                        </label>
                        <label className="font-bold text-slate-700">
                          Időpont
                          <input type="time" value={customTime} onChange={(e) => setCustomTime(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 px-2.5 py-2" />
                        </label>
                      </div>
                    )}

                    <input
                      type="text"
                      value={requesterName || user?.fullName || ""}
                      onChange={(e) => setRequesterName(e.target.value)}
                      placeholder="Teljes neved"
                      className="w-full rounded-xl border border-slate-300 px-3 py-2"
                    />
                    <textarea
                      rows={2}
                      value={bookingMessage}
                      onChange={(e) => setBookingMessage(e.target.value)}
                      placeholder="Rövid üzenet a hirdetőnek (opcionális)"
                      className="w-full rounded-xl border border-slate-300 px-3 py-2"
                    />

                    {bookingKind === "TEST_DRIVE" && vehicle.testDriveSettings?.enabled && (
                      <label className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-[11px] text-amber-950 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={hasLicenseDeclared}
                          onChange={(e) => setHasLicenseDeclared(e.target.checked)}
                          className="mt-0.5 h-4 w-4 shrink-0 accent-emerald-600"
                        />
                        <span>
                          Kijelentem, hogy rendelkezem érvényes{" "}
                          <strong>{vehicle.testDriveSettings.requiredLicenseCategory || "B"}</strong> kategóriás
                          vezetői engedéllyel, és azt a helyszínen bemutatom a hirdetőnek (jogosítványfotót az ILOLIT
                          nem tárol).
                        </span>
                      </label>
                    )}

                    <Button
                      type="button"
                      onClick={() => handleOpenBookingFlow("VIEWING")}
                      className="h-11 w-full rounded-xl bg-emerald-600 text-xs font-bold text-white hover:bg-emerald-700"
                    >
                      <Calendar className="mr-1.5 h-4 w-4" />
                      Megtekintési időpontot kérek
                    </Button>

                    {vehicle.testDriveSettings?.enabled && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => handleOpenBookingFlow("TEST_DRIVE")}
                        className="h-10 w-full rounded-xl border-emerald-300 text-xs font-bold text-emerald-800 hover:bg-emerald-50"
                      >
                        <Clock className="mr-1.5 h-4 w-4" />
                        Tesztvezetést kérek
                      </Button>
                    )}

                    <p className="flex items-center gap-1.5 text-[11px] text-slate-500">
                      <Lock className="h-3.5 w-3.5 shrink-0" />
                      A pontos magáncím csak visszaigazolás után nyílik meg.
                    </p>
                  </div>
                )}

                {/* Direct contact */}
                {!vehicle.isOwner && isSignedIn && (
                  <form onSubmit={handleSendMessage} className="space-y-2 border-t border-slate-100 pt-3">
                    <p className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                      <MessageSquare className="h-4 w-4 text-emerald-600" />
                      Kapcsolatfelvétel a hirdetővel
                    </p>
                    <textarea
                      rows={2}
                      value={msgText}
                      onChange={(e) => setMsgText(e.target.value)}
                      placeholder="Írj kérdést a járműről..."
                      required
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs"
                    />
                    <Button type="submit" variant="outline" disabled={sendingMsg} className="w-full rounded-xl text-xs font-bold">
                      <Send className="mr-1.5 h-3.5 w-3.5" />
                      Kapcsolatfelvétel
                    </Button>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Modals */}
        <PhoneVerificationModal
          isOpen={phoneModalOpen}
          onClose={() => setPhoneModalOpen(false)}
          onVerified={() => {
            refetchPhone();
            setPhoneModalOpen(false);
            setLegalModalOpen(true);
          }}
        />

        <VehicleLegalModal
          open={legalModalOpen}
          bookingKind={bookingKind}
          vehicleTitle={`${vehicle.brand} ${vehicle.model} ${vehicle.typeVariant || ""}`.trim()}
          onCancel={() => setLegalModalOpen(false)}
          onAccept={submitBookingWithLegal}
          submitting={submittingBooking}
        />

        {reportOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
            <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
              <h3 className="flex items-center gap-2 text-base font-bold text-slate-950">
                <Flag className="h-4 w-4 text-emerald-600" />
                Visszaélés jelentése
              </h3>
              <form onSubmit={handleReportSubmit} className="mt-4 space-y-3 text-xs">
                <div className="max-h-60 space-y-1 overflow-y-auto pr-1">
                  {VEHICLE_ABUSE_REPORT_REASONS.map((r) => (
                    <label key={r.code} className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 cursor-pointer">
                      <input type="radio" name="vreport" checked={reportCode === r.code} onChange={() => setReportCode(r.code)} className="accent-emerald-600" />
                      <span>{r.label}</span>
                    </label>
                  ))}
                </div>
                <textarea
                  rows={3}
                  value={reportDetails}
                  onChange={(e) => setReportDetails(e.target.value)}
                  placeholder="Rövid leírás (opcionális)"
                  className="w-full rounded-xl border border-slate-300 px-3 py-2"
                />
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setReportOpen(false)} className="rounded-xl text-xs font-bold">Mégsem</Button>
                  <Button type="submit" disabled={sendingReport} className="rounded-xl bg-emerald-600 text-xs font-bold text-white">Jelentés küldése</Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </Layout>
  );
}
