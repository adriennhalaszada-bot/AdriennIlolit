import { useState } from "react";
import {
  Bell,
  Check,
  X,
  Mail,
  Smartphone,
  Globe,
  TrendingDown,
  Sparkles,
  Clock,
  Send,
  MapPin,
  Tag,
  ShieldCheck,
  DollarSign
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSavedSearches } from "@/context/SavedSearchesContext";
import { useToast } from "@/hooks/use-toast";

interface SavedSearchConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTitle?: string;
  defaultQuery?: string;
  defaultLocation?: string;
  defaultModule?: "universal" | "marketplace" | "vehicles" | "realestate" | "beauty" | "providers" | "education";
}

export function SavedSearchConfigModal({
  isOpen,
  onClose,
  defaultTitle = "",
  defaultQuery = "",
  defaultLocation = "",
  defaultModule = "universal",
}: SavedSearchConfigModalProps) {
  const { addSavedSearch } = useSavedSearches();
  const { toast } = useToast();

  const [title, setTitle] = useState(defaultTitle || defaultQuery || "Egyedi Hirdetésfigyelő");
  const [query, setQuery] = useState(defaultQuery);
  const [location, setLocation] = useState(defaultLocation);
  const [module, setModule] = useState(defaultModule);

  // Notification controls
  const [notifyNewListings, setNotifyNewListings] = useState(true);
  const [notifyPriceDrops, setNotifyPriceDrops] = useState(true);
  const [onlyVerifiedSellers, setOnlyVerifiedSellers] = useState(false);

  // Channels
  const [channelWeb, setChannelWeb] = useState(true);
  const [channelEmail, setChannelEmail] = useState(true);
  const [channelPush, setChannelPush] = useState(false);
  const [channelSms, setChannelSms] = useState(false);

  // Frequency
  const [frequency, setFrequency] = useState<"instant" | "hourly" | "daily">("instant");

  if (!isOpen) return null;

  const handleSave = () => {
    if (!title.trim()) return;

    addSavedSearch({
      title: title.trim(),
      module: module,
      query: query,
      location: location,
      filtersSummary: `Modul: ${module.toUpperCase()} · Keresés: "${query || title}" · Település: ${location || "Országos"}${onlyVerifiedSellers ? " · Csak VERIFIED" : ""}`,
      url: `/${module}?q=${encodeURIComponent(query)}&city=${encodeURIComponent(location)}`,
      notifyWeb: channelWeb,
      notifyEmail: channelEmail,
    });

    toast({
      title: "🔔 Hirdetésfigyelő beállítva!",
      description: `Az értesítések beállítása elmentve: "${title}". Csatornák: ${[channelWeb && "Web", channelEmail && "E-mail", channelPush && "Push"].filter(Boolean).join(", ")}.`,
    });

    onClose();
  };

  const handleSendTestNotification = () => {
    toast({
      title: `🔔 [TESZT ÉRTESÍTÉS] ${title}`,
      description: `Minta találat a beállított szűrők alapján (${location || "Országos"}, ${query || "Összes kategória"}). Értesítési módszer: ${frequency === "instant" ? "Azonnali" : "Összefoglaló"}.`,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-6 overflow-hidden max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <Bell className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                Intelligens Hirdetésfigyelő Beállítása
              </h3>
              <p className="text-xs text-slate-500">
                Személyre szabott értesítési szabályok és csatornák beállítása
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Basic Search Filter Settings */}
        <div className="space-y-3">
          <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Tag className="w-3.5 h-3.5 text-emerald-500" />
            <span>Keresési Szűrők & Célkitűzés</span>
          </h4>

          <div className="space-y-3">
            <div>
              <label className="text-xs font-bold text-slate-500 block mb-1">
                Figyelő megnevezése *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="pl. Eladó családi ház Miskolc környékén"
                className="w-full px-3 py-2.5 border rounded-xl text-xs font-bold bg-slate-50 dark:bg-slate-950 border-slate-300 dark:border-slate-700 outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-500 block mb-1">
                  Keresőszó / Kategória
                </label>
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="pl. BMW, Lakás, Kozmetikus"
                  className="w-full px-3 py-2 border rounded-xl text-xs font-semibold bg-slate-50 dark:bg-slate-950 border-slate-300 dark:border-slate-700 outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 block mb-1">
                  Település szűrés
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="pl. Miskolc, Budapest"
                  className="w-full px-3 py-2 border rounded-xl text-xs font-semibold bg-slate-50 dark:bg-slate-950 border-slate-300 dark:border-slate-700 outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Triggers Section */}
        <div className="space-y-3">
          <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
            <span>Milyen esemény indítson értesítést?</span>
          </h4>

          <div className="space-y-2">
            <label className="flex items-center justify-between p-3 rounded-2xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer transition">
              <span className="text-xs font-extrabold text-slate-800 dark:text-slate-200">
                ✨ Új egyező hirdetés megjelenésekor
              </span>
              <input
                type="checkbox"
                checked={notifyNewListings}
                onChange={(e) => setNotifyNewListings(e.target.checked)}
                className="w-4 h-4 accent-emerald-600"
              />
            </label>

            <label className="flex items-center justify-between p-3 rounded-2xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer transition">
              <span className="text-xs font-extrabold text-slate-800 dark:text-slate-200">
                📉 Meglévő hirdetés árcsökkenése esetén
              </span>
              <input
                type="checkbox"
                checked={notifyPriceDrops}
                onChange={(e) => setNotifyPriceDrops(e.target.checked)}
                className="w-4 h-4 accent-emerald-600"
              />
            </label>

            <label className="flex items-center justify-between p-3 rounded-2xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer transition">
              <span className="text-xs font-extrabold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-amber-500" />
                Csak ILOLIT VERIFIED ellenőrzött eladóktól
              </span>
              <input
                type="checkbox"
                checked={onlyVerifiedSellers}
                onChange={(e) => setOnlyVerifiedSellers(e.target.checked)}
                className="w-4 h-4 accent-emerald-600"
              />
            </label>
          </div>
        </div>

        {/* Channels Section */}
        <div className="space-y-3">
          <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Globe className="w-3.5 h-3.5 text-emerald-500" />
            <span>Értesítési Csatornák</span>
          </h4>

          <div className="grid grid-cols-2 gap-2.5">
            <label
              className={`p-3 rounded-2xl border flex items-center gap-2 cursor-pointer transition ${
                channelWeb
                  ? "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 font-extrabold"
                  : "border-slate-200 dark:border-slate-800 text-slate-500"
              }`}
            >
              <input
                type="checkbox"
                checked={channelWeb}
                onChange={(e) => setChannelWeb(e.target.checked)}
                className="accent-emerald-600"
              />
              <span className="text-xs">🌐 Webes Harang</span>
            </label>

            <label
              className={`p-3 rounded-2xl border flex items-center gap-2 cursor-pointer transition ${
                channelEmail
                  ? "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 font-extrabold"
                  : "border-slate-200 dark:border-slate-800 text-slate-500"
              }`}
            >
              <input
                type="checkbox"
                checked={channelEmail}
                onChange={(e) => setChannelEmail(e.target.checked)}
                className="accent-emerald-600"
              />
              <span className="text-xs">✉️ E-mail értesítő</span>
            </label>

            <label
              className={`p-3 rounded-2xl border flex items-center gap-2 cursor-pointer transition ${
                channelPush
                  ? "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 font-extrabold"
                  : "border-slate-200 dark:border-slate-800 text-slate-500"
              }`}
            >
              <input
                type="checkbox"
                checked={channelPush}
                onChange={(e) => setChannelPush(e.target.checked)}
                className="accent-emerald-600"
              />
              <span className="text-xs">📱 Mobil Push</span>
            </label>

            <label
              className={`p-3 rounded-2xl border flex items-center gap-2 cursor-pointer transition ${
                channelSms
                  ? "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 font-extrabold"
                  : "border-slate-200 dark:border-slate-800 text-slate-500"
              }`}
            >
              <input
                type="checkbox"
                checked={channelSms}
                onChange={(e) => setChannelSms(e.target.checked)}
                className="accent-emerald-600"
              />
              <span className="text-xs">💬 SMS üzenet</span>
            </label>
          </div>
        </div>

        {/* Frequency */}
        <div className="space-y-3">
          <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-emerald-500" />
            <span>Gyakoriság</span>
          </h4>

          <div className="grid grid-cols-3 gap-2">
            {[
              { id: "instant", label: "⚡ Azonnal" },
              { id: "hourly", label: "⏱️ Óránként" },
              { id: "daily", label: "🌙 Napi 1x" },
            ].map((freq) => (
              <button
                key={freq.id}
                type="button"
                onClick={() => setFrequency(freq.id as any)}
                className={`py-2 px-3 rounded-xl border text-xs font-black transition ${
                  frequency === freq.id
                    ? "bg-emerald-600 text-white border-emerald-600 shadow-md"
                    : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300"
                }`}
              >
                {freq.label}
              </button>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={handleSendTestNotification}
            className="rounded-2xl text-xs font-bold border-slate-300 flex items-center gap-1.5"
          >
            <Send className="w-3.5 h-3.5 text-emerald-600" />
            <span>Teszt Küldése</span>
          </Button>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              className="rounded-2xl text-xs font-bold"
            >
              Mégse
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              disabled={!title.trim()}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-2xl text-xs px-5 shadow-lg shadow-emerald-600/30"
            >
              <Check className="w-4 h-4 mr-1" /> Mentés & Indítás
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
