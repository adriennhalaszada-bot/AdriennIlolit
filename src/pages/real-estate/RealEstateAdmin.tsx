import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useParams } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useUser } from "@clerk/react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { realEstateApi } from "@/lib/realEstate/api";
import {
  ABUSE_REPORT_REASONS,
  REAL_ESTATE_CONFIG,
  RESTRICTION_LEVEL_LABELS,
  STATUS_LABELS,
  VIEWING_DURATION_OPTIONS,
  VIEWING_PURPOSE_LABELS,
  VIEWING_STATUS_LABELS,
  formatHuf,
  formatPublicLocation,
  getCategoryLabel,
} from "@/lib/realEstate/config";
import type {
  AgentInquiryPolicy,
  PropertyPhoto,
  PropertyStatus,
  RealEstateProperty,
  ViewingRequest,
} from "@/lib/realEstate/types";
import { RealEstateMediaUploader } from "@/components/realestate/RealEstateMediaUploader";
import {
  Activity,
  AlertTriangle,
  Ban,
  BarChart3,
  Calendar,
  Camera,
  CheckCircle2,
  Clock,
  CreditCard,
  Edit3,
  ExternalLink,
  Eye,
  Flag,
  Heart,
  History,
  Home,
  LayoutDashboard,
  Loader2,
  Lock,
  MessageSquare,
  Plus,
  PlusCircle,
  Power,
  Repeat,
  Send,
  ShieldCheck,
  Trash2,
  Users,
  XCircle,
} from "lucide-react";

type AdminSection =
  | "overview"
  | "edit"
  | "media"
  | "slots"
  | "inquiries"
  | "messages"
  | "stats"
  | "status"
  | "billing";

const ADMIN_MENU: { id: AdminSection; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "overview", label: "Áttekintés", icon: LayoutDashboard },
  { id: "edit", label: "Hirdetés szerkesztése", icon: Edit3 },
  { id: "media", label: "Fotók és alaprajz", icon: Camera },
  { id: "slots", label: "Megtekintési időpontok", icon: Calendar },
  { id: "inquiries", label: "Érdeklődők", icon: Users },
  { id: "messages", label: "Üzenetek", icon: MessageSquare },
  { id: "stats", label: "Statisztikák", icon: BarChart3 },
  { id: "status", label: "Hirdetés státusza", icon: Power },
  { id: "billing", label: "Számlázás / fizetés", icon: CreditCard },
];

const WEEKDAY_LABELS = [
  { num: 1, label: "H" },
  { num: 2, label: "K" },
  { num: 3, label: "Sze" },
  { num: 4, label: "Cs" },
  { num: 5, label: "P" },
  { num: 6, label: "Szo" },
  { num: 0, label: "V" },
];

