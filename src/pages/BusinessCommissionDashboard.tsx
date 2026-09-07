import { useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Building2, 
  Receipt, 
  TrendingUp, 
  DollarSign, 
  CheckCircle2, 
  Clock, 
  FileText, 
  ArrowUpRight,
  Download,
  AlertCircle
} from "lucide-react";
import { 
  getMonthlyCommissionSettlements, 
  getBusinessSalesRecords, 
  markSettlementPaid, 
  MonthlyCommissionSettlement 
} from "@/lib/commissionStore";
import { formatPrice } from "@/lib/constants";
import { useToast } from "@/hooks/use-toast";

export function BusinessCommissionDashboard() {
  const { toast } = useToast();
  const [settlements, setSettlements] = useState<MonthlyCommissionSettlement[]>(() => 
    getMonthlyCommissionSettlements()
  );
  const sales = getBusinessSalesRecords();

  const handlePayCommission = (id: string, monthName: string) => {
    if (markSettlementPaid(id)) {
      setSettlements(getMonthlyCommissionSettlements());
      toast({
        title: "Sikeres elszámolás fizetés!",
        description: `A(z) ${monthName} havi 2% kereskedői jutalék kifizetése sikeresen megtörtént.`,
      });
    }
  };

  const activeSettlement = settlements.find((s) => s.status === "DUE") || settlements[0];
  const totalSalesVolume = sales.reduce((acc, curr) => acc + curr.saleAmount, 0);
  const totalCommissionsPaid = settlements
    .filter((s) => s.status === "PAID")
    .reduce((acc, curr) => acc + curr.totalCommissionDue, 0);

  return (
    <Layout>
      <div className="bg-slate-50 dark:bg-slate-950 min-h-screen py-8 px-4">
        <div className="container mx-auto max-w-7xl space-y-8">
          
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div>
              <div className="flex items-center gap-2">
                <Badge className="bg-emerald-600 text-white font-extrabold text-xs">
                  🏪 Kereskedői Fiók
                </Badge>
                <span className="text-xs text-slate-400 font-bold">Róka Tech Kft. (28491048-2-41)</span>
              </div>
              <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white mt-1">
                Havi 2%-os Jutalék Elszámolás & Számlák
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                Minden sikeres eladás után 2% jutalék kerül nyilvántartásra, melyet havonta egyszer számlázunk ki.
              </p>
            </div>

            <Button asChild variant="outline" className="rounded-2xl text-xs font-bold border-purple-200">
              <a href="/shop/biz-fox-tech" target="_blank" rel="noreferrer" className="flex items-center gap-1.5">
                <span>Shop Profil Megtekintése</span>
                <ArrowUpRight className="w-4 h-4 text-purple-600" />
              </a>
            </Button>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            <Card className="rounded-3xl border-slate-200 dark:border-slate-800 p-6 space-y-2 bg-gradient-to-br from-emerald-500/10 to-transparent">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase text-emerald-700 dark:text-emerald-400">
                  Összes Kereskedői Eladás
                </span>
                <TrendingUp className="w-5 h-5 text-emerald-600" />
              </div>
              <div className="text-2xl font-black text-slate-900 dark:text-white">
                {formatPrice(totalSalesVolume)}
              </div>
              <p className="text-[11px] text-slate-500 font-medium">{sales.length} darab teljesített tranzakció</p>
            </Card>

            <Card className="rounded-3xl border-slate-200 dark:border-slate-800 p-6 space-y-2 bg-gradient-to-br from-amber-500/10 to-transparent">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase text-amber-700 dark:text-amber-400">
                  Esedékes Havi Jutalék (2%)
                </span>
                <Clock className="w-5 h-5 text-amber-600" />
              </div>
              <div className="text-2xl font-black text-amber-600 dark:text-amber-400">
                {formatPrice(activeSettlement?.totalCommissionDue || 0)}
              </div>
              <p className="text-[11px] text-slate-500 font-medium">
                Időszak: {activeSettlement?.monthName} • Esedékesség: {activeSettlement?.dueDate}
              </p>
            </Card>

            <Card className="rounded-3xl border-slate-200 dark:border-slate-800 p-6 space-y-2 bg-gradient-to-br from-blue-500/10 to-transparent">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase text-blue-700 dark:text-blue-400">
                  Kifizetett Jutalékok
                </span>
                <CheckCircle2 className="w-5 h-5 text-blue-600" />
              </div>
              <div className="text-2xl font-black text-slate-900 dark:text-white">
                {formatPrice(totalCommissionsPaid)}
              </div>
              <p className="text-[11px] text-slate-500 font-medium">Rendezett havi számlák összege</p>
            </Card>

          </div>

          {/* Settlements Table */}
          <Card className="rounded-3xl border-slate-200 dark:border-slate-800 p-6 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Receipt className="w-5 h-5 text-purple-600" />
                Havi Elszámolások és Számlák Listája
              </h2>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 uppercase font-black tracking-wider">
                    <th className="py-3 px-4">Hónap</th>
                    <th className="py-3 px-4">Számlaszám</th>
                    <th className="py-3 px-4">Eladások száma</th>
                    <th className="py-3 px-4">Havi Forgalom</th>
                    <th className="py-3 px-4">2% Jutalék</th>
                    <th className="py-3 px-4">Státusz</th>
                    <th className="py-3 px-4 text-right">Művelet</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {settlements.map((st) => (
                    <tr key={st.id} className="hover:bg-slate-50 dark:hover:bg-slate-900 transition">
                      <td className="py-3.5 px-4 font-extrabold text-slate-900 dark:text-white">
                        {st.monthName}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-600 dark:text-slate-400">
                        {st.invoiceNumber}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-700 dark:text-slate-300">
                        {st.totalSalesCount} db
                      </td>
                      <td className="py-3.5 px-4 font-extrabold text-slate-900 dark:text-white">
                        {formatPrice(st.totalSalesVolume)}
                      </td>
                      <td className="py-3.5 px-4 font-black text-purple-600 dark:text-purple-400">
                        {formatPrice(st.totalCommissionDue)}
                      </td>
                      <td className="py-3.5 px-4">
                        {st.status === "PAID" ? (
                          <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-300 font-extrabold text-[10px]">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Kifizetve ({st.paidAt})
                          </Badge>
                        ) : (
                          <Badge className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-300 font-extrabold text-[10px]">
                            <AlertCircle className="w-3 h-3 mr-1" />
                            Fizetésre esedékes ({st.dueDate}-ig)
                          </Badge>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {st.status === "DUE" ? (
                          <Button
                            onClick={() => handlePayCommission(st.id, st.monthName)}
                            size="sm"
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl text-xs"
                          >
                            💳 Befizetés most
                          </Button>
                        ) : (
                          <Button variant="ghost" size="sm" className="font-bold text-xs">
                            <Download className="w-3.5 h-3.5 mr-1" />
                            Számla (PDF)
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

        </div>
      </div>
    </Layout>
  );
}
