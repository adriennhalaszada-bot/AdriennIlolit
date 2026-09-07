import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ImageUploader } from "./ImageUploader";
import { Edit3, Check, Archive, Save, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ListingItemData {
  id: string;
  title: string;
  price: string;
  category: string;
  condition: string;
  size?: string;
  brand?: string;
  description: string;
  images: string[];
  status: "draft" | "active" | "reserved" | "sold" | "archived";
}

interface EditListingModalProps {
  isOpen: boolean;
  onClose: () => void;
  listing: ListingItemData | null;
  onSaveListing: (updatedListing: ListingItemData) => void;
}

export function EditListingModal({ isOpen, onClose, listing, onSaveListing }: EditListingModalProps) {
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("");
  const [condition, setCondition] = useState("");
  const [size, setSize] = useState("");
  const [brand, setBrand] = useState("");
  const [description, setDescription] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [status, setStatus] = useState<ListingItemData["status"]>("active");

  useEffect(() => {
    if (listing) {
      setTitle(listing.title);
      setPrice(listing.price);
      setCategory(listing.category || "Ruhák");
      setCondition(listing.condition || "Újszerű");
      setSize(listing.size || "M");
      setBrand(listing.brand || "Zara");
      setDescription(listing.description || "");
      setImages(listing.images || []);
      setStatus(listing.status || "active");
    }
  }, [listing]);

  if (!listing) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveListing({
      ...listing,
      title,
      price,
      category,
      condition,
      size,
      brand,
      description,
      images,
      status,
    });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-xl rounded-3xl p-6 bg-white dark:bg-slate-900 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-black text-xl text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Edit3 className="w-5 h-5 text-rose-500" />
            <span>Hirdetés szerkesztése</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            Módosítsd a hirdetésed adatait vagy frissítsd a státuszát!
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Státusz Választó Badge-ek */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Hirdetés Státusza:</label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setStatus("active")}
                className={cn(
                  "px-3 py-1.5 rounded-xl font-bold text-xs transition-all",
                  status === "active" ? "bg-emerald-600 text-white shadow-xs" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                )}
              >
                🟢 Aktív
              </button>
              <button
                type="button"
                onClick={() => setStatus("reserved")}
                className={cn(
                  "px-3 py-1.5 rounded-xl font-bold text-xs transition-all",
                  status === "reserved" ? "bg-amber-500 text-slate-950 shadow-xs" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                )}
              >
                🟡 Foglalt
              </button>
              <button
                type="button"
                onClick={() => setStatus("sold")}
                className={cn(
                  "px-3 py-1.5 rounded-xl font-bold text-xs transition-all",
                  status === "sold" ? "bg-blue-600 text-white shadow-xs" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                )}
              >
                🔵 Eladva
              </button>
              <button
                type="button"
                onClick={() => setStatus("archived")}
                className={cn(
                  "px-3 py-1.5 rounded-xl font-bold text-xs transition-all",
                  status === "archived" ? "bg-slate-700 text-white shadow-xs" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                )}
              >
                ⚪ Archivált
              </button>
              <button
                type="button"
                onClick={() => setStatus("draft")}
                className={cn(
                  "px-3 py-1.5 rounded-xl font-bold text-xs transition-all",
                  status === "draft" ? "bg-purple-600 text-white shadow-xs" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                )}
              >
                🟣 Piszkozat
              </button>
            </div>
          </div>

          {/* Cím & Ár */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2 space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Termék neve:</label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="text-xs rounded-2xl bg-slate-50 dark:bg-slate-800"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Ár (Ft):</label>
              <Input
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                required
                className="text-xs rounded-2xl bg-slate-50 dark:bg-slate-800"
              />
            </div>
          </div>

          {/* Kategória, Állapot, Méret, Márka */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Kategória:</label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="text-xs rounded-2xl bg-slate-50 dark:bg-slate-800">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Ruhák">Ruhák</SelectItem>
                  <SelectItem value="Cipők">Cipők</SelectItem>
                  <SelectItem value="Kiegészítők">Kiegészítők</SelectItem>
                  <SelectItem value="Táskák">Táskák</SelectItem>
                  <SelectItem value="Szépségápolás">Szépségápolás</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Állapot:</label>
              <Select value={condition} onValueChange={setCondition}>
                <SelectTrigger className="text-xs rounded-2xl bg-slate-50 dark:bg-slate-800">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Új címkével">Új címkével</SelectItem>
                  <SelectItem value="Újszerű">Újszerű</SelectItem>
                  <SelectItem value="Jó állapotú">Jó állapotú</SelectItem>
                  <SelectItem value="Használt">Használt</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Méret:</label>
              <Input value={size} onChange={(e) => setSize(e.target.value)} className="text-xs rounded-2xl bg-slate-50 dark:bg-slate-800" />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Márka:</label>
              <Input value={brand} onChange={(e) => setBrand(e.target.value)} className="text-xs rounded-2xl bg-slate-50 dark:bg-slate-800" />
            </div>
          </div>

          {/* Leírás */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Leírás (10-2000 karakter):</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              minLength={10}
              maxLength={2000}
              rows={4}
              className="text-xs rounded-2xl bg-slate-50 dark:bg-slate-800"
            />
          </div>

          {/* Képfeltöltő */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Képek kezelése:</label>
            <ImageUploader value={images} onChange={setImages} maxImages={5} />
          </div>

          <div className="flex gap-2 justify-end pt-3 border-t">
            <Button type="button" variant="ghost" onClick={onClose} className="rounded-2xl text-xs font-bold">
              Mégse
            </Button>
            <Button type="submit" className="rounded-2xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white px-6">
              <Save className="w-4 h-4 mr-1.5" /> Módosítások mentése
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
