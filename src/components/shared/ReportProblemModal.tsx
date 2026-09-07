import React, { useState } from 'react';
import { Flag, AlertTriangle, CheckCircle, ShieldAlert, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

export type ReportCategory =
  | 'megtévesztő hirdetés'
  | 'csalásgyanú'
  | 'hibás adat'
  | 'tiltott tartalom'
  | 'hamis profil'
  | 'egyéb';

interface ReportProblemModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetTitle: string;
  targetType?: 'hirdetés' | 'profil' | 'szolgáltató';
  targetId?: string;
}

const REPORT_CATEGORIES: { id: ReportCategory; label: string; description: string }[] = [
  {
    id: 'megtévesztő hirdetés',
    label: 'Megtévesztő hirdetés',
    description: 'A termék/szolgáltatás leírása, ára vagy állapota félrevezető.',
  },
  {
    id: 'csalásgyanú',
    label: 'Csalásgyanú',
    description: 'Gyanús fizetési kérés, hamis szállítási adatok vagy előre utalásos gyanú.',
  },
  {
    id: 'hibás adat',
    label: 'Hibás adat',
    description: 'Hibás telefonszám, rossz kategória vagy elavult adatok.',
  },
  {
    id: 'tiltott tartalom',
    label: 'Tiltott tartalom',
    description: 'Jogszabályba, vagy az ILOLIT szabályzatába ütköző tartalom.',
  },
  {
    id: 'hamis profil',
    label: 'Hamis profil',
    description: 'Más személyazonosságával való visszaélés vagy nem létező vállalkozás.',
  },
  {
    id: 'egyéb',
    label: 'Egyéb probléma',
    description: 'Bármilyen egyéb észrevétel vagy probléma.',
  },
];

export const ReportProblemModal: React.FC<ReportProblemModalProps> = ({
  isOpen,
  onClose,
  targetTitle,
  targetType = 'hirdetés',
  targetId,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<ReportCategory>('megtévesztő hirdetés');
  const [description, setDescription] = useState('');
  const [reporterEmail, setReporterEmail] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitted(true);
    setTimeout(() => {
      setIsSubmitted(false);
      setDescription('');
      onClose();
    }, 2000);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg rounded-3xl p-6 bg-slate-900 border border-slate-800 text-slate-100 shadow-2xl">
        <DialogHeader>
          <DialogTitle className="font-black text-xl text-rose-500 flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-rose-500" />
            <span>Probléma jelentése</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-400">
            Jelentsd a következőt: <strong className="text-slate-200">{targetTitle}</strong> ({targetType})
          </DialogDescription>
        </DialogHeader>

        {isSubmitted ? (
          <div className="py-8 text-center space-y-3">
            <div className="w-14 h-14 bg-emerald-950/80 text-emerald-400 border border-emerald-800 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle className="w-8 h-8" />
            </div>
            <h4 className="font-extrabold text-lg text-slate-100">Köszönjük a bejelentést!</h4>
            <p className="text-xs text-slate-400 max-w-xs mx-auto">
              Moderátori csapatunk 24 órán belül felülvizsgálja a bejelentett tartalmát.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            {/* Kategória választó */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300">Válaszd ki a probléma kategóriáját:</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {REPORT_CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`p-3 rounded-xl text-left border transition-all text-xs flex flex-col justify-between ${
                      selectedCategory === cat.id
                        ? 'bg-rose-950/50 border-rose-500/80 text-rose-200 shadow-lg shadow-rose-950/40'
                        : 'bg-slate-800/60 border-slate-700/60 text-slate-300 hover:bg-slate-800 hover:border-slate-600'
                    }`}
                  >
                    <div className="font-bold flex items-center justify-between w-full">
                      <span>{cat.label}</span>
                      {selectedCategory === cat.id && (
                        <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                      )}
                    </div>
                    <span className="text-[10px] text-slate-400 mt-1">{cat.description}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Részletes leírás */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300">Részletes leírás (opcionális):</label>
              <Textarea
                placeholder="Kérjük, írd le részletesen, miért jelentred ezt a hirdetést/profilt..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={800}
                className="text-xs rounded-xl min-h-[90px] bg-slate-950 border-slate-800 text-slate-200 placeholder:text-slate-600"
              />
            </div>

            {/* E-mail értesítéshez */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300">Az e-mail címed a visszajelzéshez:</label>
              <input
                type="email"
                placeholder="pelda@email.hu"
                value={reporterEmail}
                onChange={(e) => setReporterEmail(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-xs bg-slate-950 border border-slate-800 text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-rose-500"
              />
            </div>

            <div className="flex gap-2 justify-end pt-2 border-t border-slate-800">
              <Button
                type="button"
                variant="ghost"
                onClick={onClose}
                className="rounded-xl text-xs font-bold text-slate-400 hover:text-slate-100 hover:bg-slate-800"
              >
                Mégse
              </Button>
              <Button
                type="submit"
                className="rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white px-6 shadow-lg shadow-rose-900/40"
              >
                Bejelentés küldése
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};
