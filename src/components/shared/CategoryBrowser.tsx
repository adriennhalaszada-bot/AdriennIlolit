import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { getSortedCategoryTree, CategoryNode } from "@/data/categoriesData";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search as SearchIcon, ChevronRight, Sparkles, Layers, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function CategoryBrowser() {
  const [, navigate] = useLocation();
  const categoryTree = useMemo(() => getSortedCategoryTree(), []);

  // Default selected L1 category (Női or Elektronika)
  const [selectedL1Id, setSelectedL1Id] = useState<string>("cat_noi");
  const [searchTerm, setSearchTerm] = useState("");

  const activeL1 = categoryTree.find((cat) => cat.id === selectedL1Id) || categoryTree[0];

  const handleSelectCategory = (categoryName: string) => {
    navigate(`/search?search=${encodeURIComponent(categoryName)}`);
  };

  // Filter subcategories if search term entered
  const filteredChildren = useMemo(() => {
    if (!searchTerm.trim()) return activeL1?.children || [];
    const term = searchTerm.toLowerCase().trim();

    return (activeL1?.children || []).filter((l2) => {
      if (l2.name.toLowerCase().includes(term)) return true;
      if (l2.children?.some((l3) => l3.name.toLowerCase().includes(term))) return true;
      return false;
    });
  }, [activeL1, searchTerm]);

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-6">
      
      {/* Vinted-style Main Category Tabs (L1 Header Pills) */}
      <div className="flex flex-wrap gap-2 pb-4 border-b border-slate-100 dark:border-slate-800">
        {categoryTree.map((l1) => {
          const isSelected = l1.id === selectedL1Id;
          return (
            <button
              key={l1.id}
              type="button"
              onClick={() => {
                setSelectedL1Id(l1.id);
                setSearchTerm("");
              }}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 rounded-2xl font-bold text-xs sm:text-sm transition duration-200 cursor-pointer",
                isSelected
                  ? "bg-purple-600 text-white shadow-md shadow-purple-600/20 scale-[1.02]"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
              )}
            >
              <span>{l1.icon || "🛒"}</span>
              <span>{l1.name}</span>
            </button>
          );
        })}
      </div>

      {/* Category Quick Search Input */}
      <div className="relative">
        <SearchIcon className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
        <Input
          placeholder={`Keresés a(z) "${activeL1?.name}" kategóriában (pl. Cipő, Táska, Óra, Telefon)...`}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 text-xs rounded-2xl bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 font-medium"
        />
        {searchTerm && (
          <button
            onClick={() => setSearchTerm("")}
            className="absolute right-3 top-2.5 text-xs font-bold text-slate-400 hover:text-slate-600"
          >
            Törlés
          </button>
        )}
      </div>

      {/* Vinted-style 2 to 4 Column Subcategory Layout */}
      <div>
        <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <span className="text-lg">{activeL1?.icon || "👗"}</span>
            <h3 className="font-black text-sm uppercase tracking-wider text-slate-900 dark:text-white">
              {activeL1?.name} Kategóriák
            </h3>
          </div>
          <button
            onClick={() => handleSelectCategory(activeL1?.name || "")}
            className="text-xs font-extrabold text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1"
          >
            Összes {activeL1?.name} hirdetés <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filteredChildren.map((l2) => (
            <div key={l2.id} className="space-y-2.5">
              
              {/* Level 2 Section Header */}
              <button
                onClick={() => handleSelectCategory(l2.name)}
                className="font-extrabold text-xs uppercase tracking-wider text-slate-900 dark:text-white hover:text-purple-600 dark:hover:text-purple-400 transition flex items-center justify-between w-full group text-left"
              >
                <span>{l2.name}</span>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition" />
              </button>

              {/* Level 3 Subcategory Item Links */}
              {l2.children && l2.children.length > 0 && (
                <ul className="space-y-1.5 pl-1 border-l-2 border-slate-100 dark:border-slate-800">
                  {l2.children.map((l3) => (
                    <li key={l3.id}>
                      <button
                        onClick={() => handleSelectCategory(l3.name)}
                        className="text-xs text-slate-600 dark:text-slate-400 hover:text-purple-600 dark:hover:text-purple-300 font-medium transition text-left block w-full truncate py-0.5"
                        title={l3.name}
                      >
                        • {l3.name}
                      </button>
                    </li>
                  ))}
                </ul>
              )}

            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
