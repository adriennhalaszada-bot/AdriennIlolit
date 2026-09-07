import { useState, useEffect } from "react";
import {
  Bell,
  Check,
  X,
  Mail,
  Smartphone,
  Globe,
  MessageSquare,
  TrendingDown,
  Sparkles,
  ShieldCheck,
  Clock,
  Send
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

export interface FollowSellerSettings {
  notifyNewListings: boolean;
  notifyPriceDrops: boolean;
  notifyBundles: boolean;
  channelWeb: boolean;
  channelEmail: boolean;
  channelPush: boolean;
  channelSms: boolean;
  frequency: "instant" | "hourly" | "daily";
  minDiscountPercent: number;
}

interface FollowSellerConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  sellerId: string;
  sellerName: string;
  onSave?: (settings: FollowSellerSettings) => void;
}

export function FollowSellerConfigModal({
  isOpen,
  onClose,
  sellerId,
  sellerName,
  onSave,
}: FollowSellerConfigModalProps) {
  const { toast } = useToast();

  const [settings, setSettings] = useState<FollowSellerSettings>({
    notifyNewListings: true,
    notifyPriceDrops: true,
    notifyBundles: true,
    channelWeb: true,
    channelEmail: true,
    channelPush: false,
    channelSms: false,
    frequency: "instant",
    minDiscountPercent: 5,
  });

  useEffect(() => {
    if (sellerId) {
      const saved = localStorage.getItem(`seller_config_${sellerId}`);
      if (saved) {
        try {
          setSettings(JSON.parse(saved));
        } catch (e) {
          console.warn("Could not parse seller config", e);
        }
      }
    }
  }, [sellerId]);

  if (!isOpen) return null;

  const handleSave = () => {
    localStorage.setItem(`seller_config_${sellerId}`, JSON.stringify(settings));
    localStorage.setItem(`followed_seller_${sellerId}`, "true");
    if (onSave) onSave(settings);

    toast({
      title: "⚙️ Beállítások elmentve!",
      description: `@${sellerName} értesítési szabályai sikeresen frissültek.`,
    });
    onClose();
  };

  const handleSendTestNotification = () => {
    toast({
      title: `🔔 [TESZT ÉRTESÍTÉS] @${sellerName}`,
      description: `Ez egy szimulált értesítés. Beállított csatornák: ${
        [
          settings.channelWeb && "Böngésző Web",
          settings.channelEmail && "E-mail",
          settings.channelPush && "Push",
          settings.channelSms && "SMS",
        ]
          .filter(Boolean)
          .join(", ") || "Nincs kijelölve"
      }.`,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-6 overflow-hidden max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <Bell className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                Eladó Értesítési Beállításai
              </h3>
              <p className="text-xs text-slate-500">
                Testreszabott értesítések: <strong className="text-indigo-600 dark:text-indigo-400">@{sellerName}</strong>
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

        {/* Triggers Section */}
        <div className="space-y-3">
          <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
            <span>Milyen eseményekről kérsz értesítést?</span>
          </h4>

          <div className="space-y-2">
            <label className="flex items-center justify-between p-3 rounded-2xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer transition">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold text-xs">
                  ✨
                </div>
                <div>
                  <span className="text-xs font-extrabold text-slate-900 dark:text-white block">
                    Új hirdetés feltöltésekor
                  </span>
                  <span className="text-[10px] text-slate-400">
                    Azonnali jelzés, ha @{sellerName} új terméket tölt fel
                  </span>
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings.notifyNewListings}
                onChange={(e) =>
                  setSettings({ ...settings, notifyNewListings: e.target.checked })
                }
                className="w-4 h-4 accent-indigo-600 rounded"
              />
            </label>

            <label className="flex items-center justify-between p-3 rounded-2xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer transition">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold text-xs">
                  <TrendingDown className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-extrabold text-slate-900 dark:text-white block">
                    Árcsökkenés esetén
                  </span>
                  <span className="text-[10px] text-slate-400">
                    Értesítés, ha az eladó csökkenti meglévő hirdetése árát
                  </span>
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings.notifyPriceDrops}
                onChange={(e) =>
                  setSettings({ ...settings, notifyPriceDrops: e.target.checked })
                }
                className="w-4 h-4 accent-indigo-600 rounded"
              />
            </label>

            <label className="flex items-center justify-between p-3 rounded-2xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer transition">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center font-bold text-xs">
                  🎁
                </div>
                <div>
                  <span className="text-xs font-extrabold text-slate-900 dark:text-white block">
                    Csomagkedvezmények & Akciók
                  </span>
                  <span className="text-[10px] text-slate-400">
                    Új többdarabos csomagajánlatok közzétételekor
                  </span>
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings.notifyBundles}
                onChange={(e) =>
                  setSettings({ ...settings, notifyBundles: e.target.checked })
                }
                className="w-4 h-4 accent-indigo-600 rounded"
              />
            </label>
          </div>
        </div>

        {/* Channels Section */}
        <div className="space-y-3">
          <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Globe className="w-3.5 h-3.5 text-indigo-500" />
            <span>Hol szeretnéd kapni az értesítéseket?</span>
          </h4>

          <div className="grid grid-cols-2 gap-2.5">
            <label
              className={`p-3 rounded-2xl border flex items-center gap-2.5 cursor-pointer transition ${
                settings.channelWeb
                  ? "border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300 font-extrabold"
                  : "border-slate-200 dark:border-slate-800 text-slate-500"
              }`}
            >
              <input
                type="checkbox"
                checked={settings.channelWeb}
                onChange={(e) =>
                  setSettings({ ...settings, channelWeb: e.target.checked })
                }
                className="accent-indigo-600"
              />
              <span className="text-xs">🌐 Webes Harang</span>
            </label>

            <label
              className={`p-3 rounded-2xl border flex items-center gap-2.5 cursor-pointer transition ${
                settings.channelEmail
                  ? "border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300 font-extrabold"
                  : "border-slate-200 dark:border-slate-800 text-slate-500"
              }`}
            >
              <input
                type="checkbox"
                checked={settings.channelEmail}
                onChange={(e) =>
                  setSettings({ ...settings, channelEmail: e.target.checked })
                }
                className="accent-indigo-600"
              />
              <span className="text-xs">✉️ E-mail értesítő</span>
            </label>

            <label
              className={`p-3 rounded-2xl border flex items-center gap-2.5 cursor-pointer transition ${
                settings.channelPush
                  ? "border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300 font-extrabold"
                  : "border-slate-200 dark:border-slate-800 text-slate-500"
              }`}
            >
              <input
                type="checkbox"
                checked={settings.channelPush}
                onChange={(e) =>
                  setSettings({ ...settings, channelPush: e.target.checked })
                }
                className="accent-indigo-600"
              />
              <span className="text-xs">📱 Mobil Push</span>
            </label>

            <label
              className={`p-3 rounded-2xl border flex items-center gap-2.5 cursor-pointer transition ${
                settings.channelSms
                  ? "border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300 font-extrabold"
                  : "border-slate-200 dark:border-slate-800 text-slate-500"
              }`}
            >
              <input
                type="checkbox"
                checked={settings.channelSms}
                onChange={(e) =>
                  setSettings({ ...settings, channelSms: e.target.checked })
                }
                className="accent-indigo-600"
              />
              <span className="text-xs">💬 SMS üzenet</span>
            </label>
          </div>
        </div>

        {/* Frequency & Options */}
        <div className="space-y-3">
          <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-indigo-500" />
            <span>Értesítések Gyakorisága</span>
          </h4>

          <div className="grid grid-cols-3 gap-2">
            {[
              { id: "instant", label: "⚡ Azonnal" },
              { id: "hourly", label: "⏱️ Óránként" },
              { id: "daily", label: "🌙 Napi 1x (19:00)" },
            ].map((freq) => (
              <button
                key={freq.id}
                type="button"
                onClick={() =>
                  setSettings({
                    ...settings,
                    frequency: freq.id as "instant" | "hourly" | "daily",
                  })
                }
                className={`py-2 px-3 rounded-xl border text-xs font-black transition ${
                  settings.frequency === freq.id
                    ? "bg-indigo-600 text-white border-indigo-600 shadow-md"
                    : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300"
                }`}
              >
                {freq.label}
              </button>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={handleSendTestNotification}
            className="rounded-2xl text-xs font-bold border-slate-300 flex items-center gap-1.5"
          >
            <Send className="w-3.5 h-3.5 text-indigo-600" />
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
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-2xl text-xs px-5 shadow-lg shadow-indigo-600/30"
            >
              <Check className="w-4 h-4 mr-1" /> Mentés & Követés
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
