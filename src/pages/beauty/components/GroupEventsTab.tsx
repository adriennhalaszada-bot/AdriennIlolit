import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Users2, Calendar, Clock, Plus, Trash2, BellRing, UserCheck, AlertCircle } from "lucide-react";
import { formatPrice } from "@/lib/constants";

export interface GroupEvent {
  id: string;
  title: string;
  description: string;
  date: string;
  timeSlot: string;
  maxCapacity: number;
  price: number;
  attendees: { name: string; email: string; phone: string; bookedAt: string }[];
  waitlist: { name: string; email: string; phone: string; joinedAt: string }[];
}

const mockGroupEvents: GroupEvent[] = [
  {
    id: "grp-1",
    title: "Balayage Technika & Otthoni Hajápolás Workshop",
    description: "Interaktív kiscsoportos bemutató a megfelelő hajápolásról és színmegőrzésről.",
    date: "2026-09-20",
    timeSlot: "14:00 - 17:00",
    maxCapacity: 6,
    price: 15000,
    attendees: [
      { name: "Kovács Anna", email: "anna@example.com", phone: "+36 30 111 2222", bookedAt: "2026-09-01" },
      { name: "Tóth Barbara", email: "barbara@example.com", phone: "+36 30 333 4444", bookedAt: "2026-09-02" },
      { name: "Molnár Cecil", email: "cecil@example.com", phone: "+36 30 555 6666", bookedAt: "2026-09-02" },
      { name: "Németh Dóra", email: "dora@example.com", phone: "+36 30 777 8888", bookedAt: "2026-09-03" },
      { name: "Varga Eszter", email: "eszter@example.com", phone: "+36 30 999 0000", bookedAt: "2026-09-03" },
      { name: "Fekete Flóra", email: "flora@example.com", phone: "+36 20 123 9999", bookedAt: "2026-09-04" },
    ],
    waitlist: [
      { name: "Gál Gizella", email: "gizella@example.com", phone: "+36 30 000 1111", joinedAt: "2026-09-04 15:30" },
    ],
  },
];

