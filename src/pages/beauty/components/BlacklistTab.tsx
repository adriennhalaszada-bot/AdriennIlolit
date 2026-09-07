import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { UserX, ShieldAlert, Plus, Trash2, Lock, Unlock } from "lucide-react";

export interface BannedClient {
  id: string;
  name: string;
  email: string;
  phone: string;
  reason: string;
  bannedAt: string;
}

const mockBanned: BannedClient[] = [
  {
    id: "ban-1",
    name: "Kovács István (Teszt)",
    email: "istvan.bad@example.com",
    phone: "+36 30 999 8877",
    reason: "Egymás után 2 alkalommal no-show lemondás nélkül",
    bannedAt: "2026-08-15",
  },
];

export function BlacklistTab() {
  const { toast } = useToast();
  const [bannedList, setBannedList] = useState<BannedClient[]>(mockBanned);
  const [isClosedClientBase, setIsClosedClientBase] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formReason, setFormReason] = useState("Többszöri indoklás nélküli távolmaradás (no-show)");

  const handleAddBan = () => {
    if (!formEmail.trim() && !formPhone.trim()) {
      toast({ title: "Kérjük adjon meg egy e-mail címet vagy telefonszámot!", variant: "destructive" });
      return;
    }

    const newBan: BannedClient = {
      id: `ban-${Date.now()}`,
      name: formName || "Tiltott ügyfél",
      email: formEmail,
      phone: formPhone,
      reason: formReason,
      bannedAt: new Date().toISOString().split("T")[0],
    };

    setBannedList((prev) => [...prev, newBan]);
    toast({ title: "Ügyfél sikeresen tiltólistára helyezve!" });
    setIsModalOpen(false);
  };

  const handleRemoveBan = (id: string) => {
    setBannedList((prev) => prev.filter((b) => b.id !== id));
    toast({ title: "Tiltás feloldva." });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <UserX className="w-5 h-5 text-rose-600" />
            <h2 className="text-lg font-extrabold text-slate-900">12. Tiltólista & Zárt Vendégkör</h2>
          </div>
          <p className="text-sm text-slate-500">
            Akadályozza meg a kényelmetlen foglalásokat vagy a rendszeresen meg nem jelenő (no-show) vendégek online időpontfoglalását.
          </p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="bg-rose-600 hover:bg-rose-700 text-white font-bold gap-2 rounded-xl shadow-md">
          <Plus className="w-4 h-4" /> Új ügyfél tiltása
        </Button>
      </div>

      <Card className="p-6 border-slate-200 rounded-2xl shadow-sm bg-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-amber-100 text-amber-800 rounded-2xl">
              <Lock className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-slate-900">Zárt vendégkör funkció</h3>
              <p className="text-xs text-slate-500">
                Ha bekapcsolja, kizárólag a már CRM adatbázisában rögzített meglévő ügyfelek foglalhatnak időpontot online.
              </p>
            </div>
          </div>
          <Switch
            checked={isClosedClientBase}
            onCheckedChange={(val) => {
              setIsClosedClientBase(val);
              toast({ title: val ? "Zárt vendégkör bekapcsolva!" : "Zárt vendégkör kikapcsolva." });
            }}
          />
        </div>
      </Card>

      <div className="space-y-4">
        <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
          <span>🚫 Tiltólistán lévő személyek</span>
          <Badge variant="outline" className="font-bold">{bannedList.length} fő</Badge>
        </h3>

        {bannedList.length === 0 ? (
          <p className="text-sm text-slate-500 italic">Jelenleg nincs egyetlen tiltott ügyfél sem.</p>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {bannedList.map((ban) => (
              <Card key={ban.id} className="p-5 border-rose-200/80 rounded-2xl shadow-sm bg-rose-50/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-extrabold text-slate-900 text-base">{ban.name}</h4>
                    <Badge className="bg-rose-100 text-rose-800 border-rose-300 font-bold text-[10px]">
                      Tiltva: {ban.bannedAt}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-600">
                    E-mail: <strong className="text-slate-900">{ban.email || "—"}</strong> • Tel: <strong className="text-slate-900">{ban.phone || "—"}</strong>
                  </p>
                  <p className="text-xs text-rose-700 font-medium">Indoklás: {ban.reason}</p>
                </div>

                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5 border-rose-300 text-rose-700 hover:bg-rose-100 font-bold rounded-xl self-end sm:self-center"
                  onClick={() => handleRemoveBan(ban.id)}
                >
                  <Unlock className="w-3.5 h-3.5" /> Tiltás feloldása
                </Button>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-extrabold text-xl text-slate-900">
              Ügyfél tiltólistára helyezése
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Ügyfél neve (opcionális)</label>
              <Input
                placeholder="Pl. Kovács István"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                className="rounded-xl"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Tiltandó E-mail cím</label>
              <Input
                type="email"
                placeholder="badclient@example.com"
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
                className="rounded-xl"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Tiltandó Telefonszám</label>
              <Input
                placeholder="+36 30 123 4567"
                value={formPhone}
                onChange={(e) => setFormPhone(e.target.value)}
                className="rounded-xl"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Tiltás indoka</label>
              <Input
                placeholder="Pl. Többszöri meg nem jelenés"
                value={formReason}
                onChange={(e) => setFormReason(e.target.value)}
                className="rounded-xl"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsModalOpen(false)} className="rounded-xl font-bold">
              Mégse
            </Button>
            <Button onClick={handleAddBan} className="bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl">
              Tiltólistára
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
