import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Bell, Sparkles, ShieldCheck, Clock, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ServiceWatchdogModalProps {
  isOpen: boolean;
  onClose: () => void;
  providerName: string;
  providerId: string;
  requestedDate?: string;
  serviceName?: string;
}

export function ServiceWatchdogModal({
  isOpen,
  onClose,
  providerName,
  providerId,
  requestedDate = "Következő 7 nap",
  serviceName = "Minden szolgáltatás"
}: ServiceWatchdogModalProps) {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [preferredTimeRange, setPreferredTimeRange] = useState("ALL");
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitted(true);
    toast({
      title: "⚡ Szolgáltatásfigyelő Aktiválva!",
      description: `${providerName} szakembernél 15 perces foglalási prioritást kapsz, amint felszabadul egy időpont!`,
    });
  };

  const handleReset = () => {
    setIsSubmitted(false);
    setEmail("");
    setPhone("");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleReset()}>
      <DialogContent className="sm:max-w-md rounded-3xl p-6 bg-white dark:bg-slate-900 border-2 border-emerald-500 shadow-2xl">
        <DialogHeader className="space-y-3 text-center">
          <div className="mx-auto w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950/80 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <Bell className="w-6 h-6 animate-bounce" />
          </div>
          <DialogTitle className="text-xl font-black text-slate-900 dark:text-slate-100 flex items-center justify-center gap-2">
            <span>⚡ Szolgáltatásfigyelő Rendszer</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500 font-medium">
            Foglalt az időpont? Ne maradj le róla! Amint lemondanak egy időpontot vagy a szolgáltató új helyet nyit, <strong>15 perces kizárólagos prioritással</strong> értesítünk Push üzenetben!
          </DialogDescription>
        </DialogHeader>

        {isSubmitted ? (
          <div className="py-6 text-center space-y-4 animate-in fade-in zoom-in duration-200">
            <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/60 rounded-full flex items-center justify-center mx-auto text-emerald-600">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-black text-slate-900 dark:text-slate-100">
                Sikeresen Feliratkoztál!
              </h3>
              <p className="text-xs text-slate-500">
                A rendszer figyelje a szabad időpontokat <strong>{providerName}</strong> szolgáltatónál ({requestedDate}).
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-left space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-800 dark:text-emerald-300">
                <Sparkles className="w-4 h-4 text-emerald-600" />
                <span>Kizárólagos Prioritás Garancia</span>
              </div>
              <p className="text-[11px] text-emerald-700 dark:text-emerald-400">
                Amint felszabadul egy hely, Push és SMS értesítést kapsz egy egyedi linkkel, ami 15 percig csak neked tartja fent az időpontot a nyílt piactér előtt.
              </p>
            </div>

            <Button onClick={handleReset} className="w-full bg-slate-900 hover:bg-slate-800 text-white font-extrabold rounded-2xl py-5 text-xs shadow-md">
              Rendben, Bezárás
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs space-y-1">
              <div className="font-extrabold text-slate-900 dark:text-slate-100">
                Szolgáltató: <span className="text-emerald-600 dark:text-emerald-400">{providerName}</span>
              </div>
              <div className="text-slate-500">
                Időszak: <span className="font-bold text-slate-700 dark:text-slate-300">{requestedDate}</span> • {serviceName}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">E-mail cím értesítéshez *</Label>
              <Input
                required
                type="email"
                placeholder="vevo@email.hu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="py-5 rounded-xl border-slate-300 dark:border-slate-700 text-xs font-bold"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Telefonszám (SMS értesítéshez) *</Label>
              <Input
                required
                type="tel"
                placeholder="+36 30 123 4567"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="py-5 rounded-xl border-slate-300 dark:border-slate-700 text-xs font-bold"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Preferált Idősáv</Label>
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <button
                  type="button"
                  onClick={() => setPreferredTimeRange("ALL")}
                  className={`p-2 rounded-xl border font-bold ${
                    preferredTimeRange === "ALL" ? "border-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700" : "border-slate-200"
                  }`}
                >
                  Bármikor
                </button>
                <button
                  type="button"
                  onClick={() => setPreferredTimeRange("MORNING")}
                  className={`p-2 rounded-xl border font-bold ${
                    preferredTimeRange === "MORNING" ? "border-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700" : "border-slate-200"
                  }`}
                >
                  Délelőtt (8-12)
                </button>
                <button
                  type="button"
                  onClick={() => setPreferredTimeRange("AFTERNOON")}
                  className={`p-2 rounded-xl border font-bold ${
                    preferredTimeRange === "AFTERNOON" ? "border-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700" : "border-slate-200"
                  }`}
                >
                  Délután (12-18)
                </button>
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-6 rounded-2xl text-xs shadow-lg gap-2">
                <Bell className="w-4 h-4" />
                <span>Szolgáltatásfigyelő Aktiválása (15 perc Prioritás) ➔</span>
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
