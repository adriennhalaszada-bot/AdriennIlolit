import { useMemo, useState } from "react";
import { Link, useParams } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useUser } from "@clerk/react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { realEstateApi } from "@/lib/realEstate/api";
import {
  STATUS_LABELS,
  formatHuf,
  formatPublicLocation,
  getCategoryLabel,
  getConditionLabel,
  getSubtypeLabel,
} from "@/lib/realEstate/config";
import type { ApprovedViewingDetails } from "@/lib/realEstate/types";
import { PhoneVerificationModal } from "@/components/realestate/PhoneVerificationModal";
import { ApproximateLocationMap } from "@/components/realestate/ApproximateLocationMap";
import {
  AlertTriangle,
  ArrowLeft,
  BedDouble,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Flag,
  Heart,
  Home,
  Layers,
  Leaf,
  Loader2,
  Lock,
  MapPin,
  Maximize2,
  MessageSquare,
  Phone,
  Send,
  Share2,
  ShieldCheck,
  Video,
  X,
} from "lucide-react";

export default function RealEstateDetail() {
  const { id } = useParams<{ id: string }>();
  const { isSignedIn, user } = useUser();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [mediaTab, setMediaTab] = useState<"photos" | "floorplans" | "video">("photos");
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  // Viewing request state
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedSlotId, setSelectedSlotId] = useState<string>("");
  const [requesterName, setRequesterName] = useState("");
  const [viewingMessage, setViewingMessage] = useState("");
  const [reminder24h, setReminder24h] = useState(true);
  const [reminder2h, setReminder2h] = useState(true);
  const [submittingViewing, setSubmittingViewing] = useState(false);
  const [viewingSubmitted, setViewingSubmitted] = useState(false);
  const [phoneModalOpen, setPhoneModalOpen] = useState(false);
  const [inlineDetails, setInlineDetails] = useState<ApprovedViewingDetails | null>(null);
  const [loadingInlineDetails, setLoadingInlineDetails] = useState(false);
  const [respondingBuyerAction, setRespondingBuyerAction] = useState(false);

  // Inquiry message state
  const [messageText, setMessageText] = useState("");
  const [sendingMsg, setSendingMsg] = useState(false);

  // Report modal state
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState("Valótlan vagy félrevezető adatok");
  const [reportDetails, setReportDetails] = useState("");
  const [sendingReport, setSendingReport] = useState(false);

  const { data: property, isLoading, isError, refetch } = useQuery({
    queryKey: ["real-estate-property", id],
    queryFn: () => realEstateApi.getProperty(id || ""),
    enabled: Boolean(id),
  });

  const { data: phoneStatus, refetch: refetchPhone } = useQuery({
    queryKey: ["real-estate-phone-status"],
    queryFn: () => realEstateApi.getPhoneStatus(),
    enabled: Boolean(isSignedIn),
  });

  // Live buyer viewing status for THIS property (auto-refreshes every 10s & on tab focus)
  const { data: myPropertyViewingsData, refetch: refetchMyViewing } = useQuery({
    queryKey: ["real-estate-my-property-viewings", id],
    queryFn: () => realEstateApi.getMyViewings(id),
    enabled: Boolean(isSignedIn && id),
    refetchInterval: 10000,
    refetchOnWindowFocus: true,
  });

  const latestBuyerViewing = useMemo(() => {
    const items = (myPropertyViewingsData?.items || []).filter((v) => v.role === "requester");
    return items[0] || null;
  }, [myPropertyViewingsData]);

  const handleLoadInlineApprovedDetails = async (viewingId: string) => {
    setLoadingInlineDetails(true);
    try {
      const details = await realEstateApi.getApprovedViewingDetails(viewingId);
      setInlineDetails(details);
    } catch (err: any) {
      toast({
        title: "A pontos cím nem nyitható meg",
        description: err?.message || "Próbáld újra néhány másodperc múlva.",
        variant: "destructive",
      });
    } finally {
      setLoadingInlineDetails(false);
    }
  };

  const handleBuyerAcceptProposal = async (viewingId: string) => {
    setRespondingBuyerAction(true);
    try {
      await realEstateApi.acceptProposedTime(viewingId);
      await refetchMyViewing();
      toast({ title: "Javasolt időpont elfogadva – a pontos cím megnyílt" });
    } catch (err: any) {
      toast({ title: err?.message || "Nem sikerült elfogadni.", variant: "destructive" });
    } finally {
      setRespondingBuyerAction(false);
    }
  };

  const handleBuyerCancelViewing = async (viewingId: string) => {
    if (!window.confirm("Biztosan lemondod a megtekintést? Az időpont felszabadul.")) return;
    setRespondingBuyerAction(true);
    try {
      await realEstateApi.cancelViewing(viewingId);
      setInlineDetails(null);
      await refetchMyViewing();
      refetch();
      toast({ title: "Megtekintés lemondva" });
    } catch (err: any) {
      toast({ title: err?.message || "Nem sikerült lemondani.", variant: "destructive" });
    } finally {
      setRespondingBuyerAction(false);
    }
  };

  const groupedSlots = useMemo(() => {
    const slots = property?.viewingSlots || [];
    const groups: Record<string, typeof slots> = {};
    for (const s of slots) {
      if (!groups[s.date]) groups[s.date] = [];
      groups[s.date].push(s);
    }
    return groups;
  }, [property?.viewingSlots]);

  const availableDates = useMemo(() => Object.keys(groupedSlots).sort(), [groupedSlots]);
  const effectiveDate = selectedDate && groupedSlots[selectedDate] ? selectedDate : availableDates[0] || "";
  const slotsForDate = effectiveDate ? groupedSlots[effectiveDate] || [] : [];

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast({ title: "Hirdetés linkje a vágólapra másolva" });
    } catch {
      toast({ title: "A link másolása nem sikerült", variant: "destructive" });
    }
  };

  const handleToggleFavorite = async () => {
    if (!property) return;
    if (!isSignedIn) {
      toast({ title: "A kedvencek mentéséhez jelentkezz be." });
      return;
    }
    try {
      await realEstateApi.toggleFavorite(property.id);
      refetch();
    } catch (err: any) {
      toast({ title: err?.message || "Hiba történt.", variant: "destructive" });
    }
  };

  const handleSubmitViewing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!property || !selectedSlotId) return;
    if (!phoneStatus?.phoneVerified) {
      setPhoneModalOpen(true);
      return;
    }

    const nameToSend = requesterName.trim() || user?.fullName || user?.username || "ILOLIT érdeklődő";
    setSubmittingViewing(true);
    try {
      await realEstateApi.createViewingRequest({
        propertyId: property.id,
        slotId: selectedSlotId,
        requesterName: nameToSend,
        message: viewingMessage.trim() || undefined,
        reminder24hEnabled: reminder24h,
        reminder2hEnabled: reminder2h,
      });
      setViewingSubmitted(true);
      setSelectedSlotId("");
      setViewingMessage("");
      queryClient.invalidateQueries({ queryKey: ["real-estate-property", id] });
      queryClient.invalidateQueries({ queryKey: ["real-estate-my-property-viewings", id] });
      queryClient.invalidateQueries({ queryKey: ["real-estate-my-viewings"] });
      toast({ title: "Megtekintési kérelem elküldve" });
    } catch (err: any) {
      toast({
        title: "Nem sikerült elküldeni a kérelmet",
        description: err?.message || "Próbáld meg újra.",
        variant: "destructive",
      });
    } finally {
      setSubmittingViewing(false);
    }
  };

  const handleSendInquiry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!property || !messageText.trim()) return;
    setSendingMsg(true);
    try {
      await realEstateApi.sendMessage(
        property.id,
        messageText.trim(),
        property.ownerId,
        user?.fullName || user?.username || "Érdeklődő",
      );
      setMessageText("");
      toast({ title: "Üzenet elküldve a hirdetőnek" });
    } catch (err: any) {
      toast({ title: err?.message || "Az üzenet küldése sikertelen.", variant: "destructive" });
    } finally {
      setSendingMsg(false);
    }
  };

  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!property) return;
    setSendingReport(true);
    try {
      await realEstateApi.reportAbuse({
        propertyId: property.id,
        targetUserId: property.ownerId,
        reason: reportReason,
        details: reportDetails.trim() || undefined,
      });
      setReportOpen(false);
      setReportDetails("");
      toast({ title: "Jelentés rögzítve. Köszönjük a visszajelzést." });
    } catch (err: any) {
      toast({ title: err?.message || "Nem sikerült elküldeni a jelentést.", variant: "destructive" });
    } finally {
      setSendingReport(false);
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="mx-auto max-w-6xl px-4 py-16 text-center text-sm font-semibold text-slate-500">
          Ingatlan adatlap betöltése...
        </div>
      </Layout>
    );
  }

  if (isError || !property) {
    return (
      <Layout>
        <div className="mx-auto max-w-xl px-4 py-20 text-center">
          <Home className="mx-auto h-10 w-10 text-slate-300" />
          <h1 className="mt-3 text-xl font-bold text-slate-900">Az ingatlanhirdetés nem található</h1>
          <p className="mt-1 text-sm text-slate-500">Lehetséges, hogy a hirdetés lejárt vagy törölve lett.</p>
          <Button asChild className="mt-5 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700">
            <Link href="/real-estate">Vissza az ingatlanokhoz</Link>
          </Button>
        </div>
      </Layout>
    );
  }

  const photos = property.photos || [];
  const floorPlans = property.floorPlans || [];
  const currentMediaList = mediaTab === "floorplans" ? floorPlans : photos;
  const activeMedia = currentMediaList[activePhotoIndex] || currentMediaList[0];
  const publicLocStr = formatPublicLocation(property.publicLocation);
  const statusInfo = STATUS_LABELS[property.status];
  const isClosed = property.status === "SOLD" || property.status === "RENTED" || property.status !== "ACTIVE";

  const scrollToViewingCard = () => {
    document.getElementById("viewing-booking-card")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <Layout>
      <PhoneVerificationModal
        isOpen={phoneModalOpen}
        onClose={() => setPhoneModalOpen(false)}
        onVerified={() => {
          refetchPhone();
          toast({ title: "Telefonszámod sikeresen igazolva" });
        }}
      />

      <main className="min-h-screen bg-slate-50 pb-28 lg:pb-16">
        {/* Top breadcrumb bar */}
        <div className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3.5 sm:px-6 lg:px-8">
            <Link
              href="/real-estate"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-emerald-700"
            >
              <ArrowLeft className="h-4 w-4" />
              Vissza az ingatlanokhoz
            </Link>

            <div className="flex items-center gap-2">
              {property.isOwner && (
                <Button
                  asChild
                  size="sm"
                  className="rounded-xl bg-emerald-600 text-xs font-bold text-white hover:bg-emerald-700"
                >
                  <Link href={`/real-estate/admin/${property.id}`}>Saját Ingatlan Admin</Link>
                </Button>
              )}
              <button
                type="button"
                onClick={handleToggleFavorite}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
              >
                <Heart className={`h-4 w-4 ${property.isFavorited ? "fill-rose-500 text-rose-500" : ""}`} />
                Kedvenc
              </button>
              <button
                type="button"
                onClick={handleShare}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
              >
                <Share2 className="h-4 w-4" />
                Megosztás
              </button>
              {isSignedIn && !property.isOwner && (
                <button
                  type="button"
                  onClick={() => setReportOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 hover:text-rose-600"
                >
                  <Flag className="h-4 w-4" />
                  Jelentés
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-8 px-4 py-8 sm:px-6 lg:grid-cols-12 lg:px-8">
          {/* LEFT COLUMN: Gallery + Structured Property Sheet */}
          <div className="space-y-6 lg:col-span-8">
            {/* Gallery Card */}
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
              {/* Media tabs */}
              <div className="flex items-center justify-between border-b border-slate-200 px-4 py-2.5">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setMediaTab("photos");
                      setActivePhotoIndex(0);
                    }}
                    className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                      mediaTab === "photos"
                        ? "bg-emerald-600 text-white"
                        : "text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    Fotók ({photos.length})
                  </button>
                  {floorPlans.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setMediaTab("floorplans");
                        setActivePhotoIndex(0);
                      }}
                      className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                        mediaTab === "floorplans"
                          ? "bg-emerald-600 text-white"
                          : "text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      <Layers className="h-3.5 w-3.5" />
                      Alaprajz ({floorPlans.length})
                    </button>
                  )}
                  {property.videoUrl && (
                    <button
                      type="button"
                      onClick={() => setMediaTab("video")}
                      className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                        mediaTab === "video"
                          ? "bg-emerald-600 text-white"
                          : "text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      <Video className="h-3.5 w-3.5" />
                      Videó
                    </button>
                  )}
                </div>

                {statusInfo && (
                  <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${statusInfo.className}`}>
                    {statusInfo.label}
                  </span>
                )}
              </div>

              {mediaTab === "video" && property.videoUrl ? (
                <div className="aspect-video w-full bg-slate-950">
                  <video src={property.videoUrl} controls playsInline className="h-full w-full" />
                </div>
              ) : (
                <>
                  <div className="relative aspect-[16/10] w-full bg-slate-100">
                    {activeMedia?.url ? (
                      <img
                        src={activeMedia.url}
                        alt={property.title}
                        onClick={() => setLightboxOpen(true)}
                        style={{ transform: `rotate(${activeMedia.rotation || 0}deg)` }}
                        className={`h-full w-full cursor-zoom-in ${
                          mediaTab === "floorplans" ? "object-contain p-4" : "object-cover"
                        }`}
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-slate-400">
                        <Home className="h-14 w-14" />
                      </div>
                    )}

                    {currentMediaList.length > 1 && (
                      <>
                        <button
                          type="button"
                          onClick={() =>
                            setActivePhotoIndex((i) => (i - 1 + currentMediaList.length) % currentMediaList.length)
                          }
                          className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 text-slate-800 shadow hover:bg-white"
                          aria-label="Előző kép"
                        >
                          <ChevronLeft className="h-5 w-5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setActivePhotoIndex((i) => (i + 1) % currentMediaList.length)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 text-slate-800 shadow hover:bg-white"
                          aria-label="Következő kép"
                        >
                          <ChevronRight className="h-5 w-5" />
                        </button>
                        <span className="absolute bottom-3 right-3 rounded-lg bg-slate-900/75 px-2.5 py-1 text-xs font-bold text-white">
                          {activePhotoIndex + 1} / {currentMediaList.length}
                        </span>
                      </>
                    )}
                  </div>

                  {currentMediaList.length > 1 && (
                    <div className="flex gap-2 overflow-x-auto border-t border-slate-100 p-3">
                      {currentMediaList.map((img, idx) => (
                        <button
                          key={img.id}
                          type="button"
                          onClick={() => setActivePhotoIndex(idx)}
                          className={`h-16 w-24 shrink-0 overflow-hidden rounded-lg border-2 transition ${
                            idx === activePhotoIndex ? "border-emerald-600" : "border-transparent opacity-70 hover:opacity-100"
                          }`}
                        >
                          <img src={img.url} alt="" className="h-full w-full object-cover" />
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Header Summary */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
                    <span className="rounded-lg bg-emerald-50 px-2.5 py-1 text-emerald-800">
                      {property.transactionType === "rent" ? "Kiadó" : "Eladó"}
                    </span>
                    <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-slate-700">
                      {getCategoryLabel(property.category)}
                    </span>
                    {property.subtype && (
                      <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-slate-700">
                        {getSubtypeLabel(property.category, property.subtype)}
                      </span>
                    )}
                  </div>
                  <h1 className="text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
                    {property.title}
                  </h1>
                  <p className="flex items-center gap-1.5 text-sm font-semibold text-slate-600">
                    <MapPin className="h-4 w-4 text-emerald-600" />
                    {publicLocStr}
                  </p>
                </div>

                <div className="text-left sm:text-right">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    {property.transactionType === "rent" ? "Havi bérleti díj" : "Vételár"}
                  </p>
                  <p className="text-3xl font-black text-emerald-700">
                    {formatHuf(property.price)}
                    {property.transactionType === "rent" && (
                      <span className="text-base font-semibold text-slate-500"> / hó</span>
                    )}
                  </p>
                  {property.specs?.usableAreaSqm && property.transactionType === "sale" && (
                    <p className="mt-1 text-xs font-semibold text-slate-500">
                      {formatHuf(Math.round(property.price / property.specs.usableAreaSqm))} / m²
                    </p>
                  )}
                </div>
              </div>

              {/* Key metrics strip */}
              <div className="mt-6 grid grid-cols-2 gap-3 border-t border-slate-100 pt-5 sm:grid-cols-4">
                <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
                  <span className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500">
                    <Maximize2 className="h-3.5 w-3.5 text-emerald-600" /> Alapterület
                  </span>
                  <p className="mt-1 text-base font-black text-slate-900">
                    {property.specs?.usableAreaSqm ? `${property.specs.usableAreaSqm} m²` : "—"}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
                  <span className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500">
                    <BedDouble className="h-3.5 w-3.5 text-emerald-600" /> Szobák
                  </span>
                  <p className="mt-1 text-base font-black text-slate-900">
                    {property.specs?.rooms
                      ? `${property.specs.rooms}${property.specs.halfRooms ? ` + ${property.specs.halfRooms} fél` : ""}`
                      : "—"}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
                  <span className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500">
                    <Building2 className="h-3.5 w-3.5 text-emerald-600" /> Állapot
                  </span>
                  <p className="mt-1 text-sm font-black text-slate-900">
                    {getConditionLabel(property.specs?.condition)}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
                  <span className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500">
                    <Leaf className="h-3.5 w-3.5 text-emerald-600" /> Energetika
                  </span>
                  <p className="mt-1 text-base font-black text-slate-900">
                    {property.sustainability?.energyRating || "—"}
                  </p>
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <h2 className="text-lg font-bold text-slate-950">Ingatlan bemutatása</h2>
              <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-slate-700">
                {property.description}
              </p>
            </div>

            {/* Detailed specs */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <h2 className="text-lg font-bold text-slate-950">Ingatlan alapadatai</h2>
              <dl className="mt-4 grid grid-cols-1 gap-x-8 gap-y-3 text-sm sm:grid-cols-2">
                {[
                  ["Hasznos alapterület", property.specs?.usableAreaSqm ? `${property.specs.usableAreaSqm} m²` : null],
                  ["Telekterület", property.specs?.plotAreaSqm ? `${property.specs.plotAreaSqm} m²` : null],
                  ["Erkély / terasz", property.specs?.balconyAreaSqm ? `${property.specs.balconyAreaSqm} m²` : null],
                  ["Szobák száma", property.specs?.rooms],
                  ["Félszobák száma", property.specs?.halfRooms],
                  ["Fürdőszobák száma", property.specs?.bathrooms],
                  ["WC-k száma", property.specs?.toilets],
                  ["Emelet", property.specs?.floor],
                  ["Épület szintjei", property.specs?.buildingLevels],
                  ["Lift", property.specs?.hasElevator !== undefined ? (property.specs.hasElevator ? "Van" : "Nincs") : null],
                  ["Belmagasság", property.specs?.ceilingHeightCm ? `${property.specs.ceilingHeightCm} cm` : null],
                  ["Építés éve", property.specs?.yearBuilt],
                  ["Állapot", property.specs?.condition ? getConditionLabel(property.specs.condition) : null],
                  ["Komfortfokozat", property.specs?.comfortLevel],
                  ["Tájolás", property.specs?.orientation],
                  ["Kilátás", property.specs?.view],
                  ["Kertkapcsolat", property.specs?.hasGardenAccess ? "Igen" : null],
                  ["Tetőtéri", property.specs?.isAttic ? "Igen" : null],
                  ["Akadálymentesített", property.specs?.isAccessible ? "Igen" : null],
                  ["Légkondicionáló", property.specs?.hasAirConditioning ? "Van" : null],
                  ["Parkolás", property.specs?.parking],
                ]
                  .filter(([, val]) => val !== null && val !== undefined && val !== "")
                  .map(([label, val]) => (
                    <div key={String(label)} className="flex items-center justify-between border-b border-slate-100 py-2">
                      <dt className="text-slate-500">{label}</dt>
                      <dd className="font-bold text-slate-900">{String(val)}</dd>
                    </div>
                  ))}
              </dl>
            </div>

            {/* Rental terms block */}
            {property.transactionType === "rent" && property.rentalTerms && (
              <div className="rounded-2xl border border-slate-200 bg-white p-6">
                <h2 className="text-lg font-bold text-slate-950">Bérleti feltételek</h2>
                <dl className="mt-4 grid grid-cols-1 gap-x-8 gap-y-3 text-sm sm:grid-cols-2">
                  {[
                    ["Havi bérleti díj", formatHuf(property.price)],
                    ["Kaució összege", property.rentalTerms.depositAmount ? formatHuf(property.rentalTerms.depositAmount) : null],
                    ["Minimum bérleti idő", property.rentalTerms.minRentalMonths ? `${property.rentalTerms.minRentalMonths} hónap` : null],
                    [
                      "Költözhetőség",
                      property.rentalTerms.availableImmediately
                        ? "Azonnal költözhető"
                        : property.rentalTerms.availableFromDate || null,
                    ],
                    [
                      "Bútorozottság",
                      property.rentalTerms.furnished === "yes"
                        ? "Bútorozott"
                        : property.rentalTerms.furnished === "partial"
                        ? "Részben bútorozott"
                        : property.rentalTerms.furnished === "no"
                        ? "Bútorozatlan"
                        : null,
                    ],
                    [
                      "Gépesítettség",
                      property.rentalTerms.equipped === "yes"
                        ? "Gépesített"
                        : property.rentalTerms.equipped === "partial"
                        ? "Részben gépesített"
                        : property.rentalTerms.equipped === "no"
                        ? "Gépesítetlen"
                        : null,
                    ],
                    [
                      "Kisállat",
                      property.rentalTerms.petsAllowed === "yes"
                        ? "Engedélyezett"
                        : property.rentalTerms.petsAllowed === "negotiable"
                        ? "Megbeszélés szerint"
                        : property.rentalTerms.petsAllowed === "no"
                        ? "Nem engedélyezett"
                        : null,
                    ],
                    [
                      "Dohányzás",
                      property.rentalTerms.smokingAllowed === "yes"
                        ? "Engedélyezett"
                        : property.rentalTerms.smokingAllowed === "balcony_only"
                        ? "Csak erkélyen / udvaron"
                        : property.rentalTerms.smokingAllowed === "no"
                        ? "Nem engedélyezett"
                        : null,
                    ],
                    ["Max. lakók száma", property.rentalTerms.maxOccupants ? `${property.rentalTerms.maxOccupants} fő` : null],
                    ["Rezsi a bérleti díjban", property.rentalTerms.utilitiesIncluded ? "Benne van" : "Külön fizetendő"],
                    ["Közös költség", property.rentalTerms.commonCost ? `${formatHuf(property.rentalTerms.commonCost)} / hó` : null],
                    ["Parkolási lehetőség", property.rentalTerms.parkingDetails],
                  ]
                    .filter(([, val]) => val !== null && val !== undefined && val !== "")
                    .map(([label, val]) => (
                      <div key={String(label)} className="flex items-center justify-between border-b border-slate-100 py-2">
                        <dt className="text-slate-500">{label}</dt>
                        <dd className="font-bold text-slate-900">{String(val)}</dd>
                      </div>
                    ))}
                </dl>
              </div>
            )}

            {/* Sustainability & utilities */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <h2 className="flex items-center gap-2 text-lg font-bold text-slate-950">
                <Leaf className="h-5 w-5 text-emerald-600" />
                Fenntarthatóság és rezsi
              </h2>
              <dl className="mt-4 grid grid-cols-1 gap-x-8 gap-y-3 text-sm sm:grid-cols-2">
                {[
                  ["Fűtés típusa", property.sustainability?.heatingType],
                  ["Átlagos gázfogyasztás", property.sustainability?.avgGasConsumption],
                  ["Átlagos áramfogyasztás", property.sustainability?.avgElectricityConsumption],
                  [
                    "Becsült havi rezsi",
                    property.sustainability?.estimatedMonthlyUtilities
                      ? `${formatHuf(property.sustainability.estimatedMonthlyUtilities)} / hó`
                      : null,
                  ],
                  [
                    "Közös költség",
                    property.sustainability?.commonCost
                      ? `${formatHuf(property.sustainability.commonCost)} / hó`
                      : null,
                  ],
                  ["Szigetelés", property.sustainability?.insulation],
                  ["Energetikai tanúsítvány", property.sustainability?.energyRating],
                  ["Napelem", property.sustainability?.hasSolarPanel ? "Van" : null],
                  ["Hőszivattyú", property.sustainability?.hasHeatPump ? "Van" : null],
                  ["Korszerű nyílászárók", property.sustainability?.hasModernWindows ? "Van" : null],
                  ["Egyéb energiahatékonyság", property.sustainability?.otherEnergyFeatures],
                ]
                  .filter(([, val]) => val !== null && val !== undefined && val !== "")
                  .map(([label, val]) => (
                    <div key={String(label)} className="flex items-center justify-between border-b border-slate-100 py-2">
                      <dt className="text-slate-500">{label}</dt>
                      <dd className="font-bold text-slate-900">{String(val)}</dd>
                    </div>
                  ))}
              </dl>
            </div>

            {/* Approximate Map (NEVER exact address) */}
            <ApproximateLocationMap
              mode="approximate"
              latitude={property.publicLocation?.approxLatitude ?? null}
              longitude={property.publicLocation?.approxLongitude ?? null}
              label={publicLocStr}
            />
          </div>

          {/* RIGHT COLUMN: Viewing Booking Card + Message to Owner */}
          <aside className="space-y-6 lg:col-span-4">
            <div
              id="viewing-booking-card"
              className="sticky top-24 space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs"
            >
              <div>
                <h2 className="text-xl font-black text-slate-950">Szeretnéd személyesen megnézni?</h2>
                <p className="mt-1 text-xs leading-relaxed text-slate-600">
                  Válassz a hirdető által megadott szabad időpontok közül.
                </p>
              </div>

              {/* Mandatory privacy / legal statement */}
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3.5 text-xs leading-relaxed text-emerald-950">
                <p className="flex items-start gap-2">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />
                  <span>
                    Az ILOLIT ellenőrzött telefonszámhoz és a hirdető jóváhagyásához köti a pontos cím megismerését
                    és a személyes megtekintést.
                  </span>
                </p>
              </div>

              {/* Instant Live Buyer Confirmation Card for this property */}
              {!property.isOwner && latestBuyerViewing && (
                <div
                  className={`space-y-3 rounded-2xl border p-4 text-xs ${
                    latestBuyerViewing.status === "APPROVED"
                      ? "border-emerald-300 bg-emerald-50 text-emerald-950"
                      : latestBuyerViewing.status === "PROPOSED_NEW_TIME"
                      ? "border-blue-300 bg-blue-50 text-blue-950"
                      : latestBuyerViewing.status === "PENDING"
                      ? "border-amber-300 bg-amber-50 text-amber-950"
                      : "border-rose-300 bg-rose-50 text-rose-950"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="font-bold">
                      {latestBuyerViewing.status === "APPROVED" && (
                        <span className="flex items-center gap-1.5 text-emerald-800">
                          <CheckCircle2 className="h-4 w-4 shrink-0" />
                          Az eladó elfogadta a megtekintési időpontodat
                        </span>
                      )}
                      {latestBuyerViewing.status === "PROPOSED_NEW_TIME" && (
                        <span className="flex items-center gap-1.5 text-blue-800">
                          <Clock className="h-4 w-4 shrink-0" />
                          Az eladó másik időpontot javasolt
                        </span>
                      )}
                      {latestBuyerViewing.status === "PENDING" && (
                        <span className="flex items-center gap-1.5 text-amber-800">
                          <Clock className="h-4 w-4 shrink-0" />
                          Megtekintési kérelmed az eladó válaszára vár
                        </span>
                      )}
                      {(latestBuyerViewing.status === "REJECTED" ||
                        latestBuyerViewing.status === "REVOKED_BY_OWNER") && (
                        <span className="flex items-center gap-1.5 text-rose-800">
                          <AlertTriangle className="h-4 w-4 shrink-0" />
                          {latestBuyerViewing.status === "REJECTED"
                            ? "Az eladó elutasította a kért időpontot"
                            : "Az eladó visszavonta a megtekintést"}
                        </span>
                      )}
                      {latestBuyerViewing.status === "CANCELLED_BY_REQUESTER" && (
                        <span className="text-slate-700">A korábbi megtekintési kérelmedet lemondtad</span>
                      )}
                    </div>
                  </div>

                  <p className="font-semibold">
                    Időpont: {latestBuyerViewing.date} · {latestBuyerViewing.startTime} – {latestBuyerViewing.endTime}
                  </p>

                  {latestBuyerViewing.status === "PROPOSED_NEW_TIME" && latestBuyerViewing.proposedDate && (
                    <div className="space-y-2 rounded-xl border border-blue-200 bg-white p-3">
                      <p className="font-bold text-slate-950">
                        Javasolt új időpont: {latestBuyerViewing.proposedDate} ·{" "}
                        {latestBuyerViewing.proposedStartTime} – {latestBuyerViewing.proposedEndTime}
                      </p>
                      {latestBuyerViewing.proposedNote && (
                        <p className="text-slate-600">{latestBuyerViewing.proposedNote}</p>
                      )}
                      <div className="flex flex-wrap gap-2 pt-1">
                        <Button
                          type="button"
                          size="sm"
                          disabled={respondingBuyerAction}
                          onClick={() => handleBuyerAcceptProposal(latestBuyerViewing.id)}
                          className="rounded-xl bg-emerald-600 text-xs font-bold text-white hover:bg-emerald-700"
                        >
                          <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                          Elfogadom
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={respondingBuyerAction}
                          onClick={() => handleBuyerCancelViewing(latestBuyerViewing.id)}
                          className="rounded-xl border-rose-200 text-xs font-bold text-rose-700"
                        >
                          Lemondás
                        </Button>
                      </div>
                    </div>
                  )}

                  {latestBuyerViewing.ownerResponseNote && latestBuyerViewing.status !== "PROPOSED_NEW_TIME" && (
                    <p className="rounded-xl bg-white/80 p-2.5 text-slate-700">
                      <strong>Eladó üzenete:</strong> {latestBuyerViewing.ownerResponseNote}
                    </p>
                  )}

                  {latestBuyerViewing.status === "APPROVED" && (
                    <div className="space-y-2.5">
                      {!inlineDetails ? (
                        <Button
                          type="button"
                          size="sm"
                          disabled={loadingInlineDetails}
                          onClick={() => handleLoadInlineApprovedDetails(latestBuyerViewing.id)}
                          className="w-full rounded-xl bg-emerald-600 text-xs font-bold text-white hover:bg-emerald-700"
                        >
                          {loadingInlineDetails ? (
                            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <MapPin className="mr-1.5 h-3.5 w-3.5" />
                          )}
                          Pontos cím és részletek megnyitása
                        </Button>
                      ) : (
                        <div className="space-y-2 rounded-xl border border-emerald-200 bg-white p-3 text-slate-800">
                          <p className="text-[11px] font-bold uppercase text-emerald-700">Jóváhagyott pontos cím</p>
                          <p className="font-black text-slate-950">
                            {inlineDetails.exactAddress.postalCode} {inlineDetails.exactAddress.city}
                            {inlineDetails.exactAddress.district ? `, ${inlineDetails.exactAddress.district}` : ""}
                          </p>
                          <p className="font-bold">
                            {inlineDetails.exactAddress.streetName} {inlineDetails.exactAddress.streetType}{" "}
                            {inlineDetails.exactAddress.houseNumber}
                            {inlineDetails.exactAddress.floorDoor ? `, ${inlineDetails.exactAddress.floorDoor}` : ""}
                          </p>
                          {inlineDetails.ownerPhone && (
                            <p className="flex items-center gap-1.5 font-semibold text-emerald-800">
                              <Phone className="h-3.5 w-3.5" />
                              Eladó telefonszáma: {inlineDetails.ownerPhone}
                            </p>
                          )}
                          {inlineDetails.exactAddress.viewingInstructions && (
                            <p className="text-slate-600">{inlineDetails.exactAddress.viewingInstructions}</p>
                          )}
                        </div>
                      )}
                      <div className="flex items-center justify-between gap-2">
                        <Link
                          href="/real-estate/viewings"
                          className="font-bold text-emerald-800 underline hover:text-emerald-950"
                        >
                          Megtekintés részletei és térkép
                        </Link>
                        <button
                          type="button"
                          onClick={() => handleBuyerCancelViewing(latestBuyerViewing.id)}
                          className="font-bold text-rose-700 hover:underline"
                        >
                          Lemondás
                        </button>
                      </div>
                    </div>
                  )}

                  {latestBuyerViewing.status === "PENDING" && (
                    <div className="flex items-center justify-between gap-2">
                      <Link href="/real-estate/viewings" className="font-bold text-amber-900 underline">
                        Megtekintéseim megnyitása
                      </Link>
                      <button
                        type="button"
                        onClick={() => handleBuyerCancelViewing(latestBuyerViewing.id)}
                        className="font-bold text-rose-700 hover:underline"
                      >
                        Kérelem visszavonása
                      </button>
                    </div>
                  )}
                </div>
              )}

              {latestBuyerViewing && !property.isOwner ? (
                <p className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs font-medium text-slate-600">
                  Egy adott ingatlanra vevőnként csak egyszer kérhető megtekintési időpont. A kérelmed aktuális
                  állapotát fent látod, további kérdés esetén használhatod az alábbi üzenetküldőt.
                </p>
              ) : isClosed ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs font-semibold text-slate-600">
                  <AlertTriangle className="mb-1.5 h-4 w-4 text-amber-600" />
                  Erre az ingatlanra jelenleg nem kérhető új megtekintési időpont ({statusInfo?.label}).
                </div>
              ) : property.isOwner ? (
                <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-700">
                  <p className="font-bold">Ez a saját ingatlanhirdetésed.</p>
                  <p>Az időpontok megadását és a beérkező kérelmek kezelését a Saját Ingatlan Adminban éred el.</p>
                  <Button asChild className="w-full rounded-xl bg-emerald-600 font-bold text-white hover:bg-emerald-700">
                    <Link href={`/real-estate/admin/${property.id}`}>Megtekintési időpontok kezelése</Link>
                  </Button>
                </div>
              ) : viewingSubmitted ? (
                <div className="space-y-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs text-emerald-950">
                  <div className="flex items-center gap-2 font-bold text-emerald-800">
                    <CheckCircle2 className="h-5 w-5" />
                    Megtekintési kérelem elküldve
                  </div>
                  <p>
                    A kérelmed állapota jelenleg <strong>Jóváhagyásra vár</strong>. Amint a hirdető elfogadja, a
                    pontos cím és a megtekintés részletei megnyílnak a Megtekintéseim oldalon.
                  </p>
                  <Button asChild className="w-full rounded-xl bg-emerald-600 font-bold text-white hover:bg-emerald-700">
                    <Link href="/real-estate/viewings">Megtekintéseim megnyitása</Link>
                  </Button>
                </div>
              ) : !isSignedIn ? (
                <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-700">
                  <p className="font-semibold">
                    A megtekintési időpont kéréséhez jelentkezz be az ILOLIT fiókodba, majd igazold a telefonszámodat.
                  </p>
                  <Button asChild className="h-11 w-full rounded-xl bg-emerald-600 font-bold text-white hover:bg-emerald-700">
                    <Link href="/auth/login">Bejelentkezés</Link>
                  </Button>
                </div>
              ) : !phoneStatus?.phoneVerified ? (
                <div className="space-y-3 rounded-xl border border-amber-200 bg-amber-50/70 p-4 text-xs text-amber-950">
                  <p className="font-bold">
                    A megtekintési kérelemhez előbb igazold mobiltelefonszámodat.
                  </p>
                  <p className="text-amber-900/80">
                    Az ellenőrzött elérhetőség növeli a megtekintések biztonságát.
                  </p>
                  <Button
                    type="button"
                    onClick={() => setPhoneModalOpen(true)}
                    className="h-11 w-full rounded-xl bg-emerald-600 font-bold text-white hover:bg-emerald-700"
                  >
                    <Phone className="mr-2 h-4 w-4" />
                    Telefonszám ellenőrzése
                  </Button>
                </div>
              ) : availableDates.length === 0 ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600">
                  <Calendar className="mb-1.5 h-4 w-4 text-slate-400" />
                  A hirdető még nem adott meg szabad megtekintési időpontot. Küldj neki üzenetet lentebb!
                </div>
              ) : (
                <form onSubmit={handleSubmitViewing} className="space-y-4">
                  <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50/60 px-3 py-2 text-xs font-semibold text-emerald-800">
                    <span className="flex items-center gap-1.5">
                      <CheckCircle2 className="h-4 w-4" />
                      Telefonszám ellenőrizve
                    </span>
                    <span className="text-[11px]">{phoneStatus.phoneMasked}</span>
                  </div>

                  {/* Date selector */}
                  <div>
                    <span className="block text-xs font-bold text-slate-700">Nap kiválasztása</span>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {availableDates.map((d) => (
                        <button
                          key={d}
                          type="button"
                          onClick={() => {
                            setSelectedDate(d);
                            setSelectedSlotId("");
                          }}
                          className={`rounded-xl border px-3 py-1.5 text-xs font-bold transition ${
                            effectiveDate === d
                              ? "border-emerald-600 bg-emerald-600 text-white"
                              : "border-slate-200 bg-white text-slate-700 hover:border-emerald-300"
                          }`}
                        >
                          {d}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Time slots */}
                  <div>
                    <span className="block text-xs font-bold text-slate-700">Szabad idősávok ({effectiveDate})</span>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      {slotsForDate.map((slot) => (
                        <button
                          key={slot.id}
                          type="button"
                          onClick={() => setSelectedSlotId(slot.id)}
                          className={`flex flex-col items-start rounded-xl border p-2.5 text-left transition ${
                            selectedSlotId === slot.id
                              ? "border-emerald-600 bg-emerald-50 text-emerald-900 ring-1 ring-emerald-600"
                              : "border-slate-200 bg-white text-slate-700 hover:border-emerald-300"
                          }`}
                        >
                          <span className="flex items-center gap-1 text-xs font-bold">
                            <Clock className="h-3.5 w-3.5 text-emerald-600" />
                            {slot.startTime} – {slot.endTime}
                          </span>
                          <span className="mt-0.5 text-[11px] text-slate-500">{slot.durationMinutes} perc</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <label className="block text-xs font-bold text-slate-700">
                    Neved
                    <input
                      type="text"
                      value={requesterName || user?.fullName || ""}
                      onChange={(e) => setRequesterName(e.target.value)}
                      placeholder="Teljes neved"
                      required
                      className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2 text-xs text-slate-900 outline-none focus:border-emerald-600"
                    />
                  </label>

                  <label className="block text-xs font-bold text-slate-700">
                    Rövid üzenet a hirdetőnek (opcionális)
                    <textarea
                      rows={2}
                      value={viewingMessage}
                      onChange={(e) => setViewingMessage(e.target.value)}
                      placeholder="pl. Készpénzes vásárlóként érkezem, kérdésem lenne a rezsiről."
                      className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2 text-xs text-slate-900 outline-none focus:border-emerald-600"
                    />
                  </label>

                  {/* Reminder options */}
                  <div className="space-y-1.5 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs">
                    <span className="block font-bold text-slate-700">Automatikus emlékeztető</span>
                    <label className="flex cursor-pointer items-center gap-2 text-slate-600">
                      <input
                        type="checkbox"
                        checked={reminder24h}
                        onChange={(e) => setReminder24h(e.target.checked)}
                        className="accent-emerald-600"
                      />
                      24 órával a megtekintés előtt
                    </label>
                    <label className="flex cursor-pointer items-center gap-2 text-slate-600">
                      <input
                        type="checkbox"
                        checked={reminder2h}
                        onChange={(e) => setReminder2h(e.target.checked)}
                        className="accent-emerald-600"
                      />
                      2 órával a megtekintés előtt (opcionális)
                    </label>
                  </div>

                  <Button
                    type="submit"
                    disabled={!selectedSlotId || submittingViewing}
                    className="h-11 w-full rounded-xl bg-emerald-600 font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {submittingViewing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Calendar className="mr-2 h-4 w-4" />}
                    Megtekintési időpontot kérek
                  </Button>

                  <p className="flex items-center gap-1.5 text-[11px] text-slate-500">
                    <Lock className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                    A pontos cím csak a hirdető jóváhagyása után válik láthatóvá.
                  </p>
                </form>
              )}

              {/* Direct message block */}
              {!property.isOwner && (
                <div className="border-t border-slate-200 pt-5">
                  <h3 className="flex items-center gap-1.5 text-sm font-bold text-slate-900">
                    <MessageSquare className="h-4 w-4 text-emerald-600" />
                    Kérdés a hirdetőhöz
                  </h3>
                  {isSignedIn ? (
                    <form onSubmit={handleSendInquiry} className="mt-3 space-y-2.5">
                      <textarea
                        rows={2}
                        value={messageText}
                        onChange={(e) => setMessageText(e.target.value)}
                        placeholder="Írj kérdést az ingatlanról..."
                        required
                        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs text-slate-900 outline-none focus:border-emerald-600"
                      />
                      <Button
                        type="submit"
                        variant="outline"
                        disabled={sendingMsg || !messageText.trim()}
                        className="w-full rounded-xl border-slate-300 text-xs font-bold text-slate-800 hover:bg-slate-50"
                      >
                        <Send className="mr-1.5 h-3.5 w-3.5" />
                        Üzenet küldése
                      </Button>
                    </form>
                  ) : (
                    <p className="mt-2 text-xs text-slate-500">Üzenetküldéshez jelentkezz be.</p>
                  )}
                </div>
              )}
            </div>
          </aside>
        </div>

        {/* Sticky bottom mobile CTA */}
        {!property.isOwner && !isClosed && (
          <div className="fixed bottom-16 left-0 right-0 z-40 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur md:bottom-0 lg:hidden">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold text-slate-500">
                  {property.transactionType === "rent" ? "Bérleti díj" : "Vételár"}
                </p>
                <p className="text-base font-black text-emerald-700">{formatHuf(property.price)}</p>
              </div>
              <Button
                type="button"
                onClick={scrollToViewingCard}
                className="h-11 rounded-xl bg-emerald-600 px-5 text-xs font-bold text-white hover:bg-emerald-700"
              >
                <Calendar className="mr-1.5 h-4 w-4" />
                {latestBuyerViewing ? "Megtekintési állapot" : "Megtekintési időpontot kérek"}
              </Button>
            </div>
          </div>
        )}

        {/* Photo Lightbox */}
        {lightboxOpen && activeMedia?.url && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 p-4">
            <button
              type="button"
              onClick={() => setLightboxOpen(false)}
              className="absolute right-4 top-4 rounded-full bg-white/15 p-2 text-white hover:bg-white/25"
            >
              <X className="h-6 w-6" />
            </button>
            <img
              src={activeMedia.url}
              alt={property.title}
              style={{ transform: `rotate(${activeMedia.rotation || 0}deg)` }}
              className="max-h-[88vh] max-w-[92vw] object-contain"
            />
          </div>
        )}

        {/* Abuse Report Modal */}
        {reportOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
            <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-slate-950">Hirdetés jelentése</h3>
                <button type="button" onClick={() => setReportOpen(false)} className="text-slate-400 hover:text-slate-700">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <form onSubmit={handleReportSubmit} className="mt-4 space-y-4">
                <label className="block text-xs font-bold text-slate-700">
                  Bejelentés oka
                  <select
                    value={reportReason}
                    onChange={(e) => setReportReason(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2 text-xs"
                  >
                    <option value="Valótlan vagy félrevezető adatok">Valótlan vagy félrevezető adatok</option>
                    <option value="Gyanús vagy visszaélésre utaló hirdetés">Gyanús vagy visszaélésre utaló hirdetés</option>
                    <option value="Duplikált vagy nem létező ingatlan">Duplikált vagy nem létező ingatlan</option>
                    <option value="Egyéb probléma">Egyéb probléma</option>
                  </select>
                </label>
                <label className="block text-xs font-bold text-slate-700">
                  Részletek (opcionális)
                  <textarea
                    rows={3}
                    value={reportDetails}
                    onChange={(e) => setReportDetails(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2 text-xs"
                  />
                </label>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setReportOpen(false)} className="rounded-xl text-xs">
                    Mégse
                  </Button>
                  <Button type="submit" disabled={sendingReport} className="rounded-xl bg-rose-600 text-xs font-bold text-white hover:bg-rose-700">
                    Jelentés küldése
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </Layout>
  );
}
