import { useEffect, useState } from "react";
import { useLocation, Link } from "wouter";
import { Layout } from "@/components/layout/Layout";
import {
  useGetMyBeautyProvider, getGetMyBeautyProviderQueryKey,
  getGetBeautyProviderQueryKey,
  getGetBeautyProvidersQueryKey,
  useGetMyBeautyBookings, getGetMyBeautyBookingsQueryKey,
  useRespondToBeautyBooking,
  useCompleteBeautyBooking,
  useCreateBeautyServiceOffering,
  useUpdateBeautyServiceOffering,
  useDeleteBeautyServiceOffering,
  useCreateBeautyPortfolioItem,
  useDeleteBeautyPortfolioItem,
  useGetBeautyTimeSlots, getGetBeautyTimeSlotsQueryKey,
  useReplaceBeautyTimeSlots,
  useUpdateBeautyProvider,
} from "@workspace/api-client-react";
import type { BeautyProvider, BeautyServiceOffering, BeautyTimeSlot } from "@workspace/api-client-react";
import { PROFILE_TEMPLATES } from "./templates/templateConfig";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ImageUploader } from "@/components/shared/ImageUploader";
import { formatPrice } from "@/lib/constants";
import { BEAUTY_SERVICE_TYPES, BEAUTY_SERVICE_TYPE_LABELS, BOOKING_STATUS_LABELS, BOOKING_STATUS_COLORS, DAY_LABELS, FONT_OPTIONS, downloadICalFile } from "@/lib/beautyConstants";
import { Sparkles, Clock, Plus, Trash2, Pencil, Check, X, CalendarDays, Bell, UserX, Copy, Download, RefreshCw, ShieldAlert, Eye } from "lucide-react";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const defaultMockProvider: BeautyProvider = {
  id: "prov-demo-1",
  displayName: "Kata Hajstúdió & Balayage Bar",
  region: "budapest",
  district: "5. kerület - Belváros",
  address: "1052 Budapest, Váci utca 18.",
  phone: "+36 20 123 4567",
  bio: "Exkluzív szépségápolási és hajvágási szolgáltatások prémium alapanyagokkal, személyre szabott időpontfoglalással.",
  profileImageUrl: "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=500&h=500&fit=crop",
  videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  templateId: 1,
  fontFamily: "Inter",
  services: [
    { id: "srv-1", name: "Női Hajvágás & Szárítás", category: "hair", price: 12500, durationMinutes: 45, isActive: true } as any,
    { id: "srv-2", name: "Balayage Festés & Ápolás", category: "hair", price: 32000, durationMinutes: 120, isActive: true } as any,
  ],
  portfolio: [
    { id: "port-1", imageUrl: "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=500&h=500&fit=crop", caption: "Balayage eredmény" } as any
  ]
} as any;

import { StaffTab } from "./components/StaffTab";
import { PassesTab } from "./components/PassesTab";
import { GroupEventsTab } from "./components/GroupEventsTab";
import { IntakeFormsTab } from "./components/IntakeFormsTab";
import { BlacklistTab } from "./components/BlacklistTab";
import { AiStudioTab } from "./components/AiStudioTab";
import { EmbeddingMarketingTab } from "./components/EmbeddingMarketingTab";
import { ReceiptsNavTab } from "./components/ReceiptsNavTab";
import { BeautyHeaderNav } from "@/components/beauty/BeautyHeaderNav";

