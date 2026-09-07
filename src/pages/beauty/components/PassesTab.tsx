import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Ticket, Plus, Trash2, Pencil, CheckCircle2, UserCheck, Calendar, RefreshCw } from "lucide-react";
import { formatPrice } from "@/lib/constants";
import type { BeautyServiceOffering } from "@workspace/api-client-react";

export interface BeautyPassTemplate {
  id: string;
  name: string;
  serviceName: string;
  totalSessions: number; // 0 means unlimited
  validityDays: number;
  price: number;
  isActive: boolean;
}

export interface ClientPass {
  id: string;
  clientName: string;
  clientEmail: string;
  passName: string;
  remainingSessions: number;
  totalSessions: number;
  expiryDate: string;
  purchaseDate: string;
}

const mockInitialPasses: BeautyPassTemplate[] = [
  {
    id: "pass-1",
    name: "5 Alkalmas Női Hajvágás & Szárítás Bérlet",
    serviceName: "Női Hajvágás & Szárítás",
    totalSessions: 5,
    validityDays: 180,
    price: 55000,
    isActive: true,
  },
  {
    id: "pass-2",
    name: "VIP Korlátlan Balayage Ápolási Bérlet (90 nap)",
    serviceName: "Balayage Festés & Ápolás",
    totalSessions: 0,
    validityDays: 90,
    price: 89000,
    isActive: true,
  },
];

const mockInitialClientPasses: ClientPass[] = [
  {
    id: "cp-1",
    clientName: "Szabó Erzsébet",
    clientEmail: "erzsebet@example.com",
    passName: "5 Alkalmas Női Hajvágás & Szárítás Bérlet",
    remainingSessions: 3,
    totalSessions: 5,
    expiryDate: "2026-12-31",
    purchaseDate: "2026-08-01",
  },
];

interface PassesTabProps {
  services: BeautyServiceOffering[];
}

