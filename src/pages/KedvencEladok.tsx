import { useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { Heart, Bell, Package, UserX, Settings, Sparkles, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { cn } from "@/lib/utils";
import { FollowSellerConfigModal } from "@/components/marketplace/FollowSellerConfigModal";
import { useToast } from "@/hooks/use-toast";

interface FavSeller {
  id: string;
  username: string;
  avatarUrl?: string;
  activeListings: number;
  newSince?: string;
  notify: boolean;
  notifyNewListings: boolean;
  notifyPriceDrops: boolean;
  channels: string[];
}

const INITIAL_SELLERS: FavSeller[] = [
  {
    id: "1",
    username: "fashionlover_92",
    activeListings: 14,
    newSince: "2 napja",
    notify: true,
    notifyNewListings: true,
    notifyPriceDrops: true,
    channels: ["Web", "E-mail"],
  },
  {
    id: "2",
    username: "techdeals_hu",
    activeListings: 7,
    notify: false,
    notifyNewListings: false,
    notifyPriceDrops: true,
    channels: ["Web"],
  },
  {
    id: "3",
    username: "miskolc_auto_kft",
    activeListings: 22,
    newSince: "Tegnap",
    notify: true,
    notifyNewListings: true,
    notifyPriceDrops: true,
    channels: ["Web", "E-mail", "Push"],
  },
];

export function KedvencEladok() {
  const { toast } = useToast();
  const [sellers, setSellers] = useState<FavSeller[]>(INITIAL_SELLERS);

  // Config modal state
  const [selectedSeller, setSelectedSeller] = useState<FavSeller | null>(null);
  const [isConfigOpen, setIsConfigOpen] = useState(false);

  const toggleNotify = (id: string) =>
    setSellers((prev) =>
      prev.map((s) => (s.id === id ? { ...s, notify: !s.notify } : s))
    );

  const unfollow = (id: string) =>
    setSellers((prev) => prev.filter((s) => s.id !== id));

  const openConfig = (seller: FavSeller) => {
    setSelectedSeller(seller);
    setIsConfigOpen(true);
  };

  const handleTestAlert = (seller: FavSeller) => {
    toast({
      title: `🔔 [TESZT ÉRTESÍTÉS] @${seller.username}`,
      description: `@${seller.username} új hirdetést töltött fel: "Samsung Galaxy S24 Ultra (Borsod)". Értesítés kiküldve: ${seller.channels.join(", ")}.`,
    });
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 md:px-6 py-8 max-w-4xl space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white flex items-center gap-2.5">
              <Heart className="w-7 h-7 text-rose-500 fill-rose-500/20" />
              <span>Követett Eladók & Szolgáltatók</span>
            </h1>
            <p className="text-xs md:text-sm font-semibold text-slate-500 mt-1">
              Kezeld a követett kereskedők értesítési szabályait, árcsökkenési és új termék riasztásait!
            </p>
          </div>

          <Button asChild className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-xs">
            <Link href="/universal-search">Új eladók keresése</Link>
          </Button>
        </div>

        {/* Sellers List */}
        {sellers.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 space-y-3">
            <Heart className="w-12 h-12 text-slate-300 mx-auto opacity-30" />
            <h3 className="text-base font-black text-slate-800 dark:text-white">Még nem követsz egy eladót sem</h3>
            <p className="text-xs text-slate-500 font-medium">
              Az eladók és szolgáltatók profilján a "+ Eladó követése" gombra kattintva tudod beállítani az értesítéseket.
            </p>
            <Button asChild className="mt-2 bg-indigo-600 text-white rounded-xl">
              <Link href="/universal-search">Böngészés a platformon</Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {sellers.map((seller) => (
              <div
                key={seller.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm hover:shadow-md transition flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-xl font-black shrink-0 shadow-inner">
                    {seller.username.charAt(0).toUpperCase()}
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/profile/${seller.username}`}
                        className="font-black text-base text-slate-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 transition"
                      >
                        @{seller.username}
                      </Link>
                      {seller.newSince && (
                        <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-[10px] font-black">
                          ✨ Új termék: {seller.newSince}
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-xs text-slate-500 font-semibold flex-wrap">
                      <span className="flex items-center gap-1">
                        <Package className="w-3.5 h-3.5 text-indigo-500" />
                        {seller.activeListings} aktív hirdetés
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1 text-slate-400">
                        💬 Értesítési csatornák:{" "}
                        <strong className="text-slate-700 dark:text-slate-300">
                          {seller.channels.join(", ")}
                        </strong>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right controls */}
                <div className="flex items-center gap-2 shrink-0 pt-3 md:pt-0 border-t md:border-t-0 border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => handleTestAlert(seller)}
                    className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 text-slate-700 dark:text-slate-300 text-xs font-bold transition flex items-center gap-1.5"
                    title="Teszt értesítés küldése"
                  >
                    <Send className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Teszt</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => openConfig(seller)}
                    className="px-3.5 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 border border-indigo-200 dark:border-indigo-800 text-xs font-black transition flex items-center gap-1.5"
                    title="Beállítások módosítása"
                  >
                    <Settings className="w-3.5 h-3.5 text-indigo-600" />
                    <span>⚙️ Beállítások</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => toggleNotify(seller.id)}
                    title={seller.notify ? "Értesítés felfüggesztése" : "Értesítés bekapcsolása"}
                    className={cn(
                      "p-2 rounded-xl transition border",
                      seller.notify
                        ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 text-emerald-700 dark:text-emerald-400"
                        : "bg-slate-100 dark:bg-slate-800 border-slate-200 text-slate-400"
                    )}
                  >
                    <Bell className={cn("w-4 h-4", seller.notify && "fill-emerald-500/20")} />
                  </button>

                  <button
                    type="button"
                    onClick={() => unfollow(seller.id)}
                    title="Követés törlése"
                    className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                  >
                    <UserX className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Config Modal Instance */}
        {selectedSeller && (
          <FollowSellerConfigModal
            isOpen={isConfigOpen}
            onClose={() => setIsConfigOpen(false)}
            sellerId={selectedSeller.id}
            sellerName={selectedSeller.username}
            onSave={(newSettings) => {
              setSellers((prev) =>
                prev.map((s) =>
                  s.id === selectedSeller.id
                    ? {
                        ...s,
                        notifyNewListings: newSettings.notifyNewListings,
                        notifyPriceDrops: newSettings.notifyPriceDrops,
                        channels: [
                          newSettings.channelWeb && "Web",
                          newSettings.channelEmail && "E-mail",
                          newSettings.channelPush && "Push",
                          newSettings.channelSms && "SMS",
                        ].filter(Boolean) as string[],
                      }
                    : s
                )
              );
            }}
          />
        )}
      </div>
    </Layout>
  );
}