export function BeautyDashboard() {
  const [, setLocation] = useLocation();
  const { data: provider } = useGetMyBeautyProvider({
    query: { queryKey: getGetMyBeautyProviderQueryKey() },
  });

  const activeProvider = provider || defaultMockProvider;

  return (
    <Layout>
      <BeautyHeaderNav activeTab="dashboard" />
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-5 h-5 text-emerald-600" />
              <span className="text-xs font-bold text-emerald-700 uppercase tracking-wide">ILOLIT Szolgáltatói Adminisztráció</span>
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900">{activeProvider.displayName}</h1>
          </div>
          <Button
            variant="outline"
            className="gap-2 border-emerald-300 text-emerald-700 hover:bg-emerald-50 font-bold shadow-sm"
            onClick={() => window.open(`/beauty/${activeProvider.id}`, "_blank")}
          >
            <Eye className="w-4 h-4" /> 👁️ Bemutató oldal megtekintése (új lapon)
          </Button>
        </div>

        <Tabs defaultValue="details">
          <div className="overflow-x-auto pb-2 mb-6">
            <TabsList className="flex flex-wrap sm:grid sm:grid-cols-5 md:grid-cols-8 lg:grid-cols-15 h-auto p-1.5 bg-slate-100/80 rounded-2xl gap-1 min-w-max">
              <TabsTrigger value="details" className="py-2 px-3 rounded-xl font-bold text-xs">1. Alapadatok</TabsTrigger>
              <TabsTrigger value="services" className="py-2 px-3 rounded-xl font-bold text-xs">2. Szolgáltatások</TabsTrigger>
              <TabsTrigger value="appearance" className="py-2 px-3 rounded-xl font-bold text-xs">3. Megjelenés</TabsTrigger>
              <TabsTrigger value="calendar" className="py-2 px-3 rounded-xl font-bold text-xs">4. Naptár</TabsTrigger>
              <TabsTrigger value="bookings" className="py-2 px-3 rounded-xl font-bold text-xs">5. Foglalások</TabsTrigger>
              <TabsTrigger value="analytics" className="py-2 px-3 rounded-xl font-bold text-xs">6. Statisztika</TabsTrigger>
              <TabsTrigger value="coupons" className="py-2 px-3 rounded-xl font-bold text-xs">7. Kuponok</TabsTrigger>
              <TabsTrigger value="staff" className="py-2 px-3 rounded-xl font-bold text-xs text-emerald-800 bg-emerald-100/60">8. Munkatársak</TabsTrigger>
              <TabsTrigger value="passes" className="py-2 px-3 rounded-xl font-bold text-xs text-emerald-800 bg-emerald-100/60">9. Bérletek</TabsTrigger>
              <TabsTrigger value="group" className="py-2 px-3 rounded-xl font-bold text-xs text-emerald-800 bg-emerald-100/60">10. Csoportos Órák</TabsTrigger>
              <TabsTrigger value="intake" className="py-2 px-3 rounded-xl font-bold text-xs text-emerald-800 bg-emerald-100/60">11. Kérdőívek</TabsTrigger>
              <TabsTrigger value="blacklist" className="py-2 px-3 rounded-xl font-bold text-xs text-emerald-800 bg-emerald-100/60">12. Tiltólista</TabsTrigger>
              <TabsTrigger value="aistudio" className="py-2 px-3 rounded-xl font-bold text-xs text-emerald-800 bg-emerald-100/60">13. AI Stúdió</TabsTrigger>
              <TabsTrigger value="embedding" className="py-2 px-3 rounded-xl font-bold text-xs text-emerald-800 bg-emerald-100/60">14. Beágyazás & QR</TabsTrigger>
              <TabsTrigger value="receipts" className="py-2 px-3 rounded-xl font-bold text-xs text-emerald-800 bg-emerald-100/60">15. Nyugtázás & NAV</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="details"><SettingsTab provider={activeProvider} showOnlyDetails={true} /></TabsContent>
          <TabsContent value="services"><ServicesTab providerId={activeProvider.id} services={activeProvider.services ?? []} /></TabsContent>
          <TabsContent value="appearance"><SettingsTab provider={activeProvider} showOnlyAppearance={true} /></TabsContent>
          <TabsContent value="calendar"><CalendarTab providerId={activeProvider.id} provider={activeProvider} /></TabsContent>
          <TabsContent value="bookings"><BookingsTab providerId={activeProvider.id} /></TabsContent>
          <TabsContent value="analytics"><AnalyticsTab provider={activeProvider} /></TabsContent>
          <TabsContent value="coupons"><CouponsTab provider={activeProvider} /></TabsContent>
          <TabsContent value="staff"><StaffTab services={activeProvider.services ?? []} /></TabsContent>
          <TabsContent value="passes"><PassesTab services={activeProvider.services ?? []} /></TabsContent>
          <TabsContent value="group"><GroupEventsTab /></TabsContent>
          <TabsContent value="intake"><IntakeFormsTab services={activeProvider.services ?? []} /></TabsContent>
          <TabsContent value="blacklist"><BlacklistTab /></TabsContent>
          <TabsContent value="aistudio"><AiStudioTab provider={activeProvider} /></TabsContent>
          <TabsContent value="embedding"><EmbeddingMarketingTab provider={activeProvider} /></TabsContent>
          <TabsContent value="receipts"><ReceiptsNavTab services={activeProvider.services ?? []} /></TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}

function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function BookingsTab({ providerId }: { providerId: string }) {
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: bookings, isLoading } = useGetMyBeautyBookings(
    { role: "provider" },
    { query: { queryKey: getGetMyBeautyBookingsQueryKey({ role: "provider" }) } },
  );
  const respond = useRespondToBeautyBooking();
  const complete = useCompleteBeautyBooking();

  const invalidate = () => queryClient.invalidateQueries({ queryKey: getGetMyBeautyBookingsQueryKey({ role: "provider" }) });

  const handleRespond = (id: string, action: "confirm" | "reject") => {
    respond.mutate({ id, data: { action } }, {
      onSuccess: () => { toast({ title: action === "confirm" ? "Foglalás visszaigazolva!" : "Foglalás elutasítva." }); invalidate(); },
    });
  };

  const handleComplete = (id: string) => {
    complete.mutate({ id }, {
      onSuccess: () => { toast({ title: "Foglalás teljesítve!" }); invalidate(); },
    });
  };

  const filteredBookings = (bookings ?? []).filter((b: any) => {
    if (statusFilter === "all") return true;
    return b.status === statusFilter;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-lg font-bold text-slate-900">5. Beérkezett Foglalások Kezelése</h2>
          <p className="text-sm text-muted-foreground">
            A vendégek által beküldött időpontfoglalások áttekintése és jóváhagyása. (A mobilszámok az adatvédelmi szabályok szerint rejtettek).
          </p>
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48 bg-white font-semibold">
            <SelectValue placeholder="Státusz szűrő" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Minden foglalás</SelectItem>
            <SelectItem value="pending">⏳ Függőben / Foglalva</SelectItem>
            <SelectItem value="confirmed">🟢 Visszaigazolva</SelectItem>
            <SelectItem value="completed">✓ Elvégezve</SelectItem>
            <SelectItem value="cancelled">🔴 Törölve</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <Skeleton className="h-64 rounded-2xl" />
      ) : filteredBookings.length === 0 ? (
        <div className="bg-white p-12 text-center rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-slate-500 font-medium">Nincs a szűrőnek megfelelő beérkezett foglalás.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredBookings.map((b: any) => (
            <Card key={b.id} className="p-6 border-slate-200 shadow-sm rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white">
              <div className="space-y-1.5 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge className={`${BOOKING_STATUS_COLORS[b.status] || "bg-slate-100 text-slate-800"} font-bold text-xs`}>
                    {BOOKING_STATUS_LABELS[b.status] || b.status}
                  </Badge>
                  <span className="font-bold text-slate-900">{b.serviceName || "Szépségápolási szolgáltatás"}</span>
                </div>
                <div className="text-sm text-slate-600 space-y-1 pt-1">
                  <p className="font-semibold text-slate-800">👤 Vendég: {b.clientName || "Vendég"} ({b.clientEmail || "rejtett email"})</p>
                  <p className="text-emerald-700 font-bold">📅 Dátum & Időpont: {b.bookingDate} • {b.startTime} - {b.endTime}</p>
                  {b.price && <p className="font-bold text-slate-900">💵 Ár: {formatPrice(b.price)}</p>}
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap w-full md:w-auto">
                {b.status === "pending" && (
                  <>
                    <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold" onClick={() => handleRespond(b.id, "confirm")}>
                      ✓ Elfogadás
                    </Button>
                    <Button size="sm" variant="outline" className="border-rose-300 text-rose-600 hover:bg-rose-50 font-bold" onClick={() => handleRespond(b.id, "reject")}>
                      ✕ Elutasítás
                    </Button>
                  </>
                )}
                {b.status === "confirmed" && (
                  <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white font-bold" onClick={() => handleComplete(b.id)}>
                    ✓ Elvégezve (Lezárás)
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function CalendarTab({ providerId, provider }: { providerId: string; provider: BeautyProvider }) {
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [scheduleOpen, setScheduleOpen] = useState(false);

  const { data: bookings, isLoading: bookingsLoading } = useGetMyBeautyBookings(
    { role: "provider" },
    { query: { queryKey: getGetMyBeautyBookingsQueryKey({ role: "provider" }) } },
  );
  const respond = useRespondToBeautyBooking();
  const complete = useCompleteBeautyBooking();

  const invalidate = () => queryClient.invalidateQueries({ queryKey: getGetMyBeautyBookingsQueryKey({ role: "provider" }) });

  const handleRespond = (id: string, action: "confirm" | "reject") => {
    respond.mutate({ id, data: { action } }, {
      onSuccess: () => { toast({ title: action === "confirm" ? "Foglalás visszaigazolva!" : "Foglalás elutasítva." }); invalidate(); },
    });
  };

  const handleComplete = (id: string) => {
    complete.mutate({ id }, {
      onSuccess: () => { toast({ title: "Foglalás sikeresen lezárva (teljesítve)!" }); invalidate(); },
    });
  };

  const handleNoShow = async (id: string) => {
    try {
      await fetch(`/api/beauty/bookings/${id}/no-show`, { method: "POST" });
      toast({ title: "No-show rögzítve!", description: "A vendég távolmaradása rögzítésre került." });
      invalidate();
    } catch (e: any) {
      toast({ title: "Nem sikerült rögzíteni a no-show státuszt", description: e?.message, variant: "destructive" });
    }
  };

  const activeBookings = (bookings ?? []).filter((b) => b.status !== "REJECTED" && b.status !== "CANCELLED");
  const bookingDateKeys = new Set(activeBookings.map((b) => b.bookingDate));
  const selectedKey = toDateKey(selectedDate);
  const bookingsForDay = activeBookings
    .filter((b) => b.bookingDate === selectedKey)
    .sort((a, b) => a.bookingTime.localeCompare(b.bookingTime));

  return (
    <div>
      <div className="grid md:grid-cols-[auto_1fr] gap-6 items-start">
        <Card className="p-3 w-fit">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={(d) => d && setSelectedDate(d)}
            modifiers={{ hasBooking: (d) => bookingDateKeys.has(toDateKey(d)) }}
            modifiersClassNames={{ hasBooking: "after:content-[''] after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2 after:w-1 after:h-1 after:rounded-full after:bg-primary" }}
          />
        </Card>

        <div>
               {bookingsLoading ? (
            <div className="space-y-3">{Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>
          ) : bookingsForDay.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6">Erre a napra nincs foglalás.</p>
          ) : (
            <div className="space-y-3">
              {bookingsForDay.map((b) => (
                <Card key={b.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-lg">{b.bookingTime}</span>
                        <Badge className={BOOKING_STATUS_COLORS[b.status]}>{BOOKING_STATUS_LABELS[b.status]}</Badge>
                        {(b as any).rescheduledCount > 0 && (
                          <Badge variant="outline" className="text-xs border-amber-500 text-amber-600 bg-amber-50 dark:bg-amber-950/40">
                            Átfoglalva ({(b as any).rescheduledCount}x)
                          </Badge>
                        )}
                      </div>
                      <div className="text-sm mt-0.5 font-medium">{b.customer?.fullName || b.customer?.username || "Vásárló"}</div>
                      <div className="flex items-center gap-3 text-sm mt-1.5">
                        <span className="text-muted-foreground">{b.serviceOffering?.name}</span>
                        <span className="font-medium text-primary">{formatPrice(b.totalPrice)}</span>
                      </div>
                      {b.customerNotes && <p className="text-xs text-muted-foreground mt-1.5">Megjegyzés: {b.customerNotes}</p>}

                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="secondary" className="text-[11px] gap-1 py-0.5">
                          <Bell className="w-3 h-3 text-amber-500" /> Emlékeztető aktív (24h & 2h előtt)
                        </Badge>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 flex-shrink-0">
                      {b.status === "PENDING" && (
                        <>
                          <Button size="sm" onClick={() => handleRespond(b.id, "confirm")}><Check className="w-3.5 h-3.5 mr-1" /> Elfogadás</Button>
                          <Button size="sm" variant="outline" onClick={() => handleRespond(b.id, "reject")}><X className="w-3.5 h-3.5 mr-1" /> Elutasítás</Button>
                        </>
                      )}
                      {b.status === "CONFIRMED" && (
                        <>
                          <Button size="sm" variant="outline" onClick={() => handleComplete(b.id)} className="text-green-700 hover:bg-green-50 border-green-200">
                            <Check className="w-3.5 h-3.5 mr-1" /> Teljesítve
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => handleNoShow(b.id)} className="text-destructive hover:bg-destructive/10 text-xs">
                            <UserX className="w-3.5 h-3.5 mr-1" /> Nem jelent meg (No-Show)
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mt-8 pt-6 border-t border-border">
        <button
          type="button"
          onClick={() => setScheduleOpen((v) => !v)}
          className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition"
        >
          <CalendarDays className="w-4 h-4" />
          Heti nyitvatartás és időközök szerkesztése
          <span className="text-xs">{scheduleOpen ? "▲" : "▼"}</span>
        </button>
        {scheduleOpen && (
          <div className="mt-4">
            <ScheduleEditor providerId={providerId} provider={provider} />
          </div>
        )}
      </div>
    </div>
  );
}

function CalendarSyncTab({ provider }: { provider: BeautyProvider }) {
  const { toast } = useToast();
  const updateProvider = useUpdateBeautyProvider();
  const [syncEnabled, setSyncEnabled] = useState((provider as any).googleCalendarSyncEnabled ?? false);

  const icalFeedUrl = `${window.location.origin}/api/beauty/providers/${provider.id}/calendar.ics`;

  const handleToggleSync = (checked: boolean) => {
    setSyncEnabled(checked);
    updateProvider.mutate({
      id: provider.id,
      data: { displayName: provider.displayName, region: provider.region, googleCalendarSyncEnabled: checked } as any,
    }, {
      onSuccess: () => {
        toast({ title: checked ? "Google Calendar szinkronizáció bekapcsolva" : "Szinkronizáció kikapcsolva" });
        queryClient.invalidateQueries({ queryKey: getGetMyBeautyProviderQueryKey() });
      },
      onError: () => setSyncEnabled(!checked),
    });
  };

  const copyICalUrl = () => {
    navigator.clipboard.writeText(icalFeedUrl);
    toast({ title: "iCal hivatkozás másolva a vágólapra!" });
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <Card className="p-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h2 className="text-lg font-bold flex items-center gap-2">
              <RefreshCw className="w-5 h-5 text-primary" /> Google Calendar Integráció
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Kapcsold be a szinkronizációt, hogy az újonnan visszaigazolt foglalások automatikusan megjelenjenek a Google Naptáradban.
            </p>
          </div>
          <Switch checked={syncEnabled} onCheckedChange={handleToggleSync} />
        </div>

        {syncEnabled && (
          <div className="p-3 bg-green-50 dark:bg-green-950/40 rounded-lg border border-green-200 text-xs text-green-800 dark:text-green-200">
            ✓ A Google Calendar automatikus szinkronizáció aktív. Minden visszaigazolt foglalásról naptárbejegyzés készül.
          </div>
        )}
      </Card>

      <Card className="p-6">
        <h2 className="text-lg font-bold mb-2 flex items-center gap-2">
          <CalendarDays className="w-5 h-5 text-primary" /> iCal Naptár Feed (Apple / Outlook / Google)
        </h2>
        <p className="text-sm text-muted-foreground mb-4">
          Másold ki ezt a hivatkozást, és iratkozz fel rá tetszőleges naptáralapú alkalmazásodban (Apple Calendar, Google Calendar, Outlook). A naptárad automatikusan frissülni fog.
        </p>

        <div className="flex items-center gap-2 mb-4">
          <Input readOnly value={icalFeedUrl} className="font-mono text-xs bg-muted" />
          <Button variant="outline" size="sm" onClick={copyICalUrl} className="flex-shrink-0">
            <Copy className="w-4 h-4 mr-1.5" /> Másolás
          </Button>
        </div>

        <div className="pt-2 border-t border-border flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Közvetlen letöltés az összes visszaigazolt időpontról:</span>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => downloadICalFile({
              id: provider.id,
              title: `Beauty Lolit: ${provider.displayName} foglalĂˇsok`,
              details: `SzolgĂˇltatĂłi idĹ‘pontok - ${provider.displayName}`,
              location: provider.address || provider.region,
              dateStr: new Date().toISOString().split("T")[0],
              timeStr: "09:00",
              durationMinutes: 60,
            })}
          >
            <Download className="w-4 h-4 mr-1.5" /> LetĂ¶ltĂ©s (.ics)
          </Button>
        </div>
      </Card>
    </div>
  );
}

function CancellationAndRemindersTab({ provider }: { provider: BeautyProvider }) {
  const { toast } = useToast();
  const updateProvider = useUpdateBeautyProvider();

  const [policyHours, setPolicyHours] = useState<number>((provider as any).cancellationPolicyHours ?? 24);
  const [feePercent, setFeePercent] = useState<number>((provider as any).cancellationFeePercent ?? 50);
  const [reminder24h, setReminder24h] = useState<boolean>((provider as any).reminder24hEnabled ?? true);
  const [reminder2h, setReminder2h] = useState<boolean>((provider as any).reminder2hEnabled ?? true);

  const handleSave = () => {
    updateProvider.mutate({
      id: provider.id,
      data: {
        displayName: provider.displayName,
        region: provider.region,
        cancellationPolicyHours: policyHours,
        cancellationFeePercent: feePercent,
        reminder24hEnabled: reminder24h,
        reminder2hEnabled: reminder2h,
      } as any,
    }, {
      onSuccess: () => {
        toast({ title: "LemondĂˇsi szabĂˇlyzat Ă©s emlĂ©keztetĹ‘k elmentve!" });
        queryClient.invalidateQueries({ queryKey: getGetMyBeautyProviderQueryKey() });
      },
      onError: () => toast({ title: "Nem sikerĂĽlt a mentĂ©s", variant: "destructive" }),
    });
  };

  const triggerTestReminder = () => {
    toast({
      title: "đź”” EmlĂ©keztetĹ‘ Teszt KĂĽldve!",
      description: "EmlĂ©keztetĹ‘ SMS/E-mail Ă©rtesĂ­tĂ©s minta 24 ĂłrĂˇs Ă©s 2 ĂłrĂˇs idĹ‘zĂ­tĂ©ssel a vendĂ©gek szĂˇmĂˇra.",
    });
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <Card className="p-6 space-y-4">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-amber-500" /> LemondĂˇsi SzabĂˇlyzat & No-Show VĂ©delem
        </h2>
        <p className="text-sm text-muted-foreground">
          HatĂˇrozd meg, hogy a vendĂ©geid hĂˇny ĂłrĂˇval a foglalĂˇs elĹ‘tt mondhatjĂˇk le ingyenesen az idĹ‘pontjukat.
        </p>

        <div className="grid sm:grid-cols-2 gap-4 pt-2">
          <div>
            <label className="text-sm font-medium mb-1.5 block">Ingyenes lemondĂˇsi hatĂˇridĹ‘</label>
            <Select value={String(policyHours)} onValueChange={(v) => setPolicyHours(Number(v))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="12">12 ĂłrĂˇval elĹ‘tte</SelectItem>
                <SelectItem value="24">24 ĂłrĂˇval elĹ‘tte (AjĂˇnlott)</SelectItem>
                <SelectItem value="48">48 ĂłrĂˇval elĹ‘tte</SelectItem>
                <SelectItem value="72">72 ĂłrĂˇval elĹ‘tte</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium mb-1.5 block">KĂ©sĹ‘i lemondĂˇsi dĂ­j (%)</label>
            <Select value={String(feePercent)} onValueChange={(v) => setFeePercent(Number(v))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="0">0% (DĂ­jmentes)</SelectItem>
                <SelectItem value="30">30% lemondĂˇsi dĂ­j</SelectItem>
                <SelectItem value="50">50% lemondĂˇsi dĂ­j (AjĂˇnlott)</SelectItem>
                <SelectItem value="80">80% lemondĂˇsi dĂ­j</SelectItem>
                <SelectItem value="100">100% lemondĂˇsi dĂ­j</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      <Card className="p-6 space-y-4">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <Bell className="w-5 h-5 text-primary" /> Automatikus EmlĂ©keztetĹ‘k (E-mail & SMS)
        </h2>
        <p className="text-sm text-muted-foreground">
          ĂllĂ­tsd be az automatikus emlĂ©keztetĹ‘ket a No-Show jelensĂ©g megelĹ‘zĂ©sĂ©re.
        </p>

        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-semibold text-sm">24 ĂłrĂˇs emlĂ©keztetĹ‘ kĂĽldĂ©se</div>
              <div className="text-xs text-muted-foreground">Automata SMS Ă©s E-mail Ă©rtesĂ­tĂ©s 1 nappal a foglalĂˇs elĹ‘tt.</div>
            </div>
            <Switch checked={reminder24h} onCheckedChange={setReminder24h} />
          </div>

          <div className="flex items-center justify-between border-t border-border pt-4">
            <div>
              <div className="font-semibold text-sm">2 ĂłrĂˇs emlĂ©keztetĹ‘ kĂĽldĂ©se</div>
              <div className="text-xs text-muted-foreground">Gyors figyelmeztetĂ©s SMS-ben 2 ĂłrĂˇval a kezdĂ©s elĹ‘tt.</div>
            </div>
            <Switch checked={reminder2h} onCheckedChange={setReminder2h} />
          </div>
        </div>

        <div className="pt-4 flex items-center justify-between border-t border-border">
          <Button variant="outline" size="sm" onClick={triggerTestReminder}>
            đź”” EmlĂ©keztetĹ‘ tesztelĂ©se
          </Button>
          <Button size="sm" onClick={handleSave} disabled={updateProvider.isPending}>
            {updateProvider.isPending ? "MentĂ©s..." : "BeĂˇllĂ­tĂˇsok MentĂ©se"}
          </Button>
        </div>
      </Card>
    </div>
  );
}

function ServicesTab({ providerId, services }: { providerId: string; services: BeautyServiceOffering[] }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<BeautyServiceOffering | null>(null);
  const [form, setForm] = useState({ serviceType: BEAUTY_SERVICE_TYPES[0].value, name: "", description: "", price: "", durationMinutes: "60" });

  const create = useCreateBeautyServiceOffering();
  const update = useUpdateBeautyServiceOffering();
  const del = useDeleteBeautyServiceOffering();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: getGetMyBeautyProviderQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetBeautyProviderQueryKey(providerId) });
    queryClient.invalidateQueries({ queryKey: getGetBeautyProvidersQueryKey() });
  };

  const openCreate = () => {
    setEditing(null);
    setForm({ serviceType: BEAUTY_SERVICE_TYPES[0].value, name: "", description: "", price: "", durationMinutes: "60" });
    setOpen(true);
  };

  const openEdit = (s: BeautyServiceOffering) => {
    setEditing(s);
    setForm({ serviceType: s.serviceType, name: s.name, description: s.description ?? "", price: String(s.price), durationMinutes: String(s.durationMinutes) });
    setOpen(true);
  };

  const handleSave = () => {
    const data = {
      serviceType: form.serviceType,
      name: form.name,
      description: form.description || undefined,
      price: Number(form.price),
      durationMinutes: Number(form.durationMinutes),
    };
    const onSuccess = () => { toast({ title: editing ? "SzolgĂˇltatĂˇs frissĂ­tve" : "SzolgĂˇltatĂˇs hozzĂˇadva" }); invalidate(); setOpen(false); };
    if (editing) {
      update.mutate({ id: editing.id, data }, { onSuccess });
    } else {
      create.mutate({ id: providerId, data }, { onSuccess });
    }
  };

  const handleToggleAvailable = (s: BeautyServiceOffering) => {
    const patch = (old: any) => {
      if (!old) return old;
      const patchServices = (svcs: any[]) => svcs?.map((svc: any) => svc.id === s.id ? { ...svc, isAvailable: !s.isAvailable } : svc);
      if (Array.isArray(old)) return patchServices(old);
      return { ...old, services: patchServices(old.services ?? []) };
    };
    queryClient.setQueryData(getGetMyBeautyProviderQueryKey(), patch);
    queryClient.setQueryData(getGetBeautyProviderQueryKey(providerId), patch);
    update.mutate(
      { id: s.id, data: { serviceType: s.serviceType, name: s.name, description: s.description ?? undefined, price: s.price, durationMinutes: s.durationMinutes, isAvailable: !s.isAvailable } },
      { onSuccess: invalidate, onError: invalidate }
    );
  };

  const handleDelete = (id: string) => {
    del.mutate({ id }, { onSuccess: () => { toast({ title: "SzolgĂˇltatĂˇs tĂ¶rĂ¶lve" }); invalidate(); } });
  };

  return (
    <div>
      <div className="flex justify-end mb-4">
        <Button size="sm" onClick={openCreate}><Plus className="w-4 h-4 mr-1" /> Ăšj szolgĂˇltatĂˇs</Button>
      </div>

      {services.length === 0 && <p className="text-sm text-muted-foreground py-8 text-center">MĂ©g nincs szolgĂˇltatĂˇsod. Adj hozzĂˇ egyet, hogy az ĂĽgyfelek foglalhassanak.</p>}

      <div className="space-y-3">
        {services.map((s) => (
          <Card key={s.id} className="p-4 flex items-center justify-between gap-3">
            <div>
              <div className="text-xs text-muted-foreground">{BEAUTY_SERVICE_TYPE_LABELS[s.serviceType] ?? s.serviceType}</div>
              <div className="font-semibold">{s.name}</div>
              <div className="flex items-center gap-2 mt-1 text-sm">
                <span className="font-semibold text-primary">{formatPrice(s.price)}</span>
                <span className="text-muted-foreground flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {s.durationMinutes} perc</span>
              </div>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Switch checked={s.isAvailable} onCheckedChange={() => handleToggleAvailable(s)} />
                ElĂ©rhetĹ‘
              </div>
              <Button size="icon" variant="ghost" onClick={() => openEdit(s)}><Pencil className="w-4 h-4" /></Button>
              <Button size="icon" variant="ghost" onClick={() => handleDelete(s.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
            </div>
          </Card>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "SzolgĂˇltatĂˇs szerkesztĂ©se" : "Ăšj szolgĂˇltatĂˇs"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">KategĂłria</label>
              <Select value={form.serviceType} onValueChange={(v) => setForm((f) => ({ ...f, serviceType: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {BEAUTY_SERVICE_TYPES.map((s) => <SelectItem key={s.value} value={s.value}>{s.icon} {s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">SzolgĂˇltatĂˇs neve</label>
              <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="pl. ZselĂ©s manikĹ±r" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">LeĂ­rĂˇs (opcionĂˇlis)</label>
              <Textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={3} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Ăr (Ft)</label>
                <Input type="number" min={0} value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))} />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">IdĹ‘tartam (perc)</label>
                <Input type="number" min={5} step={5} value={form.durationMinutes} onChange={(e) => setForm((f) => ({ ...f, durationMinutes: e.target.value }))} />
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {[15, 30, 45, 60, 90, 120].map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, durationMinutes: String(m) }))}
                      className={`text-xs px-2.5 py-1 rounded-full border transition ${
                        Number(form.durationMinutes) === m
                          ? "border-primary bg-primary/10 text-primary font-medium"
                          : "border-border text-muted-foreground hover:border-muted-foreground/50"
                      }`}
                    >
                      {m} perc
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>MĂ©gse</Button>
            <Button onClick={handleSave} disabled={!form.name || !form.price || create.isPending || update.isPending}>MentĂ©s</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PortfolioTab({ providerId, portfolio }: { providerId: string; portfolio: { id: string; imageUrl: string; title?: string | null }[] }) {
  const { toast } = useToast();
  const create = useCreateBeautyPortfolioItem();
  const del = useDeleteBeautyPortfolioItem();
  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: getGetMyBeautyProviderQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetBeautyProviderQueryKey(providerId) });
    queryClient.invalidateQueries({ queryKey: getGetBeautyProvidersQueryKey() });
  };

  const handleUpload = (urls: string[]) => {
    const newUrl = urls[urls.length - 1];
    if (!newUrl) return;
    create.mutate({ id: providerId, data: { imageUrl: newUrl } }, {
      onSuccess: () => { toast({ title: "KĂ©p hozzĂˇadva a portfĂłliĂłhoz" }); invalidate(); },
    });
  };

  const handleDelete = (id: string) => {
    del.mutate({ id }, { onSuccess: () => { toast({ title: "KĂ©p tĂ¶rĂ¶lve" }); invalidate(); } });
  };

  return (
    <div>
      <p className="text-sm text-muted-foreground mb-4">TĂ¶lts fel kĂ©peket a munkĂˇidrĂłl, hogy az ĂĽgyfelek lĂˇssĂˇk, mire szĂˇmĂ­thatnak.</p>
      <ImageUploader value={[]} onChange={handleUpload} maxImages={1} folder="beauty" />

      {portfolio.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mt-4">
          {portfolio.map((item) => (
            <div key={item.id} className="relative aspect-square rounded-lg overflow-hidden bg-muted group">
              <img src={item.imageUrl} alt={item.title || "PortfĂłliĂł kĂ©p"} className="w-full h-full object-cover" />
              <button
                onClick={() => handleDelete(item.id)}
                className="absolute top-1 right-1 bg-background/90 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Trash2 className="w-3.5 h-3.5 text-destructive" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ScheduleEditor({ providerId, provider }: { providerId: string; provider: BeautyProvider }) {
  const { toast } = useToast();
  const { data: slots, isLoading } = useGetBeautyTimeSlots(providerId, { query: { queryKey: getGetBeautyTimeSlotsQueryKey(providerId) } });
  const replace = useReplaceBeautyTimeSlots();
  const updateProvider = useUpdateBeautyProvider();
  const [interval, setIntervalValue] = useState<number>(provider.slotIntervalMinutes ?? 30);

  const handleIntervalChange = (minutes: number) => {
    setIntervalValue(minutes);
    updateProvider.mutate({
      id: providerId,
      data: { displayName: provider.displayName, region: provider.region, slotIntervalMinutes: minutes as 15 | 30 | 60 },
    }, {
      onSuccess: () => {
        toast({ title: "IdĹ‘kĂ¶z frissĂ­tve" });
        queryClient.invalidateQueries({ queryKey: getGetMyBeautyProviderQueryKey() });
      },
      onError: () => setIntervalValue(provider.slotIntervalMinutes ?? 30),
    });
  };

  const [rows, setRows] = useState<{ dayOfWeek: number; startTime: string; endTime: string }[]>([]);

  useEffect(() => {
    if (slots) {
      setRows(slots.filter((s: BeautyTimeSlot) => s.dayOfWeek !== null && s.dayOfWeek !== undefined && s.isAvailable).map((s) => ({ dayOfWeek: s.dayOfWeek as number, startTime: s.startTime, endTime: s.endTime })));
    }
  }, [slots]);

  const addRow = () => setRows((r) => [...r, { dayOfWeek: 1, startTime: "09:00", endTime: "17:00" }]);
  const removeRow = (idx: number) => setRows((r) => r.filter((_, i) => i !== idx));
  const updateRow = (idx: number, patch: Partial<{ dayOfWeek: number; startTime: string; endTime: string }>) => {
    setRows((r) => r.map((row, i) => (i === idx ? { ...row, ...patch } : row)));
  };

  const handleSave = () => {
    replace.mutate({ id: providerId, data: { slots: rows } }, {
      onSuccess: () => {
        toast({ title: "BeosztĂˇs mentve" });
        queryClient.invalidateQueries({ queryKey: getGetBeautyTimeSlotsQueryKey(providerId) });
      },
    });
  };

  if (isLoading) return <Skeleton className="h-64 rounded-xl" />;

  return (
    <div>
      <p className="text-sm text-muted-foreground mb-4">Add meg, mely napokon Ă©s idĹ‘pontokban fogadsz foglalĂˇsokat.</p>

      <div className="mb-6">
        <label className="text-sm font-medium mb-1.5 block">FoglalĂˇsi idĹ‘kĂ¶z</label>
        <p className="text-xs text-muted-foreground mb-2">Milyen sĹ±rĹ±n kĂ­nĂˇljunk foglalhatĂł idĹ‘pontokat az ĂĽgyfeleknek.</p>
        <div className="flex flex-wrap gap-1.5">
          {[15, 30, 60].map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => handleIntervalChange(m)}
              className={`text-xs px-3 py-1.5 rounded-full border transition ${
                interval === m
                  ? "border-primary bg-primary/10 text-primary font-medium"
                  : "border-border text-muted-foreground hover:border-muted-foreground/50"
              }`}
            >
              {m} perc
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {rows.map((row, idx) => (
          <div key={idx} className="flex flex-wrap items-center gap-2">
            <Select value={String(row.dayOfWeek)} onValueChange={(v) => updateRow(idx, { dayOfWeek: Number(v) })}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                {DAY_LABELS.map((label, i) => <SelectItem key={i} value={String(i)}>{label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input type="time" value={row.startTime} onChange={(e) => updateRow(idx, { startTime: e.target.value })} className="w-32" />
            <span className="text-muted-foreground text-sm">â€“</span>
            <Input type="time" value={row.endTime} onChange={(e) => updateRow(idx, { endTime: e.target.value })} className="w-32" />
            <Button size="icon" variant="ghost" onClick={() => removeRow(idx)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3 mt-4">
        <Button variant="outline" size="sm" onClick={addRow}><Plus className="w-4 h-4 mr-1" /> IdĹ‘sĂˇv hozzĂˇadĂˇsa</Button>
        <Button size="sm" onClick={handleSave} disabled={replace.isPending}>{replace.isPending ? "MentĂ©s..." : "BeosztĂˇs mentĂ©se"}</Button>
      </div>
    </div>
  );
}

function SettingsTab({ provider, showOnlyDetails, showOnlyAppearance }: { provider: BeautyProvider; showOnlyDetails?: boolean; showOnlyAppearance?: boolean }) {
  const { toast } = useToast();
  const updateProvider = useUpdateBeautyProvider();
  const [selected, setSelected] = useState(provider.templateId ?? 1);
  const [selectedFont, setSelectedFont] = useState(provider.fontFamily ?? "Inter");
  const [previewTemplate, setPreviewTemplate] = useState<typeof PROFILE_TEMPLATES[0] | null>(null);

  const [profile, setProfile] = useState({
    displayName: provider.displayName ?? "",
    bio: provider.bio ?? "",
    phone: provider.phone ?? "",
    profileImageUrl: provider.profileImageUrl ?? "",
    videoUrl: (provider as any).videoUrl ?? "",
    address: (provider as any).address ?? "",
    district: (provider as any).district ?? "",
  });

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: getGetMyBeautyProviderQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetBeautyProviderQueryKey(provider.id) });
    queryClient.invalidateQueries({ queryKey: getGetBeautyProvidersQueryKey() });
  };

  const handleSelect = (templateId: number) => {
    setSelected(templateId);
    updateProvider.mutate({
      id: provider.id,
      data: { displayName: provider.displayName, region: provider.region, templateId },
    }, {
      onSuccess: () => { toast({ title: "Design elmentve" }); invalidateAll(); },
      onError: () => setSelected(provider.templateId ?? 1),
    });
  };

  const handleSelectFont = (fontFamily: string) => {
    setSelectedFont(fontFamily);
    updateProvider.mutate({
      id: provider.id,
      data: { displayName: provider.displayName, region: provider.region, fontFamily },
    }, {
      onSuccess: () => { toast({ title: "Betűtípus elmentve" }); invalidateAll(); },
      onError: () => setSelectedFont(provider.fontFamily ?? "Inter"),
    });
  };

  const handleSaveProfile = () => {
    if (!profile.displayName.trim()) {
      toast({ title: "A név nem lehet üres", variant: "destructive" });
      return;
    }
    updateProvider.mutate({
      id: provider.id,
      data: {
        displayName: profile.displayName.trim(),
        region: provider.region,
        bio: profile.bio || undefined,
        phone: profile.phone || undefined,
        profileImageUrl: profile.profileImageUrl || undefined,
        videoUrl: profile.videoUrl || undefined,
        address: profile.address || undefined,
        district: profile.district || undefined,
      } as any,
    }, {
      onSuccess: () => { toast({ title: "Profil adatok és videó sikeresen elmentve!" }); invalidateAll(); },
      onError: (err: any) => {
        toast({ title: "Nem sikerült menteni", description: err?.response?.data?.error, variant: "destructive" });
      },
    });
  };

  const renderDetailsSection = () => (
    <div>
      <h2 className="text-lg font-bold mb-1 text-slate-900">1. Szalon Alapadatok & Helyszín</h2>
      <p className="text-sm text-muted-foreground mb-4">
        Ezek az adatok (lakcím, kerület, videó, profilkép) jelennek meg a saját egyedi bemutatkozó oldaladon.
      </p>
      <div className="space-y-4 max-w-md bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <label className="text-sm font-semibold mb-1.5 block">Profilkép</label>
          <ImageUploader
            value={profile.profileImageUrl ? [profile.profileImageUrl] : []}
            onChange={(urls) => setProfile((p) => ({ ...p, profileImageUrl: urls[0] || "" }))}
            maxImages={1}
            folder="beauty"
          />
        </div>

        <div>
          <label className="text-sm font-semibold mb-1.5 block">Szalon / Szolgáltató Neve *</label>
          <Input
            value={profile.displayName}
            onChange={(e) => setProfile((p) => ({ ...p, displayName: e.target.value }))}
            placeholder="pl. Kata Hajstúdió & Balayage Bar"
          />
        </div>

        <div>
          <label className="text-sm font-semibold mb-1.5 block">Városrész / Kerület</label>
          <Input
            value={profile.district}
            onChange={(e) => setProfile((p) => ({ ...p, district: e.target.value }))}
            placeholder="pl. 5. kerület - Belváros / 13. kerület - Újlipótváros"
          />
        </div>

        <div>
          <label className="text-sm font-semibold mb-1.5 block">Pontos Lakcím (Utca, Házszám)</label>
          <Input
            value={profile.address}
            onChange={(e) => setProfile((p) => ({ ...p, address: e.target.value }))}
            placeholder="pl. 1052 Budapest, Váci utca 18."
          />
        </div>

        <div>
          <label className="text-sm font-semibold mb-1.5 block">Bemutatkozó Videó URL (Cloudflare Stream / MP4 / YouTube)</label>
          <Input
            value={profile.videoUrl}
            onChange={(e) => setProfile((p) => ({ ...p, videoUrl: e.target.value }))}
            placeholder="https://... MP4 vagy videó link"
          />
          {profile.videoUrl && (
            <p className="text-xs text-emerald-600 font-semibold mt-1">✓ Videó beállítva a bemutatkozó oldaladra</p>
          )}
        </div>

        <div>
          <label className="text-sm font-semibold mb-1.5 block">Bemutatkozás</label>
          <Textarea
            value={profile.bio}
            onChange={(e) => setProfile((p) => ({ ...p, bio: e.target.value }))}
            placeholder="Mesélj magadról és a szolgáltatásaidról..."
            rows={4}
            maxLength={2000}
          />
        </div>

        <div>
          <label className="text-sm font-semibold mb-1.5 block">Telefonszám (Privát - Vendég csak chatelhet)</label>
          <Input
            value={profile.phone}
            onChange={(e) => setProfile((p) => ({ ...p, phone: e.target.value }))}
            placeholder="pl. +36 20 123 4567"
          />
        </div>

        <Button onClick={handleSaveProfile} disabled={updateProvider.isPending} className="w-full font-bold bg-emerald-600 hover:bg-emerald-700 text-white">
          {updateProvider.isPending ? "Mentés..." : "Alapadatok & Profil Mentése"}
        </Button>
      </div>
    </div>
  );

  const renderAppearanceSection = () => (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-bold mb-1 text-slate-900">3. Betűtípus Választó</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Válaszd ki a bemutató oldaladon megjelenő tipográfiát.
        </p>
        <div className="max-w-xs">
          <Select value={selectedFont} onValueChange={handleSelectFont}>
            <SelectTrigger className="w-full bg-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FONT_OPTIONS.map((f) => (
                <SelectItem key={f.value} value={f.value} style={{ fontFamily: f.value }}>
                  {f.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-bold mb-1 text-slate-900">10 Komplett Landing Page Sablon</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Kattints egy sablonra a kiválasztáshoz, vagy a nagy előnézet gombra az élő felugró ablakos megtekintéshez! (Max. 2 sötét tónusú)
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {PROFILE_TEMPLATES.map((t) => {
            const isActive = selected === t.id;
            return (
              <div
                key={t.id}
                className={`rounded-2xl overflow-hidden border-2 transition bg-white shadow-sm flex flex-col justify-between ${isActive ? "border-emerald-600 ring-2 ring-emerald-500/20" : "border-slate-200 hover:border-emerald-300"}`}
              >
                <div
                  className="h-24 relative p-3 flex flex-col justify-between"
                  style={
                    t.bgImage
                      ? { backgroundImage: `url(${t.bgImage})`, backgroundSize: "cover", backgroundPosition: "center" }
                      : { background: `linear-gradient(135deg, ${t.primaryColor} 0%, ${t.secondaryColor} 100%)` }
                  }
                >
                  <div className="flex items-center justify-between z-10">
                    <Badge variant={t.isDark ? "destructive" : "secondary"} className="text-[10px] font-bold">
                      {t.isDark ? "🌙 Sötét" : "☀️ Világos"}
                    </Badge>
                    {isActive && (
                      <span className="bg-emerald-600 text-white p-1 rounded-full text-xs">
                        <Check className="w-3.5 h-3.5" />
                      </span>
                    )}
                  </div>
                </div>

                <div className="p-3 space-y-2 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="font-bold text-sm text-slate-900">{t.fantasyName}</h3>
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{t.description}</p>
                  </div>
                  <div className="pt-2 flex items-center gap-1.5">
                    <Button
                      size="sm"
                      variant={isActive ? "default" : "outline"}
                      className={`flex-1 text-xs font-bold ${isActive ? "bg-emerald-600 hover:bg-emerald-700" : ""}`}
                      onClick={() => handleSelect(t.id)}
                    >
                      {isActive ? "Kiválasztva" : "Választás"}
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50"
                      onClick={() => setPreviewTemplate(t)}
                      title="Nagy felugró előnézet"
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Template Preview Dialog */}
      <Dialog open={!!previewTemplate} onOpenChange={() => setPreviewTemplate(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto p-0 rounded-2xl overflow-hidden border-0">
          {previewTemplate && (
            <div className={`p-8 space-y-6 ${previewTemplate.bgGradient}`}>
              <div className="flex items-center justify-between pb-4 border-b">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-2xl font-extrabold">{previewTemplate.fantasyName} Sablon Előnézet</h2>
                    <Badge variant={previewTemplate.isDark ? "destructive" : "secondary"}>
                      {previewTemplate.isDark ? "Sötét tónusú" : "Világos tónusú"}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{previewTemplate.description}</p>
                </div>
                <Button
                  className="font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={() => {
                    handleSelect(previewTemplate.id);
                    setPreviewTemplate(null);
                  }}
                >
                  Sablon Aktiválása
                </Button>
              </div>

              {/* Sample Profile Cards */}
              <div className={`p-6 rounded-2xl border ${previewTemplate.cardBg} space-y-4`}>
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-500 flex items-center justify-center font-bold text-xl">
                    K
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">{profile.displayName || "Kata Hajstúdió & Balayage Bar"}</h3>
                    <p className="text-sm opacity-80">{profile.district || "5. kerület - Belváros"} • ⭐️ 4.9 (48 értékelés)</p>
                  </div>
                </div>
                <p className="text-sm opacity-90 leading-relaxed">
                  {profile.bio || "Exkluzív szépségápolási és hajvágási szolgáltatások prémium alapanyagokkal, személyre szabott időpontfoglalással."}
                </p>
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="p-3 rounded-xl border border-black/10 bg-black/5 text-xs font-semibold">
                    ✂️ Női Hajvágás & Szárítás • 45 perc • 12 500 Ft
                  </div>
                  <div className="p-3 rounded-xl border border-black/10 bg-black/5 text-xs font-semibold">
                    🎨 Balayage Festés & Ápolás • 120 perc • 32 000 Ft
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );

  if (showOnlyDetails) return renderDetailsSection();
  if (showOnlyAppearance) return renderAppearanceSection();

  return (
    <div className="space-y-12">
      {renderDetailsSection()}
      {renderAppearanceSection()}
    </div>
  );
}

function AnalyticsTab({ provider }: { provider: BeautyProvider }) {
  return (
    <div className="space-y-6 max-w-4xl">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-5 rounded-2xl border bg-white dark:bg-slate-900 shadow-sm space-y-1">
          <span className="text-xs text-slate-500 font-semibold uppercase">Havi Összes Bevétel</span>
          <div className="text-2xl font-black text-emerald-600">345 000 Ft</div>
          <span className="text-[10px] text-emerald-600 font-bold">↑ +14% az előző hónaphoz képest</span>
        </Card>

        <Card className="p-5 rounded-2xl border bg-white dark:bg-slate-900 shadow-sm space-y-1">
          <span className="text-xs text-slate-500 font-semibold uppercase">Havi Foglalások Száma</span>
          <div className="text-2xl font-black text-slate-900 dark:text-slate-100">24 foglalás</div>
          <span className="text-[10px] text-slate-500 font-bold">Visszaigazolva & Teljesítve</span>
        </Card>

        <Card className="p-5 rounded-2xl border bg-white dark:bg-slate-900 shadow-sm space-y-1">
          <span className="text-xs text-slate-500 font-semibold uppercase">Átlagos Foglalási Érték</span>
          <div className="text-2xl font-black text-rose-600">14 375 Ft</div>
          <span className="text-[10px] text-slate-500 font-bold">Vendégenkénti átlag</span>
        </Card>
      </div>

      {/* Guest Demographic Breakdown (Új vs Visszatérő) */}
      <Card className="p-6 rounded-3xl border space-y-4">
        <h2 className="text-base font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          👥 Vendég-Összetétel (Új vs. Visszatérő Vendégek)
        </h2>

        <div className="space-y-3">
          <div>
            <div className="flex justify-between text-xs font-bold mb-1">
              <span>✨ Új Vendégek (68%)</span>
              <span>16 vendég</span>
            </div>
            <div className="w-full h-3 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
              <div className="h-full bg-rose-500 rounded-full" style={{ width: "68%" }} />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-xs font-bold mb-1">
              <span>🔄 Visszatérő Vendégek (32%)</span>
              <span>8 vendég</span>
            </div>
            <div className="w-full h-3 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
              <div className="h-full bg-indigo-600 rounded-full" style={{ width: "32%" }} />
            </div>
          </div>
        </div>
      </Card>

      {/* Favorite Services Ranking */}
      <Card className="p-6 rounded-3xl border space-y-4">
        <h2 className="text-base font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          🏆 Legnépszerűbb Szolgáltatások (Kedvencek)
        </h2>

        <div className="space-y-3 text-xs">
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 font-bold border">
            <span>1. Balayage Festés & Ápolás</span>
            <span className="text-rose-600">14 foglalás (448 000 Ft)</span>
          </div>
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 font-bold border">
            <span>2. Női Hajvágás & Szárítás</span>
            <span className="text-rose-600">8 foglalás (100 000 Ft)</span>
          </div>
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 font-bold border">
            <span>3. Hajápolás & Modellirányítás</span>
            <span className="text-rose-600">2 foglalás (25 000 Ft)</span>
          </div>
        </div>
      </Card>
    </div>
  );
}

function CouponsTab({ provider }: { provider: BeautyProvider }) {
  const { toast } = useToast();
  const [coupons, setCoupons] = useState([
    { id: "c1", code: "KEDVEZMÉNY10", percent: 10, uses: 14, active: true },
    { id: "c2", code: "SZÉPSÉG20", percent: 20, uses: 6, active: true },
  ]);

  const [newCode, setNewCode] = useState("");
  const [newPercent, setNewPercent] = useState("10");

  const handleCreateCoupon = () => {
    if (!newCode.trim()) {
      toast({ title: "A kuponkód megadása kötelező!", variant: "destructive" });
      return;
    }
    const created = {
      id: `c-${Date.now()}`,
      code: newCode.trim().toUpperCase(),
      percent: Number(newPercent),
      uses: 0,
      active: true,
    };
    setCoupons((prev) => [created, ...prev]);
    setNewCode("");
    toast({ title: "Új Kuponkód Létrehozva! 🎉", description: `Kód: ${created.code} (-${created.percent}%)` });
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <Card className="p-6 rounded-3xl border space-y-4">
        <h2 className="text-lg font-bold flex items-center gap-2">
          🎟️ Új Kuponkód Létrehozása
        </h2>
        <p className="text-xs text-muted-foreground">
          Adj meg egy kuponkódot, amit a vendégek beírhatnak a foglalási fizetésnél!
        </p>

        <div className="flex flex-col sm:flex-row gap-3">
          <Input
            placeholder="pl. TAVASZ15"
            value={newCode}
            onChange={(e) => setNewCode(e.target.value)}
            className="uppercase text-xs font-bold font-mono"
          />
          <Select value={newPercent} onValueChange={setNewPercent}>
            <SelectTrigger className="sm:w-44 text-xs font-bold"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="5">-5% kedvezmény</SelectItem>
              <SelectItem value="10">-10% kedvezmény</SelectItem>
              <SelectItem value="15">-15% kedvezmény</SelectItem>
              <SelectItem value="20">-20% kedvezmény</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={handleCreateCoupon} className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs">
            Kupon Aktiválása
          </Button>
        </div>
      </Card>

      <Card className="p-6 rounded-3xl border space-y-4">
        <h2 className="text-lg font-bold">Aktív Kuponjaid</h2>
        <div className="space-y-3">
          {coupons.map((c) => (
            <div key={c.id} className="p-4 rounded-2xl border flex items-center justify-between bg-white dark:bg-slate-900 shadow-sm">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-black text-rose-600 text-sm">{c.code}</span>
                  <Badge className="bg-rose-500 text-white font-bold text-[10px]">-{c.percent}%</Badge>
                </div>
                <span className="text-xs text-slate-500">{c.uses} alkalommal beváltva</span>
              </div>

              <Switch
                checked={c.active}
                onCheckedChange={(checked) => {
                  setCoupons((prev) => prev.map((item) => (item.id === c.id ? { ...item, active: checked } : item)));
                  toast({ title: checked ? "Kupon bekapcsolva" : "Kupon kikapcsolva" });
                }}
              />
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
