import { useState, useEffect } from "react";
import { Layout } from "@/components/layout/Layout";
import { BeautyHeaderNav } from "@/components/beauty/BeautyHeaderNav";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Calendar as CalendarIcon, Clock, Plus, Trash2, CheckCircle2, XCircle, AlertCircle, Sparkles, UserCheck, Check, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const OFFICIAL_HOLIDAYS_2026 = [
  { date: "2026-01-01", name: "Újév" },
  { date: "2026-03-15", name: "1848-as Forradalom Ünnepe" },
  { date: "2026-04-03", name: "Nagypéntek" },
  { date: "2026-04-06", name: "Húsvéthétfő" },
  { date: "2026-05-01", name: "A Munka Ünnepe" },
  { date: "2026-05-25", name: "Pünkösdhétfő" },
  { date: "2026-08-20", name: "Szent István Napja" },
  { date: "2026-10-23", name: "1956-os Forradalom Ünnepe" },
  { date: "2026-11-01", name: "Mindenszentek" },
  { date: "2026-12-25", name: "Karácsony" },
  { date: "2026-12-26", name: "Karácsony másnapja" }
];

export function InteractiveCalendarBookingApp() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"calendar" | "restdays" | "admin" | "guest">("calendar");
  const [currentDate, setCurrentDate] = useState<Date>(new Date());

  // LocalStorage Persistence
  const [events, setEvents] = useState<any[]>(() => {
    const local = localStorage.getItem("ilolit_events");
    return local ? JSON.parse(local) : [
      { id: 'ev-1', title: 'Üzleti Stratégia Megbeszélés', start: '2026-08-20T10:00', end: '2026-08-20T11:30', category: 'Munka', color: '#4f46e5' },
      { id: 'ev-2', title: 'Fodrász Időpont', start: '2026-08-21T14:00', end: '2026-08-21T15:30', category: 'Szolgáltatás', color: '#059669' }
    ];
  });

  const [restDays, setRestDays] = useState<any[]>(() => {
    const local = localStorage.getItem("ilolit_restdays");
    return local ? JSON.parse(local) : [
      { id: 'rd-1', type: 'single', date: '2026-08-20', title: 'Nemzeti Ünnep' },
      { id: 'rd-2', type: 'range', startDate: '2026-12-24', endDate: '2027-01-01', title: 'Téli Szabadság' }
    ];
  });

  const [providerSlots, setProviderSlots] = useState<any[]>(() => {
    const local = localStorage.getItem("ilolit_provider_slots");
    return local ? JSON.parse(local) : [
      { id: 'sl-1', date: '2026-08-20', start: '08:00', end: '09:30', serviceName: 'Női Hajvágás & Szárítás', status: 'FREE' },
      { id: 'sl-2', date: '2026-08-20', start: '10:00', end: '11:30', serviceName: 'Balayage Festés', status: 'CONFIRMED_ONLINE', guestName: 'Kiss Mária', guestPhone: '+36301112233' },
      { id: 'sl-3', date: '2026-08-20', start: '14:00', end: '15:30', serviceName: 'Alap hajvágás', status: 'PENDING', guestName: 'Nagy Gábor', guestPhone: '+36209988776' },
      { id: 'sl-4', date: '2026-08-21', start: '09:00', end: '10:30', serviceName: 'Női Hajvágás', status: 'FREE' }
    ];
  });

  useEffect(() => { localStorage.setItem("ilolit_events", JSON.stringify(events)); }, [events]);
  useEffect(() => { localStorage.setItem("ilolit_restdays", JSON.stringify(restDays)); }, [restDays]);
  useEffect(() => { localStorage.setItem("ilolit_provider_slots", JSON.stringify(providerSlots)); }, [providerSlots]);

  // Modal states
  const [eventModalOpen, setEventModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<any | null>(null);
  const [eventTitle, setEventTitle] = useState("");
  const [eventStart, setEventStart] = useState("");
  const [eventEnd, setEventEnd] = useState("");
  const [eventCategory, setEventCategory] = useState("Munka");
  const [eventColor, setEventColor] = useState("#4f46e5");

  // Admin slot state
  const [adminDate, setAdminDate] = useState(() => formatDateKey(new Date()));
  const [slotStart, setSlotStart] = useState("09:00");
  const [slotEnd, setSlotEnd] = useState("10:30");
  const [slotServiceName, setSlotServiceName] = useState("");

  // Guest booking modal
  const [guestModalOpen, setGuestModalOpen] = useState(false);
  const [guestBookingSlot, setGuestBookingSlot] = useState<any | null>(null);
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestPhone, setGuestPhone] = useState("");

  function formatDateKey(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  function checkIsRestDay(dateObj: Date) {
    const dateStr = formatDateKey(dateObj);
    const isOfficial = OFFICIAL_HOLIDAYS_2026.find(h => h.date === dateStr);
    if (isOfficial) return { isRest: true, title: `Ünnep: ${isOfficial.name}` };

    for (const rd of restDays) {
      if (rd.type === 'single' && rd.date === dateStr) return { isRest: true, title: rd.title };
      if (rd.type === 'range' && dateStr >= rd.startDate && dateStr <= rd.endDate) return { isRest: true, title: rd.title };
      if (rd.type === 'recurring_weekly' && dateObj.getDay() === parseInt(rd.dayOfWeek)) return { isRest: true, title: rd.title };
      if (rd.type === 'recurring_monthly' && dateObj.getDate() === parseInt(rd.dayOfMonth)) return { isRest: true, title: rd.title };
    }

    return { isRest: false, title: '' };
  }

  const openNewEventModal = (dateStr?: string) => {
    setEditingEvent(null);
    setEventTitle("");
    setEventStart(`${dateStr || formatDateKey(new Date())}T10:00`);
    setEventEnd(`${dateStr || formatDateKey(new Date())}T11:00`);
    setEventCategory("Munka");
    setEventColor("#4f46e5");
    setEventModalOpen(true);
  };

  const handleSaveEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingEvent) {
      setEvents(events.map(ev => ev.id === editingEvent.id ? { ...ev, title: eventTitle, start: eventStart, end: eventEnd, category: eventCategory, color: eventColor } : ev));
      toast({ title: "Esemény módosítva!" });
    } else {
      setEvents([...events, { id: `ev-${Date.now()}`, title: eventTitle, start: eventStart, end: eventEnd, category: eventCategory, color: eventColor }]);
      toast({ title: "Új esemény mentve!" });
    }
    setEventModalOpen(false);
  };

  const handleDeleteEvent = () => {
    if (editingEvent) {
      setEvents(events.filter(ev => ev.id !== editingEvent.id));
      toast({ title: "Esemény törölve!" });
      setEventModalOpen(false);
    }
  };

  const handleAdminAddSlot = (e: React.FormEvent) => {
    e.preventDefault();
    setProviderSlots([...providerSlots, {
      id: `sl-${Date.now()}`,
      date: adminDate,
      start: slotStart,
      end: slotEnd,
      serviceName: slotServiceName || "Szolgáltatási idősáv",
      status: "FREE"
    }]);
    toast({ title: "🟢 Új idősáv hozzáadva!" });
  };

  const handleGuestSubmitBooking = (e: React.FormEvent) => {
    e.preventDefault();
    if (!guestBookingSlot) return;

    setProviderSlots(providerSlots.map(s => {
      if (s.id === guestBookingSlot.id) {
        return { ...s, status: "PENDING", guestName, guestEmail, guestPhone };
      }
      return s;
    }));

    toast({ title: "⏳ Foglalási kérelem elküldve!", description: "A foglalás függőben van a szolgáltató jóváhagyásáig." });
    setGuestModalOpen(false);
  };

  return (
    <Layout>
      <BeautyHeaderNav activeTab="calendar" />
      <div className="container mx-auto px-4 py-8 max-w-6xl space-y-8">
        {/* Top Header */}
        <div className="bg-slate-900 text-white p-6 sm:p-8 rounded-3xl shadow-xl flex flex-col md:flex-row items-center justify-between gap-6 border border-slate-800">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-3xl shadow-inner">
              📅
            </div>
            <div>
              <div className="flex items-center gap-2">
                <Badge className="bg-indigo-500 text-white font-extrabold text-[10px] uppercase">Interaktív Rendszer</Badge>
                <span className="text-xs text-indigo-300 font-semibold">Magyar Naptár & Időpontfoglaló</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white mt-1">Interaktív Naptár & Foglalási Központ</h1>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 bg-white/10 p-1.5 rounded-2xl border border-white/10">
            <Button
              variant={activeTab === "calendar" ? "secondary" : "ghost"}
              onClick={() => setActiveTab("calendar")}
              className="text-xs font-bold rounded-xl"
            >
              📅 1. Naptár nézet
            </Button>
            <Button
              variant={activeTab === "restdays" ? "secondary" : "ghost"}
              onClick={() => setActiveTab("restdays")}
              className="text-xs font-bold rounded-xl"
            >
              🌴 2. Szabadnapok
            </Button>
            <Button
              variant={activeTab === "admin" ? "secondary" : "ghost"}
              onClick={() => setActiveTab("admin")}
              className="text-xs font-bold rounded-xl"
            >
              💼 3. Szolgáltatói Admin
            </Button>
            <Button
              variant={activeTab === "guest" ? "secondary" : "ghost"}
              onClick={() => setActiveTab("guest")}
              className="text-xs font-bold rounded-xl"
            >
              🌸 4. Vendég Nézet
            </Button>
          </div>
        </div>

        {/* TAB 1: CALENDAR VIEW */}
        {activeTab === "calendar" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border shadow-sm">
              <div className="flex items-center gap-4">
                <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))}>
                  ← Előző
                </Button>
                <h2 className="text-xl font-extrabold text-slate-900">
                  {currentDate.getFullYear()}. {["Január", "Február", "Március", "Április", "Május", "Június", "Július", "Augusztus", "Szeptember", "Október", "November", "December"][currentDate.getMonth()]}
                </h2>
                <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))}>
                  Következő →
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setCurrentDate(new Date())} className="text-indigo-600 font-bold">
                  Ma
                </Button>
              </div>

              <Button onClick={() => openNewEventModal()} className="gap-2 font-bold shadow-md bg-indigo-600 hover:bg-indigo-700 text-white">
                <Plus className="w-4 h-4" /> Új Időpont / Esemény
              </Button>
            </div>

            {/* Calendar Legend */}
            <div className="flex flex-wrap gap-4 text-xs font-semibold px-2 text-slate-600">
              <span className="flex items-center gap-1.5"><span className="w-3.5 h-3.5 rounded-md bg-indigo-600"></span> Mai nap</span>
              <span className="flex items-center gap-1.5"><span className="w-3.5 h-3.5 rounded-md bg-slate-200"></span> Hétvége</span>
              <span className="flex items-center gap-1.5"><span className="w-3.5 h-3.5 rounded-md bg-rose-100 border border-rose-300"></span> Munkaszüneti / Szabadnap</span>
              <span className="flex items-center gap-1.5"><span className="w-3.5 h-3.5 rounded-md bg-emerald-500"></span> Szolgáltatói szabad idősáv</span>
            </div>

            {/* Calendar Grid */}
            <Card className="p-0 overflow-hidden shadow-xl rounded-3xl border border-slate-200">
              <div className="grid grid-cols-7 bg-slate-50 border-b text-center text-xs font-extrabold text-slate-500 py-3 uppercase">
                <div>Hétfő</div><div>Kedd</div><div>Szerda</div><div>Csütörtök</div><div>Péntek</div><div className="text-slate-800">Szombat</div><div className="text-slate-800">Vasárnap</div>
              </div>

              <div className="grid grid-cols-7 divide-x divide-y divide-slate-100 min-h-[500px]">
                {(() => {
                  const year = currentDate.getFullYear();
                  const month = currentDate.getMonth();
                  const firstDay = new Date(year, month, 1);
                  let startDay = firstDay.getDay();
                  if (startDay === 0) startDay = 7;
                  const daysInMonth = new Date(year, month + 1, 0).getDate();
                  const today = new Date();

                  const cells = [];
                  for (let i = 1; i < startDay; i++) {
                    cells.push(<div key={`empty-${i}`} className="bg-slate-50/40 min-h-[120px]" />);
                  }

                  for (let d = 1; d <= daysInMonth; d++) {
                    const cellDate = new Date(year, month, d);
                    const dateStr = formatDateKey(cellDate);
                    const isWeekend = cellDate.getDay() === 0 || cellDate.getDay() === 6;
                    const restInfo = checkIsRestDay(cellDate);
                    const isToday = formatDateKey(today) === dateStr;

                    const dayEvents = events.filter(e => e.start.startsWith(dateStr));
                    const daySlots = providerSlots.filter(s => s.date === dateStr && s.status === "FREE");

                    cells.push(
                      <div
                        key={d}
                        onClick={() => openNewEventModal(dateStr)}
                        className={`p-2 min-h-[120px] transition cursor-pointer border-b border-r flex flex-col justify-between ${
                          isToday ? "bg-indigo-50/60 ring-2 ring-indigo-500 ring-inset" : restInfo.isRest ? "bg-rose-50/70" : isWeekend ? "bg-slate-50" : "bg-white"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className={`text-xs font-black px-2 py-0.5 rounded-full ${isToday ? "bg-indigo-600 text-white" : "text-slate-800"}`}>
                            {d}
                          </span>
                          {restInfo.isRest && (
                            <span className="text-[10px] font-extrabold text-rose-700 bg-rose-100 px-1.5 py-0.5 rounded truncate max-w-[80px]">
                              {restInfo.title}
                            </span>
                          )}
                        </div>

                        <div className="space-y-1 my-1">
                          {dayEvents.map(ev => (
                            <div
                              key={ev.id}
                              style={{ backgroundColor: ev.color }}
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingEvent(ev);
                                setEventTitle(ev.title);
                                setEventStart(ev.start);
                                setEventEnd(ev.end);
                                setEventCategory(ev.category || "Munka");
                                setEventColor(ev.color || "#4f46e5");
                                setEventModalOpen(true);
                              }}
                              className="text-[11px] font-bold p-1 rounded-md text-white shadow-sm truncate"
                            >
                              {ev.start.split('T')[1]} {ev.title}
                            </div>
                          ))}

                          {daySlots.length > 0 && (
                            <div className="text-[10px] font-black text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded border border-emerald-300">
                              🟢 {daySlots.length} Szabad idősáv
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  }

                  return cells;
                })()}
              </div>
            </Card>
          </div>
        )}

        {/* TAB 2: REST DAYS */}
        {activeTab === "restdays" && (
          <div className="grid md:grid-cols-3 gap-6">
            <Card className="p-6 space-y-4">
              <h3 className="text-base font-bold text-slate-900">🌴 Szabadnapok & Ünnepek Beállítása</h3>
              <p className="text-xs text-muted-foreground">Adj hozzá egyéni szabadságot vagy ismétlődő pihenőnapokat.</p>
              <form onSubmit={(e) => {
                e.preventDefault();
                const form = e.target as any;
                const type = form.type.value;
                const title = form.title.value;
                const newRest: any = { id: `rd-${Date.now()}`, type, title };
                if (type === "single") newRest.date = form.date.value;
                if (type === "range") { newRest.startDate = form.startDate.value; newRest.endDate = form.endDate.value; }
                setRestDays([...restDays, newRest]);
                toast({ title: "🌴 Szabadnap elmentve!" });
              }} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold mb-1">Típus:</label>
                  <select name="type" className="w-full rounded-xl border p-2 text-xs font-semibold">
                    <option value="single">Egyedi Dátum (2026-08-20)</option>
                    <option value="range">Időintervallum (2026-12-24 – 2027-01-01)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1">Dátum / Kezdő Dátum:</label>
                  <Input type="date" name="startDate" defaultValue={formatDateKey(new Date())} className="text-xs font-semibold" />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1">Záró Dátum (ha intervallum):</label>
                  <Input type="date" name="endDate" defaultValue={formatDateKey(new Date())} className="text-xs font-semibold" />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1">Megnevezés:</label>
                  <Input type="text" name="title" required placeholder="pl. Nyári szünet" className="text-xs font-semibold" />
                </div>
                <Button type="submit" className="w-full font-bold text-xs bg-indigo-600 hover:bg-indigo-700 text-white">
                  + Szabadnap Mentése
                </Button>
              </form>
            </Card>

            <div className="md:col-span-2 space-y-6">
              <Card className="p-6 space-y-4">
                <h3 className="text-base font-bold text-slate-900 flex items-center justify-between">
                  <span>🇭🇺 Hivatalos Magyar Munkaszüneti Napok (2026)</span>
                  <Badge variant="secondary">Beépített</Badge>
                </h3>
                <div className="grid sm:grid-cols-2 gap-3 text-xs">
                  {OFFICIAL_HOLIDAYS_2026.map(h => (
                    <div key={h.date} className="p-3 bg-slate-50 border rounded-xl flex items-center justify-between font-semibold">
                      <span>{h.date}</span>
                      <span className="text-rose-700 font-extrabold">{h.name}</span>
                    </div>
                  ))}
                </div>
              </Card>

              <Card className="p-6 space-y-4">
                <h3 className="text-base font-bold text-slate-900">Beállított Egyéni Szabadnapok</h3>
                <div className="space-y-2 text-xs">
                  {restDays.map(rd => (
                    <div key={rd.id} className="p-3 bg-slate-50 border rounded-xl flex items-center justify-between font-semibold">
                      <div>
                        <div className="font-bold text-slate-900">{rd.title}</div>
                        <div className="text-slate-500 text-[11px]">{rd.type === 'single' ? rd.date : `${rd.startDate} – ${rd.endDate}`}</div>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => setRestDays(restDays.filter(r => r.id !== rd.id))} className="text-rose-600 hover:bg-rose-50 text-xs font-bold">
                        Törlés
                      </Button>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </div>
        )}

        {/* TAB 3: PROVIDER ADMIN */}
        {activeTab === "admin" && (
          <div className="space-y-6">
            <div className="bg-emerald-950 text-white p-6 rounded-3xl border border-emerald-800 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <Badge className="bg-emerald-800 text-emerald-300 font-bold mb-1">Szolgáltatói Admin</Badge>
                <h2 className="text-2xl font-black">Kata Hajstúdió & Szalon Idősáv Kezelő</h2>
              </div>
              <Input type="date" value={adminDate} onChange={(e) => setAdminDate(e.target.value)} className="w-auto bg-white/10 border-white/20 text-white font-bold text-xs" />
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              <Card className="p-6 space-y-4">
                <h3 className="text-base font-bold text-slate-900">➕ Új Elérhetőségi Idősáv</h3>
                <form onSubmit={handleAdminAddSlot} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold mb-1">Dátum:</label>
                    <Input type="date" value={adminDate} onChange={(e) => setAdminDate(e.target.value)} className="text-xs font-semibold" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-bold mb-1">Kezdés:</label>
                      <Input type="time" value={slotStart} onChange={(e) => setSlotStart(e.target.value)} className="text-xs font-semibold" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold mb-1">Befejezés:</label>
                      <Input type="time" value={slotEnd} onChange={(e) => setSlotEnd(e.target.value)} className="text-xs font-semibold" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold mb-1">Szolgáltatás Neve:</label>
                    <Input type="text" value={slotServiceName} onChange={(e) => setSlotServiceName(e.target.value)} placeholder="pl. Balayage Festés" className="text-xs font-semibold" />
                  </div>
                  <Button type="submit" className="w-full font-bold text-xs bg-emerald-600 hover:bg-emerald-700 text-white">
                    + Idősáv Rögzítése
                  </Button>
                </form>
              </Card>

              <div className="md:col-span-2">
                <Card className="p-6 space-y-4">
                  <h3 className="text-base font-bold text-slate-900 border-b pb-3">Idősávok ezen a napon: {adminDate}</h3>
                  <div className="space-y-3">
                    {providerSlots.filter(s => s.date === adminDate).length === 0 ? (
                      <p className="text-slate-400 text-xs py-8 text-center border border-dashed rounded-2xl">Még nincs rögzített idősáv erre a napra.</p>
                    ) : (
                      providerSlots.filter(s => s.date === adminDate).map(s => (
                        <div key={s.id} className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${s.status === "PENDING" ? "border-amber-300 bg-amber-50/60" : "border-slate-200 bg-white"}`}>
                          <div>
                            <div className="flex items-center gap-3 mb-1">
                              <span className="text-lg font-black text-slate-900">{s.start} – {s.end}</span>
                              {s.status === "FREE" && <Badge className="bg-emerald-100 text-emerald-800 font-black text-xs">🟢 SZABAD</Badge>}
                              {s.status === "CONFIRMED_MANUAL" && <Badge className="bg-rose-100 text-rose-800 font-black text-xs">🔴 FOGLALT (manuális)</Badge>}
                              {s.status === "CONFIRMED_ONLINE" && <Badge className="bg-rose-600 text-white font-black text-xs">🔴 FOGLALT (online)</Badge>}
                              {s.status === "PENDING" && <Badge className="bg-amber-100 text-amber-800 font-black text-xs animate-pulse">⏳ FÜGGŐBEN</Badge>}
                            </div>
                            <div className="text-xs font-bold text-slate-600">{s.serviceName}</div>
                            {s.guestName && <div className="text-xs text-indigo-700 font-semibold mt-1">Vendég: {s.guestName} ({s.guestPhone})</div>}
                          </div>

                          <div className="flex flex-wrap gap-2">
                            {s.status === "PENDING" && (
                              <>
                                <Button size="sm" onClick={() => {
                                  setProviderSlots(providerSlots.map(x => x.id === s.id ? { ...x, status: "CONFIRMED_ONLINE" } : x));
                                  toast({ title: "✅ Foglalás jóváhagyva!" });
                                }} className="bg-emerald-600 text-white text-xs font-extrabold">✓ Jóváhagyás</Button>
                                <Button size="sm" variant="destructive" onClick={() => {
                                  setProviderSlots(providerSlots.map(x => x.id === s.id ? { ...x, status: "FREE", guestName: null } : x));
                                  toast({ title: "🔴 Foglalás elutasítva!" });
                                }} className="text-xs font-extrabold">✕ Elutasítás</Button>
                              </>
                            )}

                            {s.status === "FREE" && (
                              <Button size="sm" variant="outline" onClick={() => setProviderSlots(providerSlots.map(x => x.id === s.id ? { ...x, status: "CONFIRMED_MANUAL" } : x))} className="text-xs font-bold">
                                🔴 Jelölés Foglaltként
                              </Button>
                            )}

                            {s.status === "CONFIRMED_MANUAL" && (
                              <Button size="sm" variant="outline" onClick={() => setProviderSlots(providerSlots.map(x => x.id === s.id ? { ...x, status: "FREE" } : x))} className="text-xs font-bold text-emerald-700 border-emerald-300">
                                🟢 Jelölés Szabadként
                              </Button>
                            )}

                            <Button size="sm" variant="ghost" onClick={() => setProviderSlots(providerSlots.filter(x => x.id !== s.id))} className="text-rose-600 hover:bg-rose-50">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </Card>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: GUEST VIEW */}
        {activeTab === "guest" && (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-violet-900 to-indigo-900 text-white p-8 rounded-3xl shadow-xl flex flex-col sm:flex-row items-center justify-between gap-6 border border-violet-700">
              <div>
                <Badge className="bg-violet-500/30 text-violet-200 font-extrabold text-xs mb-1">Vendég Időpontfoglalás</Badge>
                <h2 className="text-3xl font-black">Kata Hajstúdió & Szalon</h2>
                <p className="text-xs text-violet-200 mt-1">Válassz a közzétett szabad időpontok közül!</p>
              </div>
              <Input type="date" value={adminDate} onChange={(e) => setAdminDate(e.target.value)} className="w-auto bg-white/10 border-white/20 text-white font-bold text-xs" />
            </div>

            <Card className="p-8 space-y-6">
              <h3 className="text-lg font-bold text-slate-900">Elérhető Szabad Időpontok: {adminDate}</h3>
              <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
                {providerSlots.filter(s => s.date === adminDate && s.status === "FREE").length === 0 ? (
                  <p className="col-span-full text-slate-400 text-xs py-12 text-center border border-dashed rounded-3xl">Ezen a napon nincsenek szabad időpontok.</p>
                ) : (
                  providerSlots.filter(s => s.date === adminDate && s.status === "FREE").map(s => (
                    <div key={s.id} className="p-5 rounded-3xl border border-slate-200 bg-white hover:border-violet-500 hover:shadow-lg transition space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xl font-black text-slate-900">{s.start} – {s.end}</span>
                        <Badge className="bg-emerald-100 text-emerald-800 font-black text-[10px]">SZABAD</Badge>
                      </div>
                      <div className="text-xs font-extrabold text-violet-700">{s.serviceName}</div>
                      <Button onClick={() => {
                        setGuestBookingSlot(s);
                        setGuestModalOpen(true);
                      }} className="w-full bg-violet-600 hover:bg-violet-700 text-white font-extrabold text-xs">
                        Foglalás erre az időpontra →
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </div>
        )}
      </div>

      {/* Add / Edit Event Dialog */}
      <Dialog open={eventModalOpen} onOpenChange={setEventModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingEvent ? "Időpont Szerkesztése" : "Új Időpont / Esemény Hozzáadása"}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSaveEvent} className="space-y-4 py-2">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Cím / Esemény Neve *</label>
              <Input type="text" required value={eventTitle} onChange={(e) => setEventTitle(e.target.value)} placeholder="pl. Üzleti megbeszélés" className="text-xs font-semibold" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Kezdő Idő *</label>
                <Input type="datetime-local" required value={eventStart} onChange={(e) => setEventStart(e.target.value)} className="text-xs font-semibold" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Záró Idő *</label>
                <Input type="datetime-local" required value={eventEnd} onChange={(e) => setEventEnd(e.target.value)} className="text-xs font-semibold" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Kategória</label>
                <Select value={eventCategory} onValueChange={setEventCategory}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Munka">💼 Munka</SelectItem>
                    <SelectItem value="Magán">🏠 Magán</SelectItem>
                    <SelectItem value="Szolgáltatás">🌸 Szolgáltatás</SelectItem>
                    <SelectItem value="Egyéb">📌 Egyéb</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Szín</label>
                <input type="color" value={eventColor} onChange={(e) => setEventColor(e.target.value)} className="w-full h-10 rounded-xl border p-1 cursor-pointer" />
              </div>
            </div>

            <DialogFooter className="gap-2 pt-4">
              {editingEvent && (
                <Button type="button" variant="destructive" onClick={handleDeleteEvent} className="text-xs font-bold">Törlés</Button>
              )}
              <Button type="button" variant="outline" onClick={() => setEventModalOpen(false)}>Mégse</Button>
              <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs">Mentés</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Guest Booking Dialog */}
      <Dialog open={guestModalOpen} onOpenChange={setGuestModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Foglalás megerősítése</DialogTitle>
          </DialogHeader>

          {guestBookingSlot && (
            <form onSubmit={handleGuestSubmitBooking} className="space-y-4 py-2">
              <div className="bg-indigo-50 border border-indigo-200 p-3 rounded-2xl text-xs space-y-1">
                <div className="font-bold text-indigo-900">{guestBookingSlot.serviceName}</div>
                <div className="text-indigo-700 font-semibold">{guestBookingSlot.date} · {guestBookingSlot.start} – {guestBookingSlot.end}</div>
              </div>

              <div>
                <label className="block text-xs font-bold mb-1">Neved *</label>
                <Input type="text" required value={guestName} onChange={(e) => setGuestName(e.target.value)} placeholder="Kovács Anna" className="text-xs font-semibold" />
              </div>

              <div>
                <label className="block text-xs font-bold mb-1">Telefonszámod *</label>
                <Input type="tel" required value={guestPhone} onChange={(e) => setGuestPhone(e.target.value)} placeholder="+36 30 123 4567" className="text-xs font-semibold" />
              </div>

              <DialogFooter className="pt-4">
                <Button type="button" variant="outline" onClick={() => setGuestModalOpen(false)}>Mégse</Button>
                <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs">Foglalási Kérelem Küldése</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
