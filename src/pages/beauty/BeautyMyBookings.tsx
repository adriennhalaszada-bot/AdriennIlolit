import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Layout } from "@/components/layout/Layout";
import { BeautyHeaderNav } from "@/components/beauty/BeautyHeaderNav";
import {
  useGetMyBeautyBookings, getGetMyBeautyBookingsQueryKey,
  useCancelBeautyBooking,
  useCreateBeautyReview,
} from "@workspace/api-client-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { formatPrice } from "@/lib/constants";
import { BOOKING_STATUS_LABELS, BOOKING_STATUS_COLORS, createGoogleCalendarUrl, downloadICalFile } from "@/lib/beautyConstants";
import { Star, MapPin, Sparkles, Calendar, Clock, Bell, AlertTriangle, ExternalLink, Download } from "lucide-react";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { cancelProviderBooking, getMyProviderBookings, getProviderAvailability, rescheduleProviderBooking, type ProviderBookingRecord } from "@/lib/providerBookingApi";

const AVAILABLE_TIME_SLOTS = [
  "08:00", "08:30", "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
  "12:00", "12:30", "13:00", "13:30", "14:00", "14:30", "15:00", "15:30",
  "16:00", "16:30", "17:00", "17:30", "18:00"
];

export function BeautyMyBookings() {
  const { toast } = useToast();
  const { data: bookings, isLoading } = useGetMyBeautyBookings(
    { role: "customer" },
    { query: { queryKey: getGetMyBeautyBookingsQueryKey({ role: "customer" }) } },
  );

  const cancelBooking = useCancelBeautyBooking();
  const createReview = useCreateBeautyReview();
  const [providerBookings, setProviderBookings] = useState<ProviderBookingRecord[]>([]);
  const [isLoadingProviderBookings, setIsLoadingProviderBookings] = useState(true);
  const [cancellingProviderBookingId, setCancellingProviderBookingId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    getMyProviderBookings()
      .then(({ items }) => active && setProviderBookings(items.filter((booking) => booking.role === "customer")))
      .catch(() => {})
      .finally(() => active && setIsLoadingProviderBookings(false));
    return () => { active = false; };
  }, []);

  const [rescheduleBooking, setRescheduleBooking] = useState<any | null>(null);
  const [newDate, setNewDate] = useState("");
  const [newTime, setNewTime] = useState("");
  const [isRescheduling, setIsRescheduling] = useState(false);
  const [rescheduleSlots, setRescheduleSlots] = useState<string[]>(AVAILABLE_TIME_SLOTS);
  const [isLoadingRescheduleSlots, setIsLoadingRescheduleSlots] = useState(false);

  useEffect(() => {
    if (!rescheduleBooking || !newDate) return;
    if (!rescheduleBooking.isProviderBooking) {
      setRescheduleSlots(AVAILABLE_TIME_SLOTS);
      return;
    }
    let active = true;
    setIsLoadingRescheduleSlots(true);
    getProviderAvailability(rescheduleBooking.providerId, newDate)
      .then((result) => {
        if (!active) return;
        const times = result.slots.map((slot) => slot.time);
        setRescheduleSlots(times);
        setNewTime((current) => times.includes(current) ? current : "");
      })
      .catch(() => active && setRescheduleSlots([]))
      .finally(() => active && setIsLoadingRescheduleSlots(false));
    return () => { active = false; };
  }, [rescheduleBooking, newDate]);

  const [reviewBookingId, setReviewBookingId] = useState<string | null>(null);
  const [rating, setRating] = useState(5);
  const [reviewText, setReviewText] = useState("");

  const [cancelTargetBooking, setCancelTargetBooking] = useState<any | null>(null);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: getGetMyBeautyBookingsQueryKey({ role: "customer" }) });

  const confirmCancel = async (booking: any) => {
    if (booking.isProviderBooking) {
      setCancellingProviderBookingId(booking.id);
      try {
        const updated = await cancelProviderBooking(booking.id);
        setProviderBookings((current) => current.map((item) => item.id === updated.id ? updated : item));
        toast({ title: "Foglalás lemondva" });
        setCancelTargetBooking(null);
      } catch (error) {
        toast({ title: "Nem sikerült lemondani", description: error instanceof Error ? error.message : "Ismeretlen hiba történt.", variant: "destructive" });
      } finally {
        setCancellingProviderBookingId(null);
      }
      return;
    }
    cancelBooking.mutate({ id: booking.id }, {
      onSuccess: () => {
        toast({ title: "Foglalás lemondva" });
        setCancelTargetBooking(null);
        invalidate();
      },
      onError: (err: any) => {
        toast({ title: "Nem sikerült lemondani", description: err?.message, variant: "destructive" });
      },
    });
  };

  const handleRescheduleSubmit = async () => {
    if (!rescheduleBooking || !newDate || !newTime) return;
    setIsRescheduling(true);
    try {
      if (rescheduleBooking.isProviderBooking) {
        const updated = await rescheduleProviderBooking(rescheduleBooking.id, newDate, newTime);
        setProviderBookings((current) => current.map((item) => item.id === updated.id ? updated : item));
        toast({ title: "Átfoglalási kérés elküldve", description: `Új időpont: ${newDate} ${newTime}. A szolgáltató új visszaigazolása szükséges.` });
        setRescheduleBooking(null);
        return;
      }
      await fetch(`/api/beauty/bookings/${rescheduleBooking.id}/reschedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newBookingDate: newDate, newBookingTime: newTime }),
      });
      toast({ title: "Sikeres átidőzítés!", description: `Új időpont: ${newDate} ${newTime}` });
      setRescheduleBooking(null);
      invalidate();
    } catch (err: any) {
      toast({ title: "Nem sikerült az átidőzítés", description: err?.message || "Kérjük válassz másik időpontot!", variant: "destructive" });
    } finally {
      setIsRescheduling(false);
    }
  };

  const handleReviewSubmit = () => {
    if (!reviewBookingId) return;
    createReview.mutate({ id: reviewBookingId, data: { rating, reviewText: reviewText || undefined } }, {
      onSuccess: () => {
        toast({ title: "Köszönjük az értékelést!" });
        setReviewBookingId(null);
        setRating(5);
        setReviewText("");
        invalidate();
      },
      onError: (err: any) => toast({ title: "Nem sikerült az értékelés", description: err?.message, variant: "destructive" }),
    });
  };

  const isWithin24Hours = (dateStr: string, timeStr: string): boolean => {
    try {
      const bookingDateTime = new Date(`${dateStr}T${timeStr}:00`);
      const hoursRemaining = (bookingDateTime.getTime() - Date.now()) / (1000 * 60 * 60);
      return hoursRemaining > 0 && hoursRemaining < 24;
    } catch {
      return false;
    }
  };

  const [activeTabFilter, setActiveTabFilter] = useState<"upcoming" | "past" | "cancelled">("upcoming");

  const persistentBookings = providerBookings.map((booking) => ({
    ...booking,
    isProviderBooking: true,
    totalPrice: booking.price,
    serviceOffering: { name: booking.serviceName },
    provider: { displayName: booking.providerName },
  }));
  const rawList = [...persistentBookings, ...(bookings ?? [])];

  const filteredBookings = rawList.filter((b: any) => {
    if (activeTabFilter === "cancelled") return b.status === "CANCELLED" || b.status === "REJECTED";
    if (activeTabFilter === "past") return b.status === "COMPLETED" || new Date(b.bookingDate) < new Date();
    return b.status === "CONFIRMED" || b.status === "PENDING";
  });

  return (
    <Layout>
      <BeautyHeaderNav activeTab="bookings" />
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="w-5 h-5 text-emerald-600" />
          <span className="text-sm font-extrabold text-emerald-700 uppercase tracking-wide">ILOLIT Szépségápolás</span>
        </div>
        <h1 className="text-2xl font-black mb-6">Én Foglalásaim</h1>

        {/* Tab Filters */}
        <div className="flex gap-2 mb-6 border-b pb-3 font-extrabold text-sm">
          {[
            { id: "upcoming", label: "🗓️ Jövőbeni Foglalások" },
            { id: "past", label: "⌛ Múltbeli / Teljesített" },
            { id: "cancelled", label: "❌ Lemondott / Elutasított" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTabFilter(tab.id as typeof activeTabFilter)}
              className={`px-4 py-2 rounded-2xl transition-all ${
                activeTabFilter === tab.id
                  ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/20"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {(isLoading || isLoadingProviderBookings) && (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
          </div>
        )}

        {!isLoading && !isLoadingProviderBookings && filteredBookings.length === 0 && (
          <div className="text-center py-16 bg-slate-50 dark:bg-slate-900 border rounded-3xl p-8">
            <p className="text-lg font-extrabold mb-1">Nincs megjeleníthető foglalás ebben a kategóriában.</p>
            <p className="text-muted-foreground text-xs mb-4">Böngéssz az elérhető szépségipari szolgáltatók között!</p>
            <Button asChild className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl"><Link href="/beauty">Szolgáltatók Böngészése</Link></Button>
          </div>
        )}

        <div className="space-y-4">
          {filteredBookings.map((b: any) => {
            const isPendingOrConfirmed = b.status === "PENDING" || b.status === "CONFIRMED";
            const googleCalUrl = createGoogleCalendarUrl({
              title: `Beauty Lolit: ${b.serviceOffering?.name || 'Szolgáltatás'} - ${b.provider?.displayName || ''}`,
              details: `Beauty Lolit foglalás az alábbi szolgáltatásra: ${b.serviceOffering?.name}. Szolgáltató: ${b.provider?.displayName}`,
              location: b.provider?.address || '',
              dateStr: b.bookingDate,
              timeStr: b.bookingTime,
              durationMinutes: b.durationMinutes || 60,
            });

            return (
              <Card key={b.id} className="p-5">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link href={`/beauty/${b.providerId}`} className="font-bold text-lg hover:underline text-foreground">
                        {b.provider?.displayName}
                      </Link>
                      <Badge className={BOOKING_STATUS_COLORS[b.status]}>{BOOKING_STATUS_LABELS[b.status]}</Badge>
                      {(b as any).rescheduledCount > 0 && (
                        <Badge variant="outline" className="text-xs border-amber-500 text-amber-600 bg-amber-50 dark:bg-amber-950/40">
                          Átfoglalva ({(b as any).rescheduledCount}x)
                        </Badge>
                      )}
                    </div>

                    <div className="text-sm font-medium text-muted-foreground">{b.serviceOffering?.name}</div>

                    <div className="flex flex-wrap items-center gap-4 text-sm">
                      <span className="flex items-center gap-1.5 font-semibold text-foreground">
                        <Calendar className="w-4 h-4 text-primary" /> {b.bookingDate} · {b.bookingTime}
                      </span>
                      <span className="font-semibold text-primary">{formatPrice(b.totalPrice)}</span>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" /> {b.durationMinutes} perc
                      </span>
                    </div>

                    {b.provider?.address && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="w-3.5 h-3.5 text-primary" /> {b.provider.address}
                      </div>
                    )}

                    {b.providerNotes && (
                      <p className="text-xs bg-muted/60 p-2 rounded-md text-muted-foreground">
                        <span className="font-semibold text-foreground">Szolgáltató válasza:</span> {b.providerNotes}
                      </p>
                    )}

                    {(b as any).cancellationPenaltyApplied && (b as any).cancellationFeeAmount > 0 && (
                      <p className="text-xs text-red-600 font-semibold bg-red-50 dark:bg-red-950/30 p-2 rounded-md border border-red-200">
                        ⚠️ Lemondási díj terhelve: {formatPrice((b as any).cancellationFeeAmount)}
                      </p>
                    )}

                    {/* Deposit & Pre-Authorization Status Badge */}
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      {b.status === "PENDING" && b.depositAmount > 0 && (
                        <Badge variant="outline" className="text-[11px] gap-1 py-0.5 border-indigo-300 bg-indigo-50 text-indigo-900 font-bold">
                          Előleg a visszaigazolás után fizetendő
                        </Badge>
                      )}
                      {b.status === "CONFIRMED" && b.depositAmount > 0 && (
                        <Badge variant="outline" className="text-[11px] gap-1 py-0.5 border-emerald-300 bg-emerald-50 text-emerald-900 font-bold">
                          Visszaigazolva · előleg: {formatPrice(b.depositAmount)}
                        </Badge>
                      )}
                      {(b.status === "REJECTED" || b.status === "CANCELLED") && b.depositAmount > 0 && (
                        <Badge variant="outline" className="text-[11px] gap-1 py-0.5 border-slate-300 bg-slate-100 text-slate-700 font-medium">
                          Nem történt terhelés
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Actions column */}
                  <div className="flex flex-col gap-2 flex-shrink-0 md:min-w-[170px]">
                    {isPendingOrConfirmed && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setRescheduleBooking(b);
                            setNewDate(b.bookingDate);
                            setNewTime(b.bookingTime);
                          }}
                          className="w-full justify-start text-xs font-semibold"
                        >
                          <Calendar className="w-3.5 h-3.5 mr-1.5 text-primary" /> Átidőzítés
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setCancelTargetBooking(b)}
                          className="w-full justify-start text-xs font-semibold text-destructive hover:bg-destructive/10"
                        >
                          Lemondás
                        </Button>

                        {b.status === "CONFIRMED" && (
                          <div className="pt-1 flex flex-col gap-1.5 border-t border-border mt-1">
                            <a
                              href={googleCalUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:underline font-medium"
                            >
                              <ExternalLink className="w-3.5 h-3.5" /> Google Naptárhoz
                            </a>
                            <button
                              type="button"
                              onClick={() => downloadICalFile({
                                id: b.id,
                                title: `${b.serviceOffering?.name || 'Foglalás'} - ${b.provider?.displayName || ''}`,
                                details: `Beauty Lolit időpont. Szolgáltatás: ${b.serviceOffering?.name}`,
                                location: b.provider?.address || '',
                                dateStr: b.bookingDate,
                                timeStr: b.bookingTime,
                                durationMinutes: b.durationMinutes || 60,
                              })}
                              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground font-medium text-left"
                            >
                              <Download className="w-3.5 h-3.5" /> Letöltés iCal (.ics)
                            </button>
                          </div>
                        )}
                      </>
                    )}

                    {b.status === "COMPLETED" && (
                      <Button size="sm" variant="outline" onClick={() => setReviewBookingId(b.id)} className="w-full">
                        <Star className="w-3.5 h-3.5 mr-1 fill-amber-400 text-amber-400" /> Értékelés írása
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Reschedule Modal */}
      <Dialog open={!!rescheduleBooking} onOpenChange={(open) => !open && setRescheduleBooking(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Foglalás Átidőzítése</DialogTitle>
            <DialogDescription>
              Válassz új napot és szabad időpontot a(z) <span className="font-semibold text-foreground">{rescheduleBooking?.serviceOffering?.name}</span> szolgáltatásra!
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Új Dátum</label>
              <Input
                type="date"
                min={new Date().toISOString().split("T")[0]}
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-1.5 block">Új Időpont</label>
              <Select value={newTime} onValueChange={setNewTime}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {rescheduleSlots.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {isLoadingRescheduleSlots && <p className="mt-1 text-xs text-muted-foreground">Szabad időpontok frissítése…</p>}
              {!isLoadingRescheduleSlots && rescheduleSlots.length === 0 && <p className="mt-1 text-xs font-semibold text-amber-700">Erre a napra nincs szabad időpont.</p>}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setRescheduleBooking(null)}>Mégse</Button>
            <Button onClick={handleRescheduleSubmit} disabled={isRescheduling || !newDate || !newTime || isLoadingRescheduleSlots}>
              {isRescheduling ? "Átidőzítés..." : "Átidőzítés megerősítése"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancellation Warning Dialog */}
      <Dialog open={!!cancelTargetBooking} onOpenChange={(open) => !open && setCancelTargetBooking(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" /> Foglalás Lemondása
            </DialogTitle>
          </DialogHeader>

          {cancelTargetBooking && isWithin24Hours(cancelTargetBooking.bookingDate, cancelTargetBooking.bookingTime) ? (
            <div className="space-y-3 py-2">
              <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 text-amber-800 dark:text-amber-200 text-sm">
                <p className="font-bold mb-1">⚠️ 24 órán belüli lemondás!</p>
                <p className="text-xs">
                  A szolgáltató lemondási szabályzata alapján a 24 órán belüli lemondás esetén <strong>{cancelTargetBooking.provider?.cancellationFeePercent || 50}% lemondási díj</strong> kerülhet felszámításra ({formatPrice(Math.round(cancelTargetBooking.totalPrice * ((cancelTargetBooking.provider?.cancellationFeePercent || 50) / 100)))}).
                </p>
              </div>
              <p className="text-xs text-muted-foreground">Biztosan le szeretnéd mondani ezt az időpontot?</p>
            </div>
          ) : (
            <p className="text-sm py-2 text-muted-foreground">
              Biztosan le szeretnéd mondani ezt a foglalást a(z) <span className="font-semibold text-foreground">{cancelTargetBooking?.provider?.displayName}</span> szolgáltatónál?
            </p>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelTargetBooking(null)}>Mégse, megtartom</Button>
            <Button variant="destructive" onClick={() => confirmCancel(cancelTargetBooking)} disabled={cancelBooking.isPending || cancellingProviderBookingId === cancelTargetBooking?.id}>
              {cancelBooking.isPending || cancellingProviderBookingId === cancelTargetBooking?.id ? "Lemondás..." : "Igen, lemondom"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Review Dialog */}
      <Dialog open={!!reviewBookingId} onOpenChange={(open) => !open && setReviewBookingId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Értékelés írása</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <button key={i} type="button" onClick={() => setRating(i + 1)}>
                  <Star className={`w-7 h-7 ${i < rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground"}`} />
                </button>
              ))}
            </div>
            <Textarea placeholder="Milyen volt a tapasztalatod? (opcionális)" value={reviewText} onChange={(e) => setReviewText(e.target.value)} rows={4} maxLength={1000} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewBookingId(null)}>Mégse</Button>
            <Button onClick={handleReviewSubmit} disabled={createReview.isPending}>
              {createReview.isPending ? "Küldés..." : "Értékelés küldése"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
