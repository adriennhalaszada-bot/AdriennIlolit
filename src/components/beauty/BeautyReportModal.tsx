import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, ShieldAlert, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface BeautyReportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetType: "provider" | "booking" | "content";
  targetName: string;
}

export function BeautyReportModal({
  open,
  onOpenChange,
  targetType,
  targetName,
}: BeautyReportModalProps) {
  const { toast } = useToast();
  const [reasonCategory, setReasonCategory] = useState<string>("no_show");
  const [details, setDetails] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {
    if (!details.trim()) {
      toast({ title: "Kérjük fejtsd ki a bejelentés okát!", variant: "destructive" });
      return;
    }

    setSubmitted(true);
    toast({
      title: "Bejelentés továbbítva az Adminisztrátoroknak! 🛡️",
      description: "Munkatársaink 24 órán belül felülvizsgálják az esetet.",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-3xl p-6">
        {!submitted ? (
          <>
            <DialogHeader>
              <DialogTitle className="text-lg font-extrabold text-rose-600 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" /> Visszaélés / Probléma Bejelentése
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-2 text-xs">
              <div className="bg-rose-50 dark:bg-rose-950/30 p-3 rounded-2xl border border-rose-200 text-rose-900 dark:text-rose-200">
                Jelentett elem: <strong>{targetName}</strong> ({targetType === "booking" ? "Foglalási visszaélés" : "Tartalmi sérelem"})
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Bejelentés Kategóriája *</label>
                <Select value={reasonCategory} onValueChange={setReasonCategory}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="no_show">🚫 Nem Megjelenés (No-Show)</SelectItem>
                    <SelectItem value="content_violation">⚠️ Tartalmi Sérelem / Megtévesztő Adatok</SelectItem>
                    <SelectItem value="unprofessional">❌ Szakszerűtlen Szolgáltatás / Viselkedés</SelectItem>
                    <SelectItem value="other">💬 Egyéb Visszaélés</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Részletes Leírás *</label>
                <Textarea
                  placeholder="Írd le a probléma körülményeit..."
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  rows={4}
                />
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>Mégse</Button>
              <Button onClick={handleSubmit} className="bg-rose-600 hover:bg-rose-700 text-white font-bold">
                Bejelentés Elküldése
              </Button>
            </DialogFooter>
          </>
        ) : (
          <div className="text-center py-6 space-y-3 text-xs">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
            <h3 className="text-lg font-bold">Bejelentés Rögzítve</h3>
            <p className="text-slate-500">Köszönjük a jelzést! Az adminisztrátorok felülvizsgálják az esetet.</p>
            <Button variant="outline" onClick={() => onOpenChange(false)}>Bezárás</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
