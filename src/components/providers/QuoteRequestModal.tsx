import React, { useState } from 'react';
import { MessageSquarePlus, Camera, MapPin, Calendar, Clock, Tag, CheckCircle, Upload, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

interface QuoteRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  providerName: string;
  serviceName?: string;
  defaultLocation?: string;
}

export const QuoteRequestModal: React.FC<QuoteRequestModalProps> = ({
  isOpen,
  onClose,
  providerName,
  serviceName = 'Egyedi szolgáltatás',
  defaultLocation = 'Miskolc',
}) => {
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState(defaultLocation);
  const [images, setImages] = useState<string[]>([]);
  const [preferredDate, setPreferredDate] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleAddSampleImage = () => {
    if (images.length < 5) {
      setImages([...images, `https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=400`]);
    }
  };

  const handleRemoveImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitted(true);
    setTimeout(() => {
      setIsSubmitted(false);
      setDescription('');
      setImages([]);
      onClose();
    }, 2000);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg rounded-3xl p-6 bg-slate-900 border border-slate-800 text-slate-100 shadow-2xl">
        <DialogHeader>
          <DialogTitle className="font-black text-xl text-teal-400 flex items-center gap-2">
            <MessageSquarePlus className="w-6 h-6 text-teal-400" />
            <span>Egyedi Árajánlatkérés</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-400">
            Kérj személyre szabott ajánlatot a következőtől: <strong className="text-teal-300">{providerName}</strong> ({serviceName})
          </DialogDescription>
        </DialogHeader>

        {isSubmitted ? (
          <div className="py-8 text-center space-y-3">
            <div className="w-14 h-14 bg-teal-950/80 text-teal-400 border border-teal-500/60 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-teal-950/50">
              <CheckCircle className="w-8 h-8 text-teal-400" />
            </div>
            <h4 className="font-extrabold text-lg text-slate-100">Árajánlatkérés elküldve!</h4>
            <p className="text-xs text-slate-400 max-w-xs mx-auto">
              A szolgáltató értesítést kapott. A válasz tartalmazni fogja a <strong>pontos árat</strong>, a <strong>várható időtartamot</strong> és a <strong>szabad időpontokat</strong>.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            {/* Rövid leírás */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
                <span>Rövid leírás a feladatról: *</span>
                <span className="text-[10px] text-slate-500">{description.length}/500</span>
              </label>
              <Textarea
                required
                placeholder="Írd le részletesen, milyen szolgáltatásra van szükséged (pl. 35 m² szoba festése, egyedi smink menyasszonynak, stb.)..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={500}
                className="text-xs rounded-xl min-h-[90px] bg-slate-950 border-slate-800 text-slate-200 placeholder:text-slate-600 focus:border-teal-500"
              />
            </div>

            {/* Helyszín / Település */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 flex items-center gap-1">
                <MapPin size={14} className="text-teal-400" /> Munkavégzés helyszíne / Település: *
              </label>
              <input
                type="text"
                required
                placeholder="Pl. Miskolc, Belváros"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-xs bg-slate-950 border border-slate-800 text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-teal-500"
              />
            </div>

            {/* Képek feltöltése */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300 flex items-center gap-1">
                <Camera size={14} className="text-teal-400" /> Képek csatolása (opcionális):
              </label>
              <div className="flex flex-wrap gap-2">
                {images.map((img, idx) => (
                  <div key={idx} className="relative w-16 h-16 rounded-xl overflow-hidden border border-teal-500/40">
                    <img src={img} alt="Csatolt kép" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(idx)}
                      className="absolute top-1 right-1 p-0.5 bg-slate-950/80 text-rose-400 rounded-full hover:bg-rose-600 hover:text-white"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
                {images.length < 5 && (
                  <button
                    type="button"
                    onClick={handleAddSampleImage}
                    className="w-16 h-16 rounded-xl border-2 border-dashed border-slate-700 bg-slate-950/60 hover:bg-slate-800 text-slate-400 flex flex-col items-center justify-center transition-colors text-[10px] gap-1"
                  >
                    <Upload size={16} className="text-teal-400" />
                    <span>Kép hozzáadása</span>
                  </button>
                )}
              </div>
            </div>

            {/* Dátum elvárás */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 flex items-center gap-1">
                <Calendar size={14} className="text-teal-400" /> Tervezett időpont / határidő:
              </label>
              <input
                type="date"
                value={preferredDate}
                onChange={(e) => setPreferredDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-xs bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-teal-500"
              />
            </div>

            {/* Információs doboz */}
            <div className="p-3 bg-teal-950/40 border border-teal-500/30 rounded-xl text-[11px] text-teal-200/90 flex items-start gap-2">
              <Tag size={16} className="text-teal-400 shrink-0 mt-0.5" />
              <span>
                A szolgáltató a válaszában megadja a pontos <strong>árajánlatot</strong>, a <strong>várható teljesítési időt</strong> és a <strong>szabad időpont opciókat</strong>.
              </span>
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
                className="rounded-xl text-xs font-bold bg-teal-500 hover:bg-teal-400 text-slate-950 px-6 shadow-lg shadow-teal-500/20"
              >
                Ajánlatkérés elküldése
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};
