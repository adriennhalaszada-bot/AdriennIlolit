import { useState } from "react";
import { PackageCheck, Tag, Sparkles, Plus, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface BundleItem {
  id: string;
  title: string;
  priceNum: number;
  image: string;
}

interface BundleDiscountSectionProps {
  sellerName: string;
  otherItemsBySeller: BundleItem[];
  currentProduct: BundleItem;
}

export function BundleDiscountSection({
  sellerName,
  otherItemsBySeller,
  currentProduct,
}: BundleDiscountSectionProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([currentProduct.id]);

  const toggleItem = (id: string) => {
    if (id === currentProduct.id) return; // current item is always locked in
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const count = selectedIds.length;
  const discountPercent = count >= 3 ? 10 : count === 2 ? 5 : 0;

  const allItems = [currentProduct, ...otherItemsBySeller];
  const selectedItems = allItems.filter((item) => selectedIds.includes(item.id));
  const subtotal = selectedItems.reduce((acc, item) => acc + item.priceNum, 0);
  const discountAmount = Math.round((subtotal * discountPercent) / 100);
  const finalPrice = subtotal - discountAmount;

  if (otherItemsBySeller.length === 0) return null;

  return (
    <div className="bg-gradient-to-r from-purple-900/10 via-indigo-900/10 to-blue-900/10 border border-indigo-200 dark:border-indigo-900/40 rounded-3xl p-6 space-y-5">
      <div className="flex items-center justify-between border-b border-indigo-100 dark:border-indigo-900/40 pb-4">
        <div className="flex items-center gap-2">
          <div className="p-2.5 bg-indigo-600 text-white rounded-2xl shadow-md">
            <PackageCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-1 text-[10px] font-black uppercase text-indigo-600 tracking-wider">
              <Sparkles className="w-3 h-3" /> Csomagkedvezmény ettől az eladótól
            </div>
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
              Vásárolj többet {sellerName}-tól és spórolj!
            </h3>
          </div>
        </div>

        {/* Tiers Badge */}
        <div className="flex items-center gap-1.5 text-xs font-black">
          <span className={`px-2.5 py-1 rounded-full border transition ${count === 2 ? "bg-indigo-600 text-white border-indigo-600" : "bg-white dark:bg-slate-900 text-slate-600 border-slate-200"}`}>
            2 termék: -5%
          </span>
          <span className={`px-2.5 py-1 rounded-full border transition ${count >= 3 ? "bg-indigo-600 text-white border-indigo-600" : "bg-white dark:bg-slate-900 text-slate-600 border-slate-200"}`}>
            3+ termék: -10%
          </span>
        </div>
      </div>

      {/* Selectable Products Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Main product */}
        <div className="p-3 bg-white dark:bg-slate-950 rounded-2xl border-2 border-indigo-500 flex items-center gap-3 relative shadow-sm">
          <img
            src={currentProduct.image}
            alt={currentProduct.title}
            className="w-12 h-12 rounded-xl object-cover shrink-0"
          />
          <div className="flex-1 min-w-0">
            <span className="text-[9px] font-black uppercase text-indigo-600 block">Jelenlegi termék</span>
            <h4 className="font-extrabold text-xs text-slate-900 dark:text-white truncate">
              {currentProduct.title}
            </h4>
            <span className="text-xs font-black text-slate-800 dark:text-slate-200">
              {currentProduct.priceNum.toLocaleString()} Ft
            </span>
          </div>
          <div className="w-6 h-6 bg-indigo-600 text-white rounded-full flex items-center justify-center shrink-0">
            <Check className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* Other seller products */}
        {otherItemsBySeller.map((item) => {
          const isSelected = selectedIds.includes(item.id);
          return (
            <div
              key={item.id}
              onClick={() => toggleItem(item.id)}
              className={`p-3 rounded-2xl border flex items-center gap-3 cursor-pointer transition ${
                isSelected
                  ? "bg-white dark:bg-slate-950 border-2 border-indigo-500 shadow-sm"
                  : "bg-slate-50/60 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 hover:border-slate-300"
              }`}
            >
              <img
                src={item.image}
                alt={item.title}
                className="w-12 h-12 rounded-xl object-cover shrink-0"
              />
              <div className="flex-1 min-w-0">
                <h4 className="font-extrabold text-xs text-slate-900 dark:text-white truncate">
                  {item.title}
                </h4>
                <span className="text-xs font-black text-slate-800 dark:text-slate-200">
                  +{item.priceNum.toLocaleString()} Ft
                </span>
              </div>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 border ${
                isSelected ? "bg-indigo-600 text-white border-indigo-600" : "border-slate-300 text-slate-400"
              }`}>
                {isSelected ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
              </div>
            </div>
          );
        })}
      </div>

      {/* Bundle Summary Bar */}
      <div className="p-4 bg-white dark:bg-slate-950 border border-indigo-200 dark:border-indigo-900/40 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black uppercase text-indigo-600">
              Csomag összesen ({count} termék):
            </span>
            {discountPercent > 0 && (
              <span className="text-xs font-black bg-rose-500 text-white px-2 py-0.5 rounded-full">
                −{discountPercent}% Csomagkedvezmény!
              </span>
            )}
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400">
              {finalPrice.toLocaleString()} Ft
            </span>
            {discountAmount > 0 && (
              <span className="text-xs font-bold text-slate-400 line-through">
                {subtotal.toLocaleString()} Ft
              </span>
            )}
          </div>
        </div>

        <Button
          type="button"
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl px-5 py-2.5 shadow-md shadow-indigo-600/30 shrink-0"
        >
          <Tag className="w-4 h-4 mr-1.5" /> Csomag Kosárba Tétele ({discountAmount > 0 ? `Spórolsz ${discountAmount.toLocaleString()} Ft-ot` : "Fix Ár"})
        </Button>
      </div>
    </div>
  );
}
