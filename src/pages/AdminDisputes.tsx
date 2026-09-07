import { useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, ShieldCheck, CheckCircle, RefreshCw, UserX, Search, MessageSquare, Ban } from "lucide-react";
import { cn } from "@/lib/utils";

interface DisputeItem {
  id: string;
  itemTitle: string;
  itemPrice: string;
  buyerName: string;
  sellerName: string;
  reason: "no_show" | "not_as_described" | "shipping_issue" | "fake_product";
  status: "open" | "refunded" | "paid_out" | "dismissed";
  date: string;
  description: string;
}

const MOCK_DISPUTES: DisputeItem[] = [
  {
    id: "disp_101",
    itemTitle: "Zara Elegáns Bőrdzseki M-es",
    itemPrice: "14 500 Ft",
    buyerName: "Kovács Anna",
    sellerName: "Nagy Éva",
    reason: "not_as_described",
    status: "open",
    date: "2026-08-20",
    description: "A kabát ujján szakadás található, ami nem szerepelt a leírásban és a képeken sem.",
  },
  {
    id: "disp_102",
    itemTitle: "Nike Air Force 1 Sárga Sneaker (38)",
    itemPrice: "22 000 Ft",
    buyerName: "Tóth Gábor",
    sellerName: "Molnár Balázs",
    reason: "no_show",
    status: "open",
    date: "2026-08-19",
    description: "Az eladó 5 napja nem adta fel a csomagot a FoxPost automatánál.",
  },
  {
    id: "disp_103",
    itemTitle: "Gucci Bőr Pénztárca (Eredeti)",
    itemPrice: "45 000 Ft",
    buyerName: "Szabó Lilla",
    sellerName: "Fekete Zoltán",
    reason: "fake_product",
    status: "refunded",
    date: "2026-08-15",
    description: "A kapott termék másolat, a sorozatszáma nem eredeti.",
  },
];

