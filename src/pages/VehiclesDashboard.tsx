import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Calendar,
  Clock,
  Plus,
  Trash,
  Check,
  X,
  Car,
  Users,
  MessageSquare,
  Star,
  RefreshCw,
  ArrowLeft,
  Mail,
  Phone,
  Settings
} from "lucide-react";
import {
  getVehicleSlots,
  saveVehicleSlots,
  getVehicleBookings,
  saveVehicleBookings,
  sendSimulatedSMS,
  VehicleSlot,
  VehicleBooking
} from "@/lib/smsSim";
import { MOCK_VEHICLES } from "./Vehicles";

export default function VehiclesDashboard() {
  const { toast } = useToast();

  // Data States
  const [slots, setSlots] = useState<VehicleSlot[]>([]);
  const [bookings, setBookings] = useState<VehicleBooking[]>([]);

  // Active configurations
  const [selectedVehicleId, setSelectedVehicleId] = useState(MOCK_VEHICLES[0].id);
  const [selectedDay, setSelectedDay] = useState("Hétfő");
  const [activeTab, setActiveTab] = useState<"slots" | "bookings" | "reviews">("slots");

  // New slot details
  const [newSlotStart, setNewSlotStart] = useState("09:00");
  const [newSlotEnd, setNewSlotEnd] = useState("10:00");
  const [newSlotType, setNewSlotType] = useState<"testdrive" | "viewing" | "consultation">("testdrive");

  // Review states
  const [ratedBookings, setRatedBookings] = useState<Record<string, { rating: number; comment: string }>>({});
  const [ratingInput, setRatingInput] = useState(5);
  const [commentInput, setCommentInput] = useState("");
  const [activeReviewBookingId, setActiveReviewBookingId] = useState<string | null>(null);

  // Load database
  useEffect(() => {
    setSlots(getVehicleSlots());
    setBookings(getVehicleBookings());

    const savedReviews = localStorage.getItem("ilolit_vehicle_reviews");
    if (savedReviews) {
      setRatedBookings(JSON.parse(savedReviews));
    }
  }, []);

  const selectedVehicle = MOCK_VEHICLES.find(v => v.id === selectedVehicleId) || MOCK_VEHICLES[0];

  // Add custom slot
  const handleAddSlot = (e: React.FormEvent) => {
    e.preventDefault();

    const newSlot: VehicleSlot = {
      id: `car-slot-${Date.now()}`,
      vehicleId: selectedVehicleId,
      day: selectedDay,
      startTime: newSlotStart,
      endTime: newSlotEnd,
      type: newSlotType,
      typeLabel: newSlotType === "testdrive" ? "Tesztvezetés" : newSlotType === "viewing" ? "Személyes megtekintés" : "Telefonos egyeztetés",
      isAvailable: true
    };

    const updated = [...slots, newSlot];
    setSlots(updated);
    saveVehicleSlots(updated);

    toast({
      title: "Új idősáv hozzáadva! 🟢",
      description: `${selectedDay} ${newSlotStart} - ${newSlotEnd} (${newSlot.typeLabel})`
    });
  };

  // Toggle slot availability
  const handleToggleSlot = (id: string) => {
    const updated = slots.map(s => s.id === id ? { ...s, isAvailable: !s.isAvailable } : s);
    setSlots(updated);
    saveVehicleSlots(updated);
    toast({ title: "Idősáv állapota frissítve" });
  };

  // Delete slot with conflict check
  const handleDeleteSlot = (id: string) => {
    const activeBooking = bookings.find(b => b.slotId === id && b.status !== "rejected");

    if (activeBooking) {
      const confirmDelete = window.confirm(
        `FIGYELEM! Erre a tesztvezetésre foglalás érkezett tőle: ${activeBooking.clientName}.\n` +
        `Ha törlöd a slotot, a foglalást elutasítjuk, és a vevőt automatikusan értesítjük (SMS).\n\n` +
        `Biztosan törlöd a foglalt idősávot?`
      );

      if (!confirmDelete) return;

      // Reject booking
      const updatedBookings = bookings.map(b =>
        b.id === activeBooking.id ? { ...b, status: "rejected" as const } : b
      );
      setBookings(updatedBookings);
      saveVehicleBookings(updatedBookings);

      // Send SMS
      sendSimulatedSMS(
        activeBooking.clientPhone,
        `ILOLIT Értesítés: Sajnáljuk, a(z) ${activeBooking.vehicleName} járműre lefoglalt tesztvezetés időpontod (${activeBooking.slotDay} ${activeBooking.slotTime}) az eladó által lemondásra került.`
      );
    }

    const updatedSlots = slots.filter(s => s.id !== id);
    setSlots(updatedSlots);
    saveVehicleSlots(updatedSlots);

    toast({ title: "Idősáv sikeresen törölve!" });
  };

  // Auto-generate timeslots
  const handleAutoGenerate = () => {
    const defaultTimes = [
      { start: "09:00", end: "10:30" },
      { start: "10:30", end: "12:00" },
      { start: "13:00", end: "14:30" },
      { start: "14:30", end: "16:00" },
      { start: "16:00", end: "17:30" }
    ];

    // Filter existing slots for this vehicle and day
    const cleanSlots = slots.filter(s => !(s.vehicleId === selectedVehicleId && s.day === selectedDay));

    const generated: VehicleSlot[] = defaultTimes.map((time, idx) => ({
      id: `car-slot-gen-${Date.now()}-${idx}`,
      vehicleId: selectedVehicleId,
      day: selectedDay,
      startTime: time.start,
      endTime: time.end,
      type: "testdrive",
      typeLabel: "Tesztvezetés",
      isAvailable: true
    }));

    const updated = [...cleanSlots, ...generated];
    setSlots(updated);
    saveVehicleSlots(updated);

    toast({
      title: "Idősávok generálva! ⚡",
      description: `${selectedDay} napra generáltunk ${generated.length} db tesztvezetés idősávot.`
    });
  };

  // Manage Bookings
  const handleBookingAction = (bookingId: string, action: "confirm" | "reject" | "cancel") => {
    const booking = bookings.find(b => b.id === bookingId);
    if (!booking) return;

    let newStatus: "confirmed" | "rejected" | "pending" = "pending";
    let clientMessage = "";
    let toastTitle = "";

    if (action === "confirm") {
      newStatus = "confirmed";
      toastTitle = "Foglalás jóváhagyva! ✅";
      clientMessage = `ILOLIT Visszaigazolás: A tesztvezetés foglalásod a(z) ${booking.vehicleName} járműre (${booking.slotDay} ${booking.slotTime}) jóváhagyásra került! Hirdető telefon: +36 20 123 4567.`;
    } else if (action === "reject") {
      newStatus = "rejected";
      toastTitle = "Foglalás elutasítva ❌";
      clientMessage = `ILOLIT Értesítés: Sajnáljuk, a tesztvezetés kérelmed a(z) ${booking.vehicleName} járműre (${booking.slotDay} ${booking.slotTime}) elutasításra került az eladó által.`;
    } else if (action === "cancel") {
      const confirmCancel = window.confirm("Biztosan lemondod ezt a megerősített tesztvezetést?");
      if (!confirmCancel) return;
      newStatus = "rejected";
      toastTitle = "Foglalás lemondva";
      clientMessage = `ILOLIT Értesítés: A lefoglalt tesztvezetésed a(z) ${booking.vehicleName} járműre (${booking.slotDay} ${booking.slotTime}) lemondásra került az eladó által.`;
    }

    const updated = bookings.map(b => b.id === bookingId ? { ...b, status: newStatus } : b);
    setBookings(updated);
    saveVehicleBookings(updated);

    // Send SMS
    sendSimulatedSMS(booking.clientPhone, clientMessage);

    toast({ title: toastTitle, description: `SMS kiküldve a vevőnek: ${booking.clientPhone}` });
  };

  // Review submit
  const handleRatingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeReviewBookingId) return;

    const updatedReviews = {
      ...ratedBookings,
      [activeReviewBookingId]: {
        rating: ratingInput,
        comment: commentInput
      }
    };
    setRatedBookings(updatedReviews);
    localStorage.setItem("ilolit_vehicle_reviews", JSON.stringify(updatedReviews));

    toast({ title: "Értékelés elküldve! ⭐", description: "Köszönjük a visszajelzést!" });
    setActiveReviewBookingId(null);
    setCommentInput("");
    setRatingInput(5);
  };

  const filteredSlots = slots.filter(s => s.vehicleId === selectedVehicleId && s.day === selectedDay);
  const filteredBookings = bookings.filter(b => b.vehicleId === selectedVehicleId);

  const daysOfWeek = ["Hétfő", "Kedd", "Szerda", "Csütörtök", "Péntek", "Szombat", "Vasárnap"];

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-6xl space-y-8">

        {/* Header Breadcrumb */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
              <Link href="/vehicles" className="hover:text-blue-600 flex items-center gap-1">
                <ArrowLeft className="w-3.5 h-3.5" /> Járművek
              </Link>
              <span>/</span>
              <span className="text-slate-900 dark:text-white">Jármű Naptár</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              <Car className="w-6 h-6 text-blue-600" />
              Jármű Naptár & Foglalások
            </h1>
          </div>

          {/* Vehicle Selector */}
          <div className="flex items-center gap-3">
            <span className="text-xs font-black uppercase text-slate-400">Jármű:</span>
            <select
              value={selectedVehicleId}
              onChange={(e) => setSelectedVehicleId(e.target.value)}
              className="px-4 py-2 border rounded-xl text-sm bg-white dark:bg-slate-900 font-extrabold focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              {MOCK_VEHICLES.map(v => (
                <option key={v.id} value={v.id}>{v.title}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Vehicle mini showcase */}
        <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-3xl border flex flex-col md:flex-row items-center gap-4">
          <div className="w-32 h-20 rounded-2xl overflow-hidden bg-slate-200 shrink-0">
            <img src={selectedVehicle.image} alt={selectedVehicle.title} className="w-full h-full object-cover" />
          </div>
          <div className="space-y-1 flex-1 text-center md:text-left">
            <h3 className="font-extrabold text-lg text-slate-900 dark:text-white">{selectedVehicle.title}</h3>
            <p className="text-xs font-semibold text-slate-500">{selectedVehicle.location} • {selectedVehicle.price}</p>
          </div>
          <Badge className="bg-blue-600 text-white font-extrabold text-xs shadow-sm">
            Márka: {selectedVehicle.brand} ({selectedVehicle.year})
          </Badge>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b pb-0.5">
          <button
            onClick={() => setActiveTab("slots")}
            className={`px-4 py-2 text-sm font-bold border-b-2 transition ${
              activeTab === "slots"
                ? "border-blue-600 text-blue-700 dark:text-blue-400 font-black"
                : "border-transparent text-slate-500 hover:text-slate-900"
            }`}
          >
            🗓️ Idősávok Beállítása
          </button>
          <button
            onClick={() => setActiveTab("bookings")}
            className={`px-4 py-2 text-sm font-bold border-b-2 transition relative ${
              activeTab === "bookings"
                ? "border-blue-600 text-blue-700 dark:text-blue-400 font-black"
                : "border-transparent text-slate-500 hover:text-slate-900"
            }`}
          >
            📋 Tesztvezetések
            {bookings.filter(b => b.vehicleId === selectedVehicleId && b.status === "pending").length > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-rose-600 text-white rounded-full flex items-center justify-center text-[10px] font-black animate-pulse">
                {bookings.filter(b => b.vehicleId === selectedVehicleId && b.status === "pending").length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("reviews")}
            className={`px-4 py-2 text-sm font-bold border-b-2 transition ${
              activeTab === "reviews"
                ? "border-blue-600 text-blue-700 dark:text-blue-400 font-black"
                : "border-transparent text-slate-500 hover:text-slate-900"
            }`}
          >
            ⭐ Visszajelzések
          </button>
        </div>

        {/* Tab 1: Slots Management */}
        {activeTab === "slots" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

            {/* Day Selector */}
            <div className="lg:col-span-1 space-y-6">
              <Card className="p-6 rounded-3xl border shadow-sm space-y-4">
                <h3 className="font-extrabold text-sm text-slate-900 dark:text-white uppercase tracking-wider">Nap kiválasztása</h3>

                <div className="flex flex-col gap-1.5">
                  {daysOfWeek.map((day) => {
                    const count = slots.filter(s => s.vehicleId === selectedVehicleId && s.day === day).length;
                    return (
                      <button
                        key={day}
                        onClick={() => setSelectedDay(day)}
                        className={`w-full px-4 py-2.5 rounded-xl text-left text-sm font-bold border flex items-center justify-between transition ${
                          selectedDay === day
                            ? "bg-blue-600 border-blue-600 text-white"
                            : "bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 hover:bg-slate-50"
                        }`}
                      >
                        <span>{day}</span>
                        <Badge className={`${selectedDay === day ? "bg-white text-blue-700" : "bg-slate-100 text-slate-700"} font-black`}>
                          {count} idősáv
                        </Badge>
                      </button>
                    );
                  })}
                </div>

                <div className="pt-2 border-t">
                  <Button
                    onClick={handleAutoGenerate}
                    className="w-full bg-slate-900 hover:bg-slate-800 text-white font-extrabold rounded-xl text-xs flex items-center justify-center gap-1.5"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Standard idősávok generálása
                  </Button>
                </div>
              </Card>

              {/* Add Custom Slot */}
              <Card className="p-6 rounded-3xl border shadow-sm space-y-4">
                <h3 className="font-extrabold text-sm text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Plus className="w-4 h-4 text-blue-600" />
                  Idősáv Hozzáadása
                </h3>

                <form onSubmit={handleAddSlot} className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase text-slate-400">Kezdet</label>
                      <input
                        type="time"
                        value={newSlotStart}
                        onChange={(e) => setNewSlotStart(e.target.value)}
                        className="w-full p-2 border rounded-xl text-sm font-bold dark:bg-slate-900"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase text-slate-400">Vége</label>
                      <input
                        type="time"
                        value={newSlotEnd}
                        onChange={(e) => setNewSlotEnd(e.target.value)}
                        className="w-full p-2 border rounded-xl text-sm font-bold dark:bg-slate-900"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400">Időpont Típusa</label>
                    <select
                      value={newSlotType}
                      onChange={(e) => setNewSlotType(e.target.value as any)}
                      className="w-full p-2 border rounded-xl text-sm font-bold dark:bg-slate-900"
                    >
                      <option value="testdrive">Tesztvezetés</option>
                      <option value="viewing">Személyes megtekintés</option>
                      <option value="consultation">Telefonos egyeztetés</option>
                    </select>
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-xl text-xs"
                  >
                    Hozzáadás a naptárhoz
                  </Button>
                </form>
              </Card>
            </div>

            {/* List of slots */}
            <div className="lg:col-span-2 space-y-4">
              <h3 className="font-extrabold text-lg text-slate-900 dark:text-white flex items-center gap-1.5">
                <Clock className="w-5 h-5 text-blue-600" />
                {selectedDay}i Idősávok ({filteredSlots.length} db)
              </h3>

              {filteredSlots.length === 0 ? (
                <div className="text-center py-16 bg-slate-50 dark:bg-slate-900 border border-dashed rounded-3xl">
                  <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <h4 className="text-sm font-extrabold text-slate-700 dark:text-slate-300">Nincsenek idősávok beállítva erre a napra</h4>
                  <p className="text-xs text-slate-400 mt-1">Generálj standard idősávokat az oldalsáv gombbal!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredSlots.map((slot) => {
                    const hasActiveBooking = bookings.find(b => b.slotId === slot.id && b.status !== "rejected");

                    return (
                      <div
                        key={slot.id}
                        className={`p-4 rounded-2xl bg-white dark:bg-slate-955 border transition flex items-center justify-between gap-4 ${
                          hasActiveBooking ? "border-amber-400 bg-amber-50/10" : "hover:border-slate-300"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-900 text-slate-650 flex items-center justify-center font-black text-sm">
                            🚗
                          </div>
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-extrabold text-slate-900 dark:text-white">
                                {slot.startTime} – {slot.endTime}
                              </span>
                              <Badge variant="outline" className="text-[10px] font-bold">
                                {slot.typeLabel}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-1.5">
                              {hasActiveBooking ? (
                                <span className="text-[11px] font-extrabold text-amber-600">
                                  ⚠️ Foglalva: {hasActiveBooking.clientName} ({hasActiveBooking.status === "confirmed" ? "Jóváhagyva" : "Visszaigazolásra vár"})
                                </span>
                              ) : (
                                <span className={`text-[11px] font-extrabold ${slot.isAvailable ? "text-emerald-600" : "text-rose-600"}`}>
                                  {slot.isAvailable ? "🟢 Szabad időpont" : "🔴 Nem foglalható"}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2">
                          <Button
                            onClick={() => handleToggleSlot(slot.id)}
                            variant="ghost"
                            size="sm"
                            className="rounded-xl text-xs font-bold"
                          >
                            {slot.isAvailable ? "Zárás" : "Nyitás"}
                          </Button>
                          <Button
                            onClick={() => handleDeleteSlot(slot.id)}
                            variant="ghost"
                            size="sm"
                            className="rounded-xl text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                          >
                            <Trash className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>
        )}

        {/* Tab 2: Bookings List */}
        {activeTab === "bookings" && (
          <div className="space-y-6">
            <h3 className="font-extrabold text-lg text-slate-900 dark:text-white flex items-center gap-1.5">
              <Users className="w-5 h-5 text-blue-600" />
              Tesztvezetési foglalások ({filteredBookings.length} db kérelem)
            </h3>

            {filteredBookings.length === 0 ? (
              <div className="text-center py-20 bg-slate-50 dark:bg-slate-900 border border-dashed rounded-3xl">
                <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h4 className="text-sm font-extrabold text-slate-700 dark:text-slate-300">Nincs foglalási kérelem a járműre</h4>
                <p className="text-xs text-slate-400">Amint a vevők tesztvezetést foglalnak a weboldalon, itt látni fogod.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredBookings.map((booking) => {
                  const isPending = booking.status === "pending";
                  const isConfirmed = booking.status === "confirmed";
                  const isRejected = booking.status === "rejected";

                  return (
                    <Card
                      key={booking.id}
                      className={`p-5 rounded-3xl border transition flex flex-col justify-between space-y-5 ${
                        isPending
                          ? "border-amber-400 bg-amber-50/5 shadow-md shadow-amber-100/50"
                          : isConfirmed
                          ? "border-emerald-200 bg-emerald-50/5"
                          : "opacity-60 border-slate-200"
                      }`}
                    >
                      <div className="space-y-4">
                        <div className="flex items-center justify-between border-b pb-2">
                          <span className="text-[10px] font-black text-slate-400">Azonosító: {booking.id}</span>
                          <Badge
                            className={`font-black text-xs ${
                              isPending
                                ? "bg-amber-100 text-amber-800 dark:bg-amber-950"
                                : isConfirmed
                                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950"
                                : "bg-rose-100 text-rose-800 dark:bg-rose-950"
                            }`}
                          >
                            {isPending ? "⏳ Függőben" : isConfirmed ? "✅ Megerősítve" : "❌ Elutasítva"}
                          </Badge>
                        </div>

                        <div className="space-y-1">
                          <div className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-1">
                            📅 {booking.slotDay} · {booking.slotTime}
                          </div>
                          <p className="text-xs text-slate-500 font-semibold">{booking.vehicleName}</p>
                        </div>

                        <div className="space-y-1.5 p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border text-xs">
                          <div className="font-extrabold text-slate-800 dark:text-slate-200">👤 {booking.clientName}</div>
                          <div className="text-slate-505 flex items-center gap-1 font-semibold">
                            <Phone className="w-3 h-3 text-blue-600" /> {booking.clientPhone}
                          </div>
                          <div className="text-slate-505 flex items-center gap-1 font-semibold">
                            <Mail className="w-3 h-3 text-blue-600" /> {booking.clientEmail}
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2 pt-2 border-t">
                        {isPending && (
                          <>
                            <Button
                              onClick={() => handleBookingAction(booking.id, "reject")}
                              variant="outline"
                              size="sm"
                              className="flex-1 rounded-xl text-xs font-bold border-rose-200 text-rose-600 hover:bg-rose-50"
                            >
                              <X className="w-3.5 h-3.5 mr-1" /> Elutasít
                            </Button>
                            <Button
                              onClick={() => handleBookingAction(booking.id, "confirm")}
                              size="sm"
                              className="flex-1 rounded-xl text-xs font-extrabold bg-blue-600 hover:bg-blue-700 text-white"
                            >
                              <Check className="w-3.5 h-3.5 mr-1" /> Elfogad
                            </Button>
                          </>
                        )}

                        {isConfirmed && (
                          <div className="w-full flex items-center justify-between gap-2">
                            <Button
                              onClick={() => handleBookingAction(booking.id, "cancel")}
                              variant="outline"
                              size="sm"
                              className="w-full rounded-xl text-xs font-bold border-slate-200 text-rose-600 hover:bg-rose-50"
                            >
                              Foglalás lemondása
                            </Button>
                            <Button
                              onClick={() => setActiveReviewBookingId(booking.id)}
                              size="sm"
                              className="rounded-xl text-xs font-bold bg-slate-900 text-white"
                            >
                              Értékelés
                            </Button>
                          </div>
                        )}

                        {isRejected && (
                          <span className="text-xs text-slate-400 font-semibold italic text-center w-full">Elutasított foglalás.</span>
                        )}
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Reviews */}
        {activeTab === "reviews" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="p-6 rounded-3xl border space-y-4">
              <h4 className="font-extrabold text-sm text-slate-950 dark:text-white uppercase tracking-wider">Visszajelzések a vevőktől</h4>

              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs">👤 Nagy Tibor (Vevő)</span>
                    <div className="flex text-amber-400">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} className="w-3.5 h-3.5 fill-current" />
                      ))}
                    </div>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                    „Minden a megbeszéltek szerint történt, az autó pont olyan állapotban volt, mint a hirdetésben. A tesztvezetés során minden funkciót ki tudtam próbálni.”
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-6 rounded-3xl border space-y-4">
              <h4 className="font-extrabold text-sm text-slate-950 dark:text-white uppercase tracking-wider">Vevők általam leadott értékelései</h4>

              <div className="space-y-4">
                {Object.keys(ratedBookings).length === 0 ? (
                  <p className="text-xs text-slate-400 font-semibold italic">Még nem értékeltél egyetlen tesztvezetést sem.</p>
                ) : (
                  Object.entries(ratedBookings).map(([bookingId, review]) => {
                    const booking = bookings.find(b => b.id === bookingId);
                    return (
                      <div key={bookingId} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs">👤 {booking?.clientName || "Vevő"} ({booking?.slotDay})</span>
                          <div className="flex text-amber-400">
                            {Array.from({ length: review.rating }).map((_, i) => (
                              <Star key={i} className="w-3.5 h-3.5 fill-current" />
                            ))}
                          </div>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                          {review.comment}
                        </p>
                      </div>
                    );
                  })
                )}
              </div>
            </Card>
          </div>
        )}

      </div>

      {/* Review Dialog */}
      {activeReviewBookingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-950 border rounded-3xl max-w-md w-full p-6 space-y-4 relative animate-in fade-in zoom-in-95 duration-150">
            <button
              onClick={() => setActiveReviewBookingId(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">Találkozó Értékelése</h3>
            <p className="text-xs text-slate-505 font-semibold">
              Mondd el a véleményed a vevő komolyságáról a tesztvezetés során!
            </p>

            <form onSubmit={handleRatingSubmit} className="space-y-4 pt-2">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400">Csillagok</label>
                <div className="flex gap-2 pt-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRatingInput(star)}
                      className={`w-9 h-9 rounded-xl border flex items-center justify-center text-sm font-black transition ${
                        ratingInput >= star
                          ? "bg-amber-100 border-amber-400 text-amber-600"
                          : "bg-slate-50 text-slate-400"
                      }`}
                    >
                      ★
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400">Visszajelzés</label>
                <textarea
                  value={commentInput}
                  onChange={(e) => setCommentInput(e.target.value)}
                  placeholder="Korrekt volt a vevő? Időben érkezett?..."
                  rows={3}
                  required
                  className="w-full p-3 border rounded-xl text-sm font-medium dark:bg-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="flex gap-3 justify-end pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setActiveReviewBookingId(null)}
                  className="rounded-xl text-xs font-bold"
                >
                  Mégse
                </Button>
                <Button
                  type="submit"
                  className="rounded-xl text-xs font-extrabold bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Értékelés mentése
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}
