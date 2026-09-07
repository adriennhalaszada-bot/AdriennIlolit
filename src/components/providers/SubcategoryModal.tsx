import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Sparkles, Check, ArrowRight } from "lucide-react";
import type { ProviderCategory } from "@/data/allProvidersData";

interface SubcategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  category: ProviderCategory | null;
  onSelectSubcategory: (categoryName: string, subcategoryName: string) => void;
}

export function SubcategoryModal({ isOpen, onClose, category, onSelectSubcategory }: SubcategoryModalProps) {
  const [filterText, setFilterText] = useState("");

  if (!category) return null;

  const filteredSubs = category.subcategories.filter((sub) =>
    sub.toLowerCase().includes(filterText.toLowerCase())
  );

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl p-6 max-h-[85vh] overflow-y-auto rounded-3xl">
        <DialogHeader className="space-y-1">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-emerald-600" />
            <Badge className="bg-emerald-600 text-white font-extrabold text-[10px]">
              {category.subcategories.length} ALKATEGÓRIA & SZAKMA
            </Badge>
          </div>
          <DialogTitle className="text-2xl font-black text-slate-900 dark:text-slate-100">
            {category.name}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Böngéssz az ágazathoz tartozó összes specifikus szakterület és alszolgáltatás között!
          </DialogDescription>
        </DialogHeader>

        {/* Search input inside modal */}
        <div className="relative my-3">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            type="text"
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            placeholder="Szűrés a szakmák között (Pl. hegesztő, kozmetikus, cipész)..."
            className="pl-10 py-5 text-xs rounded-xl border-slate-300 font-medium"
          />
        </div>

        {/* Subcategories Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
          {filteredSubs.map((sub) => (
            <button
              key={sub}
              type="button"
              onClick={() => {
                onSelectSubcategory(category.name, sub);
                onClose();
              }}
              className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 hover:border-emerald-500 transition-all text-left group flex items-center justify-between"
            >
              <div>
                <div className="text-xs font-extrabold text-slate-900 dark:text-slate-100 group-hover:text-emerald-700 dark:group-hover:text-emerald-400">
                  {sub}
                </div>
                <div className="text-[10px] font-medium text-slate-500 mt-0.5">
                  Időpontfoglalás & Bemutató profilok
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 transition group-hover:translate-x-0.5" />
            </button>
          ))}
        </div>

        {filteredSubs.length === 0 && (
          <div className="text-center py-8 text-xs text-slate-400">
            Nem található keresésnek megfelelő alkategória ebben az ágazatban.
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