export function AdminDisputes() {
  const [disputes, setDisputes] = useState<DisputeItem[]>(MOCK_DISPUTES);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDispute, setSelectedDispute] = useState<DisputeItem | null>(MOCK_DISPUTES[0]);

  const handleResolve = (id: string, action: "refund" | "payout" | "dismiss") => {
    setDisputes((prev) =>
      prev.map((d) => {
        if (d.id === id) {
          const newStatus = action === "refund" ? "refunded" : action === "payout" ? "paid_out" : "dismissed";
          return { ...d, status: newStatus };
        }
        return d;
      })
    );
    if (selectedDispute?.id === id) {
      setSelectedDispute((prev) => prev ? { ...prev, status: action === "refund" ? "refunded" : action === "payout" ? "paid_out" : "dismissed" } : null);
    }
  };

  const filteredDisputes = disputes.filter((d) =>
    d.itemTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.buyerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.sellerName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Fejléc */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <ShieldCheck className="w-6 h-6 text-rose-600" />
              <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100">Moderáció & Vitarendezés (Admin)</h1>
            </div>
            <p className="text-xs text-slate-500">Kezeld a vásárlói panaszokat, nem-megjelenéseket és hamisítvány bejelentéseket!</p>
          </div>

          <div className="flex items-center gap-3">
            <Badge variant="outline" className="text-xs font-bold px-3 py-1 bg-amber-50 text-amber-700 border-amber-300">
              {disputes.filter((d) => d.status === "open").length} Nyitott ügy
            </Badge>
          </div>
        </div>

        {/* Kereső */}
        <div className="relative mb-6">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Keresés termék, vevő vagy eladó neve alapján..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 text-xs rounded-2xl bg-white dark:bg-slate-900 border-slate-200"
          />
        </div>

        {/* Fő tartalom grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Lista bal oldalon */}
          <div className="space-y-3">
            <h3 className="font-extrabold text-sm text-slate-900 dark:text-slate-100 mb-2">Bejelentett ügyek:</h3>
            {filteredDisputes.map((d) => {
              const isSelected = d.id === selectedDispute?.id;

              return (
                <div
                  key={d.id}
                  onClick={() => setSelectedDispute(d)}
                  className={cn(
                    "p-4 rounded-2xl border transition-all cursor-pointer space-y-2",
                    isSelected
                      ? "bg-rose-50/80 dark:bg-rose-950/40 border-rose-500 shadow-sm scale-[1.01]"
                      : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-rose-300"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-400">#{d.id}</span>
                    <Badge
                      className={cn(
                        "text-[10px] font-bold rounded-lg px-2 py-0.5",
                        d.status === "open"
                          ? "bg-amber-100 text-amber-800"
                          : d.status === "refunded"
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-blue-100 text-blue-800"
                      )}
                    >
                      {d.status === "open" ? "Nyitott" : d.status === "refunded" ? "Visszatérítve" : "Kifizetve"}
                    </Badge>
                  </div>

                  <h4 className="font-extrabold text-xs text-slate-900 dark:text-slate-100 truncate">{d.itemTitle}</h4>
                  <div className="text-[11px] text-slate-500 flex justify-between">
                    <span>Vevő: {d.buyerName}</span>
                    <span>Eladó: {d.sellerName}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Részletező és bírálat jobb oldalon */}
          {selectedDispute ? (
            <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-6">
              <div className="flex items-start justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
                <div>
                  <span className="text-xs font-bold text-slate-400">Ügy azonosító: #{selectedDispute.id} ({selectedDispute.date})</span>
                  <h2 className="font-black text-lg text-slate-900 dark:text-slate-100 mt-1">{selectedDispute.itemTitle}</h2>
                  <p className="text-sm font-extrabold text-rose-600 mt-0.5">{selectedDispute.itemPrice}</p>
                </div>
              </div>

              {/* Részletek */}
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700">
                  <span className="text-slate-400 font-bold">Vevő (Panaszos):</span>
                  <p className="font-extrabold text-slate-900 dark:text-slate-100 text-sm mt-0.5">{selectedDispute.buyerName}</p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700">
                  <span className="text-slate-400 font-bold">Eladó:</span>
                  <p className="font-extrabold text-slate-900 dark:text-slate-100 text-sm mt-0.5">{selectedDispute.sellerName}</p>
                </div>
              </div>

              {/* Panasz leírása */}
              <div className="bg-amber-50/60 dark:bg-amber-950/30 p-4 rounded-2xl border border-amber-200 dark:border-amber-900 space-y-1">
                <h5 className="font-extrabold text-xs text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600" /> Panasz indoklása:
                </h5>
                <p className="text-xs text-amber-800 dark:text-amber-200 leading-relaxed">{selectedDispute.description}</p>
              </div>

              {/* Admin Bírálati Akciók */}
              {selectedDispute.status === "open" ? (
                <div className="space-y-3 pt-2">
                  <h4 className="font-extrabold text-xs text-slate-900 dark:text-slate-100">Bírálati döntés meghozatala:</h4>
                  <div className="flex flex-wrap gap-3">
                    <Button
                      onClick={() => handleResolve(selectedDispute.id, "refund")}
                      className="rounded-2xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      <RefreshCw className="w-4 h-4 mr-1.5" /> Visszatérítés a Vevőnek
                    </Button>
                    <Button
                      onClick={() => handleResolve(selectedDispute.id, "payout")}
                      className="rounded-2xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      <CheckCircle className="w-4 h-4 mr-1.5" /> Kifizetés az Eladónak
                    </Button>
                    <Button
                      onClick={() => handleResolve(selectedDispute.id, "dismiss")}
                      variant="outline"
                      className="rounded-2xl text-xs font-bold text-slate-600"
                    >
                      <Ban className="w-4 h-4 mr-1.5" /> Panasz elutasítása
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 text-emerald-800 dark:text-emerald-200 text-xs font-bold flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-emerald-600" />
                  <span>Az ügy lezárva: {selectedDispute.status === "refunded" ? "Pénzvisszatérítés teljesítve" : "Kifizetés jóváhagyva"}</span>
                </div>
              )}
            </div>
          ) : (
            <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 text-center text-slate-400">
              Válassz ki egy ügyet a bal oldali listából!
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
