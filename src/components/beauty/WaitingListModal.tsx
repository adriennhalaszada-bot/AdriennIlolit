import React, { useState } from 'react';
import { Bell, Calendar, Clock, User, Sparkles, CheckCircle, ShieldAlert } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface WaitingListModalProps {
  isOpen: boolean;
  onClose: () => void;
  providerName: string;
  serviceTitle?: string;
}

export type TimeOfDayOption = 'délelőtt' | 'délután' | 'este' | 'bármikor';

export const WaitingListModal: React.FC<WaitingListModalProps> = ({
  isOpen,
  onClose,
  providerName,
  serviceTitle = 'Kozmetikai szolgáltatás',
}) => {
  const [selectedService, setSelectedService] = useState(serviceTitle);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(
    new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDayOption>('bármikor');
  const [userPhone, setUserPhone] = useState('');
  const [isSaved, setIsSaved] = useState(false);

  const timeOfDayOptions: { id: TimeOfDayOption; label: string; desc: string }[] = [
    { id: 'bármikor', label: 'Bármikor', desc: 'Bármilyen időpont jó' },
    { id: 'délelőtt', label: 'Délelőtt', desc: '08:00 - 12:00 között' },
    { id: 'délután', label: 'Délután', desc: '12:00 - 17:00 között' },
    { id: 'este', label: 'Este', desc: '17:00 - 21:00 között' },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaved(true);
    setTimeout(() => {
      setIsSaved(false);
      onClose();
    }, 2000);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md rounded-3xl p-6 bg-slate-900 border border-slate-800 text-slate-100 shadow-2xl">
        <DialogHeader>
          <DialogTitle className="font-black text-xl text-amber-400 flex items-center gap-2">
            <Bell className="w-6 h-6 text-amber-400 fill-amber-400/20 animate-bounce" />
            <span>Értesíts, ha felszabadul időpont!</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-400">
            Iratkozz fel a várólistára. Ha valaki lemondja a foglalását náluk: <strong className="text-amber-300">{providerName}</strong>, azonnal értesítést kapsz!
          </DialogDescription>
        </DialogHeader>

        {isSaved ? (
          <div className="py-8 text-center space-y-3">
            <div className="w-14 h-14 bg-amber-950/80 text-amber-400 border border-amber-500/60 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-amber-950/50">
              <CheckCircle className="w-8 h-8 text-amber-400" />
            </div>
            <h4 className="font-extrabold text-lg text-slate-100">Sikeresen feliratkoztál a várólistára!</h4>
            <p className="text-xs text-slate-400 max-w-xs mx-auto">
              Azonnal értesítést küldünk a telefonodra és e-mail címedre, amint felszabadul egy időpont.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            {/* Szolgáltató & Szolgáltatás */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <User size={14} className="text-amber-400" /> Szolgáltató & Szolgáltatás:
              </label>
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs">
                <p className="font-bold text-amber-400">{providerName}</p>
                <input
                  type="text"
                  value={selectedService}
                  onChange={(e) => setSelectedService(e.target.value)}
                  className="w-full mt-1.5 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-200 font-medium focus:outline-none focus:border-amber-500 text-xs"
                  placeholder="Kért szolgáltatás megnevezése"
                />
              </div>
            </div>

            {/* Dátumtartomány */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Calendar size={14} className="text-amber-400" /> Dátumtartomány:
              </label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[10px] text-slate-400 block mb-1">Ettől a naptól:</span>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:border-amber-500"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block mb-1">Eddig a napig:</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:border-amber-500"
                  />
                </div>
              </div>
            </div>

            {/* Napszak szűrés */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Clock size={14} className="text-amber-400" /> Preferált napszak:
              </label>
              <div className="grid grid-cols-2 gap-2">
                {timeOfDayOptions.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setTimeOfDay(opt.id)}
                    className={`p-2.5 rounded-xl text-left border transition-all text-xs ${
                      timeOfDay === opt.id
                        ? 'bg-amber-950/60 border-amber-500 text-amber-300 font-bold shadow-md shadow-amber-950/40'
                        : 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <div>{opt.label}</div>
                    <div className="text-[10px] text-slate-400 font-normal">{opt.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Telefonszám értesítéshez */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-300">Telefonszám (SMS értesítéshez):</label>
              <input
                type="tel"
                placeholder="+36 30 123 4567"
                value={userPhone}
                onChange={(e) => setUserPhone(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-xs bg-slate-950 border border-slate-800 text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="flex gap-2 justify-end pt-3 border-t border-slate-800">
              <Button
                type="button"
                variant="ghost"
                onClick={onClose}
                className="rounded-xl text-xs font-bold text-slate-400 hover:text-slate-100"
              >
                Mégse
              </Button>
              <Button
                type="submit"
                className="rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 px-6 shadow-lg shadow-amber-500/20"
              >
                Feliratkozás a várólistára
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};
