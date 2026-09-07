import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Star, CheckCircle, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface ReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetUserName: string;
  itemTitle: string;
  onSubmitReview: (review: { rating: number; comment: string; tags: string[] }) => void;
}

const PRESET_TAGS = [
  "⚡ Gyors szállítás",
  "📦 Gondos csomagolás",
  "✨ Pontos leírás",
  "💬 Kedves eladó",
  "🤝 Ajánlom mindenkinek",
  "💯 Újszerű állapot",
];

export function ReviewModal({ isOpen, onClose, targetUserName, itemTitle, onSubmitReview }: ReviewModalProps) {
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [comment, setComment] = useState<string>("");
  const [selectedTags, setSelectedTags] = useState<string[]>(["⚡ Gyors szállítás", "✨ Pontos leírás"]);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmitReview({ rating, comment, tags: selectedTags });
    setIsSubmitted(true);
    setTimeout(() => {
      setIsSubmitted(false);
      onClose();
    }, 1500);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md rounded-3xl p-6 bg-white dark:bg-slate-900">
        <DialogHeader>
          <DialogTitle className="font-black text-xl text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-500" />
            <span>Ellenőrzött értékelés írása</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500 space-y-1">
            <p>Értékeld a tranzakciót a következőről: <strong>{itemTitle}</strong> (Partner: <strong>{targetUserName}</strong>)</p>
            <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 rounded-full mt-1">
              <CheckCircle size={12} />
              <span>Igazolt teljesített tranzakció (vásárlás / foglalás / szolgáltatás / képzés)</span>
            </div>
          </DialogDescription>
        </DialogHeader>

        {isSubmitted ? (
          <div className="py-8 text-center space-y-3">
            <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-950 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle className="w-6 h-6" />
            </div>
            <h4 className="font-extrabold text-base text-slate-900 dark:text-slate-100">Köszönjük az értékelést!</h4>
            <p className="text-xs text-slate-500">Az értékelésed megjelent a felhasználó profilján.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5 pt-2">
            {/* Csillag Értékelő */}
            <div className="text-center space-y-2">
              <span className="text-xs font-bold text-slate-600 dark:text-slate-400">Válassz értékelést:</span>
              <div className="flex justify-center gap-1.5">
                {[1, 2, 3, 4, 5].map((star) => {
                  const activeStar = hoverRating ? star <= hoverRating : star <= rating;
                  return (
                    <button
                      key={star}
                      type="button"
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      onClick={() => setRating(star)}
                      className="p-1 transition-transform hover:scale-125 focus:outline-none"
                    >
                      <Star
                        className={cn(
                          "w-8 h-8 transition-colors",
                          activeStar ? "text-amber-400 fill-amber-400" : "text-slate-200 dark:text-slate-700"
                        )}
                      />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Gyors Címkék */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Pozitív tulajdonságok:</label>
              <div className="flex flex-wrap gap-1.5">
                {PRESET_TAGS.map((tag) => {
                  const isSelected = selectedTags.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleTag(tag)}
                      className={cn(
                        "text-xs font-bold px-3 py-1.5 rounded-xl transition-all border",
                        isSelected
                          ? "bg-rose-600 text-white border-rose-600 shadow-xs"
                          : "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-100"
                      )}
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Szöveges Értékelés */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Személyes megjegyzés (opcionális):</label>
              <Textarea
                placeholder="Írd le a tapasztalataidat a tranzakcióról..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                maxLength={500}
                className="text-xs rounded-2xl min-h-[80px] bg-slate-50 dark:bg-slate-800"
              />
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <Button type="button" variant="ghost" onClick={onClose} className="rounded-2xl text-xs font-bold">
                Mégse
              </Button>
              <Button type="submit" className="rounded-2xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white px-6">
                Értékelés beküldése
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