export function GroupEventsTab() {
  const { toast } = useToast();
  const [events, setEvents] = useState<GroupEvent[]>(mockGroupEvents);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [formTitle, setFormTitle] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formDate, setFormDate] = useState("");
  const [formTime, setFormTime] = useState("14:00 - 17:00");
  const [formCap, setFormCap] = useState("6");
  const [formPrice, setFormPrice] = useState("15000");

  const handleOpenAdd = () => {
    setFormTitle("");
    setFormDesc("");
    setFormDate("2026-09-25");
    setFormTime("14:00 - 17:00");
    setFormCap("6");
    setFormPrice("15000");
    setIsModalOpen(true);
  };

  const handleCreateEvent = () => {
    if (!formTitle.trim() || !formDate) {
      toast({ title: "Kérjük töltse ki a kötelező mezőket!", variant: "destructive" });
      return;
    }

    const newEv: GroupEvent = {
      id: `grp-${Date.now()}`,
      title: formTitle,
      description: formDesc,
      date: formDate,
      timeSlot: formTime,
      maxCapacity: parseInt(formCap) || 5,
      price: parseInt(formPrice) || 0,
      attendees: [],
      waitlist: [],
    };

    setEvents((prev) => [...prev, newEv]);
    toast({ title: "Új csoportos esemény létrehozva!" });
    setIsModalOpen(false);
  };

  const handleNotifyWaitlist = (eventId: string) => {
    toast({
      title: "Értesítések elküldve!",
      description: "Automatikus SMS és E-mail értesítés ment a várólistás vendégeknek a felszabadult helyről.",
    });
  };

  const handleDeleteEvent = (id: string) => {
    setEvents((prev) => prev.filter((e) => e.id !== id));
    toast({ title: "Esemény törölve." });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Users2 className="w-5 h-5 text-emerald-600" />
            <h2 className="text-lg font-extrabold text-slate-900">10. Csoportos Órák & Várólista</h2>
          </div>
          <p className="text-sm text-slate-500">
            Szervezzen csoportos bemutatókat, oktatásokat vagy workshopokat. A betelt eseményeknél az okos várólista automatikusan értesíti az érdeklődőket.
          </p>
        </div>
        <Button onClick={handleOpenAdd} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-2 rounded-xl shadow-md">
          <Plus className="w-4 h-4" /> Új csoportos esemény
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {events.map((ev) => {
          const isFull = ev.attendees.length >= ev.maxCapacity;
          return (
            <Card key={ev.id} className="p-6 border-slate-200 rounded-2xl shadow-sm bg-white">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4 pb-4 border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-extrabold text-lg text-slate-900">{ev.title}</h3>
                    {isFull ? (
                      <Badge className="bg-amber-100 text-amber-800 border-amber-300 font-bold">
                        FULL • Betelt
                      </Badge>
                    ) : (
                      <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 font-bold">
                        Szabad helyek elérhetőek
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-slate-600">{ev.description}</p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <span className="text-xs text-slate-400 font-bold uppercase block">Részvételi díj</span>
                    <span className="font-extrabold text-emerald-700 text-base">{formatPrice(ev.price)}</span>
                  </div>
                  <Button size="icon" variant="ghost" className="h-9 w-9 text-rose-500 hover:text-rose-700" onClick={() => handleDeleteEvent(ev.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <Calendar className="w-5 h-5 text-emerald-600" />
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Dátum</span>
                    <span className="font-bold text-slate-900 text-sm">{ev.date}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <Clock className="w-5 h-5 text-emerald-600" />
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Idősáv</span>
                    <span className="font-bold text-slate-900 text-sm">{ev.timeSlot}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <Users2 className="w-5 h-5 text-emerald-600" />
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Létszám keret</span>
                    <span className="font-bold text-slate-900 text-sm">
                      {ev.attendees.length} / {ev.maxCapacity} fő
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <h4 className="font-bold text-xs uppercase tracking-wide text-slate-700 flex items-center gap-1.5">
                    <UserCheck className="w-4 h-4 text-emerald-600" /> Jelentkezett résztvevők ({ev.attendees.length})
                  </h4>
                  <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 max-h-40 overflow-y-auto space-y-2">
                    {ev.attendees.map((att, i) => (
                      <div key={i} className="flex items-center justify-between text-xs py-1 border-b border-slate-200/50 last:border-0">
                        <span className="font-bold text-slate-900">{att.name}</span>
                        <span className="text-slate-500">{att.phone}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-xs uppercase tracking-wide text-amber-700 flex items-center gap-1.5">
                      <AlertCircle className="w-4 h-4 text-amber-600" /> Okos Várólista ({ev.waitlist.length} fő)
                    </h4>
                    {ev.waitlist.length > 0 && (
                      <Button size="sm" variant="outline" className="h-7 text-xs gap-1 font-bold text-amber-700 border-amber-300 hover:bg-amber-50" onClick={() => handleNotifyWaitlist(ev.id)}>
                        <BellRing className="w-3 h-3" /> Értesítés küldése
                      </Button>
                    )}
                  </div>

                  <div className="bg-amber-50/50 rounded-xl p-3 border border-amber-200/50 max-h-40 overflow-y-auto space-y-2">
                    {ev.waitlist.length === 0 ? (
                      <p className="text-xs text-slate-400 italic">Jelenleg nincs senki a várólistán.</p>
                    ) : (
                      ev.waitlist.map((wl, i) => (
                        <div key={i} className="flex items-center justify-between text-xs py-1 border-b border-amber-200/30 last:border-0">
                          <div>
                            <span className="font-bold text-slate-900 block">{wl.name}</span>
                            <span className="text-[10px] text-slate-400">{wl.joinedAt}</span>
                          </div>
                          <span className="text-amber-800 font-medium">{wl.phone}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-extrabold text-xl text-slate-900">
              Új csoportos esemény létrehozása
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Esemény megnevezése *</label>
              <Input
                placeholder="Pl. Hajápolás & Styling Mesterkurzus"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                className="rounded-xl"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Rövid leírás</label>
              <Textarea
                placeholder="Esemény részletei, témája..."
                value={formDesc}
                onChange={(e) => setFormDesc(e.target.value)}
                className="rounded-xl"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Dátum *</label>
                <Input
                  type="date"
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  className="rounded-xl"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Idősáv</label>
                <Input
                  placeholder="14:00 - 17:00"
                  value={formTime}
                  onChange={(e) => setFormTime(e.target.value)}
                  className="rounded-xl"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Max létszám (fő)</label>
                <Input
                  type="number"
                  placeholder="6"
                  value={formCap}
                  onChange={(e) => setFormCap(e.target.value)}
                  className="rounded-xl"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Ár / fő (Ft)</label>
                <Input
                  type="number"
                  placeholder="15000"
                  value={formPrice}
                  onChange={(e) => setFormPrice(e.target.value)}
                  className="rounded-xl"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsModalOpen(false)} className="rounded-xl font-bold">
              Mégse
            </Button>
            <Button onClick={handleCreateEvent} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl">
              Létrehozás
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
