import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Receipt, ShieldCheck, CheckCircle2, AlertTriangle, Plus, FileText, Download, Printer, RefreshCw } from "lucide-react";
import { formatPrice } from "@/lib/constants";
import type { BeautyServiceOffering } from "@workspace/api-client-react";

export interface ReceiptItem {
  id: string;
  receiptNumber: string;
  clientName: string;
  itemsSummary: string;
  totalAmount: number;
  paymentMethod: "cash" | "card" | "transfer";
  navStatus: "submitted" | "pending" | "error";
  createdAt: string;
}

const mockReceipts: ReceiptItem[] = [
  {
    id: "rec-1",
    receiptNumber: "IL-NYU-2026-00421",
    clientName: "Nagy Anita",
    itemsSummary: "Balayage Festés & Ápolás",
    totalAmount: 32000,
    paymentMethod: "card",
    navStatus: "submitted",
    createdAt: "2026-09-04 14:20",
  },
  {
    id: "rec-2",
    receiptNumber: "IL-NYU-2026-00422",
    clientName: "Kiss Péter",
    itemsSummary: "Női Hajvágás & Szárítás",
    totalAmount: 12500,
    paymentMethod: "cash",
    navStatus: "submitted",
    createdAt: "2026-09-04 16:05",
  },
];

interface ReceiptsNavTabProps {
  services: BeautyServiceOffering[];
}

export function ReceiptsNavTab({ services }: ReceiptsNavTabProps) {
  const { toast } = useToast();
  const [receipts, setReceipts] = useState<ReceiptItem[]>(mockReceipts);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [formClient, setFormClient] = useState("");
  const [formService, setFormService] = useState(services[0]?.name || "Női Hajvágás & Szárítás");
  const [formAmount, setFormAmount] = useState("12500");
  const [formPayment, setFormPayment] = useState<"cash" | "card" | "transfer">("card");

  const handleCreateReceipt = () => {
    const amountNum = parseInt(formAmount) || 0;
    const newRec: ReceiptItem = {
      id: `rec-${Date.now()}`,
      receiptNumber: `IL-NYU-2026-${Math.floor(10000 + Math.random() * 90000)}`,
      clientName: formClient || "Lakossági Vevő",
      itemsSummary: formService,
      totalAmount: amountNum,
      paymentMethod: formPayment,
      navStatus: "submitted",
      createdAt: new Date().toISOString().replace("T", " ").substring(0, 16),
    };

    setReceipts((prev) => [newRec, ...prev]);
    toast({
      title: "Nyugta sikeresen kiállítva!",
      description: `Bizonylatszám: ${newRec.receiptNumber} • NAV adatszolgáltatás elküldve.`,
    });
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Receipt className="w-5 h-5 text-emerald-600" />
            <h2 className="text-lg font-extrabold text-slate-900">15. Saját Nyugtázás & NAV Adatszolgáltatás</h2>
          </div>
          <p className="text-sm text-slate-500">
            Gyors mobil nyugtakiállítás közvetlenül a saját árlistából, automatikus NAV adatszolgáltatással és 100% bírsággaranciával.
          </p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-2 rounded-xl shadow-md">
          <Plus className="w-4 h-4" /> Új Nyugta kiállítása
        </Button>
      </div>

      {/* 100% NAV Guarantee Banner */}
      <Card className="p-4 bg-emerald-50 border-emerald-200 rounded-2xl flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <ShieldCheck className="w-6 h-6 text-emerald-700" />
          <div>
            <h3 className="font-extrabold text-sm text-emerald-900">100%-os ILOLIT NAV Bírsággarancia</h3>
            <p className="text-xs text-emerald-700">
              Az ILOLIT felhőalapú nyugtázója teljes mértékben megfelel a hatályos hazai jogszabályoknak és automatikusan továbbítja az adatokat a NAV felé.
            </p>
          </div>
        </div>
        <Badge className="bg-emerald-600 text-white font-bold text-xs shrink-0">NAV Minősített</Badge>
      </Card>

      <div className="space-y-4">
        <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
          <span>🧾 Kiállított nyugták előzményei</span>
          <Badge variant="outline" className="font-bold">{receipts.length} db</Badge>
        </h3>

        <div className="grid grid-cols-1 gap-4">
          {receipts.map((rec) => (
            <Card key={rec.id} className="p-5 border-slate-200 rounded-2xl shadow-sm bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-extrabold text-slate-900 text-sm">{rec.receiptNumber}</span>
                  <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 font-bold text-[10px]">
                    <CheckCircle2 className="w-3 h-3 mr-1" /> NAV Elfogadva
                  </Badge>
                  <span className="text-xs text-slate-400 font-medium">{rec.createdAt}</span>
                </div>
                <h4 className="font-bold text-slate-800 text-sm">{rec.clientName}</h4>
                <p className="text-xs text-slate-500">Tételek: {rec.itemsSummary}</p>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-right">
                  <span className="text-xs text-slate-400 font-bold uppercase block">Fizetési mód: {rec.paymentMethod.toUpperCase()}</span>
                  <span className="font-extrabold text-emerald-700 text-lg">{formatPrice(rec.totalAmount)}</span>
                </div>
                <Button size="icon" variant="outline" className="h-9 w-9 rounded-xl border-slate-300 text-slate-700 hover:bg-slate-50" onClick={() => toast({ title: "Nyugta letöltése PDF formátumban" })}>
                  <Download className="w-4 h-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-extrabold text-xl text-slate-900">
              Gyors Nyugtakiállítás (NAV)
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Vevő neve / Vevőkód (Opcionális)</label>
              <Input
                placeholder="Pl. Lakossági vevő vagy Kovács Anna"
                value={formClient}
                onChange={(e) => setFormClient(e.target.value)}
                className="rounded-xl"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Szolgáltatás kiválasztása</label>
              <Select value={formService} onValueChange={setFormService}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {services.map((s) => (
                    <SelectItem key={s.id} value={s.name}>
                      {s.name} ({formatPrice(s.price)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Végösszeg (Ft)</label>
                <Input
                  type="number"
                  value={formAmount}
                  onChange={(e) => setFormAmount(e.target.value)}
                  className="rounded-xl"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Fizetési mód</label>
                <Select value={formPayment} onValueChange={(val: any) => setFormPayment(val)}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="card">💳 Bankkártya</SelectItem>
                    <SelectItem value="cash">💵 Készpénz</SelectItem>
                    <SelectItem value="transfer">🏦 Átutalás</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsModalOpen(false)} className="rounded-xl font-bold">
              Mégse
            </Button>
            <Button onClick={handleCreateReceipt} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl gap-1">
              <Printer className="w-4 h-4" /> Nyugta kiállítása & NAV küldés
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
