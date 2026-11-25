import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useUser } from "@clerk/react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { vehiclesApi } from "@/lib/vehicles/api";
import {
  DRIVE_OPTIONS,
  FUEL_OPTIONS,
  TRANSMISSION_OPTIONS,
  VEHICLE_ABUSE_REPORT_REASONS,
  VEHICLE_BOOKING_STATUS_LABELS,
  VEHICLE_CATEGORIES,
  VEHICLE_STATUS_LABELS,
  formatHuf,
  formatHuDateDot,
  formatKm,
  getCategoryLabel,
  getFuelLabel,
} from "@/lib/vehicles/config";
import type {
  DealerProfile,
  DriveType,
  FuelCategory,
  PricingRuleConfig,
  TransmissionType,
  VehicleBookingKind,
  VehicleBookingRecord,
  VehicleBookingStatus,
  VehicleCategory,
  VehicleListing,
  VehicleListingStatus,
} from "@/lib/vehicles/types";
import {
  AlertTriangle,
  BarChart3,
  Building2,
  Calendar,
  Car,
  CheckCircle2,
  Clock,
  CreditCard,
  Database,
  Edit3,
  ExternalLink,
  Eye,
  FileSpreadsheet,
  Flag,
  Heart,
  LayoutDashboard,
  Loader2,
  MessageSquare,
  PauseCircle,
  PlayCircle,
  Plus,
  Send,
  ShieldCheck,
  Sliders,
  Trash2,
  Users,
  XCircle,
} from "lucide-react";

type AdminSectionId =
  | "overview"
  | "listings"
  | "viewing_slots"
  | "test_drives"
  | "inquiries"
  | "messages"
  | "stats"
  | "billing_pricing"
  | "dealer_csv"
  | "catalog_admin";

const LISTING_STATUS_META = VEHICLE_STATUS_LABELS;
const BOOKING_STATUS_META = VEHICLE_BOOKING_STATUS_LABELS;
const ABUSE_REPORT_REASONS = VEHICLE_ABUSE_REPORT_REASONS;

const WEEKDAYS = [
  { value: 1, label: "H" },
  { value: 2, label: "K" },
  { value: 3, label: "Sze" },
  { value: 4, label: "Cs" },
  { value: 5, label: "P" },
  { value: 6, label: "Szo" },
  { value: 0, label: "V" },
];