export default function RealEstateAdmin() {
  const { id: paramId } = useParams<{ id?: string }>();
  const [, setLocation] = useLocation();
  const { isSignedIn, user } = useUser();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [section, setSection] = useState<AdminSection>("overview");
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>(paramId || "");
  const [paymentMessage, setPaymentMessage] = useState<string>("");

  // Slot creation state
  const [slotMode, setSlotMode] = useState<"single" | "recurring">("single");
  const [singleDate, setSingleDate] = useState(() => {
    const d = new Date(Date.now() + 86_400_000);
    return d.toISOString().slice(0, 10);
  });
  const [singleTimes, setSingleTimes] = useState<string>("16:00, 16:30");
  const [durationChoice, setDurationChoice] = useState<number>(REAL_ESTATE_CONFIG.defaultViewingDurationMinutes);
  const [customDuration, setCustomDuration] = useState<string>("");
  const [recStartDate, setRecStartDate] = useState(() => new Date(Date.now() + 86_400_000).toISOString().slice(0, 10));
  const [recEndDate, setRecEndDate] = useState(() => new Date(Date.now() + 14 * 86_400_000).toISOString().slice(0, 10));
  const [recWeekdays, setRecWeekdays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [recWindowStart, setRecWindowStart] = useState("16:00");
  const [recWindowEnd, setRecWindowEnd] = useState("18:00");
  const [slotBusy, setSlotBusy] = useState(false);

  // Quick edit states
  const [editTitle, setEditTitle] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editInstructions, setEditInstructions] = useState("");
  const [editOwnerPhoneMode, setEditOwnerPhoneMode] = useState<"none" | "approved_only">("none");
  const [editOwnerPhone, setEditOwnerPhone] = useState("");
  const [editAgentPolicy, setEditAgentPolicy] = useState<AgentInquiryPolicy>("no_agents");
  const [editVerifiedOnly, setEditVerifiedOnly] = useState(false);
  const [editPhotos, setEditPhotos] = useState<PropertyPhoto[]>([]);

  // One-click abuse report modal state (#10)
  const [reportTargetViewing, setReportTargetViewing] = useState<ViewingRequest | null>(null);
  const [reportReasonCode, setReportReasonCode] = useState<string>("unsolicited_agent");
  const [reportDetails, setReportDetails] = useState("");
  const [sendingAbuseReport, setSendingAbuseReport] = useState(false);
  const [editFloorPlans, setEditFloorPlans] = useState<PropertyPhoto[]>([]);
  const [editVideoUrl, setEditVideoUrl] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  // Viewing response state
  const [proposingViewingId, setProposingViewingId] = useState<string | null>(null);
  const [propDate, setPropDate] = useState("");
  const [propTime, setPropTime] = useState("17:00");
  const [propNote, setPropNote] = useState("");
  const [viewingBusyId, setViewingBusyId] = useState<string | null>(null);

  // Message reply state
  const [replyTargetId, setReplyTargetId] = useState("");
  const [replyText, setReplyText] = useState("");
  const [sendingReply, setSendingReply] = useState(false);

  // Checkout busy
  const [checkoutBusy, setCheckoutBusy] = useState(false);

  // Verify Stripe Checkout return on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const payment = params.get("payment");
    const sessionId = params.get("session_id");
    if (payment === "success" && sessionId && isSignedIn) {
      realEstateApi
        .verifyListingCheckout(sessionId)
        .then((res) => {
          if (res.paid) {
            setPaymentMessage("A fizetés sikeres volt, a hirdetésed aktív! Most megadhatod a megtekintési időpontokat.");
            queryClient.invalidateQueries({ queryKey: ["real-estate-my-properties"] });
            queryClient.invalidateQueries({ queryKey: ["real-estate-property", res.propertyId] });
          }
        })
        .catch(() => {
          setPaymentMessage("A fizetés ellenőrzése folyamatban van – frissítsd az oldalt néhány másodperc múlva.");
        });
    } else if (payment === "cancelled") {
      setPaymentMessage("A fizetés megszakadt. A hirdetésed Fizetésre vár állapotban maradt – bármikor folytathatod.");
    }
  }, [isSignedIn, queryClient]);

  const { data: myPropertiesData, isLoading: loadingList } = useQuery({
    queryKey: ["real-estate-my-properties"],
    queryFn: () => realEstateApi.listProperties({ mine: true }),
    enabled: Boolean(isSignedIn),
  });

  const myProperties = myPropertiesData?.items || [];

  useEffect(() => {
    if (paramId) {
      setSelectedPropertyId(paramId);
    } else if (!selectedPropertyId && myProperties.length > 0) {
      setSelectedPropertyId(myProperties[0].id);
    }
  }, [paramId, myProperties, selectedPropertyId]);

  const activeProperty: RealEstateProperty | undefined = useMemo(
    () => myProperties.find((p) => p.id === selectedPropertyId) || myProperties[0],
    [myProperties, selectedPropertyId],
  );

  useEffect(() => {
    if (!activeProperty) return;
    setEditTitle(activeProperty.title || "");
    setEditPrice(String(activeProperty.price || ""));
    setEditDesc(activeProperty.description || "");
    setEditInstructions(activeProperty.exactAddress?.viewingInstructions || "");
    setEditOwnerPhoneMode(activeProperty.ownerPhoneShareMode || "none");
    setEditOwnerPhone(activeProperty.ownerPhone || "");
    setEditAgentPolicy(activeProperty.agentInquiryPolicy || "no_agents");
    setEditVerifiedOnly(Boolean(activeProperty.verifiedBuyersOnly));
    setEditPhotos(activeProperty.photos || []);
    setEditFloorPlans(activeProperty.floorPlans || []);
    setEditVideoUrl(activeProperty.videoUrl || "");
  }, [activeProperty?.id, activeProperty?.updatedAt]);

  const { data: viewingsData, refetch: refetchViewings } = useQuery({
    queryKey: ["real-estate-admin-viewings", activeProperty?.id],
    queryFn: () => realEstateApi.getMyViewings(activeProperty?.id),
    enabled: Boolean(isSignedIn && activeProperty?.id),
  });

  const { data: auditData, refetch: refetchAudit } = useQuery({
    queryKey: ["real-estate-admin-audit", activeProperty?.id],
    queryFn: () => realEstateApi.getAuditLog(activeProperty!.id),
    enabled: Boolean(isSignedIn && activeProperty?.id),
  });

  const { data: messagesData, refetch: refetchMessages } = useQuery({
    queryKey: ["real-estate-admin-messages", activeProperty?.id],
    queryFn: () => realEstateApi.getMessages(activeProperty!.id),
    enabled: Boolean(isSignedIn && activeProperty?.id),
  });

  const { data: moderationData, refetch: refetchModeration } = useQuery({
    queryKey: ["real-estate-admin-moderation", activeProperty?.id],
    queryFn: () => realEstateApi.getModerationLog(activeProperty!.id),
    enabled: Boolean(isSignedIn && activeProperty?.id),
  });

  const ownerViewings = (viewingsData?.items || []).filter((v) => v.role === "owner");
  const pendingViewings = ownerViewings.filter((v) => v.status === "PENDING");
  const approvedViewings = ownerViewings.filter((v) => v.status === "APPROVED");
  const todayIso = new Date().toISOString().slice(0, 10);
  const isDeletableViewing = (v: ViewingRequest) =>
    ["REJECTED", "REVOKED_BY_OWNER", "CANCELLED_BY_REQUESTER"].includes(v.status) || v.date < todayIso;
  const deletableViewings = ownerViewings.filter(isDeletableViewing);
  const auditLogs = auditData?.items || [];
  const messages = messagesData?.items || [];

  const effectiveDuration = customDuration ? Math.max(10, Math.min(240, Number(customDuration) || 30)) : durationChoice;

  const refreshAll = () => {
    queryClient.invalidateQueries({ queryKey: ["real-estate-my-properties"] });
    refetchViewings();
    refetchAudit();
    refetchMessages();
    refetchModeration();
  };

  const handleSubmitAbuseReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProperty || !reportTargetViewing) return;
    const chosen =
      ABUSE_REPORT_REASONS.find((r) => r.code === reportReasonCode) || ABUSE_REPORT_REASONS[0];
    setSendingAbuseReport(true);
    try {
      await realEstateApi.reportAbuse({
        propertyId: activeProperty.id,
        viewingId: reportTargetViewing.id,
        targetUserId: reportTargetViewing.requesterId,
        reasonCode: chosen.code,
        reason: chosen.label,
        details: reportDetails.trim() || undefined,
      });
      setReportTargetViewing(null);
      setReportDetails("");
      setReportReasonCode("unsolicited_agent");
      refreshAll();
      toast({
        title: "Bejelentés rögzítve moderációra",
        description:
          "A jelentés bekerült a moderációs naplóba. Ismétlődő vagy igazolt visszaélés esetén fokozatos korlátozás alkalmazható.",
      });
    } catch (err: any) {
      toast({ title: err?.message || "Nem sikerült elküldeni a jelentést.", variant: "destructive" });
    } finally {
      setSendingAbuseReport(false);
    }
  };

  const handleAddSlots = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProperty) return;
    setSlotBusy(true);
    try {
      if (slotMode === "single") {
        const parsedTimes = singleTimes
          .split(/[,\n;]+/)
          .map((t) => t.trim())
          .filter((t) => /^\d{2}:\d{2}$/.test(t));
        if (parsedTimes.length === 0) {
          toast({ title: "Adj meg legalább egy érvényes kezdési időpontot (pl. 16:00, 16:30).", variant: "destructive" });
          return;
        }
        const res = await realEstateApi.addSlots(activeProperty.id, {
          slots: parsedTimes.map((startTime) => ({
            date: singleDate,
            startTime,
            durationMinutes: effectiveDuration,
          })),
        });
        toast({ title: `${res.addedCount} megtekintési időpont hozzáadva` });
      } else {
        const res = await realEstateApi.addSlots(activeProperty.id, {
          recurring: {
            startDate: recStartDate,
            endDate: recEndDate,
            weekdays: recWeekdays,
            windowStart: recWindowStart,
            windowEnd: recWindowEnd,
            durationMinutes: effectiveDuration,
          },
        });
        toast({ title: `${res.addedCount} ismétlődő időpont generálva` });
      }
      refreshAll();
    } catch (err: any) {
      toast({ title: err?.message || "Nem sikerült hozzáadni az időpontokat.", variant: "destructive" });
    } finally {
      setSlotBusy(false);
    }
  };

  const handleToggleSlotBlock = async (slotId: string, currentlyBlocked: boolean) => {
    if (!activeProperty) return;
    try {
      await realEstateApi.toggleBlockSlot(activeProperty.id, slotId, !currentlyBlocked);
      refreshAll();
    } catch (err: any) {
      toast({ title: err?.message || "Hiba történt.", variant: "destructive" });
    }
  };

  const handleDeleteSlot = async (slotId: string) => {
    if (!activeProperty) return;
    if (!window.confirm("Biztosan törlöd ezt az idősávot? Ha volt rá foglalás, az érdeklődő értesítést kap.")) return;
    try {
      await realEstateApi.deleteSlot(activeProperty.id, slotId);
      refreshAll();
      toast({ title: "Időpont törölve" });
    } catch (err: any) {
      toast({ title: err?.message || "Nem sikerült törölni.", variant: "destructive" });
    }
  };

  const handleViewingAction = async (
    v: ViewingRequest,
    action: "APPROVE" | "REJECT" | "REVOKE" | "PROPOSE_NEW_TIME",
  ) => {
    if (action === "REVOKE" && !window.confirm("Biztosan visszavonod a jóváhagyott megtekintést? Az érdeklődő azonnal értesítést kap, és megszűnik a hozzáférése a pontos címhez.")) {
      return;
    }
    setViewingBusyId(v.id);
    try {
      await realEstateApi.respondToViewing(v.id, {
        action,
        proposedDate: action === "PROPOSE_NEW_TIME" ? propDate : undefined,
        proposedStartTime: action === "PROPOSE_NEW_TIME" ? propTime : undefined,
        proposedDurationMinutes: action === "PROPOSE_NEW_TIME" ? v.durationMinutes : undefined,
        note: action === "PROPOSE_NEW_TIME" ? propNote : undefined,
      });
      setProposingViewingId(null);
      setPropNote("");
      refreshAll();
      toast({
        title:
          action === "APPROVE"
            ? "Megtekintés jóváhagyva – a pontos cím megnyílt az érdeklődő számára"
            : action === "PROPOSE_NEW_TIME"
            ? "Új időpont-javaslat elküldve"
            : action === "REVOKE"
            ? "Megtekintés visszavonva"
            : "Kérelem elutasítva",
      });
    } catch (err: any) {
      toast({ title: err?.message || "A művelet sikertelen.", variant: "destructive" });
    } finally {
      setViewingBusyId(null);
    }
  };

  const handleBlockUser = async (targetUserId: string) => {
    if (!activeProperty) return;
    if (!window.confirm("Biztosan letiltod ezt a felhasználót? Többé nem küldhet megtekintési kérelmet vagy üzenetet.")) return;
    try {
      await realEstateApi.blockUser(targetUserId, activeProperty.id);
      refreshAll();
      toast({ title: "Felhasználó letiltva" });
    } catch (err: any) {
      toast({ title: err?.message || "Nem sikerült tiltani.", variant: "destructive" });
    }
  };

  const handleDeleteViewing = async (v: ViewingRequest) => {
    if (!window.confirm("Biztosan törlöd ezt a régi/lezárt érdeklődést a listából?")) return;
    setViewingBusyId(v.id);
    try {
      await realEstateApi.deleteViewing(v.id);
      refreshAll();
      toast({ title: "Érdeklődés törölve a listából" });
    } catch (err: any) {
      toast({ title: err?.message || "Nem sikerült törölni.", variant: "destructive" });
    } finally {
      setViewingBusyId(null);
    }
  };

  const handleBulkDeleteOldViewings = async () => {
    if (deletableViewings.length === 0) return;
    if (!window.confirm(`Biztosan törlöd mind a(z) ${deletableViewings.length} régi/lemondott érdeklődést?`)) return;
    setViewingBusyId("bulk");
    try {
      for (const v of deletableViewings) {
        await realEstateApi.deleteViewing(v.id);
      }
      refreshAll();
      toast({ title: `${deletableViewings.length} régi / lemondott érdeklődés törölve` });
    } catch (err: any) {
      toast({ title: err?.message || "Nem sikerült minden tételt törölni.", variant: "destructive" });
    } finally {
      setViewingBusyId(null);
    }
  };

  const handleSaveQuickEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProperty) return;
    setSavingEdit(true);
    try {
      await realEstateApi.updateProperty(activeProperty.id, {
        title: editTitle.trim(),
        price: Math.max(1000, Math.round(Number(editPrice) || activeProperty.price)),
        description: editDesc.trim(),
        ownerPhoneShareMode: editOwnerPhoneMode,
        ownerPhone: editOwnerPhoneMode === "approved_only" ? editOwnerPhone.trim() : "",
        agentInquiryPolicy: editAgentPolicy,
        verifiedBuyersOnly: editVerifiedOnly,
        exactAddress: activeProperty.exactAddress
          ? { ...activeProperty.exactAddress, viewingInstructions: editInstructions.trim() || undefined }
          : undefined,
      });
      refreshAll();
      toast({ title: "Hirdetés adatai frissítve" });
    } catch (err: any) {
      toast({ title: err?.message || "Mentési hiba.", variant: "destructive" });
    } finally {
      setSavingEdit(false);
    }
  };

  const handleSaveMedia = async () => {
    if (!activeProperty) return;
    setSavingEdit(true);
    try {
      await realEstateApi.updateProperty(activeProperty.id, {
        photos: editPhotos,
        floorPlans: editFloorPlans,
        videoUrl: editVideoUrl,
      });
      refreshAll();
      toast({ title: "Fotók és alaprajzok mentve" });
    } catch (err: any) {
      toast({ title: err?.message || "Nem sikerült menteni.", variant: "destructive" });
    } finally {
      setSavingEdit(false);
    }
  };

  const handleStatusChange = async (nextStatus: PropertyStatus) => {
    if (!activeProperty) return;
    if (nextStatus === "DELETED" && !window.confirm("Biztosan törlöd ezt az ingatlanhirdetést?")) return;
    try {
      await realEstateApi.updatePropertyStatus(activeProperty.id, nextStatus);
      refreshAll();
      toast({ title: `Státusz frissítve: ${STATUS_LABELS[nextStatus].label}` });
      if (nextStatus === "DELETED") setSelectedPropertyId("");
    } catch (err: any) {
      toast({ title: err?.message || "A státusz nem módosítható.", variant: "destructive" });
    }
  };

  const handlePayNow = async () => {
    if (!activeProperty) return;
    setCheckoutBusy(true);
    try {
      const res = await realEstateApi.startListingCheckout(activeProperty.id);
      if (res.activated) {
        refreshAll();
        toast({ title: "Hirdetés aktiválva!" });
        return;
      }
      if (res.checkoutUrl) {
        window.location.href = res.checkoutUrl;
      }
    } catch (err: any) {
      toast({ title: err?.message || "A fizetés indítása sikertelen.", variant: "destructive" });
    } finally {
      setCheckoutBusy(false);
    }
  };

  const handleTestActivate = async () => {
    if (!activeProperty) return;
    setCheckoutBusy(true);
    try {
      await realEstateApi.testActivateProperty(activeProperty.id);
      refreshAll();
      toast({
        title: "Teszt aktiválás kész (fizetés nélkül)",
        description: "A hirdetés most aktív – kipróbálhatod a tulajdonosi és publikus nézetet is.",
      });
    } catch (err: any) {
      toast({ title: err?.message || "A teszt aktiválás nem sikerült.", variant: "destructive" });
    } finally {
      setCheckoutBusy(false);
    }
  };

  const handleCreateTestViewing = async () => {
    if (!activeProperty) return;
    setViewingBusyId("test");
    try {
      await realEstateApi.createTestViewing(activeProperty.id);
      refreshAll();
      toast({
        title: "Teszt megtekintési kérelem létrehozva",
        description: "Most kipróbálhatod az Elfogadom / Másik időpontot ajánlok / Elutasítom gombokat.",
      });
    } catch (err: any) {
      toast({ title: err?.message || "Nem sikerült létrehozni a teszt kérelmet.", variant: "destructive" });
    } finally {
      setViewingBusyId(null);
    }
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProperty || !replyText.trim() || !replyTargetId) return;
    setSendingReply(true);
    try {
      await realEstateApi.sendMessage(
        activeProperty.id,
        replyText.trim(),
        replyTargetId,
        user?.fullName || activeProperty.ownerName,
      );
      setReplyText("");
      refetchMessages();
      toast({ title: "Válasz elküldve" });
    } catch (err: any) {
      toast({ title: err?.message || "Nem sikerült elküldeni.", variant: "destructive" });
    } finally {
      setSendingReply(false);
    }
  };

  if (!isSignedIn) {
    return (
      <Layout>
        <div className="mx-auto max-w-lg px-4 py-20 text-center">
          <LayoutDashboard className="mx-auto h-10 w-10 text-emerald-600" />
          <h1 className="mt-3 text-2xl font-black text-slate-950">Saját Ingatlan Admin</h1>
          <p className="mt-2 text-sm text-slate-600">
            Az ingatlanhirdetéseid és megtekintési időpontjaid kezeléséhez jelentkezz be.
          </p>
          <Button asChild className="mt-5 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700">
            <Link href="/auth/login">Bejelentkezés</Link>
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <main className="min-h-screen bg-slate-50 pb-20">
        {/* Header */}
        <section className="border-b border-slate-200 bg-white px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto flex max-w-7xl flex-col justify-between gap-4 md:flex-row md:items-center">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-emerald-700">ILOLIT Ingatlan</p>
              <h1 className="mt-1 text-2xl font-black text-slate-950 sm:text-3xl">Saját Ingatlan Admin</h1>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {myProperties.length > 0 && (
                <select
                  value={activeProperty?.id || ""}
                  onChange={(e) => {
                    setSelectedPropertyId(e.target.value);
                    setLocation(`/real-estate/admin/${e.target.value}`);
                  }}
                  className="h-10 rounded-xl border border-slate-300 bg-white px-3 text-xs font-bold text-slate-900 outline-none focus:border-emerald-600"
                >
                  {myProperties.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title} ({STATUS_LABELS[p.status]?.label})
                    </option>
                  ))}
                </select>
              )}
              <Button asChild className="h-10 rounded-xl bg-emerald-600 px-4 text-xs font-bold text-white hover:bg-emerald-700">
                <Link href="/real-estate/new">
                  <PlusCircle className="mr-1.5 h-4 w-4" />
                  Új ingatlan feladása
                </Link>
              </Button>
            </div>
          </div>
        </section>

        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          {paymentMessage && (
            <div className="mb-6 flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-900">
              <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-700" />
              <span>{paymentMessage}</span>
            </div>
          )}

          {loadingList ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-14 text-center text-sm text-slate-500">
              Ingatlanok betöltése...
            </div>
          ) : !activeProperty ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-14 text-center">
              <Home className="mx-auto h-10 w-10 text-slate-300" />
              <h2 className="mt-3 text-lg font-bold text-slate-900">Még nincs feladott ingatlanhirdetésed</h2>
              <p className="mt-1 text-xs text-slate-500">
                Adj fel egy hirdetést, és a fizetés után itt kezelheted a fotókat, megtekintési időpontokat és
                érdeklődőket.
              </p>
              <Button asChild className="mt-5 rounded-xl bg-emerald-600 text-xs font-bold text-white hover:bg-emerald-700">
                <Link href="/real-estate/new">
                  <PlusCircle className="mr-1.5 h-4 w-4" />
                  Első ingatlan feladása
                </Link>
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
              {/* Left Admin Navigation (9 sections) */}
              <aside className="lg:col-span-3">
                <div className="rounded-2xl border border-slate-200 bg-white p-3">
                  <div className="mb-3 border-b border-slate-100 p-2">
                    <span
                      className={`inline-block rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${
                        STATUS_LABELS[activeProperty.status]?.className
                      }`}
                    >
                      {STATUS_LABELS[activeProperty.status]?.label}
                    </span>
                    <p className="mt-1.5 line-clamp-2 text-sm font-bold text-slate-950">{activeProperty.title}</p>
                    <p className="mt-0.5 text-xs font-bold text-emerald-700">
                      {formatHuf(activeProperty.price)}
                      {activeProperty.transactionType === "rent" ? " / hó" : ""}
                    </p>
                  </div>

                  <nav className="flex flex-row gap-1 overflow-x-auto pb-1 lg:flex-col">
                    {ADMIN_MENU.map((item) => {
                      const Icon = item.icon;
                      const active = section === item.id;
                      const badgeCount =
                        item.id === "inquiries"
                          ? pendingViewings.length
                          : item.id === "messages"
                          ? messages.length
                          : 0;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setSection(item.id)}
                          className={`flex shrink-0 items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-left text-xs font-bold transition ${
                            active
                              ? "bg-emerald-600 text-white"
                              : "text-slate-700 hover:bg-slate-100 hover:text-slate-950"
                          }`}
                        >
                          <span className="flex items-center gap-2">
                            <Icon className="h-4 w-4" />
                            {item.label}
                          </span>
                          {badgeCount > 0 && (
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] font-black ${
                                active ? "bg-white text-emerald-700" : "bg-emerald-100 text-emerald-800"
                              }`}
                            >
                              {badgeCount}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </nav>
                </div>
              </aside>

              {/* Main Admin Content */}
              <div className="space-y-6 lg:col-span-9">
                {/* Payment / Renewal needed banner */}
                {(activeProperty.status === "DRAFT" ||
                  activeProperty.status === "PAYMENT_PENDING" ||
                  activeProperty.status === "EXPIRED") && (
                  <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-amber-200 bg-amber-50 p-5">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
                      <div className="text-xs text-amber-950">
                        <p className="font-bold">
                          {activeProperty.status === "EXPIRED"
                            ? "A 30 napos hirdetési időszak lejárt – hosszabbítás szükséges"
                            : `A hirdetés még nem aktív (${STATUS_LABELS[activeProperty.status].label})`}
                        </p>
                        <p className="mt-0.5">
                          ILOLIT hirdetési díj: <strong>{formatHuf(activeProperty.listingFee)} / 30 nap</strong> (
                          {activeProperty.listingFeeTier}). 30 nap elteltével a hirdetés ismételt fizetéssel
                          hosszabbítható meg.
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        disabled={checkoutBusy}
                        onClick={handleTestActivate}
                        className="rounded-xl border-emerald-300 bg-white text-xs font-bold text-emerald-800 hover:bg-emerald-50"
                      >
                        <ShieldCheck className="mr-1.5 h-4 w-4" />
                        Teszt aktiválás 30 napra (fizetés nélkül)
                      </Button>
                      <Button
                        type="button"
                        disabled={checkoutBusy}
                        onClick={handlePayNow}
                        className="rounded-xl bg-emerald-600 text-xs font-bold text-white hover:bg-emerald-700"
                      >
                        {checkoutBusy ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <CreditCard className="mr-1.5 h-4 w-4" />}
                        {activeProperty.status === "EXPIRED"
                          ? `Hosszabbítás 30 napra (${formatHuf(activeProperty.listingFee)})`
                          : `Fizetés és aktiválás 30 napra (${formatHuf(activeProperty.listingFee)})`}
                      </Button>
                    </div>
                  </div>
                )}

                {/* ── 1. ÁTTEKINTÉS ── */}
                {section === "overview" && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                      {[
                        { label: "Megtekintések (adatlap)", val: activeProperty.stats.views, icon: Eye },
                        { label: "Kedvencek", val: activeProperty.stats.favorites, icon: Heart },
                        { label: "Megtekintési kérelmek", val: activeProperty.stats.viewingRequests, icon: Users },
                        { label: "Jóváhagyott megtekintések", val: activeProperty.stats.approvedViewings, icon: CheckCircle2 },
                        { label: "Üzenetek", val: activeProperty.stats.messages, icon: MessageSquare },
                        { label: "Aktív napok", val: activeProperty.stats.activeDays, icon: Activity },
                      ].map((kpi) => {
                        const Icon = kpi.icon;
                        return (
                          <div key={kpi.label} className="rounded-2xl border border-slate-200 bg-white p-4">
                            <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                              <Icon className="h-4 w-4 text-emerald-600" />
                              {kpi.label}
                            </span>
                            <p className="mt-2 text-2xl font-black text-slate-950">{kpi.val}</p>
                          </div>
                        );
                      })}
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-6">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <h2 className="text-base font-bold text-slate-950">Gyors áttekintés</h2>
                          <p className="mt-0.5 text-xs text-slate-500">
                            {getCategoryLabel(activeProperty.category)} ·{" "}
                            {formatPublicLocation(activeProperty.publicLocation)}
                          </p>
                          {activeProperty.expiresAt && (
                            <p className="mt-1 text-xs font-bold text-emerald-800">
                              30 napos érvényesség vége:{" "}
                              {new Date(activeProperty.expiresAt).toLocaleDateString("hu-HU")} (
                              {activeProperty.daysRemaining ?? 0} nap hátra)
                            </p>
                          )}
                        </div>
                        <Button asChild variant="outline" size="sm" className="rounded-xl text-xs font-bold">
                          <Link href={`/real-estate/${activeProperty.id}`}>
                            Publikus adatlap megnyitása
                            <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
                          </Link>
                        </Button>
                      </div>

                      {activeProperty.exactAddress && (
                        <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-xs text-slate-700">
                          <Lock className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                          <div>
                            <strong className="text-slate-900">Védett pontos cím (csak te és a jóváhagyott érdeklődők látják):</strong>
                            <p className="mt-0.5">
                              {activeProperty.exactAddress.postalCode} {activeProperty.exactAddress.city}{" "}
                              {activeProperty.exactAddress.district || ""}, {activeProperty.exactAddress.streetName}{" "}
                              {activeProperty.exactAddress.streetType} {activeProperty.exactAddress.houseNumber}
                              {activeProperty.exactAddress.floorDoor ? `, ${activeProperty.exactAddress.floorDoor}` : ""}
                            </p>
                          </div>
                        </div>
                      )}

                      <div className="mt-5 flex flex-wrap gap-2.5">
                        <Button
                          type="button"
                          onClick={() => setSection("slots")}
                          className="rounded-xl bg-emerald-600 text-xs font-bold text-white hover:bg-emerald-700"
                        >
                          <Calendar className="mr-1.5 h-4 w-4" />
                          Megtekintési időpontok ({activeProperty.viewingSlots.length} db)
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setSection("inquiries")}
                          className="rounded-xl border-slate-300 text-xs font-bold"
                        >
                          <Users className="mr-1.5 h-4 w-4 text-emerald-600" />
                          Beérkező kérelmek ({pendingViewings.length} függőben)
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {/* ── 2. HIRDETÉS SZERKESZTÉSE ── */}
                {section === "edit" && (
                  <div className="rounded-2xl border border-slate-200 bg-white p-6">
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
                      <div>
                        <h2 className="text-lg font-bold text-slate-950">Hirdetés szerkesztése</h2>
                        <p className="text-xs text-slate-500">Gyors szerkesztés vagy teljes több lépéses adatlap módosítás.</p>
                      </div>
                      <Button asChild variant="outline" size="sm" className="rounded-xl text-xs font-bold">
                        <Link href={`/real-estate/${activeProperty.id}/edit`}>Teljes szerkesztő megnyitása</Link>
                      </Button>
                    </div>

                    <form onSubmit={handleSaveQuickEdit} className="mt-5 space-y-4">
                      <label className="block text-xs font-bold text-slate-700">
                        Hirdetés címe
                        <input
                          type="text"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          required
                          className="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm outline-none focus:border-emerald-600"
                        />
                      </label>
                      <label className="block text-xs font-bold text-slate-700">
                        {activeProperty.transactionType === "rent" ? "Havi bérleti díj (Ft / hó)" : "Vételár (Ft)"}
                        <input
                          type="number"
                          min={1000}
                          value={editPrice}
                          onChange={(e) => setEditPrice(e.target.value)}
                          required
                          className="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm outline-none focus:border-emerald-600"
                        />
                      </label>
                      <label className="block text-xs font-bold text-slate-700">
                        Ingatlan bemutatása
                        <textarea
                          rows={6}
                          value={editDesc}
                          onChange={(e) => setEditDesc(e.target.value)}
                          required
                          className="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm outline-none focus:border-emerald-600"
                        />
                      </label>
                      <label className="block text-xs font-bold text-slate-700">
                        Megtekintési instrukció (csak jóváhagyás után jelenik meg az érdeklődőnek)
                        <textarea
                          rows={2}
                          value={editInstructions}
                          onChange={(e) => setEditInstructions(e.target.value)}
                          placeholder="pl. Kapucsengő, bejárat, parkolás..."
                          className="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm outline-none focus:border-emerald-600"
                        />
                      </label>

                      {/* Agent Inquiry Policy & Verified Buyers Only (always editable, #1, #18) */}
                      <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
                        <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
                          <div className="text-xs">
                            <p className="font-bold text-slate-900">Ingatlanközvetítői megkeresések</p>
                            <p className="text-slate-500">
                              Te döntöd el, fogadsz-e ingatlanközvetítői megkeresést.
                            </p>
                          </div>
                          <div className="inline-flex shrink-0 rounded-xl border border-slate-200 bg-white p-1 text-xs font-bold">
                            <button
                              type="button"
                              onClick={() => setEditAgentPolicy("no_agents")}
                              className={`rounded-lg px-3 py-1.5 transition ${
                                editAgentPolicy === "no_agents" ? "bg-emerald-600 text-white" : "text-slate-600"
                              }`}
                            >
                              Nem kérek közvetítőt
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditAgentPolicy("allow_agents")}
                              className={`rounded-lg px-3 py-1.5 transition ${
                                editAgentPolicy === "allow_agents" ? "bg-emerald-600 text-white" : "text-slate-600"
                              }`}
                            >
                              Fogadok közvetítőt
                            </button>
                          </div>
                        </div>
                        <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700">
                          <input
                            type="checkbox"
                            checked={editVerifiedOnly}
                            onChange={(e) => setEditVerifiedOnly(e.target.checked)}
                            className="h-4 w-4 accent-emerald-600"
                          />
                          Csak ellenőrzött érdeklődők kérhetnek megtekintést (ellenőrzött telefon + e-mail + teljes profil)
                        </label>
                      </div>

                      {/* Optional seller phone visibility */}
                      <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
                        <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
                          <div className="text-xs">
                            <p className="font-bold text-slate-900">Saját telefonszám (opcionális)</p>
                            <p className="text-slate-500">
                              Sosem nyilvános – opcionálisan csak jóváhagyott érdeklődőknek mutatható meg.
                            </p>
                          </div>
                          <div className="inline-flex shrink-0 rounded-xl border border-slate-200 bg-white p-1 text-xs font-bold">
                            <button
                              type="button"
                              onClick={() => setEditOwnerPhoneMode("none")}
                              className={`rounded-lg px-3 py-1.5 transition ${
                                editOwnerPhoneMode === "none" ? "bg-emerald-600 text-white" : "text-slate-600"
                              }`}
                            >
                              Nem adom meg
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditOwnerPhoneMode("approved_only")}
                              className={`rounded-lg px-3 py-1.5 transition ${
                                editOwnerPhoneMode === "approved_only" ? "bg-emerald-600 text-white" : "text-slate-600"
                              }`}
                            >
                              Jóváhagyás után
                            </button>
                          </div>
                        </div>
                        {editOwnerPhoneMode === "approved_only" && (
                          <input
                            type="tel"
                            value={editOwnerPhone}
                            onChange={(e) => setEditOwnerPhone(e.target.value)}
                            placeholder="+36 30 123 4567"
                            className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm outline-none focus:border-emerald-600"
                          />
                        )}
                      </div>
                      <Button
                        type="submit"
                        disabled={savingEdit}
                        className="rounded-xl bg-emerald-600 px-6 text-xs font-bold text-white hover:bg-emerald-700"
                      >
                        {savingEdit ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Módosítások mentése
                      </Button>
                    </form>
                  </div>
                )}

                {/* ── 3. FOTÓK ÉS ALAPRAJZ ── */}
                {section === "media" && (
                  <div className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6">
                    <RealEstateMediaUploader
                      photos={editPhotos}
                      onPhotosChange={setEditPhotos}
                      floorPlans={editFloorPlans}
                      onFloorPlansChange={setEditFloorPlans}
                      videoUrl={editVideoUrl}
                      onVideoChange={setEditVideoUrl}
                    />
                    <div className="border-t border-slate-200 pt-4">
                      <Button
                        type="button"
                        disabled={savingEdit}
                        onClick={handleSaveMedia}
                        className="rounded-xl bg-emerald-600 px-6 text-xs font-bold text-white hover:bg-emerald-700"
                      >
                        {savingEdit ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Fotók és alaprajzok mentése
                      </Button>
                    </div>
                  </div>
                )}

                {/* ── 4. MEGTEKINTÉSI IDŐPONTOK ── */}
                {section === "slots" && (
                  <div className="space-y-6">
                    <div className="rounded-2xl border border-slate-200 bg-white p-6">
                      <h2 className="text-lg font-bold text-slate-950">Megtekintési időpontok létrehozása</h2>
                      <p className="mt-0.5 text-xs text-slate-500">
                        Adj meg egyedi vagy ismétlődő megtekintési időpontokat. Az érdeklődők csak ezek közül
                        választhatnak, ellenőrzött telefonszámmal.
                      </p>

                      <div className="mt-4 flex gap-2">
                        <button
                          type="button"
                          onClick={() => setSlotMode("single")}
                          className={`inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-bold ${
                            slotMode === "single"
                              ? "border-emerald-600 bg-emerald-600 text-white"
                              : "border-slate-200 bg-white text-slate-700"
                          }`}
                        >
                          <Plus className="h-3.5 w-3.5" />
                          Egyedi / több időpont
                        </button>
                        <button
                          type="button"
                          onClick={() => setSlotMode("recurring")}
                          className={`inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-bold ${
                            slotMode === "recurring"
                              ? "border-emerald-600 bg-emerald-600 text-white"
                              : "border-slate-200 bg-white text-slate-700"
                          }`}
                        >
                          <Repeat className="h-3.5 w-3.5" />
                          Ismétlődő időablak
                        </button>
                      </div>

                      <form onSubmit={handleAddSlots} className="mt-5 space-y-4">
                        {/* Duration picker */}
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                          <label className="block text-xs font-bold text-slate-700">
                            Időpont hossza
                            <select
                              value={durationChoice}
                              onChange={(e) => {
                                setDurationChoice(Number(e.target.value));
                                setCustomDuration("");
                              }}
                              className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold"
                            >
                              {VIEWING_DURATION_OPTIONS.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                  {opt.label}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label className="block text-xs font-bold text-slate-700">
                            Vagy egyéni időtartam (perc)
                            <input
                              type="number"
                              min={10}
                              max={240}
                              value={customDuration}
                              onChange={(e) => setCustomDuration(e.target.value)}
                              placeholder="pl. 20 vagy 90"
                              className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2 text-xs"
                            />
                          </label>
                        </div>

                        {slotMode === "single" ? (
                          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <label className="block text-xs font-bold text-slate-700">
                              Dátum
                              <input
                                type="date"
                                value={singleDate}
                                onChange={(e) => setSingleDate(e.target.value)}
                                required
                                className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold"
                              />
                            </label>
                            <label className="block text-xs font-bold text-slate-700">
                              Kezdési időpontok (vesszővel elválasztva)
                              <input
                                type="text"
                                value={singleTimes}
                                onChange={(e) => setSingleTimes(e.target.value)}
                                placeholder="pl. 16:00, 16:30, 17:00"
                                required
                                className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold"
                              />
                            </label>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                              <label className="block text-xs font-bold text-slate-700">
                                Kezdő dátum
                                <input
                                  type="date"
                                  value={recStartDate}
                                  onChange={(e) => setRecStartDate(e.target.value)}
                                  required
                                  className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2 text-xs"
                                />
                              </label>
                              <label className="block text-xs font-bold text-slate-700">
                                Záró dátum
                                <input
                                  type="date"
                                  value={recEndDate}
                                  onChange={(e) => setRecEndDate(e.target.value)}
                                  required
                                  className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2 text-xs"
                                />
                              </label>
                              <label className="block text-xs font-bold text-slate-700">
                                Időablak kezdete
                                <input
                                  type="time"
                                  value={recWindowStart}
                                  onChange={(e) => setRecWindowStart(e.target.value)}
                                  required
                                  className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2 text-xs"
                                />
                              </label>
                              <label className="block text-xs font-bold text-slate-700">
                                Időablak vége
                                <input
                                  type="time"
                                  value={recWindowEnd}
                                  onChange={(e) => setRecWindowEnd(e.target.value)}
                                  required
                                  className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2 text-xs"
                                />
                              </label>
                            </div>

                            <div>
                              <span className="block text-xs font-bold text-slate-700">Napok</span>
                              <div className="mt-2 flex flex-wrap gap-1.5">
                                {WEEKDAY_LABELS.map((d) => {
                                  const selected = recWeekdays.includes(d.num);
                                  return (
                                    <button
                                      key={d.num}
                                      type="button"
                                      onClick={() =>
                                        setRecWeekdays((prev) =>
                                          selected ? prev.filter((x) => x !== d.num) : [...prev, d.num],
                                        )
                                      }
                                      className={`h-9 w-10 rounded-xl border text-xs font-bold ${
                                        selected
                                          ? "border-emerald-600 bg-emerald-600 text-white"
                                          : "border-slate-200 bg-white text-slate-700"
                                      }`}
                                    >
                                      {d.label}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        )}

                        <Button
                          type="submit"
                          disabled={slotBusy}
                          className="rounded-xl bg-emerald-600 px-5 text-xs font-bold text-white hover:bg-emerald-700"
                        >
                          {slotBusy ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Plus className="mr-1.5 h-4 w-4" />}
                          Időpontok hozzáadása ({effectiveDuration} perc / idősáv)
                        </Button>
                      </form>
                    </div>

                    {/* Existing slots list */}
                    <div className="rounded-2xl border border-slate-200 bg-white p-6">
                      <h3 className="text-base font-bold text-slate-950">
                        Megadott megtekintési időpontok ({activeProperty.viewingSlots.length} db)
                      </h3>
                      {activeProperty.viewingSlots.length === 0 ? (
                        <p className="mt-3 text-xs text-slate-500">Még nincs megadott megtekintési időpont.</p>
                      ) : (
                        <div className="mt-4 space-y-2">
                          {activeProperty.viewingSlots.map((slot) => (
                            <div
                              key={slot.id}
                              className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3 text-xs ${
                                slot.isBlocked ? "border-slate-200 bg-slate-50 opacity-70" : "border-slate-200 bg-white"
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <Calendar className="h-4 w-4 text-emerald-600" />
                                <span className="font-bold text-slate-950">{slot.date}</span>
                                <span className="flex items-center gap-1 font-semibold text-slate-700">
                                  <Clock className="h-3.5 w-3.5 text-slate-400" />
                                  {slot.startTime} – {slot.endTime} ({slot.durationMinutes} perc)
                                </span>
                                {slot.isBlocked && (
                                  <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                                    Blokkolva
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleToggleSlotBlock(slot.id, slot.isBlocked)}
                                  className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-bold text-slate-700 hover:bg-slate-50"
                                >
                                  {slot.isBlocked ? "Feloldás" : "Blokkolás"}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteSlot(slot.id)}
                                  className="rounded-lg p-1.5 text-slate-500 hover:bg-rose-50 hover:text-rose-600"
                                  title="Időpont törlése"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* ── 5. ÉRDEKLŐDŐK & AUDIT NAPLÓ ── */}
                {section === "inquiries" && (
                  <div className="space-y-6">
                    <div className="rounded-2xl border border-slate-200 bg-white p-6">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <h2 className="text-lg font-bold text-slate-950">
                            Megtekintési kérelmek ({ownerViewings.length})
                          </h2>
                          <p className="mt-0.5 text-xs text-slate-500">
                            A pontos cím csak akkor válik láthatóvá az érdeklődőnek, ha elfogadod a kérelmét.
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          {deletableViewings.length > 0 && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled={viewingBusyId === "bulk"}
                              onClick={handleBulkDeleteOldViewings}
                              className="rounded-xl border-rose-200 bg-white text-xs font-bold text-rose-700 hover:bg-rose-50"
                            >
                              {viewingBusyId === "bulk" ? (
                                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                              )}
                              Régi / lemondottak törlése ({deletableViewings.length})
                            </Button>
                          )}
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={viewingBusyId === "test"}
                            onClick={handleCreateTestViewing}
                            className="rounded-xl border-emerald-300 bg-emerald-50 text-xs font-bold text-emerald-800 hover:bg-emerald-100"
                          >
                            {viewingBusyId === "test" ? (
                              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Plus className="mr-1.5 h-3.5 w-3.5" />
                            )}
                            Teszt érdeklődői kérelem szimulálása
                          </Button>
                        </div>
                      </div>

                      {ownerViewings.length === 0 ? (
                        <p className="mt-4 text-xs text-slate-500">Még nem érkezett megtekintési kérelem.</p>
                      ) : (
                        <div className="mt-4 space-y-4">
                          {ownerViewings.map((v) => {
                            const badge = VIEWING_STATUS_LABELS[v.status];
                            return (
                              <div key={v.id} className="rounded-2xl border border-slate-200 p-4">
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                  <div>
                                    <div className="flex flex-wrap items-center gap-2">
                                      <span className="text-sm font-bold text-slate-950">{v.requesterName}</span>
                                      {v.requesterPhoneVerified && (
                                        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-800">
                                          <ShieldCheck className="h-3 w-3" />
                                          Ellenőrzött telefonszám
                                        </span>
                                      )}
                                      <span className={`rounded-full border px-2 py-0.5 text-[11px] font-bold ${badge.className}`}>
                                        {badge.label}
                                      </span>
                                    </div>
                                    <p className="mt-1.5 flex items-center gap-2 text-xs font-semibold text-slate-700">
                                      <Calendar className="h-3.5 w-3.5 text-emerald-600" />
                                      Kért időpont: {v.date} · {v.startTime} – {v.endTime} ({v.durationMinutes} perc)
                                    </p>

                                    {/* Declared Viewing Purpose & Declaration Confirmation (#3, #4, #5) */}
                                    {(v.viewingPurpose || v.declarationLog) && (
                                      <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px]">
                                        {v.viewingPurpose && (
                                          <span className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 font-semibold text-slate-700">
                                            Cél: {VIEWING_PURPOSE_LABELS[v.viewingPurpose] || v.viewingPurpose}
                                          </span>
                                        )}
                                        {v.declarationLog && (
                                          <span className="rounded-lg border border-emerald-200 bg-emerald-50/70 px-2.5 py-1 font-semibold text-emerald-800">
                                            Nyilatkozat elfogadva ({v.declarationLog.version})
                                          </span>
                                        )}
                                      </div>
                                    )}

                                    {/* Factual Requester Trust Profile (#8, #9 — NO AI risk scores or stigmatizing labels) */}
                                    {v.requesterTrustProfile && (
                                      <div className="mt-3 grid grid-cols-2 gap-2 rounded-xl border border-slate-200 bg-slate-50/70 p-3 text-[11px] sm:grid-cols-4">
                                        <div>
                                          <span className="block text-slate-400">Telefonszám</span>
                                          <span className="font-bold text-slate-900">
                                            {v.requesterTrustProfile.phoneVerified ? "Ellenőrizve" : "Nincs ellenőrizve"}
                                          </span>
                                        </div>
                                        <div>
                                          <span className="block text-slate-400">E-mail</span>
                                          <span className="font-bold text-slate-900">
                                            {v.requesterTrustProfile.emailVerified ? "Ellenőrizve" : "Nincs ellenőrizve"}
                                          </span>
                                        </div>
                                        <div>
                                          <span className="block text-slate-400">Fiók létrehozva</span>
                                          <span className="font-bold text-slate-900">
                                            {v.requesterTrustProfile.accountCreatedAt
                                              ? new Date(v.requesterTrustProfile.accountCreatedAt).toLocaleDateString("hu-HU")
                                              : "—"}
                                          </span>
                                        </div>
                                        <div>
                                          <span className="block text-slate-400">Státusz</span>
                                          <span
                                            className={`inline-block rounded-full border px-2 py-0.5 text-[10px] font-bold ${
                                              RESTRICTION_LEVEL_LABELS[v.requesterTrustProfile.restrictionLevel]?.className ||
                                              "border-slate-200 bg-white text-slate-700"
                                            }`}
                                          >
                                            {RESTRICTION_LEVEL_LABELS[v.requesterTrustProfile.restrictionLevel]?.label ||
                                              "Nincs korlátozás"}
                                          </span>
                                        </div>
                                        <div>
                                          <span className="block text-slate-400">Korábbi megtekintések</span>
                                          <span className="font-bold text-slate-900">
                                            {v.requesterTrustProfile.totalViewings} db
                                          </span>
                                        </div>
                                        <div>
                                          <span className="block text-slate-400">Teljesített</span>
                                          <span className="font-bold text-slate-900">
                                            {v.requesterTrustProfile.completedViewings} db
                                          </span>
                                        </div>
                                        <div>
                                          <span className="block text-slate-400">Lemondások</span>
                                          <span className="font-bold text-slate-900">
                                            {v.requesterTrustProfile.cancelledViewings} db
                                          </span>
                                        </div>
                                        <div>
                                          <span className="block text-slate-400">Korábbi jelentések</span>
                                          <span className="font-bold text-slate-900">
                                            {v.requesterTrustProfile.previousReportsCount} db
                                          </span>
                                        </div>
                                      </div>
                                    )}

                                    {v.message && (
                                      <p className="mt-2 rounded-xl bg-slate-50 p-2.5 text-xs text-slate-700">
                                        {v.message}
                                      </p>
                                    )}
                                  </div>

                                  <div className="flex flex-wrap items-center gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setReportTargetViewing(v);
                                        setReportReasonCode("unsolicited_agent");
                                        setReportDetails("");
                                      }}
                                      className="inline-flex items-center gap-1 rounded-lg border border-amber-200 bg-amber-50/70 px-2.5 py-1 text-[11px] font-bold text-amber-800 hover:bg-amber-100"
                                    >
                                      <Flag className="h-3.5 w-3.5" />
                                      Probléma jelentése
                                    </button>
                                    {isDeletableViewing(v) && (
                                      <button
                                        type="button"
                                        disabled={viewingBusyId === v.id}
                                        onClick={() => handleDeleteViewing(v)}
                                        className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50/60 px-2.5 py-1 text-[11px] font-bold text-rose-700 hover:bg-rose-100"
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                        Törlés
                                      </button>
                                    )}
                                    <button
                                      type="button"
                                      onClick={() => handleBlockUser(v.requesterId)}
                                      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-[11px] font-bold text-slate-500 hover:border-rose-200 hover:text-rose-600"
                                    >
                                      <Ban className="h-3.5 w-3.5" />
                                      Blokkolás
                                    </button>
                                  </div>
                                </div>

                                {/* Owner actions */}
                                {v.status === "PENDING" && (
                                  <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-3">
                                    <Button
                                      type="button"
                                      size="sm"
                                      disabled={viewingBusyId === v.id}
                                      onClick={() => handleViewingAction(v, "APPROVE")}
                                      className="rounded-xl bg-emerald-600 text-xs font-bold text-white hover:bg-emerald-700"
                                    >
                                      <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                                      Elfogadom
                                    </Button>
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="outline"
                                      disabled={viewingBusyId === v.id}
                                      onClick={() => {
                                        setProposingViewingId(proposingViewingId === v.id ? null : v.id);
                                        setPropDate(v.date);
                                        setPropTime(v.startTime);
                                      }}
                                      className="rounded-xl border-slate-300 text-xs font-bold"
                                    >
                                      <Clock className="mr-1.5 h-3.5 w-3.5" />
                                      Másik időpontot ajánlok
                                    </Button>
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="outline"
                                      disabled={viewingBusyId === v.id}
                                      onClick={() => handleViewingAction(v, "REJECT")}
                                      className="rounded-xl border-rose-200 text-xs font-bold text-rose-700 hover:bg-rose-50"
                                    >
                                      <XCircle className="mr-1.5 h-3.5 w-3.5" />
                                      Elutasítom
                                    </Button>
                                  </div>
                                )}

                                {v.status === "APPROVED" && (
                                  <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
                                    <span className="text-xs font-semibold text-emerald-700">
                                      Pontos cím megosztva: {v.addressUnlockedAt ? new Date(v.addressUnlockedAt).toLocaleString("hu-HU") : ""}
                                    </span>
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="outline"
                                      disabled={viewingBusyId === v.id}
                                      onClick={() => handleViewingAction(v, "REVOKE")}
                                      className="rounded-xl border-rose-200 text-xs font-bold text-rose-700 hover:bg-rose-50"
                                    >
                                      Megtekintés visszavonása
                                    </Button>
                                  </div>
                                )}

                                {proposingViewingId === v.id && (
                                  <div className="mt-3 grid grid-cols-1 gap-2 rounded-xl border border-blue-200 bg-blue-50/50 p-3 sm:grid-cols-4">
                                    <input
                                      type="date"
                                      value={propDate}
                                      onChange={(e) => setPropDate(e.target.value)}
                                      className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs"
                                    />
                                    <input
                                      type="time"
                                      value={propTime}
                                      onChange={(e) => setPropTime(e.target.value)}
                                      className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs"
                                    />
                                    <input
                                      type="text"
                                      value={propNote}
                                      onChange={(e) => setPropNote(e.target.value)}
                                      placeholder="Megjegyzés (opcionális)"
                                      className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs"
                                    />
                                    <Button
                                      type="button"
                                      size="sm"
                                      onClick={() => handleViewingAction(v, "PROPOSE_NEW_TIME")}
                                      className="rounded-lg bg-emerald-600 text-xs font-bold text-white hover:bg-emerald-700"
                                    >
                                      Javaslat küldése
                                    </Button>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Moderation & Abuse Log (#11, #21) */}
                    <div className="rounded-2xl border border-slate-200 bg-white p-6">
                      <h3 className="flex items-center gap-2 text-base font-bold text-slate-950">
                        <Flag className="h-4 w-4 text-emerald-600" />
                        Visszaélési és moderációs napló ({(moderationData?.reports?.length || 0) + (moderationData?.spamSignals?.length || 0)})
                      </h3>
                      <p className="mt-0.5 text-xs text-slate-500">
                        A jelentéseket moderáljuk. Egyetlen bejelentés önmagában nem eredményez automatikus végleges
                        tiltást; fokozatos rendszer működik (1. Figyelmeztetés, 2. Ideiglenes korlátozás, 3. Hosszabb
                        idejű korlátozás, 4. Fiók felfüggesztése).
                      </p>

                      {(!moderationData?.reports?.length && !moderationData?.spamSignals?.length) ? (
                        <p className="mt-3 text-xs text-slate-500">Nincs rögzített bejelentés vagy spam jelzés.</p>
                      ) : (
                        <div className="mt-4 space-y-2.5 text-xs">
                          {(moderationData?.reports || []).map((r) => (
                            <div key={r.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <span className="font-bold text-slate-900">{r.reason}</span>
                                <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-bold text-slate-700">
                                  {r.moderationStatus === "PENDING_MODERATION"
                                    ? "Moderációra vár"
                                    : r.moderationStatus === "WARNING_ISSUED"
                                      ? "1. Figyelmeztetés"
                                      : r.moderationStatus === "TEMP_RESTRICTED"
                                        ? "2. Ideiglenes korlátozás"
                                        : r.moderationStatus === "EXTENDED_RESTRICTED"
                                          ? "3. Hosszabb korlátozás"
                                          : r.moderationStatus === "SUSPENDED"
                                            ? "4. Fiók felfüggesztve"
                                            : "Lezárva"}
                                </span>
                              </div>
                              {r.details && <p className="mt-1 text-slate-600">{r.details}</p>}
                              <p className="mt-1 text-[11px] text-slate-400">
                                {new Date(r.createdAt).toLocaleString("hu-HU")}
                              </p>
                            </div>
                          ))}

                          {(moderationData?.spamSignals || []).map((s) => (
                            <div key={s.id} className="rounded-xl border border-amber-200 bg-amber-50/50 p-3">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <span className="font-bold text-amber-950">Spam / üzletszerzési jelzés ({s.signalType})</span>
                                <span className="text-[11px] text-slate-500">
                                  {new Date(s.createdAt).toLocaleString("hu-HU")}
                                </span>
                              </div>
                              <p className="mt-1 text-slate-700">{s.details}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Audit Log */}
                    <div className="rounded-2xl border border-slate-200 bg-white p-6">
                      <h3 className="flex items-center gap-2 text-base font-bold text-slate-950">
                        <History className="h-4 w-4 text-emerald-600" />
                        Biztonsági audit napló ({auditLogs.length})
                      </h3>
                      <p className="mt-0.5 text-xs text-slate-500">
                        Minden megtekintési kérelem, jóváhagyás, címhozzáférés és lemondás időbélyeggel naplózva.
                      </p>
                      {auditLogs.length === 0 ? (
                        <p className="mt-3 text-xs text-slate-500">Még nincs rögzített esemény.</p>
                      ) : (
                        <div className="mt-4 divide-y divide-slate-100 text-xs">
                          {auditLogs.slice(0, 30).map((entry) => (
                            <div key={entry.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                              <div>
                                <span className="font-bold text-slate-900">{entry.action}</span>
                                {entry.slotSummary && <span className="ml-2 text-slate-600">({entry.slotSummary})</span>}
                                {entry.details && <p className="text-slate-500">{entry.details}</p>}
                              </div>
                              <span className="text-[11px] font-medium text-slate-400">
                                {new Date(entry.timestamp).toLocaleString("hu-HU")}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* ── 6. ÜZENETEK ── */}
                {section === "messages" && (
                  <div className="rounded-2xl border border-slate-200 bg-white p-6">
                    <h2 className="text-lg font-bold text-slate-950">Üzenetek ({messages.length})</h2>
                    {messages.length === 0 ? (
                      <p className="mt-3 text-xs text-slate-500">Még nem érkezett üzenet ehhez az ingatlanhoz.</p>
                    ) : (
                      <div className="mt-4 space-y-3">
                        {messages.map((m) => {
                          const fromOwner = m.senderId === activeProperty.ownerId;
                          return (
                            <div
                              key={m.id}
                              className={`rounded-xl border p-3.5 text-xs ${
                                fromOwner
                                  ? "ml-8 border-emerald-200 bg-emerald-50/70"
                                  : "mr-8 border-slate-200 bg-slate-50"
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-slate-900">{m.senderName}</span>
                                <span className="text-[11px] text-slate-400">
                                  {new Date(m.createdAt).toLocaleString("hu-HU")}
                                </span>
                              </div>
                              <p className="mt-1 text-slate-700">{m.body}</p>
                              {!fromOwner && (
                                <button
                                  type="button"
                                  onClick={() => setReplyTargetId(m.senderId)}
                                  className="mt-2 text-[11px] font-bold text-emerald-700 hover:underline"
                                >
                                  Válasz küldése neki
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {replyTargetId && (
                      <form onSubmit={handleSendReply} className="mt-5 flex gap-2 border-t border-slate-100 pt-4">
                        <input
                          type="text"
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          placeholder="Írd meg a válaszodat..."
                          required
                          className="flex-1 rounded-xl border border-slate-300 px-3.5 py-2 text-xs outline-none focus:border-emerald-600"
                        />
                        <Button
                          type="submit"
                          disabled={sendingReply}
                          className="rounded-xl bg-emerald-600 px-4 text-xs font-bold text-white hover:bg-emerald-700"
                        >
                          <Send className="mr-1.5 h-3.5 w-3.5" />
                          Küldés
                        </Button>
                      </form>
                    )}
                  </div>
                )}

                {/* ── 7. STATISZTIKÁK (VALÓS ADATOK) ── */}
                {section === "stats" && (
                  <div className="rounded-2xl border border-slate-200 bg-white p-6">
                    <h2 className="text-lg font-bold text-slate-950">Hirdetői statisztikák</h2>
                    <p className="mt-0.5 text-xs text-slate-500">
                      Kizárólag ténylegesen rögzített események alapján számolt statisztikák.
                    </p>
                    <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {[
                        { label: "Adatlap megtekintések", value: activeProperty.stats.views },
                        { label: "Kedvencek száma", value: activeProperty.stats.favorites },
                        { label: "Megtekintési kérelmek", value: activeProperty.stats.viewingRequests },
                        { label: "Jóváhagyott megtekintések", value: approvedViewings.length },
                        { label: "Üzenetek száma", value: messages.length },
                        { label: "Hirdetés aktív napjai", value: activeProperty.stats.activeDays },
                      ].map((s) => (
                        <div key={s.label} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                          <span className="text-xs font-semibold text-slate-500">{s.label}</span>
                          <p className="mt-1 text-3xl font-black text-slate-950">{s.value}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ── 8. HIRDETÉS STÁTUSZA ── */}
                {section === "status" && (
                  <div className="rounded-2xl border border-slate-200 bg-white p-6">
                    <h2 className="text-lg font-bold text-slate-950">Hirdetés státusza</h2>
                    <p className="mt-1 text-xs text-slate-500">
                      <strong>Eladva</strong> vagy <strong>Kiadva</strong> állapot után a rendszer automatikusan
                      letiltja az új megtekintési kérelmeket.
                    </p>

                    <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
                      {(["ACTIVE", "PAUSED", "SOLD", "RENTED", "EXPIRED", "DELETED"] as PropertyStatus[]).map((st) => {
                        const info = STATUS_LABELS[st];
                        const isCurrent = activeProperty.status === st;
                        return (
                          <button
                            key={st}
                            type="button"
                            disabled={isCurrent}
                            onClick={() => handleStatusChange(st)}
                            className={`rounded-xl border p-3.5 text-left transition ${
                              isCurrent
                                ? "border-emerald-600 bg-emerald-50 ring-1 ring-emerald-600"
                                : "border-slate-200 bg-white hover:border-slate-300"
                            }`}
                          >
                            <span className="block text-xs font-bold text-slate-900">{info.label}</span>
                            <span className="mt-0.5 block text-[11px] text-slate-500">
                              {isCurrent ? "Jelenlegi státusz" : "Átváltás erre"}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* ── 9. SZÁMLÁZÁS / FIZETÉS ── */}
                {section === "billing" && (
                  <div className="rounded-2xl border border-slate-200 bg-white p-6">
                    <h2 className="text-lg font-bold text-slate-950">Számlázás és 30 napos hirdetési időszak</h2>
                    <p className="mt-1 text-xs text-slate-500">
                      Minden befizetés 30 napos aktív megjelenést biztosít. 30 nap elteltével a hirdetés automatikusan
                      lejár, és újabb fizetéssel hosszabbítható meg.
                    </p>

                    <div className="mt-4 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-emerald-200 bg-emerald-50/70 p-4">
                      <div>
                        <p className="text-xs font-semibold text-emerald-900/70">Automatikus hirdetési díjkategória</p>
                        <p className="mt-0.5 text-sm font-bold text-slate-950">{activeProperty.listingFeeTier}</p>
                        <p className="text-xl font-black text-emerald-700">
                          {formatHuf(activeProperty.listingFee)}{" "}
                          <span className="text-xs font-bold text-emerald-800/80">/ 30 nap</span>
                        </p>
                        {activeProperty.expiresAt && (
                          <p className="mt-1 text-xs font-semibold text-slate-700">
                            Jelenlegi érvényesség:{" "}
                            <strong>{new Date(activeProperty.expiresAt).toLocaleDateString("hu-HU")}</strong> (
                            {activeProperty.daysRemaining ?? 0} nap hátra)
                          </p>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          disabled={checkoutBusy}
                          onClick={handleTestActivate}
                          className="rounded-xl border-emerald-300 bg-white text-xs font-bold text-emerald-800 hover:bg-emerald-50"
                        >
                          Teszt hosszabbítás +30 nap
                        </Button>
                        <Button
                          type="button"
                          disabled={checkoutBusy}
                          onClick={handlePayNow}
                          className="rounded-xl bg-emerald-600 text-xs font-bold text-white hover:bg-emerald-700"
                        >
                          {activeProperty.status === "ACTIVE"
                            ? `Hosszabbítás +30 nappal (${formatHuf(activeProperty.listingFee)})`
                            : `Fizetés 30 napra (${formatHuf(activeProperty.listingFee)})`}
                        </Button>
                      </div>
                    </div>

                    <h3 className="mt-6 text-sm font-bold text-slate-900">Fizetési előzmények</h3>
                    {!activeProperty.billing || activeProperty.billing.length === 0 ? (
                      <p className="mt-2 text-xs text-slate-500">Még nincs rögzített fizetési tranzakció.</p>
                    ) : (
                      <div className="mt-3 divide-y divide-slate-100 text-xs">
                        {activeProperty.billing.map((b) => (
                          <div key={b.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                            <div>
                              <p className="font-bold text-slate-900">{b.tierLabel}</p>
                              <p className="text-slate-500">
                                {new Date(b.paidAt || b.createdAt).toLocaleString("hu-HU")}
                                {b.expiresAt
                                  ? ` · Érvényes: ${new Date(b.expiresAt).toLocaleDateString("hu-HU")}-ig`
                                  : ""}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-black text-slate-950">{formatHuf(b.amount)}</p>
                              <span
                                className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                  b.status === "paid"
                                    ? "bg-emerald-50 text-emerald-800"
                                    : "bg-amber-50 text-amber-800"
                                }`}
                              >
                                {b.status === "paid" ? "Kifizetve (30 nap)" : "Folyamatban"}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* One-click Owner Abuse Report Modal (#10, #11) */}
        {reportTargetViewing && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
            <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
              <h3 className="flex items-center gap-2 text-base font-bold text-slate-950">
                <Flag className="h-4 w-4 text-emerald-600" />
                Probléma jelentése
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                Érdeklődő: <strong>{reportTargetViewing.requesterName}</strong> ({reportTargetViewing.date}{" "}
                {reportTargetViewing.startTime})
              </p>

              <form onSubmit={handleSubmitAbuseReport} className="mt-4 space-y-4">
                <div className="space-y-1.5">
                  <span className="block text-xs font-bold text-slate-700">Jelentés oka *</span>
                  {ABUSE_REPORT_REASONS.map((r) => (
                    <label
                      key={r.code}
                      className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-xs transition ${
                        reportReasonCode === r.code
                          ? "border-emerald-600 bg-emerald-50/50 font-bold text-slate-950"
                          : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      <input
                        type="radio"
                        name="abuseReasonCode"
                        value={r.code}
                        checked={reportReasonCode === r.code}
                        onChange={() => setReportReasonCode(r.code)}
                        className="accent-emerald-600"
                      />
                      <span>{r.label}</span>
                    </label>
                  ))}
                </div>

                <label className="block text-xs font-bold text-slate-700">
                  Rövid leírás (opcionális)
                  <textarea
                    rows={3}
                    value={reportDetails}
                    onChange={(e) => setReportDetails(e.target.value)}
                    placeholder="Pl. A megtekintésen közvetítői megbízási szerződést ajánlott valódi vételi szándék helyett."
                    className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2 text-xs outline-none focus:border-emerald-600"
                  />
                </label>

                <p className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-[11px] leading-relaxed text-slate-600">
                  A jelentést moderáljuk. Egyetlen bejelentés önmagában nem eredményez automatikus végleges tiltást;
                  ismétlődő vagy igazolt visszaélés esetén fokozatos korlátozást alkalmazunk.
                </p>

                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setReportTargetViewing(null)}
                    className="rounded-xl text-xs font-bold"
                  >
                    Mégse
                  </Button>
                  <Button
                    type="submit"
                    disabled={sendingAbuseReport}
                    className="rounded-xl bg-emerald-600 text-xs font-bold text-white hover:bg-emerald-700"
                  >
                    {sendingAbuseReport ? "Küldés..." : "Jelentés beküldése"}
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
