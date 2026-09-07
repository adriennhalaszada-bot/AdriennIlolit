import { useState } from "react";
import { Link } from "wouter";
import { useFavorites, FavoriteType } from "@/context/FavoritesContext";
import { Store, Sparkles, Wrench, Home, Car, GraduationCap, Heart, Trash2, ExternalLink, ArrowRight, Tag } from "lucide-react";

export function DashboardFavorites() {
  const { favorites, getFavoritesByType, removeFavorite, clearAllFavorites, totalCount } = useFavorites();
  const [activeTab, setActiveTab] = useState<FavoriteType>("marketplace");

  const tabs: { id: FavoriteType; label: string; icon: any; count: number }[] = [
    { id: "marketplace", label: "Piactér", icon: Store, count: getFavoritesByType("marketplace").length },
    { id: "beauty", label: "Szépségipar", icon: Sparkles, count: getFavoritesByType("beauty").length },
    { id: "providers", label: "Szolgáltatások", icon: Wrench, count: getFavoritesByType("providers").length },
    { id: "realestate", label: "Ingatlanok", icon: Home, count: getFavoritesByType("realestate").length },
    { id: "vehicles", label: "Járművek", icon: Car, count: getFavoritesByType("vehicles").length },
    { id: "education", label: "Oktatás", icon: GraduationCap, count: getFavoritesByType("education").length },
  ];

  const currentTabItems = getFavoritesByType(activeTab);

  return (
    <div className="container mx-auto px-4 md:px-6 py-8 max-w-[1280px] space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white flex items-center gap-2.5">
            <Heart className="w-7 h-7 text-rose-600 fill-rose-600" />
            <span>Kedvenceim</span>
          </h1>
          <p className="text-xs md:text-sm font-semibold text-slate-500 mt-1">
            Összesen {totalCount} elmentett elem mind a 6 modulból
          </p>
        </div>

        {totalCount > 0 && (
          <button
            type="button"
            onClick={clearAllFavorites}
            className="text-xs font-extrabold text-rose-600 hover:text-rose-700 flex items-center gap-1.5 px-3 py-2 rounded-xl border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/40 transition self-start sm:self-auto"
          >
            <Trash2 className="w-4 h-4" />
            <span>Összes törlése</span>
          </button>
        )}
      </div>

      {/* 6 Tabs Navigation */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar border-b border-slate-200 dark:border-slate-800">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2.5 rounded-xl text-xs md:text-sm font-extrabold flex items-center gap-2 transition shrink-0 cursor-pointer ${
                isActive
                  ? "bg-rose-600 text-white shadow-md"
                  : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${isActive ? "bg-rose-700 text-white" : "bg-slate-200 dark:bg-slate-800 text-slate-600"}`}>
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Items Display */}
      {currentTabItems.length === 0 ? (
        <div className="p-16 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-4">
          <Heart className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-base font-black text-slate-800 dark:text-white">
            Nincs mentett elem ebben a modulban ({tabs.find(t => t.id === activeTab)?.label})
          </h3>
          <p className="text-xs font-semibold text-slate-500 max-w-sm mx-auto">
            Böngéssz az ajánlatok között, és kattints a szív ikonra a mentéshez!
          </p>
          <Link
            href={`/${activeTab === "marketplace" ? "marketplace" : activeTab === "realestate" ? "real-estate" : activeTab}`}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-extrabold hover:bg-slate-800 transition"
          >
            <span>Böngészés indítása</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {currentTabItems.map((item) => (
            <div
              key={item.id}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm flex flex-col justify-between group hover:shadow-md transition"
            >
              <div className="p-4 space-y-3">
                <div className="relative overflow-hidden rounded-xl h-44">
                  <img
                    src={item.image || "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=600"}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                  />
                  <button
                    type="button"
                    onClick={() => removeFavorite(item.id, item.type)}
                    className="absolute top-2.5 right-2.5 p-2 rounded-xl bg-white/90 dark:bg-slate-900/90 text-rose-600 shadow hover:bg-rose-600 hover:text-white transition"
                    title="Eltávolítás"
                  >
                    <Heart className="w-4 h-4 fill-rose-600" />
                  </button>
                  {item.originalPrice && item.price && item.originalPrice > item.price && (
                    <span className="absolute bottom-2.5 left-2.5 text-[10px] font-black px-2 py-1 rounded-lg bg-rose-600 text-white shadow flex items-center gap-1">
                      <Tag className="w-3 h-3" />
                      Árcsökkenés: -{Math.round(((item.originalPrice - item.price) / item.originalPrice) * 100)}%
                    </span>
                  )}
                </div>

                <div className="space-y-1">
                  {item.location && (
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                      📍 {item.location}
                    </span>
                  )}
                  <h3 className="font-extrabold text-sm md:text-base text-slate-900 dark:text-white line-clamp-2">
                    {item.title}
                  </h3>
                  {item.subtitle && (
                    <p className="text-xs font-semibold text-slate-500 line-clamp-1">
                      {item.subtitle}
                    </p>
                  )}
                </div>
              </div>

              <div className="p-4 pt-0 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between mt-auto">
                <div>
                  {item.price ? (
                    <div className="space-y-0.5">
                      <span className="text-sm md:text-base font-black text-emerald-600">
                        {item.price.toLocaleString("hu-HU")} Ft
                      </span>
                      {item.originalPrice && item.originalPrice > item.price && (
                        <span className="block text-[10px] font-semibold text-slate-400 line-through">
                          {item.originalPrice.toLocaleString("hu-HU")} Ft
                        </span>
                      )}
                    </div>
                  ) : item.rating ? (
                    <span className="text-xs font-bold text-amber-500">
                      ⭐ {item.rating} Értékelés
                    </span>
                  ) : (
                    <span className="text-xs font-bold text-slate-400">
                      Megtekintés
                    </span>
                  )}
                </div>

                <Link
                  href={item.url}
                  className="px-3.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-black hover:bg-emerald-600 hover:text-white transition flex items-center gap-1"
                >
                  <span>Megnyitás</span>
                  <ExternalLink className="w-3 h-3" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
