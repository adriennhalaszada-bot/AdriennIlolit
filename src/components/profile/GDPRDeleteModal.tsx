import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Trash2, ShieldCheck, CheckCircle2 } from "lucide-react";

interface GDPRDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmDelete: () => void;
}

export function GDPRDeleteModal({ isOpen, onClose, onConfirmDelete }: GDPRDeleteModalProps) {
  const [confirmText, setConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleted, setIsDeleted] = useState(false);

  const handleDelete = (e: React.FormEvent) => {
    e.preventDefault();
    if (confirmText.trim().toUpperCase() !== "TÖRLÉS") return;

    setIsDeleting(true);
    setTimeout(() => {
      setIsDeleting(false);
      setIsDeleted(true);
      setTimeout(() => {
        onConfirmDelete();
      }, 2000);
    }, 1500);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md rounded-3xl p-6 bg-white dark:bg-slate-900 border-rose-200 dark:border-rose-900">
        <DialogHeader>
          <DialogTitle className="font-black text-xl text-red-600 flex items-center gap-2">
            <AlertTriangle className="w-6 h-6 text-red-500" />
            <span>Fiók végleges törlése (GDPR)</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            Figyelem! Ez a művelet végleges és nem vonható vissza.
          </DialogDescription>
        </DialogHeader>

        {isDeleted ? (
          <div className="py-8 text-center space-y-3">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
            <h4 className="font-extrabold text-base text-slate-900 dark:text-slate-100">Fiók sikeresen törölve!</h4>
            <p className="text-xs text-slate-500">Minden személyes adatod eltávolításra került a rendszereinkből.</p>
          </div>
        ) : (
          <form onSubmit={handleDelete} className="space-y-4 pt-2">
            <div className="bg-red-50 dark:bg-red-950/40 p-4 rounded-2xl border border-red-200 dark:border-red-900 text-xs text-red-700 dark:text-red-300 space-y-2">
              <p className="font-bold flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-red-500" /> A törlés során az alábbi adatok végleg megsemmisülnek:
              </p>
              <ul className="list-disc list-inside space-y-1 text-[11px] pl-1">
                <li>Összes aktív és archivált hirdetésed</li>
                <li>Vásárlási és eladási előzmények</li>
                <li>Belső üzenetváltások és értékelések</li>
                <li>Kártya- és szállítási adatok</li>
              </ul>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                A törlés megerősítéséhez írd be ide: <span className="font-black text-red-600">TÖRLÉS</span>
              </label>
              <Input
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="TÖRLÉS"
                required
                className="text-xs rounded-2xl bg-slate-50 dark:bg-slate-800 border-red-200 focus:border-red-500"
              />
            </div>

            <div className="flex gap-2 justify-end pt-3">
              <Button type="button" variant="ghost" onClick={onClose} className="rounded-2xl text-xs font-bold">
                Mégse
              </Button>
              <Button
                type="submit"
                disabled={confirmText.trim().toUpperCase() !== "TÖRLÉS" || isDeleting}
                className="rounded-2xl text-xs font-bold bg-red-600 hover:bg-red-700 text-white px-6 shadow-xs"
              >
                <Trash2 className="w-4 h-4 mr-1.5" />
                {isDeleting ? "Törlés folyamatban..." : "Fiók és adatok végleges törlése"}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