export default function VehicleAdmin() {
  const params = useParams<{ id?: string }>();
  const { isSignedIn, user } = useUser();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [section, setSection] = useState<AdminSectionId>(params.id ? "inquiries" : "overview");
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>(params.id || "");
  const [listingStatusFilter, setListingStatusFilter] = useState<"ALL" | VehicleListingStatus>("ALL");
  const [inquiryFilter, setInquiryFilter] = useState<"ALL" | "PENDING" | "APPROVED" | "TEST_DRIVE" | "CLOSED">("ALL");
  const [busyId, setBusyId] = useState<string | null>(null);

  // Quick price edit state (triggers price-drop alerts!)
  const [priceEditId, setPriceEditId] = useState<string | null>(null);
  const [priceEditValue, setPriceEditValue] = useState<string>("");

  // Slot creation state
  const todayIso = new Date().toISOString().slice(0, 10);
  const nextWeekIso = new Date(Date.now() + 7 * 86400_000).toISOString().slice(0, 10);
  const [slotDate, setSlotDate] = useState(todayIso);
  const [slotStart, setSlotStart] = useState("10:00");
  const [slotDuration, setSlotDuration] = useState("30");
  const [slotNote, setSlotNote] = useState("");
  const [recStart, setRecStart] = useState(todayIso);
  const [recEnd, setRecEnd] = useState(nextWeekIso);
  const [recDays, setRecDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [recWinStart, setRecWinStart] = useState("10:00");
  const [recWinEnd, setRecWinEnd] = useState("17:00");
  const [recDur, setRecDur] = useState("30");

  // Booking response modals/inline forms
  const [approveBookingId, setApproveBookingId] = useState<string | null>(null);
  const [exactAddressInput, setExactAddressInput] = useState("");
  const [meetingPlaceInput, setMeetingPlaceInput] = useState("");
  const [instructionsInput, setInstructionsInput] = useState("");
  const [ownerPhoneInput, setOwnerPhoneInput] = useState("");

  const [proposeBookingId, setProposeBookingId] = useState<string | null>(null);
  const [proposeDate, setProposeDate] = useState(todayIso);
  const [proposeTime, setProposeTime] = useState("15:00");
  const [proposeNote, setProposeNote] = useState("");

  // Abuse report state
  const [reportBooking, setReportBooking] = useState<VehicleBookingRecord | null>(null);
  const [reportReasonCode, setReportReasonCode] = useState(ABUSE_REPORT_REASONS[0].code);
  const [reportDetails, setReportDetails] = useState("");

  // Message reply state
  const [replyText, setReplyText] = useState("");
  const [replyRecipientId, setReplyRecipientId] = useState("");

  // Dealer profile + CSV state
  const [dealerForm, setDealerForm] = useState<Partial<DealerProfile>>({
    companyName: "",
    taxNumber: "",
    description: "",
    locations: [{ name: "Fő telephely", address: "", city: "", postalCode: "", openingHours: "H–P 09:00–17:00" }],
    contacts: [{ name: "", role: "Értékesítő", phone: "", email: "" }],
    staffEmails: [],
  });
  const [csvRawText, setCsvRawText] = useState("");
  const [csvImportResult, setCsvImportResult] = useState<{ importedCount: number; errors: string[] } | null>(null);

  // Central pricing config state
  const [pricingDraft, setPricingDraft] = useState<PricingRuleConfig | null>(null);

  // Central catalog entry form
  const [catForm, setCatForm] = useState({
    category: "passenger_car" as VehicleCategory,
    brand: "",
    manufacturer: "",
    model: "",
    typeVariant: "",
    generation: "",
    yearFrom: "2020",
    yearTo: "",
    engineVariant: "",
    engineCode: "",
    displacementCc: "",
    powerKw: "",
    powerHp: "",
    fuelType: "benzin" as FuelCategory,
    driveType: "elso" as DriveType,
    transmission: "manualis" as TransmissionType,
    trimLevel: "",
    dataSource: "Gyártói magyar árlista / hivatalos műszaki adatlap",
    usageRights: "Saját szerkesztett tényadat (jogtiszta)",
  });

  // Queries
  const { data: myListingsData, isLoading: loadingListings } = useQuery({
    queryKey: ["my-vehicle-listings"],
    queryFn: () => vehiclesApi.listVehicles({ mine: true }),
    enabled: Boolean(isSignedIn),
  });

  const { data: bookingsData, isLoading: loadingBookings } = useQuery({
    queryKey: ["my-vehicle-bookings-admin"],
    queryFn: () => vehiclesApi.getMyBookings(),
    enabled: Boolean(isSignedIn),
  });

  const { data: dealerData } = useQuery({
    queryKey: ["my-dealer-profile"],
    queryFn: () => vehiclesApi.getDealerProfile(),
    enabled: Boolean(isSignedIn),
  });

  const { data: pricingData } = useQuery({
    queryKey: ["vehicle-pricing-config"],
    queryFn: () => vehiclesApi.getPricingConfig(),
    enabled: Boolean(isSignedIn),
  });

  const { data: customCatalogData } = useQuery({
    queryKey: ["vehicles-custom-catalog"],
    queryFn: () => vehiclesApi.getCustomCatalog(),
    enabled: Boolean(isSignedIn),
  });

  const myListings = myListingsData?.items || [];

  useEffect(() => {
    if (!selectedVehicleId && myListings.length > 0) {
      setSelectedVehicleId(myListings[0].id);
    }
  }, [myListings, selectedVehicleId]);

  useEffect(() => {
    if (dealerData?.profile) {
      setDealerForm({
        ...dealerData.profile,
        locations:
          dealerData.profile.locations?.length > 0
            ? dealerData.profile.locations
            : [{ name: "Fő telephely", address: "", city: "", postalCode: "", openingHours: "H–P 09:00–17:00" }],
        contacts:
          dealerData.profile.contacts?.length > 0
            ? dealerData.profile.contacts
            : [{ name: "", role: "Értékesítő", phone: "", email: "" }],
      });
    }
  }, [dealerData?.profile]);

  useEffect(() => {
    if (pricingData) {
      setPricingDraft(pricingData);
    }
  }, [pricingData]);

  const selectedVehicle = useMemo(
    () => myListings.find((v) => v.id === selectedVehicleId) || myListings[0] || null,
    [myListings, selectedVehicleId],
  );

  const { data: messagesData, refetch: refetchMessages } = useQuery({
    queryKey: ["vehicle-admin-messages", selectedVehicle?.id],
    queryFn: () => vehiclesApi.getMessages(selectedVehicle!.id),
    enabled: Boolean(isSignedIn && selectedVehicle?.id && section === "messages"),
  });

  const ownerBookings = useMemo(
    () => (bookingsData?.items || []).filter((b) => b.role === "owner"),
    [bookingsData?.items],
  );

  const filteredListings = useMemo(() => {
    if (listingStatusFilter === "ALL") return myListings;
    return myListings.filter((l) => l.status === listingStatusFilter);
  }, [myListings, listingStatusFilter]);

  const filteredBookings = useMemo(() => {
    let list = ownerBookings;
    if (params.id) {
      list = list.filter((b) => b.vehicleId === params.id);
    }
    if (inquiryFilter === "PENDING") return list.filter((b) => b.status === "PENDING");
    if (inquiryFilter === "APPROVED") return list.filter((b) => b.status === "APPROVED");
    if (inquiryFilter === "TEST_DRIVE") return list.filter((b) => b.bookingKind === "TEST_DRIVE");
    if (inquiryFilter === "CLOSED") {
      return list.filter((b) =>
        ["REJECTED", "REVOKED_BY_OWNER", "CANCELLED_BY_REQUESTER", "COMPLETED", "NO_SHOW"].includes(b.status),
      );
    }
    return list;
  }, [ownerBookings, inquiryFilter, params.id]);

  // Aggregate KPIs
  const kpis = useMemo(() => {
    const active = myListings.filter((v) => v.status === "ACTIVE").length;
    const drafts = myListings.filter((v) => v.status === "DRAFT").length;
    const sold = myListings.filter((v) => v.status === "SOLD").length;
    const views = myListings.reduce((sum, v) => sum + (v.stats?.views || 0), 0);
    const favorites = myListings.reduce((sum, v) => sum + (v.stats?.favorites || 0), 0);
    const pendingInquiries = ownerBookings.filter((b) => b.status === "PENDING").length;
    const approvedInquiries = ownerBookings.filter((b) => b.status === "APPROVED").length;
    const testDriveCount = ownerBookings.filter((b) => b.bookingKind === "TEST_DRIVE").length;
    return { active, drafts, sold, views, favorites, pendingInquiries, approvedInquiries, testDriveCount };
  }, [myListings, ownerBookings]);

  const refreshAdmin = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["my-vehicle-listings"] }),
      queryClient.invalidateQueries({ queryKey: ["my-vehicle-bookings-admin"] }),
      queryClient.invalidateQueries({ queryKey: ["vehicles-list"] }),
    ]);
  };

  // Listing status & quick price handlers
  const handleStatusChange = async (listing: VehicleListing, status: VehicleListingStatus) => {
    if (status === "DELETED" && !window.confirm("Biztosan törlöd ezt a járműhirdetést?")) return;
    setBusyId(listing.id);
    try {
      await vehiclesApi.updateVehicleStatus(listing.id, status);
      await refreshAdmin();
      toast({ title: `Hirdetés állapota frissítve: ${LISTING_STATUS_META[status].label}` });
    } catch (err: any) {
      toast({ title: err?.message || "A művelet sikertelen.", variant: "destructive" });
    } finally {
      setBusyId(null);
    }
  };

  const handleSaveQuickPrice = async (listing: VehicleListing) => {
    const newPrice = Number(priceEditValue.replace(/\D/g, ""));
    if (!newPrice || newPrice <= 0) {
      toast({ title: "Adj meg érvényes árat (Ft).", variant: "destructive" });
      return;
    }
    setBusyId(listing.id);
    try {
      const lowered = newPrice < listing.pricing.priceHuf;
      await vehiclesApi.updateVehicle(listing.id, {
        pricing: { ...listing.pricing, priceHuf: newPrice },
      });
      setPriceEditId(null);
      await refreshAdmin();
      toast({
        title: lowered
          ? "Ár csökkentve – a kedvencekbe mentett felhasználók árriasztást kaptak"
          : "Ár sikeresen frissítve",
      });
    } catch (err: any) {
      toast({ title: err?.message || "Nem sikerült menteni az árat.", variant: "destructive" });
    } finally {
      setBusyId(null);
    }
  };

  // Slot handlers
  const handleAddSingleSlot = async (kind: VehicleBookingKind) => {
    if (!selectedVehicle) return;
    setBusyId("slot-single");
    try {
      await vehiclesApi.addSlots(selectedVehicle.id, {
        slots: [
          {
            date: slotDate,
            startTime: slotStart,
            durationMinutes: Number(slotDuration) || 30,
            slotKind: kind,
            note: slotNote.trim() || undefined,
          },
        ],
      });
      setSlotNote("");
      await refreshAdmin();
      toast({ title: kind === "TEST_DRIVE" ? "Tesztvezetési idősáv hozzáadva" : "Megtekintési idősáv hozzáadva" });
    } catch (err: any) {
      toast({ title: err?.message || "Nem sikerült hozzáadni az idősávot.", variant: "destructive" });
    } finally {
      setBusyId(null);
    }
  };

  const handleAddRecurringSlots = async (kind: VehicleBookingKind) => {
    if (!selectedVehicle || recDays.length === 0) return;
    setBusyId("slot-rec");
    try {
      const res = await vehiclesApi.addSlots(selectedVehicle.id, {
        recurring: {
          startDate: recStart,
          endDate: recEnd,
          weekdays: recDays,
          windowStart: recWinStart,
          windowEnd: recWinEnd,
          durationMinutes: Number(recDur) || 30,
          slotKind: kind,
        },
      });
      await refreshAdmin();
      toast({ title: `${res.addedCount} ismétlődő idősáv létrehozva` });
    } catch (err: any) {
      toast({ title: err?.message || "Nem sikerült létrehozni az idősávokat.", variant: "destructive" });
    } finally {
      setBusyId(null);
    }
  };

  const handleToggleSlotBlock = async (vehicleId: string, slotId: string, isBlocked: boolean) => {
    setBusyId(slotId);
    try {
      await vehiclesApi.toggleBlockSlot(vehicleId, slotId, isBlocked);
      await refreshAdmin();
      toast({ title: isBlocked ? "Idősáv zárolva" : "Idősáv feloldva" });
    } catch (err: any) {
      toast({ title: err?.message || "Hiba történt.", variant: "destructive" });
    } finally {
      setBusyId(null);
    }
  };

  const handleDeleteSlot = async (vehicleId: string, slotId: string) => {
    setBusyId(slotId);
    try {
      await vehiclesApi.deleteSlot(vehicleId, slotId);
      await refreshAdmin();
      toast({ title: "Idősáv törölve" });
    } catch (err: any) {
      toast({ title: err?.message || "Nem sikerült törölni.", variant: "destructive" });
    } finally {
      setBusyId(null);
    }
  };

  // Booking response handlers
  const handleBookingRespond = async (
    booking: VehicleBookingRecord,
    action: "APPROVE" | "PROPOSE_NEW_TIME" | "REJECT" | "REVOKE" | "COMPLETE" | "NO_SHOW",
  ) => {
    if (action === "APPROVE" && !exactAddressInput.trim()) {
      toast({ title: "Add meg a megtekintés / találkozás pontos címét.", variant: "destructive" });
      return;
    }
    if (action === "REVOKE" && !window.confirm("Biztosan visszavonod a jóváhagyást? Az érdeklődő címhozzáférése azonnal megszűnik.")) {
      return;
    }
    if (action === "REJECT" && !window.confirm("Biztosan elutasítod a kérelmet?")) {
      return;
    }
    setBusyId(booking.id);
    try {
      await vehiclesApi.respondToBooking(booking.id, {
        action,
        exactAddress: action === "APPROVE" ? exactAddressInput.trim() : undefined,
        meetingPlace: action === "APPROVE" ? meetingPlaceInput.trim() || undefined : undefined,
        instructions: action === "APPROVE" ? instructionsInput.trim() || undefined : undefined,
        ownerPhone: action === "APPROVE" ? ownerPhoneInput.trim() || undefined : undefined,
        proposedDate: action === "PROPOSE_NEW_TIME" ? proposeDate : undefined,
        proposedStartTime: action === "PROPOSE_NEW_TIME" ? proposeTime : undefined,
        note: action === "PROPOSE_NEW_TIME" ? proposeNote.trim() || undefined : undefined,
      });
      setApproveBookingId(null);
      setProposeBookingId(null);
      await refreshAdmin();
      const labels: Record<typeof action, string> = {
        APPROVE: "Időpont visszaigazolva – az érdeklődő értesítést kapott",
        PROPOSE_NEW_TIME: "Új időpont javasolva az érdeklődőnek",
        REJECT: "Kérelem elutasítva",
        REVOKE: "Visszaigazolás visszavonva, címhozzáférés lezárva",
        COMPLETE: "Megtekintés teljesítettként rögzítve",
        NO_SHOW: "Nem jelent meg állapot rögzítve",
      };
      toast({ title: labels[action] });
    } catch (err: any) {
      toast({ title: err?.message || "A művelet sikertelen.", variant: "destructive" });
    } finally {
      setBusyId(null);
    }
  };

  const handleSubmitAbuseReport = async () => {
    if (!reportBooking) return;
    const reasonObj = ABUSE_REPORT_REASONS.find((r) => r.code === reportReasonCode);
    setBusyId("report");
    try {
      await vehiclesApi.reportAbuse({
        vehicleId: reportBooking.vehicleId,
        bookingId: reportBooking.id,
        targetUserId: reportBooking.requesterId,
        reasonCode: reportReasonCode,
        reason: reasonObj?.label || reportReasonCode,
        details: reportDetails.trim() || undefined,
      });
      setReportBooking(null);
      setReportDetails("");
      toast({ title: "Visszaélés-bejelentés rögzítve – köszönjük a jelzést" });
    } catch (err: any) {
      toast({ title: err?.message || "Nem sikerült elküldeni a bejelentést.", variant: "destructive" });
    } finally {
      setBusyId(null);
    }
  };

  // Messages reply
  const handleSendReply = async () => {
    if (!selectedVehicle || !replyText.trim()) return;
    setBusyId("msg-reply");
    try {
      await vehiclesApi.sendMessage(
        selectedVehicle.id,
        replyText.trim(),
        replyRecipientId || undefined,
        user?.fullName || "Hirdető",
      );
      setReplyText("");
      await refetchMessages();
      toast({ title: "Üzenet elküldve" });
    } catch (err: any) {
      toast({ title: err?.message || "Nem sikerült elküldeni.", variant: "destructive" });
    } finally {
      setBusyId(null);
    }
  };

  // Dealer profile save
  const handleSaveDealer = async () => {
    setBusyId("dealer-save");
    try {
      await vehiclesApi.saveDealerProfile(dealerForm);
      await queryClient.invalidateQueries({ queryKey: ["my-dealer-profile"] });
      toast({ title: "Kereskedői profil mentve" });
    } catch (err: any) {
      toast({ title: err?.message || "Nem sikerült menteni a kereskedői profilt.", variant: "destructive" });
    } finally {
      setBusyId(null);
    }
  };

  // CSV parser & import
  const handleCsvFileUpload = (file: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setCsvRawText(String(reader.result || ""));
    };
    reader.readAsText(file, "utf-8");
  };

  const handleImportCsv = async () => {
    const lines = csvRawText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length < 2) {
      toast({ title: "A CSV legalább 1 fejlécsort és 1 járműsort tartalmazzon.", variant: "destructive" });
      return;
    }
    const sep = lines[0].includes(";") ? ";" : ",";
    const headers = lines[0].split(sep).map((h) => h.trim().toLowerCase());
    const rows: Array<Record<string, any>> = [];
    for (let i = 1; i < lines.length; i += 1) {
      const cols = lines[i].split(sep).map((c) => c.trim());
      const row: Record<string, any> = {};
      headers.forEach((h, idx) => {
        row[h] = cols[idx] ?? "";
      });
      rows.push(row);
    }
    setBusyId("csv-import");
    try {
      const res = await vehiclesApi.importDealerCsv(rows);
      setCsvImportResult({ importedCount: res.importedCount, errors: res.errors || [] });
      await refreshAdmin();
      toast({ title: `${res.importedCount} jármű sikeresen importálva (piszkozatként)` });
    } catch (err: any) {
      toast({ title: err?.message || "A CSV import sikertelen.", variant: "destructive" });
    } finally {
      setBusyId(null);
    }
  };

  // Save central pricing config
  const handleSavePricing = async () => {
    if (!pricingDraft) return;
    setBusyId("pricing-save");
    try {
      const updated = await vehiclesApi.updatePricingConfig(pricingDraft);
      setPricingDraft(updated);
      await queryClient.invalidateQueries({ queryKey: ["vehicle-pricing-config"] });
      toast({ title: "Központi díjszabási szabályok mentve" });
    } catch (err: any) {
      toast({ title: err?.message || "Nem sikerült menteni a díjszabást.", variant: "destructive" });
    } finally {
      setBusyId(null);
    }
  };

  // Add central catalog entry
  const handleAddCatalogEntry = async () => {
    if (!catForm.brand.trim() || !catForm.model.trim()) {
      toast({ title: "A márka és modell megadása kötelező.", variant: "destructive" });
      return;
    }
    setBusyId("cat-add");
    try {
      await vehiclesApi.addCustomCatalogEntry({
        category: catForm.category,
        brand: catForm.brand.trim(),
        manufacturer: catForm.manufacturer.trim() || undefined,
        model: catForm.model.trim(),
        typeVariant: catForm.typeVariant.trim() || undefined,
        generation: catForm.generation.trim() || undefined,
        yearFrom: catForm.yearFrom ? Number(catForm.yearFrom) : undefined,
        yearTo: catForm.yearTo ? Number(catForm.yearTo) : null,
        engineVariant: catForm.engineVariant.trim() || undefined,
        engineCode: catForm.engineCode.trim() || undefined,
        displacementCc: catForm.displacementCc ? Number(catForm.displacementCc) : null,
        powerKw: catForm.powerKw ? Number(catForm.powerKw) : null,
        powerHp: catForm.powerHp ? Number(catForm.powerHp) : null,
        fuelType: catForm.fuelType,
        driveType: catForm.driveType,
        transmission: catForm.transmission,
        trimLevel: catForm.trimLevel.trim() || undefined,
        dataSource: catForm.dataSource.trim(),
        usageRights: catForm.usageRights.trim(),
      });
      await queryClient.invalidateQueries({ queryKey: ["vehicles-custom-catalog"] });
      setCatForm((prev) => ({
        ...prev,
        model: "",
        typeVariant: "",
        generation: "",
        engineVariant: "",
        engineCode: "",
      }));
      toast({ title: "Új törzsadat-bejegyzés hozzáadva a járműkatalógushoz" });
    } catch (err: any) {
      toast({ title: err?.message || "Nem sikerült menteni a törzsadatot.", variant: "destructive" });
    } finally {
      setBusyId(null);
    }
  };

  if (!isSignedIn) {
    return (
      <Layout>
        <div className="mx-auto max-w-xl px-4 py-20 text-center">
          <Car className="mx-auto h-10 w-10 text-emerald-600" />
          <h1 className="mt-4 text-2xl font-black text-slate-950">Saját Járműadmin</h1>
          <p className="mt-2 text-sm text-slate-600">
            A járműhirdetéseid, megtekintési és tesztvezetési időpontjaid, valamint kereskedői profilod kezeléséhez jelentkezz be.
          </p>
          <Button asChild className="mt-6 rounded-xl bg-emerald-600 font-bold text-white hover:bg-emerald-700">
            <Link href="/auth/login">Bejelentkezés</Link>
          </Button>
        </div>
      </Layout>
    );
  }

  const navItems: Array<{ id: AdminSectionId; label: string; icon: any; badge?: number }> = [
    { id: "overview", label: "Áttekintés", icon: LayoutDashboard },
    { id: "listings", label: "Járműhirdetéseim", icon: Car, badge: myListings.length },
    { id: "viewing_slots", label: "Megtekintési időpontok", icon: Calendar },
    { id: "test_drives", label: "Tesztvezetések", icon: Clock, badge: kpis.testDriveCount },
    { id: "inquiries", label: "Érdeklődők", icon: Users, badge: kpis.pendingInquiries },
    { id: "messages", label: "Üzenetek", icon: MessageSquare },
    { id: "stats", label: "Statisztikák", icon: BarChart3 },
    { id: "billing_pricing", label: "Fizetéseim és díjszabás", icon: CreditCard },
    { id: "dealer_csv", label: "Kereskedői profil & CSV", icon: Building2 },
    { id: "catalog_admin", label: "Katalógus törzsadatok", icon: Database },
  ];

  const renderSlotManager = (kind: VehicleBookingKind) => {
    const slots = (selectedVehicle?.viewingSlots || []).filter((s) => s.slotKind === kind);
    const kindLabel = kind === "TEST_DRIVE" ? "tesztvezetési" : "megtekintési";

    return (
      <div className="space-y-6">
        <div className="flex flex-col justify-between gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-xl font-black text-slate-950">
              {kind === "TEST_DRIVE" ? "Tesztvezetési időpontok és feltételek" : "Megtekintési időpontok kezelése"}
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Válaszd ki a járművedet, majd vegyél fel egyszeri vagy ismétlődő {kindLabel} idősávokat.
            </p>
          </div>
          {myListings.length > 0 && (
            <select
              value={selectedVehicle?.id || ""}
              onChange={(e) => setSelectedVehicleId(e.target.value)}
              className="h-10 rounded-xl border border-slate-300 bg-white px-3 text-xs font-bold text-slate-900"
            >
              {myListings.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.brand} {v.model} ({v.manufactureYear}) – {v.listingCode}
                </option>
              ))}
            </select>
          )}
        </div>

        {!selectedVehicle ? (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-600">
            Még nincs feladott járműhirdetésed.{" "}
            <Link href="/vehicles/new" className="font-bold text-emerald-700 underline">
              Adj fel egy járművet
            </Link>
            .
          </div>
        ) : (
          <>
            {kind === "TEST_DRIVE" && (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4 text-xs text-slate-700">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-bold text-slate-900">
                      Tesztvezetés állapota ennél a járműnél:{" "}
                      <span className={selectedVehicle.testDriveSettings?.enabled ? "text-emerald-700" : "text-slate-600"}>
                        {selectedVehicle.testDriveSettings?.enabled ? "Engedélyezve" : "Nincs engedélyezve"}
                      </span>
                    </p>
                    <p className="mt-1 text-slate-600">
                      Jogosítvány-kategória: <strong>{selectedVehicle.testDriveSettings?.requiredLicenseCategory || "B"}</strong> ·
                      Időtartam: <strong>{selectedVehicle.testDriveSettings?.durationMinutes || 30} perc</strong> ·
                      Helyszíni jogosítvány-ellenőrzés:{" "}
                      <strong>{selectedVehicle.testDriveSettings?.licenseInspectionOnSite ? "Kötelező" : "Opcionális"}</strong>
                    </p>
                  </div>
                  <Button asChild size="sm" variant="outline" className="rounded-xl text-xs font-bold">
                    <Link href={`/vehicles/${selectedVehicle.id}/edit`}>Tesztvezetési feltételek szerkesztése</Link>
                  </Button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              {/* Single slot */}
              <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                <h3 className="text-sm font-black text-slate-900">Egyszeri {kindLabel} idősáv</h3>
                <div className="grid grid-cols-3 gap-2">
                  <label className="text-xs font-semibold text-slate-700">
                    Dátum
                    <Input type="date" min={todayIso} value={slotDate} onChange={(e) => setSlotDate(e.target.value)} className="mt-1 h-9 bg-white text-xs" />
                  </label>
                  <label className="text-xs font-semibold text-slate-700">
                    Kezdés
                    <Input type="time" value={slotStart} onChange={(e) => setSlotStart(e.target.value)} className="mt-1 h-9 bg-white text-xs" />
                  </label>
                  <label className="text-xs font-semibold text-slate-700">
                    Időtartam (perc)
                    <Input type="number" min={15} max={180} value={slotDuration} onChange={(e) => setSlotDuration(e.target.value)} className="mt-1 h-9 bg-white text-xs" />
                  </label>
                </div>
                <Input
                  value={slotNote}
                  onChange={(e) => setSlotNote(e.target.value)}
                  placeholder="Megjegyzés (opcionális, pl. délutáni megtekintés)"
                  className="h-9 bg-white text-xs"
                />
                <Button
                  type="button"
                  size="sm"
                  disabled={busyId === "slot-single"}
                  onClick={() => handleAddSingleSlot(kind)}
                  className="rounded-xl bg-emerald-600 text-xs font-bold text-white hover:bg-emerald-700"
                >
                  <Plus className="mr-1.5 h-3.5 w-3.5" />
                  Idősáv hozzáadása
                </Button>
              </div>

              {/* Recurring slot generator */}
              <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                <h3 className="text-sm font-black text-slate-900">Ismétlődő {kindLabel} idősáv-generátor</h3>
                <div className="grid grid-cols-2 gap-2">
                  <label className="text-xs font-semibold text-slate-700">
                    Kezdő dátum
                    <Input type="date" min={todayIso} value={recStart} onChange={(e) => setRecStart(e.target.value)} className="mt-1 h-9 bg-white text-xs" />
                  </label>
                  <label className="text-xs font-semibold text-slate-700">
                    Záró dátum
                    <Input type="date" min={recStart} value={recEnd} onChange={(e) => setRecEnd(e.target.value)} className="mt-1 h-9 bg-white text-xs" />
                  </label>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {WEEKDAYS.map((d) => {
                    const active = recDays.includes(d.value);
                    return (
                      <button
                        key={d.value}
                        type="button"
                        onClick={() =>
                          setRecDays((prev) =>
                            prev.includes(d.value) ? prev.filter((x) => x !== d.value) : [...prev, d.value],
                          )
                        }
                        className={`rounded-lg border px-2.5 py-1 text-xs font-bold transition ${
                          active
                            ? "border-emerald-600 bg-emerald-600 text-white"
                            : "border-slate-300 bg-white text-slate-700"
                        }`}
                      >
                        {d.label}
                      </button>
                    );
                  })}
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <label className="text-xs font-semibold text-slate-700">
                    Ettől
                    <Input type="time" value={recWinStart} onChange={(e) => setRecWinStart(e.target.value)} className="mt-1 h-9 bg-white text-xs" />
                  </label>
                  <label className="text-xs font-semibold text-slate-700">
                    Eddig
                    <Input type="time" value={recWinEnd} onChange={(e) => setRecWinEnd(e.target.value)} className="mt-1 h-9 bg-white text-xs" />
                  </label>
                  <label className="text-xs font-semibold text-slate-700">
                    Blokk (perc)
                    <Input type="number" min={15} max={180} value={recDur} onChange={(e) => setRecDur(e.target.value)} className="mt-1 h-9 bg-white text-xs" />
                  </label>
                </div>
                <Button
                  type="button"
                  size="sm"
                  disabled={busyId === "slot-rec"}
                  onClick={() => handleAddRecurringSlots(kind)}
                  className="rounded-xl bg-emerald-600 text-xs font-bold text-white hover:bg-emerald-700"
                >
                  <Calendar className="mr-1.5 h-3.5 w-3.5" />
                  Idősávok generálása
                </Button>
              </div>
            </div>

            {/* Existing slots list */}
            <div className="space-y-2">
              <h3 className="text-sm font-black text-slate-900">
                Rögzített {kindLabel} idősávok ({slots.length})
              </h3>
              {slots.length === 0 ? (
                <p className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-500">
                  Még nincs rögzített {kindLabel} idősáv ehhez a járműhöz.
                </p>
              ) : (
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {slots.map((s) => (
                    <div
                      key={s.id}
                      className={`flex items-center justify-between rounded-xl border p-3 text-xs ${
                        s.isBlocked ? "border-slate-200 bg-slate-100 text-slate-500" : "border-slate-200 bg-white"
                      }`}
                    >
                      <div>
                        <p className="font-bold text-slate-900">{formatHuDateDot(s.date)}</p>
                        <p className="text-slate-600">
                          {s.startTime} – {s.endTime} ({s.durationMinutes} perc)
                        </p>
                        {s.note && <p className="mt-0.5 text-[11px] text-slate-500">{s.note}</p>}
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={busyId === s.id}
                          onClick={() => handleToggleSlotBlock(selectedVehicle.id, s.id, !s.isBlocked)}
                          className="h-7 rounded-lg px-2 text-[11px] font-bold"
                        >
                          {s.isBlocked ? "Felold" : "Zárol"}
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={busyId === s.id}
                          onClick={() => handleDeleteSlot(selectedVehicle.id, s.id)}
                          className="h-7 rounded-lg border-rose-200 px-2 text-rose-700 hover:bg-rose-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    );
  };

  return (
    <Layout>
      <div className="min-h-screen bg-slate-50/70 pb-20">
        <div className="mx-auto max-w-7xl px-4 py-8">
          {/* Top header */}
          <div className="mb-6 flex flex-col justify-between gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-xs sm:flex-row sm:items-center">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-bold text-emerald-800">
                <Car className="h-3.5 w-3.5" />
                ILOLIT Járművek – Önálló hirdetői és kereskedői felület
              </span>
              <h1 className="mt-2 text-2xl font-black text-slate-950">Saját Járműadmin</h1>
              <p className="mt-1 text-xs text-slate-500">
                Hirdetéseid, megtekintési és tesztvezetési időpontjaid, érdeklődőid, statisztikáid és kereskedői eszközeid egy helyen.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button asChild variant="outline" className="rounded-xl border-slate-200 text-xs font-bold">
                <Link href="/vehicles">Járművek keresése</Link>
              </Button>
              <Button asChild className="rounded-xl bg-emerald-600 text-xs font-bold text-white hover:bg-emerald-700">
                <Link href="/vehicles/new">
                  <Plus className="mr-1.5 h-4 w-4" />
                  Hirdetés feladása
                </Link>
              </Button>
            </div>
          </div>

          <div className="flex flex-col gap-6 lg:flex-row">
            {/* Left Sidebar */}
            <aside className="w-full shrink-0 lg:w-64">
              <nav className="space-y-1 rounded-3xl border border-slate-200 bg-white p-3 shadow-xs">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const active = section === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setSection(item.id)}
                      className={`flex w-full items-center justify-between rounded-2xl px-3.5 py-2.5 text-left text-xs font-bold transition ${
                        active
                          ? "bg-emerald-600 text-white shadow-xs"
                          : "text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      <span className="flex items-center gap-2.5 truncate">
                        <Icon className={`h-4 w-4 shrink-0 ${active ? "text-white" : "text-emerald-600"}`} />
                        <span className="truncate">{item.label}</span>
                      </span>
                      {item.badge !== undefined && item.badge > 0 && (
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-black ${
                            active ? "bg-white/20 text-white" : "bg-emerald-100 text-emerald-800"
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </nav>
            </aside>

            {/* Main Content */}
            <main className="min-w-0 flex-1 rounded-3xl border border-slate-200 bg-white p-5 shadow-xs sm:p-6">
              {/* 1. ÁTTEKINTÉS */}
              {section === "overview" && (
                <div className="space-y-6">
                  <div className="border-b border-slate-200 pb-4">
                    <h2 className="text-xl font-black text-slate-950">Áttekintés</h2>
                    <p className="mt-1 text-xs text-slate-500">
                      Valós idejű összesítés a járműhirdetéseidről és a beérkezett megtekintési, illetve tesztvezetési kérelmekről.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <KpiCard label="Aktív hirdetéseim" value={kpis.active} sub={`${kpis.drafts} piszkozat · ${kpis.sold} eladva`} />
                    <KpiCard label="Visszaigazolásra vár" value={kpis.pendingInquiries} sub={`${kpis.approvedInquiries} visszaigazolva`} highlight={kpis.pendingInquiries > 0} />
                    <KpiCard label="Összes megtekintés" value={kpis.views} sub={`${kpis.favorites} kedvencnek jelölés`} />
                    <KpiCard label="Tesztvezetési kérelmek" value={kpis.testDriveCount} sub="Külön kezelt foglalások" />
                  </div>

                  {/* Pending actions highlight */}
                  {kpis.pendingInquiries > 0 && (
                    <div className="flex flex-col justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 sm:flex-row sm:items-center">
                      <div className="text-xs text-amber-950">
                        <p className="font-bold">
                          {kpis.pendingInquiries} új, ellenőrzött telefonszámú érdeklődői kérelem vár a döntésedre.
                        </p>
                        <p className="mt-0.5 text-amber-800">
                          A pontos cím és találkozási hely csak a jóváhagyásod után jelenik meg az érdeklődő számára.
                        </p>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => {
                          setInquiryFilter("PENDING");
                          setSection("inquiries");
                        }}
                        className="shrink-0 rounded-xl bg-emerald-600 text-xs font-bold text-white hover:bg-emerald-700"
                      >
                        Kérelmek megnyitása
                      </Button>
                    </div>
                  )}

                  {/* Recent listings */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-black text-slate-900">Legutóbbi járműhirdetéseid</h3>
                      <button
                        type="button"
                        onClick={() => setSection("listings")}
                        className="text-xs font-bold text-emerald-700 hover:underline"
                      >
                        Összes hirdetés ({myListings.length})
                      </button>
                    </div>
                    {loadingListings ? (
                      <div className="flex items-center justify-center gap-2 py-10 text-xs text-slate-500">
                        <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />
                        Hirdetések betöltése...
                      </div>
                    ) : myListings.length === 0 ? (
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-8 text-center">
                        <Car className="mx-auto h-9 w-9 text-slate-300" />
                        <p className="mt-2 text-sm font-bold text-slate-900">Még nincs feladott járműhirdetésed</p>
                        <p className="mt-1 text-xs text-slate-500">
                          A 12 lépéses, magyar járműpiacra szabott űrlappal percek alatt feladhatod első járművedet.
                        </p>
                        <Button asChild size="sm" className="mt-4 rounded-xl bg-emerald-600 text-xs font-bold text-white">
                          <Link href="/vehicles/new">Hirdetés feladása</Link>
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-2.5">
                        {myListings.slice(0, 5).map((v) => (
                          <div
                            key={v.id}
                            className="flex flex-col justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50/60 p-3.5 sm:flex-row sm:items-center"
                          >
                            <div className="flex items-center gap-3">
                              <div className="h-14 w-20 shrink-0 overflow-hidden rounded-xl bg-slate-200">
                                {v.photos?.[0]?.url ? (
                                  <img src={v.photos[0].url} alt={v.title} className="h-full w-full object-cover" />
                                ) : (
                                  <div className="flex h-full items-center justify-center">
                                    <Car className="h-5 w-5 text-slate-400" />
                                  </div>
                                )}
                              </div>
                              <div>
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${LISTING_STATUS_META[v.status].className}`}>
                                    {LISTING_STATUS_META[v.status].label}
                                  </span>
                                  <span className="text-[11px] font-semibold text-slate-500">{v.listingCode}</span>
                                </div>
                                <p className="mt-0.5 text-sm font-bold text-slate-950">{v.title}</p>
                                <p className="text-xs text-slate-600">
                                  {formatHuf(v.pricing.priceHuf)} · {v.manufactureYear} · {formatKm(v.mileageKm)}
                                </p>
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <Button asChild size="sm" variant="outline" className="rounded-xl text-xs font-bold">
                                <Link href={`/vehicles/${v.id}/edit`}>Szerkesztés</Link>
                              </Button>
                              <Button asChild size="sm" variant="outline" className="rounded-xl text-xs font-bold">
                                <Link href={`/vehicles/${v.id}`}>Adatlap</Link>
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 2. JÁRMŰHIRDETÉSEIM */}
              {section === "listings" && (
                <div className="space-y-5">
                  <div className="flex flex-col justify-between gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-center">
                    <div>
                      <h2 className="text-xl font-black text-slate-950">Járműhirdetéseim</h2>
                      <p className="mt-1 text-xs text-slate-500">
                        Aktív, piszkozat, szüneteltetett és eladott járműveid kezelése, gyors ármódosítás és árriasztás.
                      </p>
                    </div>
                    <Button asChild size="sm" className="rounded-xl bg-emerald-600 text-xs font-bold text-white">
                      <Link href="/vehicles/new">
                        <Plus className="mr-1.5 h-3.5 w-3.5" />
                        Új hirdetés
                      </Link>
                    </Button>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {(
                      [
                        { key: "ALL", label: `Összes (${myListings.length})` },
                        { key: "ACTIVE", label: `Aktív hirdetéseim (${kpis.active})` },
                        { key: "DRAFT", label: `Piszkozataim (${kpis.drafts})` },
                        { key: "PAUSED", label: "Szüneteltetve" },
                        { key: "SOLD", label: `Eladott járműveim (${kpis.sold})` },
                      ] as const
                    ).map((f) => (
                      <button
                        key={f.key}
                        type="button"
                        onClick={() => setListingStatusFilter(f.key)}
                        className={`rounded-xl border px-3 py-1.5 text-xs font-bold transition ${
                          listingStatusFilter === f.key
                            ? "border-emerald-600 bg-emerald-600 text-white"
                            : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>

                  {filteredListings.length === 0 ? (
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-10 text-center text-sm text-slate-500">
                      Nincs ebbe az állapotba tartozó járműhirdetésed.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {filteredListings.map((v) => (
                        <div key={v.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                          <div className="flex flex-col gap-4 sm:flex-row">
                            <Link
                              href={`/vehicles/${v.id}`}
                              className="h-32 w-full shrink-0 overflow-hidden rounded-xl bg-slate-100 sm:w-44"
                            >
                              {v.photos?.[0]?.url ? (
                                <img src={v.photos[0].url} alt={v.title} className="h-full w-full object-cover" />
                              ) : (
                                <div className="flex h-full items-center justify-center">
                                  <Car className="h-8 w-8 text-slate-300" />
                                </div>
                              )}
                            </Link>
                            <div className="min-w-0 flex-1 space-y-2">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${LISTING_STATUS_META[v.status].className}`}>
                                    {LISTING_STATUS_META[v.status].label}
                                  </span>
                                  <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600">
                                    {getCategoryLabel(v.category)}
                                  </span>
                                  <span className="text-[11px] text-slate-500">Azonosító: {v.listingCode}</span>
                                </div>
                                <span className="text-base font-black text-slate-950">{formatHuf(v.pricing.priceHuf)}</span>
                              </div>

                              <Link href={`/vehicles/${v.id}`} className="block text-base font-bold text-slate-950 hover:text-emerald-700">
                                {v.title}
                              </Link>

                              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
                                <span>{v.manufactureYear}</span>
                                <span>{getFuelLabel(v.fuelType)}</span>
                                <span>{formatKm(v.mileageKm)}</span>
                                <span>{v.publicLocation.city}</span>
                                <span className="inline-flex items-center gap-1">
                                  <Eye className="h-3.5 w-3.5 text-slate-400" /> {v.stats?.views || 0}
                                </span>
                                <span className="inline-flex items-center gap-1">
                                  <Heart className="h-3.5 w-3.5 text-slate-400" /> {v.stats?.favorites || 0}
                                </span>
                                <span>{v.photos?.length || 0} fotó · {v.documents?.length || 0} dokumentum</span>
                              </div>

                              {/* Quick price update */}
                              {priceEditId === v.id && (
                                <div className="flex flex-wrap items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50/50 p-3">
                                  <Input
                                    value={priceEditValue}
                                    onChange={(e) => setPriceEditValue(e.target.value)}
                                    placeholder="Új vételár (Ft)"
                                    className="h-9 w-48 bg-white text-xs font-bold"
                                  />
                                  <Button
                                    type="button"
                                    size="sm"
                                    disabled={busyId === v.id}
                                    onClick={() => handleSaveQuickPrice(v)}
                                    className="h-9 rounded-xl bg-emerald-600 text-xs font-bold text-white"
                                  >
                                    Ár mentése
                                  </Button>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => setPriceEditId(null)}
                                    className="h-9 text-xs"
                                  >
                                    Mégse
                                  </Button>
                                  <span className="text-[11px] text-slate-600">
                                    Árcsökkentésnél a kedvencekbe mentett érdeklődők automatikus árriasztást kapnak.
                                  </span>
                                </div>
                              )}

                              <div className="flex flex-wrap gap-2 pt-1">
                                <Button asChild size="sm" variant="outline" className="rounded-xl text-xs font-bold">
                                  <Link href={`/vehicles/${v.id}/edit`}>
                                    <Edit3 className="mr-1.5 h-3.5 w-3.5" />
                                    Szerkesztés / Fotók
                                  </Link>
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setPriceEditId(priceEditId === v.id ? null : v.id);
                                    setPriceEditValue(String(v.pricing.priceHuf || ""));
                                  }}
                                  className="rounded-xl text-xs font-bold"
                                >
                                  Ár módosítása
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setSelectedVehicleId(v.id);
                                    setSection("viewing_slots");
                                  }}
                                  className="rounded-xl text-xs font-bold"
                                >
                                  Idősávok
                                </Button>
                                {v.status !== "ACTIVE" && (
                                  <Button
                                    type="button"
                                    size="sm"
                                    disabled={busyId === v.id}
                                    onClick={() => handleStatusChange(v, "ACTIVE")}
                                    className="rounded-xl bg-emerald-600 text-xs font-bold text-white hover:bg-emerald-700"
                                  >
                                    <PlayCircle className="mr-1.5 h-3.5 w-3.5" />
                                    Aktiválás
                                  </Button>
                                )}
                                {v.status === "ACTIVE" && (
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    disabled={busyId === v.id}
                                    onClick={() => handleStatusChange(v, "PAUSED")}
                                    className="rounded-xl text-xs font-bold"
                                  >
                                    <PauseCircle className="mr-1.5 h-3.5 w-3.5" />
                                    Szüneteltetés
                                  </Button>
                                )}
                                {v.status !== "SOLD" && (
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    disabled={busyId === v.id}
                                    onClick={() => handleStatusChange(v, "SOLD")}
                                    className="rounded-xl text-xs font-bold"
                                  >
                                    Eladva
                                  </Button>
                                )}
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  disabled={busyId === v.id}
                                  onClick={() => handleStatusChange(v, "DELETED")}
                                  className="rounded-xl border-rose-200 text-xs font-bold text-rose-700 hover:bg-rose-50"
                                >
                                  <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                                  Törlés
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* 3. MEGTEKINTÉSI IDŐPONTOK */}
              {section === "viewing_slots" && renderSlotManager("VIEWING")}

              {/* 4. TESZTVEZETÉSEK */}
              {section === "test_drives" && renderSlotManager("TEST_DRIVE")}

              {/* 5. ÉRDEKLŐDŐK */}
              {section === "inquiries" && (
                <div className="space-y-5">
                  <div className="border-b border-slate-200 pb-4">
                    <h2 className="text-xl font-black text-slate-950">Beérkezett megtekintési és tesztvezetési kérelmek</h2>
                    <p className="mt-1 text-xs text-slate-500">
                      Minden kérelem SMS-ellenőrzött telefonszámmal és kötelező, naplózott jogi nyilatkozattal érkezik.
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {(
                      [
                        { id: "ALL", label: `Összes (${ownerBookings.length})` },
                        { id: "PENDING", label: `Visszaigazolásra vár (${kpis.pendingInquiries})` },
                        { id: "APPROVED", label: `Visszaigazolt (${kpis.approvedInquiries})` },
                        { id: "TEST_DRIVE", label: `Tesztvezetések (${kpis.testDriveCount})` },
                        { id: "CLOSED", label: "Lezárt / Elutasított" },
                      ] as const
                    ).map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => setInquiryFilter(f.id)}
                        className={`rounded-xl border px-3 py-1.5 text-xs font-bold transition ${
                          inquiryFilter === f.id
                            ? "border-emerald-600 bg-emerald-600 text-white"
                            : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>

                  {loadingBookings ? (
                    <div className="flex items-center justify-center gap-2 py-12 text-xs text-slate-500">
                      <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />
                      Kérelmek betöltése...
                    </div>
                  ) : filteredBookings.length === 0 ? (
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-10 text-center text-sm text-slate-500">
                      Nincs megjeleníthető érdeklődői kérelem ebben a szűrésben.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {filteredBookings.map((b) => {
                        const badge = BOOKING_STATUS_META[b.status] || BOOKING_STATUS_META.PENDING;
                        const matchingListing = myListings.find((l) => l.id === b.vehicleId);
                        return (
                          <div key={b.id} className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div className="space-y-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${badge.className}`}>
                                    {badge.label}
                                  </span>
                                  <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[11px] font-bold text-slate-700">
                                    {b.bookingKind === "TEST_DRIVE" ? "Tesztvezetés" : "Személyes megtekintés"}
                                  </span>
                                  {b.requesterPhoneVerified && (
                                    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800">
                                      <ShieldCheck className="h-3 w-3" />
                                      SMS-ellenőrzött érdeklődő
                                    </span>
                                  )}
                                  {b.declarationLog?.declaration1Accepted && b.declarationLog?.declaration2Accepted && (
                                    <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600">
                                      Jogi nyilatkozat elfogadva
                                    </span>
                                  )}
                                </div>
                                <h3 className="text-base font-bold text-slate-950">{b.vehicleTitle}</h3>
                                <p className="text-xs text-slate-600">
                                  Érdeklődő: <strong className="text-slate-900">{b.requesterName}</strong> · Kért időpont:{" "}
                                  <strong className="text-slate-900">
                                    {formatHuDateDot(b.date)} {b.startTime} – {b.endTime}
                                  </strong>
                                </p>
                                {b.bookingKind === "TEST_DRIVE" && b.licenseCategoryConfirmed && (
                                  <p className="text-xs text-emerald-800">
                                    Nyilatkozott jogosítvány-kategória: <strong>{b.licenseCategoryConfirmed}</strong> (érvényes jogosítvány megléte megerősítve)
                                  </p>
                                )}
                                {b.message && (
                                  <p className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
                                    Üzenet: „{b.message}”
                                  </p>
                                )}
                              </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
                              {(b.status === "PENDING" || b.status === "PROPOSED_NEW_TIME") && (
                                <>
                                  <Button
                                    type="button"
                                    size="sm"
                                    onClick={() => {
                                      setApproveBookingId(approveBookingId === b.id ? null : b.id);
                                      setProposeBookingId(null);
                                      setExactAddressInput(
                                        matchingListing?.protectedLocation?.exactAddress ||
                                          matchingListing?.publicLocation?.publicDealershipAddress ||
                                          b.vehiclePublicCity ||
                                          "",
                                      );
                                      setMeetingPlaceInput(matchingListing?.protectedLocation?.meetingPlace || "");
                                      setInstructionsInput(matchingListing?.protectedLocation?.instructions || "");
                                      setOwnerPhoneInput(matchingListing?.ownerPhone || "");
                                    }}
                                    className="rounded-xl bg-emerald-600 text-xs font-bold text-white hover:bg-emerald-700"
                                  >
                                    <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                                    Elfogadás &amp; pontos cím kiadása
                                  </Button>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      setProposeBookingId(proposeBookingId === b.id ? null : b.id);
                                      setApproveBookingId(null);
                                      setProposeDate(b.date);
                                      setProposeTime(b.startTime);
                                    }}
                                    className="rounded-xl text-xs font-bold"
                                  >
                                    Másik időpont javaslása
                                  </Button>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    disabled={busyId === b.id}
                                    onClick={() => handleBookingRespond(b, "REJECT")}
                                    className="rounded-xl border-rose-200 text-xs font-bold text-rose-700 hover:bg-rose-50"
                                  >
                                    <XCircle className="mr-1.5 h-3.5 w-3.5" />
                                    Elutasítás
                                  </Button>
                                </>
                              )}

                              {b.status === "APPROVED" && (
                                <>
                                  <Button
                                    type="button"
                                    size="sm"
                                    disabled={busyId === b.id}
                                    onClick={() => handleBookingRespond(b, "COMPLETE")}
                                    className="rounded-xl bg-emerald-600 text-xs font-bold text-white hover:bg-emerald-700"
                                  >
                                    Teljesítve
                                  </Button>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    disabled={busyId === b.id}
                                    onClick={() => handleBookingRespond(b, "NO_SHOW")}
                                    className="rounded-xl border-amber-300 text-xs font-bold text-amber-800 hover:bg-amber-50"
                                  >
                                    Nem jelent meg
                                  </Button>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    disabled={busyId === b.id}
                                    onClick={() => handleBookingRespond(b, "REVOKE")}
                                    className="rounded-xl border-rose-200 text-xs font-bold text-rose-700 hover:bg-rose-50"
                                  >
                                    Visszavonás (cím tiltása)
                                  </Button>
                                </>
                              )}

                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={() => setReportBooking(b)}
                                className="ml-auto rounded-xl text-xs font-semibold text-slate-500 hover:text-rose-700"
                              >
                                <Flag className="mr-1.5 h-3.5 w-3.5" />
                                Visszaélés jelentése
                              </Button>
                            </div>

                            {/* Approve form */}
                            {approveBookingId === b.id && (
                              <div className="space-y-2.5 rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4">
                                <p className="text-xs font-bold text-emerald-950">
                                  Pontos cím és találkozási instrukciók (kizárólag ennek az érdeklődőnek válik láthatóvá):
                                </p>
                                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                  <label className="text-xs font-semibold text-slate-700">
                                    Pontos cím *
                                    <Input
                                      value={exactAddressInput}
                                      onChange={(e) => setExactAddressInput(e.target.value)}
                                      placeholder="Pl. 1134 Budapest, Váci út 120."
                                      className="mt-1 h-9 bg-white text-xs"
                                    />
                                  </label>
                                  <label className="text-xs font-semibold text-slate-700">
                                    Találkozási pont (opcionális)
                                    <Input
                                      value={meetingPlaceInput}
                                      onChange={(e) => setMeetingPlaceInput(e.target.value)}
                                      placeholder="Pl. Főbejárat melletti parkoló"
                                      className="mt-1 h-9 bg-white text-xs"
                                    />
                                  </label>
                                  <label className="text-xs font-semibold text-slate-700">
                                    Telefonszám (opcionális)
                                    <Input
                                      value={ownerPhoneInput}
                                      onChange={(e) => setOwnerPhoneInput(e.target.value)}
                                      placeholder="+36 30 ..."
                                      className="mt-1 h-9 bg-white text-xs"
                                    />
                                  </label>
                                  <label className="text-xs font-semibold text-slate-700">
                                    Instrukció (opcionális)
                                    <Input
                                      value={instructionsInput}
                                      onChange={(e) => setInstructionsInput(e.target.value)}
                                      placeholder="Pl. Csörgess meg érkezéskor."
                                      className="mt-1 h-9 bg-white text-xs"
                                    />
                                  </label>
                                </div>
                                <Button
                                  type="button"
                                  size="sm"
                                  disabled={busyId === b.id}
                                  onClick={() => handleBookingRespond(b, "APPROVE")}
                                  className="rounded-xl bg-emerald-600 text-xs font-bold text-white hover:bg-emerald-700"
                                >
                                  Visszaigazolás küldése
                                </Button>
                              </div>
                            )}

                            {/* Propose new time form */}
                            {proposeBookingId === b.id && (
                              <div className="grid grid-cols-1 gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-3">
                                <Input
                                  type="date"
                                  min={todayIso}
                                  value={proposeDate}
                                  onChange={(e) => setProposeDate(e.target.value)}
                                  className="h-9 bg-white text-xs"
                                />
                                <Input
                                  type="time"
                                  value={proposeTime}
                                  onChange={(e) => setProposeTime(e.target.value)}
                                  className="h-9 bg-white text-xs"
                                />
                                <Button
                                  type="button"
                                  size="sm"
                                  disabled={busyId === b.id}
                                  onClick={() => handleBookingRespond(b, "PROPOSE_NEW_TIME")}
                                  className="h-9 rounded-xl bg-emerald-600 text-xs font-bold text-white"
                                >
                                  Javaslat küldése
                                </Button>
                                <Input
                                  value={proposeNote}
                                  onChange={(e) => setProposeNote(e.target.value)}
                                  placeholder="Megjegyzés (opcionális)"
                                  className="h-9 bg-white text-xs sm:col-span-3"
                                />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Abuse report modal */}
                  {reportBooking && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
                      <div className="w-full max-w-md space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
                        <div className="flex items-center gap-2 text-rose-700">
                          <AlertTriangle className="h-5 w-5" />
                          <h3 className="text-base font-black text-slate-950">Visszaélés vagy kéretlen megkeresés jelentése</h3>
                        </div>
                        <p className="text-xs text-slate-600">
                          Jelentett érdeklődő: <strong>{reportBooking.requesterName}</strong> ({reportBooking.vehicleTitle})
                        </p>
                        <select
                          value={reportReasonCode}
                          onChange={(e) => setReportReasonCode(e.target.value)}
                          className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-900"
                        >
                          {ABUSE_REPORT_REASONS.map((r) => (
                            <option key={r.code} value={r.code}>
                              {r.label}
                            </option>
                          ))}
                        </select>
                        <Textarea
                          value={reportDetails}
                          onChange={(e) => setReportDetails(e.target.value)}
                          placeholder="Rövid leírás a történtekről (opcionális)..."
                          rows={3}
                          className="text-xs"
                        />
                        <div className="flex justify-end gap-2">
                          <Button type="button" variant="outline" size="sm" onClick={() => setReportBooking(null)} className="rounded-xl text-xs">
                            Mégse
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            disabled={busyId === "report"}
                            onClick={handleSubmitAbuseReport}
                            className="rounded-xl bg-rose-600 text-xs font-bold text-white hover:bg-rose-700"
                          >
                            Jelentés beküldése
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* 6. ÜZENETEK */}
              {section === "messages" && (
                <div className="space-y-5">
                  <div className="flex flex-col justify-between gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-center">
                    <div>
                      <h2 className="text-xl font-black text-slate-950">Üzenetek</h2>
                      <p className="mt-1 text-xs text-slate-500">
                        Közvetlen üzenetváltások a kiválasztott járműhirdetésedhez.
                      </p>
                    </div>
                    {myListings.length > 0 && (
                      <select
                        value={selectedVehicle?.id || ""}
                        onChange={(e) => setSelectedVehicleId(e.target.value)}
                        className="h-10 rounded-xl border border-slate-300 bg-white px-3 text-xs font-bold text-slate-900"
                      >
                        {myListings.map((v) => (
                          <option key={v.id} value={v.id}>
                            {v.brand} {v.model} ({v.manufactureYear})
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  {!selectedVehicle ? (
                    <p className="text-sm text-slate-500">Nincs kiválasztott járműhirdetés.</p>
                  ) : (
                    <div className="space-y-4">
                      <div className="max-h-96 space-y-2.5 overflow-y-auto rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        {(messagesData?.items || []).length === 0 ? (
                          <p className="text-center text-xs text-slate-500">
                            Ehhez a járműhöz még nem érkezett közvetlen üzenet.
                          </p>
                        ) : (
                          (messagesData?.items || []).map((m) => (
                            <div
                              key={m.id}
                              className="rounded-xl border border-slate-200 bg-white p-3 text-xs"
                              onClick={() => {
                                if (m.senderId !== selectedVehicle.ownerId) setReplyRecipientId(m.senderId);
                              }}
                            >
                              <div className="flex items-center justify-between">
                                <strong className="text-slate-900">{m.senderName}</strong>
                                <span className="text-[11px] text-slate-400">
                                  {new Date(m.createdAt).toLocaleString("hu-HU")}
                                </span>
                              </div>
                              <p className="mt-1 text-slate-700">{m.body}</p>
                            </div>
                          ))
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Input
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          placeholder="Válasz írása az érdeklődőnek..."
                          className="h-10 rounded-xl text-xs"
                        />
                        <Button
                          type="button"
                          disabled={busyId === "msg-reply" || !replyText.trim()}
                          onClick={handleSendReply}
                          className="h-10 rounded-xl bg-emerald-600 px-4 text-xs font-bold text-white hover:bg-emerald-700"
                        >
                          <Send className="mr-1.5 h-3.5 w-3.5" />
                          Küldés
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* 7. STATISZTIKÁK */}
              {section === "stats" && (
                <div className="space-y-5">
                  <div className="border-b border-slate-200 pb-4">
                    <h2 className="text-xl font-black text-slate-950">Statisztikák</h2>
                    <p className="mt-1 text-xs text-slate-500">
                      Valós hirdetés-megtekintések, kedvencekbe mentések, időpontkérelmek és üzenetek járművenként.
                    </p>
                  </div>
                  <div className="overflow-x-auto rounded-2xl border border-slate-200">
                    <table className="w-full text-left text-xs">
                      <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase text-slate-600">
                        <tr>
                          <th className="px-4 py-3">Jármű</th>
                          <th className="px-3 py-3">Állapot</th>
                          <th className="px-3 py-3 text-right">Megtekintés</th>
                          <th className="px-3 py-3 text-right">Kedvencek</th>
                          <th className="px-3 py-3 text-right">Megtekintési kérelem</th>
                          <th className="px-3 py-3 text-right">Tesztvezetés</th>
                          <th className="px-3 py-3 text-right">Visszaigazolva</th>
                          <th className="px-3 py-3 text-right">Üzenetek</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {myListings.map((v) => (
                          <tr key={v.id} className="hover:bg-slate-50">
                            <td className="px-4 py-3 font-bold text-slate-900">
                              <Link href={`/vehicles/${v.id}`} className="hover:text-emerald-700">
                                {v.title}
                              </Link>
                            </td>
                            <td className="px-3 py-3">{LISTING_STATUS_META[v.status].label}</td>
                            <td className="px-3 py-3 text-right font-semibold">{v.stats?.views || 0}</td>
                            <td className="px-3 py-3 text-right font-semibold">{v.stats?.favorites || 0}</td>
                            <td className="px-3 py-3 text-right font-semibold">{v.stats?.viewingRequests || 0}</td>
                            <td className="px-3 py-3 text-right font-semibold">{v.stats?.testDriveRequests || 0}</td>
                            <td className="px-3 py-3 text-right font-semibold text-emerald-700">{v.stats?.approvedBookings || 0}</td>
                            <td className="px-3 py-3 text-right font-semibold">{v.stats?.messages || 0}</td>
                          </tr>
                        ))}
                        {myListings.length === 0 && (
                          <tr>
                            <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
                              Még nincs statisztikai adat.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* 8. FIZETÉSEIM ÉS KÖZPONTI DÍJSZABÁS */}
              {section === "billing_pricing" && (
                <div className="space-y-6">
                  <div className="border-b border-slate-200 pb-4">
                    <h2 className="text-xl font-black text-slate-950">Fizetéseim, számláim és központi díjszabás</h2>
                    <p className="mt-1 text-xs text-slate-500">
                      A hirdetési és kiemelési díjak központilag paraméterezhetők; kötelező fizetési díj az üzleti döntést követően aktiválható.
                    </p>
                  </div>

                  {pricingDraft && (
                    <div className="space-y-5 rounded-2xl border border-slate-200 bg-slate-50/70 p-5">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <Sliders className="h-4 w-4 text-emerald-600" />
                          <h3 className="text-sm font-black text-slate-900">Központi díjszabás konfiguráció</h3>
                        </div>
                        <label className="flex items-center gap-2 text-xs font-bold text-slate-900">
                          <input
                            type="checkbox"
                            checked={pricingDraft.enabled}
                            onChange={(e) => setPricingDraft({ ...pricingDraft, enabled: e.target.checked })}
                            className="h-4 w-4 accent-emerald-600"
                          />
                          Fizetős hirdetési díjszabás aktív
                        </label>
                      </div>

                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <label className="text-xs font-semibold text-slate-700">
                          Alap hirdetési időtartam (nap)
                          <Input
                            type="number"
                            min={7}
                            max={365}
                            value={pricingDraft.defaultDurationDays}
                            onChange={(e) =>
                              setPricingDraft({ ...pricingDraft, defaultDurationDays: Number(e.target.value) || 30 })
                            }
                            className="mt-1 h-9 bg-white text-xs"
                          />
                        </label>
                        <label className="text-xs font-semibold text-slate-700">
                          Kiemelés díja (Ft)
                          <Input
                            type="number"
                            min={0}
                            value={pricingDraft.featuredFeeHuf}
                            onChange={(e) =>
                              setPricingDraft({ ...pricingDraft, featuredFeeHuf: Number(e.target.value) || 0 })
                            }
                            className="mt-1 h-9 bg-white text-xs"
                          />
                        </label>
                      </div>

                      <div>
                        <p className="mb-2 text-xs font-bold text-slate-800">Kategóriánkénti alapdíjak (Ft)</p>
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                          {VEHICLE_CATEGORIES.map((cat) => {
                            const entry = pricingDraft.categoryBaseFees?.[cat.value] || { privateFeeHuf: 0, dealerFeeHuf: 0 };
                            return (
                              <div
                                key={cat.value}
                                className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs"
                              >
                                <span className="truncate font-semibold text-slate-800">{cat.label}</span>
                                <div className="flex items-center gap-1.5">
                                  <Input
                                    type="number"
                                    min={0}
                                    value={entry.privateFeeHuf}
                                    onChange={(e) =>
                                      setPricingDraft({
                                        ...pricingDraft,
                                        categoryBaseFees: {
                                          ...pricingDraft.categoryBaseFees,
                                          [cat.value]: { ...entry, privateFeeHuf: Number(e.target.value) || 0 },
                                        },
                                      })
                                    }
                                    title="Magánhirdető (Ft)"
                                    className="h-8 w-20 text-xs"
                                  />
                                  <Input
                                    type="number"
                                    min={0}
                                    value={entry.dealerFeeHuf}
                                    onChange={(e) =>
                                      setPricingDraft({
                                        ...pricingDraft,
                                        categoryBaseFees: {
                                          ...pricingDraft.categoryBaseFees,
                                          [cat.value]: { ...entry, dealerFeeHuf: Number(e.target.value) || 0 },
                                        },
                                      })
                                    }
                                    title="Kereskedő (Ft)"
                                    className="h-8 w-20 text-xs"
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        <p className="mt-1.5 text-[11px] text-slate-500">
                          Első oszlop: magánhirdető díja (Ft) · Második oszlop: kereskedő díja (Ft).
                        </p>
                      </div>

                      <Button
                        type="button"
                        disabled={busyId === "pricing-save"}
                        onClick={handleSavePricing}
                        className="rounded-xl bg-emerald-600 text-xs font-bold text-white hover:bg-emerald-700"
                      >
                        Díjszabási szabályok mentése
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* 9. KERESKEDŐI PROFIL ÉS CSV IMPORT */}
              {section === "dealer_csv" && (
                <div className="space-y-6">
                  <div className="border-b border-slate-200 pb-4">
                    <h2 className="text-xl font-black text-slate-950">Kereskedői profil és tömeges CSV feltöltés</h2>
                    <p className="mt-1 text-xs text-slate-500">
                      Autókereskedések, márkakereskedések és flottakezelők számára: cégadatok, telephely, kapcsolattartók és CSV járműimport.
                    </p>
                  </div>

                  <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-5">
                    <h3 className="text-sm font-black text-slate-900">Kereskedői adatok</h3>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <label className="text-xs font-semibold text-slate-700">
                        Cégnév *
                        <Input
                          value={dealerForm.companyName || ""}
                          onChange={(e) => setDealerForm({ ...dealerForm, companyName: e.target.value })}
                          placeholder="Pl. Példa Autóház Kft."
                          className="mt-1 h-9 bg-white text-xs"
                        />
                      </label>
                      <label className="text-xs font-semibold text-slate-700">
                        Adószám
                        <Input
                          value={dealerForm.taxNumber || ""}
                          onChange={(e) => setDealerForm({ ...dealerForm, taxNumber: e.target.value })}
                          placeholder="12345678-2-41"
                          className="mt-1 h-9 bg-white text-xs"
                        />
                      </label>
                    </div>

                    {dealerForm.locations?.[0] && (
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
                        <label className="text-xs font-semibold text-slate-700">
                          Telephely neve
                          <Input
                            value={dealerForm.locations[0].name}
                            onChange={(e) => {
                              const locs = [...(dealerForm.locations || [])];
                              locs[0] = { ...locs[0], name: e.target.value };
                              setDealerForm({ ...dealerForm, locations: locs });
                            }}
                            className="mt-1 h-9 bg-white text-xs"
                          />
                        </label>
                        <label className="text-xs font-semibold text-slate-700">
                          Település
                          <Input
                            value={dealerForm.locations[0].city}
                            onChange={(e) => {
                              const locs = [...(dealerForm.locations || [])];
                              locs[0] = { ...locs[0], city: e.target.value };
                              setDealerForm({ ...dealerForm, locations: locs });
                            }}
                            placeholder="Budapest"
                            className="mt-1 h-9 bg-white text-xs"
                          />
                        </label>
                        <label className="text-xs font-semibold text-slate-700">
                          Cím
                          <Input
                            value={dealerForm.locations[0].address}
                            onChange={(e) => {
                              const locs = [...(dealerForm.locations || [])];
                              locs[0] = { ...locs[0], address: e.target.value };
                              setDealerForm({ ...dealerForm, locations: locs });
                            }}
                            placeholder="Váci út 120."
                            className="mt-1 h-9 bg-white text-xs"
                          />
                        </label>
                        <label className="text-xs font-semibold text-slate-700">
                          Nyitvatartás
                          <Input
                            value={dealerForm.locations[0].openingHours}
                            onChange={(e) => {
                              const locs = [...(dealerForm.locations || [])];
                              locs[0] = { ...locs[0], openingHours: e.target.value };
                              setDealerForm({ ...dealerForm, locations: locs });
                            }}
                            className="mt-1 h-9 bg-white text-xs"
                          />
                        </label>
                      </div>
                    )}

                    <label className="block text-xs font-semibold text-slate-700">
                      Kereskedés bemutatkozása
                      <Textarea
                        value={dealerForm.description || ""}
                        onChange={(e) => setDealerForm({ ...dealerForm, description: e.target.value })}
                        rows={3}
                        placeholder="Szolgáltatások, garanciális feltételek, beszámítás..."
                        className="mt-1 bg-white text-xs"
                      />
                    </label>

                    <Button
                      type="button"
                      disabled={busyId === "dealer-save"}
                      onClick={handleSaveDealer}
                      className="rounded-xl bg-emerald-600 text-xs font-bold text-white hover:bg-emerald-700"
                    >
                      Kereskedői profil mentése
                    </Button>
                  </div>

                  {/* CSV Import */}
                  <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
                    <div className="flex items-center gap-2">
                      <FileSpreadsheet className="h-5 w-5 text-emerald-600" />
                      <h3 className="text-sm font-black text-slate-900">Tömeges járműfeltöltés CSV fájlból</h3>
                    </div>
                    <p className="text-xs text-slate-600">
                      Támogatott fejlécek (pontosvesszővel vagy vesszővel elválasztva):{" "}
                      <code className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px]">
                        category;brand;model;typeVariant;manufactureYear;mileageKm;fuelType;transmission;priceHuf;city;title;description
                      </code>
                    </p>
                    <input
                      type="file"
                      accept=".csv,text/csv"
                      onChange={(e) => handleCsvFileUpload(e.target.files?.[0] || null)}
                      className="block text-xs text-slate-600"
                    />
                    <Textarea
                      value={csvRawText}
                      onChange={(e) => setCsvRawText(e.target.value)}
                      rows={5}
                      placeholder={
                        "category;brand;model;typeVariant;manufactureYear;mileageKm;fuelType;transmission;priceHuf;city\npassenger_car;Suzuki;Swift;1.2 GL+;2021;42000;benzin;manualis;4890000;Győr"
                      }
                      className="font-mono text-xs"
                    />
                    <div className="flex items-center gap-3">
                      <Button
                        type="button"
                        disabled={busyId === "csv-import" || !csvRawText.trim()}
                        onClick={handleImportCsv}
                        className="rounded-xl bg-emerald-600 text-xs font-bold text-white hover:bg-emerald-700"
                      >
                        CSV járművek importálása (piszkozatként)
                      </Button>
                      {csvImportResult && (
                        <span className="text-xs font-bold text-emerald-700">
                          Importálva: {csvImportResult.importedCount} db
                          {csvImportResult.errors.length > 0 ? ` · Hibás sor: ${csvImportResult.errors.length}` : ""}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* 10. KÖZPONTI KATALÓGUS TÖRZSADAT-KEZELŐ */}
              {section === "catalog_admin" && (
                <div className="space-y-6">
                  <div className="border-b border-slate-200 pb-4">
                    <h2 className="text-xl font-black text-slate-950">Központi járműkatalógus törzsadat-kezelő</h2>
                    <p className="mt-1 text-xs text-slate-500">
                      Új márka, modell, típusváltozat, generáció, motorvariáns és felszereltségi szint felvétele kódfejlesztés nélkül, forrás- és jogtisztaság-naplózással.
                    </p>
                  </div>

                  <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-5">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                      <label className="text-xs font-semibold text-slate-700">
                        Kategória *
                        <select
                          value={catForm.category}
                          onChange={(e) => setCatForm({ ...catForm, category: e.target.value as VehicleCategory })}
                          className="mt-1 h-9 w-full rounded-xl border border-slate-300 bg-white px-2.5 text-xs"
                        >
                          {VEHICLE_CATEGORIES.map((c) => (
                            <option key={c.value} value={c.value}>
                              {c.label}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="text-xs font-semibold text-slate-700">
                        Márka *
                        <Input value={catForm.brand} onChange={(e) => setCatForm({ ...catForm, brand: e.target.value })} placeholder="Pl. BYD" className="mt-1 h-9 bg-white text-xs" />
                      </label>
                      <label className="text-xs font-semibold text-slate-700">
                        Modell *
                        <Input value={catForm.model} onChange={(e) => setCatForm({ ...catForm, model: e.target.value })} placeholder="Pl. Sealion 7" className="mt-1 h-9 bg-white text-xs" />
                      </label>
                      <label className="text-xs font-semibold text-slate-700">
                        Típus / változat
                        <Input value={catForm.typeVariant} onChange={(e) => setCatForm({ ...catForm, typeVariant: e.target.value })} placeholder="Pl. Excellence AWD" className="mt-1 h-9 bg-white text-xs" />
                      </label>
                      <label className="text-xs font-semibold text-slate-700">
                        Generáció
                        <Input value={catForm.generation} onChange={(e) => setCatForm({ ...catForm, generation: e.target.value })} placeholder="Pl. I (2024–)" className="mt-1 h-9 bg-white text-xs" />
                      </label>
                      <label className="text-xs font-semibold text-slate-700">
                        Motorvariáns
                        <Input value={catForm.engineVariant} onChange={(e) => setCatForm({ ...catForm, engineVariant: e.target.value })} placeholder="Pl. 91.3 kWh Dual Motor" className="mt-1 h-9 bg-white text-xs" />
                      </label>
                      <label className="text-xs font-semibold text-slate-700">
                        Gyártás kezdete (év)
                        <Input type="number" value={catForm.yearFrom} onChange={(e) => setCatForm({ ...catForm, yearFrom: e.target.value })} className="mt-1 h-9 bg-white text-xs" />
                      </label>
                      <label className="text-xs font-semibold text-slate-700">
                        Gyártás vége (üres = jelenleg)
                        <Input type="number" value={catForm.yearTo} onChange={(e) => setCatForm({ ...catForm, yearTo: e.target.value })} className="mt-1 h-9 bg-white text-xs" />
                      </label>
                      <label className="text-xs font-semibold text-slate-700">
                        Üzemanyag
                        <select
                          value={catForm.fuelType}
                          onChange={(e) => setCatForm({ ...catForm, fuelType: e.target.value as FuelCategory })}
                          className="mt-1 h-9 w-full rounded-xl border border-slate-300 bg-white px-2.5 text-xs"
                        >
                          {FUEL_OPTIONS.map((f) => (
                            <option key={f.value} value={f.value}>
                              {f.label}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="text-xs font-semibold text-slate-700">
                        Teljesítmény (kW)
                        <Input type="number" value={catForm.powerKw} onChange={(e) => setCatForm({ ...catForm, powerKw: e.target.value })} className="mt-1 h-9 bg-white text-xs" />
                      </label>
                      <label className="text-xs font-semibold text-slate-700">
                        Teljesítmény (LE)
                        <Input type="number" value={catForm.powerHp} onChange={(e) => setCatForm({ ...catForm, powerHp: e.target.value })} className="mt-1 h-9 bg-white text-xs" />
                      </label>
                      <label className="text-xs font-semibold text-slate-700">
                        Sebességváltó
                        <select
                          value={catForm.transmission}
                          onChange={(e) => setCatForm({ ...catForm, transmission: e.target.value as TransmissionType })}
                          className="mt-1 h-9 w-full rounded-xl border border-slate-300 bg-white px-2.5 text-xs"
                        >
                          {TRANSMISSION_OPTIONS.map((t) => (
                            <option key={t.value} value={t.value}>
                              {t.label}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="text-xs font-semibold text-slate-700">
                        Hajtás
                        <select
                          value={catForm.driveType}
                          onChange={(e) => setCatForm({ ...catForm, driveType: e.target.value as DriveType })}
                          className="mt-1 h-9 w-full rounded-xl border border-slate-300 bg-white px-2.5 text-xs"
                        >
                          {DRIVE_OPTIONS.map((d) => (
                            <option key={d.value} value={d.value}>
                              {d.label}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="text-xs font-semibold text-slate-700">
                        Adatforrás
                        <Input value={catForm.dataSource} onChange={(e) => setCatForm({ ...catForm, dataSource: e.target.value })} className="mt-1 h-9 bg-white text-xs" />
                      </label>
                      <label className="text-xs font-semibold text-slate-700">
                        Felhasználási jog / megjegyzés
                        <Input value={catForm.usageRights} onChange={(e) => setCatForm({ ...catForm, usageRights: e.target.value })} className="mt-1 h-9 bg-white text-xs" />
                      </label>
                    </div>

                    <Button
                      type="button"
                      disabled={busyId === "cat-add"}
                      onClick={handleAddCatalogEntry}
                      className="rounded-xl bg-emerald-600 text-xs font-bold text-white hover:bg-emerald-700"
                    >
                      <Plus className="mr-1.5 h-3.5 w-3.5" />
                      Törzsadat rögzítése
                    </Button>
                  </div>

                  {/* Custom entries list */}
                  <div className="space-y-2">
                    <h3 className="text-sm font-black text-slate-900">
                      Központilag hozzáadott törzsadatok ({customCatalogData?.items?.length || 0})
                    </h3>
                    {(customCatalogData?.items || []).length === 0 ? (
                      <p className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-500">
                        Még nincs külön felvett egyedi katalógusbejegyzés; az alap katalógus automatikusan aktív.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {(customCatalogData?.items || []).map((item) => (
                          <div key={item.id} className="rounded-xl border border-slate-200 bg-white p-3 text-xs">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <span className="font-bold text-slate-950">
                                {item.brand} {item.model} {item.typeVariant || ""} {item.generation ? `(${item.generation})` : ""}
                              </span>
                              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                                {getCategoryLabel(item.category)}
                              </span>
                            </div>
                            <p className="mt-1 text-[11px] text-slate-500">
                              Forrás: {item.dataSource} · Jogállás: {item.usageRights} · Ellenőrizve: {item.verifiedAt?.slice(0, 10)}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </main>
          </div>
        </div>
      </div>
    </Layout>
  );
}

function KpiCard({
  label,
  value,
  sub,
  highlight,
}: {
  label: string;
  value: number;
  sub: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-4 ${
        highlight ? "border-emerald-300 bg-emerald-50/50" : "border-slate-200 bg-slate-50/70"
      }`}
    >
      <p className="text-xs font-bold text-slate-600">{label}</p>
      <p className="mt-1.5 text-2xl font-black text-slate-950">{value}</p>
      <p className="mt-0.5 text-[11px] text-slate-500">{sub}</p>
    </div>
  );
}