export function PassesTab({ services }: PassesTabProps) {
  const { toast } = useToast();
  const [passTemplates, setPassTemplates] = useState<BeautyPassTemplate[]>(mockInitialPasses);
  const [clientPasses, setClientPasses] = useState<ClientPass[]>(mockInitialClientPasses);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPass, setEditingPass] = useState<BeautyPassTemplate | null>(null);

  const [formName, setFormName] = useState("");
  const [formService, setFormService] = useState("");
  const [formSessions, setFormSessions] = useState("5");
  const [formValidityDays, setFormValidityDays] = useState("90");
  const [formPrice, setFormPrice] = useState("50000");

  const handleOpenAdd = () => {
    setEditingPass(null);
    setFormName("");
    setFormService(services[0]?.name || "Összes szolgáltatás");
    setFormSessions("5");
    setFormValidityDays("90");
    setFormPrice("50000");
    setIsModalOpen(true);
  };

  const handleSavePass = () => {
    if (!formName.trim()) {
      toast({ title: "Kérjük adja meg a bérlet nevét!", variant: "destructive" });
      return;
    }

    const priceNum = parseInt(formPrice) || 0;
    const sessionsNum = parseInt(formSessions) || 0;
    const validityNum = parseInt(formValidityDays) || 30;

    if (editingPass) {
      setPassTemplates((prev) =>
        prev.map((p) =>
          p.id === editingPass.id
            ? {
                ...p,
                name: formName,
                serviceName: formService,
                totalSessions: sessionsNum,
                validityDays: validityNum,
                price: priceNum,
              }
            : p
        )
      );
      toast({ title: "Bérlettípus frissítve!" });
    } else {
      const newPass: BeautyPassTemplate = {
        id: `pass-${Date.now()}`,
        name: formName,
        serviceName: formService,
        totalSessions: sessionsNum,
        validityDays: validityNum,
        price: priceNum,
        isActive: true,
      };
      setPassTemplates((prev) => [...prev, newPass]);
      toast({ title: "Új bérlettípus sikeresen létrehozva!" });
    }
    setIsModalOpen(false);
  };

  const handleDeletePass = (id: string) => {
    setPassTemplates((prev) => prev.filter((p) => p.id !== id));
    toast({ title: "Bérlettípus törölve." });
  };

  const handleDeductSession = (id: string) => {
    setClientPasses((prev) =>
      prev.map((cp) => {
        if (cp.id === id) {
          const nextRem = Math.max(0, cp.remainingSessions - 1);
          return { ...cp, remainingSessions: nextRem };
        }
        return cp;
      })
    );
    toast({ title: "1 alkalom sikeresen levonva a vendég bérletéből!" });
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Ticket className="w-5 h-5 text-emerald-600" />
            <h2 className="text-lg font-extrabold text-slate-900">9. Bérletkezelés & Előfizetések</h2>
          </div>
          <p className="text-sm text-slate-500">
            Hozzon létre többalkalmas vagy korlátlan bérleteket, és kövesse nyomon a vendégek hátralévő alkalmait.
          </p>
        </div>
        <Button onClick={handleOpenAdd} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-2 rounded-xl shadow-md">
          <Plus className="w-4 h-4" /> Új bérlettípus létrehozása
        </Button>
      </div>

      <div className="space-y-4">
        <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
          <span>🏷️ Elérhető bérlet csomagok</span>
          <Badge variant="outline" className="font-bold">{passTemplates.length} db</Badge>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {passTemplates.map((pass) => (
            <Card key={pass.id} className="p-6 border-slate-200 rounded-2xl shadow-sm bg-white hover:shadow-md transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between gap-4 mb-2">
                  <h4 className="font-extrabold text-slate-900 text-base">{pass.name}</h4>
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-rose-500 hover:text-rose-700" onClick={() => handleDeletePass(pass.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-xs text-emerald-700 font-bold mb-4">Hozzárendelt szolgáltatás: {pass.serviceName}</p>

                <div className="grid grid-cols-3 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-100 text-center mb-4">
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Alkalmak</span>
                    <span className="font-extrabold text-slate-900 text-sm">
                      {pass.totalSessions === 0 ? "∞ Korlátlan" : `${pass.totalSessions} alkalom`}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Érvényesség</span>
                    <span className="font-extrabold text-slate-900 text-sm">{pass.validityDays} nap</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Ár</span>
                    <span className="font-extrabold text-emerald-700 text-sm">{formatPrice(pass.price)}</span>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span className="flex items-center gap-1 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Auto-levonás foglaláskor
                </span>
                <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 font-bold">Aktív értékesítés</Badge>
              </div>
            </Card>
          ))}
        </div>
      </div>

      <div className="space-y-4 pt-4 border-t border-slate-200">
        <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
          <span>👥 Aktív vendég bérletek & egyenlegek</span>
        </h3>

        {clientPasses.length === 0 ? (
          <p className="text-sm text-slate-500 italic">Jelenleg nincs aktív eladott bérlet.</p>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {clientPasses.map((cp) => (
              <Card key={cp.id} className="p-4 border-slate-200 rounded-2xl shadow-sm bg-white flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-extrabold text-lg">
                    {cp.remainingSessions}
                  </div>
                  <div>
                    <h4 className="font-extrabold text-slate-900 text-base">{cp.clientName}</h4>
                    <p className="text-xs text-slate-500">{cp.passName} • Lejár: {cp.expiryDate}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Badge variant="outline" className="font-bold text-slate-700 bg-slate-50">
                    Hátralévő: {cp.remainingSessions} / {cp.totalSessions} alkalom
                  </Badge>
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5 border-emerald-300 text-emerald-700 hover:bg-emerald-50 font-bold rounded-xl"
                    onClick={() => handleDeductSession(cp.id)}
                    disabled={cp.remainingSessions <= 0}
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> 1 alkalom levonása
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-extrabold text-xl text-slate-900">
              Új bérlettípus létrehozása
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Bérlet megnevezése *</label>
              <Input
                placeholder="Pl. 10 Alkalmas Masszázs Bérlet"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                className="rounded-xl"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Kapcsolódó szolgáltatás</label>
              <Select value={formService} onValueChange={setFormService}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Összes szolgáltatás">Minden szolgáltatásra érvényes</SelectItem>
                  {services.map((s) => (
                    <SelectItem key={s.id} value={s.name}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Alkalmak száma</label>
                <Input
                  type="number"
                  placeholder="5 (0 = korlátlan)"
                  value={formSessions}
                  onChange={(e) => setFormSessions(e.target.value)}
                  className="rounded-xl"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Érvényesség (nap)</label>
                <Input
                  type="number"
                  placeholder="90"
                  value={formValidityDays}
                  onChange={(e) => setFormValidityDays(e.target.value)}
                  className="rounded-xl"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Bérlet ára (Ft)</label>
                <Input
                  type="number"
                  placeholder="45000"
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
            <Button onClick={handleSavePass} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl">
              Létrehozás
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
