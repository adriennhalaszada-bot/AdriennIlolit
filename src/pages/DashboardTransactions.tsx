import { Layout } from "@/components/layout/Layout";
import {
  useGetTransactions,
  getGetTransactionsQueryKey,
  useGetSellerPayoutSummary,
  getGetSellerPayoutSummaryQueryKey,
  useConfirmDelivery,
  useDisputeTransaction,
} from "@workspace/api-client-react";
import { formatPrice } from "@/lib/constants";
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQueryClient } from "@tanstack/react-query";
import { ReviewModal } from "@/components/reviews/ReviewModal";
import { CheckCircle, AlertTriangle, Clock, Banknote, Package, ShieldCheck, Star } from "lucide-react";

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  PENDING: { label: "Függőben", color: "secondary" },
  PAYMENT_PENDING: { label: "Fizetés folyamatban", color: "secondary" },
  PAID_PENDING_CONFIRMATION: { label: "Fizetett – visszaigazolásra vár", color: "default" },
  AWAITING_SHIPMENT: { label: "Szállításra vár", color: "secondary" },
  SHIPPED: { label: "Szállítás alatt", color: "default" },
  DELIVERED: { label: "Kézbesítve", color: "default" },
  CONFIRMED: { label: "Visszaigazolva", color: "outline" },
  COMPLETED: { label: "Befejezve", color: "outline" },
  DISPUTED: { label: "Vita folyamatban", color: "destructive" },
  REFUNDED: { label: "Visszatérítve", color: "secondary" },
  CANCELLED: { label: "Törölve", color: "secondary" },
};

type TxItem = {
  id: string;
  status: string;
  totalAmount: number;
  listingPrice: number;
  ilolitFee: number;
  createdAt: string;
  paidAt?: string | null;
  listing?: { title?: string; id?: string } | null;
  buyer?: { username?: string } | null;
  seller?: { username?: string } | null;
};

function TransactionCard({
  tx,
  role,
  onConfirm,
  onDispute,
  onOpenReview,
  isConfirming,
  isDisputing,
}: {
  tx: TxItem;
  role: "buyer" | "seller";
  onConfirm: (id: string) => void;
  onDispute: (id: string) => void;
  onOpenReview: (tx: TxItem) => void;
  isConfirming: boolean;
  isDisputing: boolean;
}) {
  const statusInfo = STATUS_LABELS[tx.status] ?? { label: tx.status, color: "secondary" };
  const paidDate = tx.paidAt ? new Date(tx.paidAt) : null;
  const autoReleaseDate = paidDate
    ? new Date(paidDate.getTime() + 14 * 24 * 60 * 60 * 1000)
    : null;

  return (
    <div className="p-4 border rounded-xl bg-card space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="font-semibold truncate">{tx.listing?.title ?? "Ismeretlen termék"}</div>
          <div className="text-sm text-muted-foreground">
            {new Date(tx.createdAt).toLocaleDateString("hu-HU")}
            {role === "buyer" && tx.seller?.username && (
              <> · Eladó: @{tx.seller.username}</>
            )}
            {role === "seller" && tx.buyer?.username && (
              <> · Vevő: @{tx.buyer.username}</>
            )}
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="font-bold">{formatPrice(tx.totalAmount)}</div>
          <Badge variant={statusInfo.color as any} className="text-xs mt-1">
            {statusInfo.label}
          </Badge>
        </div>
      </div>

      {tx.status === "PAID_PENDING_CONFIRMATION" && autoReleaseDate && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-lg p-2">
          <Clock className="w-3.5 h-3.5 shrink-0" />
          Automatikus felszabadítás: {autoReleaseDate.toLocaleDateString("hu-HU")} (ha a vevő nem jelez vissza)
        </div>
      )}

      {role === "buyer" && tx.status === "PAID_PENDING_CONFIRMATION" && (
        <div className="flex gap-2 pt-1">
          <Button
            size="sm"
            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
            onClick={() => onConfirm(tx.id)}
            disabled={isConfirming || isDisputing}
          >
            <CheckCircle className="w-4 h-4 mr-1.5" />
            {isConfirming ? "Feldolgozás…" : "Csomag megérkezett"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="flex-1 border-destructive text-destructive hover:bg-destructive/5"
            onClick={() => onDispute(tx.id)}
            disabled={isConfirming || isDisputing}
          >
            <AlertTriangle className="w-4 h-4 mr-1.5" />
            {isDisputing ? "Jelzés…" : "Probléma jelzése"}
          </Button>
        </div>
      )}

      {tx.status === "COMPLETED" && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 rounded-lg p-2">
            <ShieldCheck className="w-3.5 h-3.5 shrink-0 text-emerald-600" />
            {role === "buyer" ? "Visszaigazoltad a kézbesítést" : "Kifizetés elindult a te számládon"}
          </div>
          <Button
            size="sm"
            variant="outline"
            className="w-full text-xs font-bold rounded-xl border-amber-300 text-amber-700 dark:text-amber-300 hover:bg-amber-50"
            onClick={() => onOpenReview(tx)}
          >
            <Star className="w-4 h-4 mr-1.5 fill-amber-400 text-amber-400" />
            Értékelés írása @{role === "buyer" ? tx.seller?.username || "Eladó" : tx.buyer?.username || "Vevő"} részére
          </Button>
        </div>
      )}

      {tx.status === "DISPUTED" && (
        <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 rounded-lg p-2">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
          Vita folyamatban – az Ilolit csapata hamarosan felveszi veled a kapcsolatot
        </div>
      )}
    </div>
  );
}

export function DashboardTransactions() {
  const [role, setRole] = useState<"buyer" | "seller">("buyer");
  const qc = useQueryClient();

  const txParams = { role, limit: 50 };
  const { data, isLoading } = useGetTransactions(txParams, {
    query: { queryKey: getGetTransactionsQueryKey(txParams) },
  });

  const { data: payoutSummary } = useGetSellerPayoutSummary({
    query: { enabled: role === "seller", queryKey: getGetSellerPayoutSummaryQueryKey() },
  });

  const confirm = useConfirmDelivery();
  const dispute = useDisputeTransaction();

  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [disputingId, setDisputingId] = useState<string | null>(null);
  const [reviewTx, setReviewTx] = useState<TxItem | null>(null);

  const handleConfirm = async (id: string) => {
    setConfirmingId(id);
    try {
      await confirm.mutateAsync({ id });
      await qc.invalidateQueries({ queryKey: getGetTransactionsQueryKey(txParams) });
      await qc.invalidateQueries({ queryKey: getGetSellerPayoutSummaryQueryKey() });
    } catch {
      /* error surfaced elsewhere */
    } finally {
      setConfirmingId(null);
    }
  };

  const handleDispute = async (id: string) => {
    if (!window.confirm("Biztosan problémát szeretnél jelezni? Az Ilolit csapata felveszi veled a kapcsolatot.")) return;
    setDisputingId(id);
    try {
      await dispute.mutateAsync({ id, data: { reason: "Nem kaptam meg / Hibás termék" } });
      await qc.invalidateQueries({ queryKey: getGetTransactionsQueryKey(txParams) });
    } catch {
      /* error surfaced elsewhere */
    } finally {
      setDisputingId(null);
    }
  };

  const rawItems = (data as unknown as { items?: TxItem[] } | undefined)?.items;
  const items = rawItems ?? [];
  const payout = payoutSummary as unknown as {
    pendingEscrow?: number;
    confirmedPayout?: number;
    totalEarnings?: number;
    currency?: string;
  } | undefined;

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <h1 className="text-2xl font-bold mb-6">Tranzakciók</h1>

        <Tabs value={role} onValueChange={(v: any) => setRole(v)} className="w-full mb-6">
          <TabsList className="w-full">
            <TabsTrigger value="buyer" className="flex-1">Vásárlásaim</TabsTrigger>
            <TabsTrigger value="seller" className="flex-1">Eladásaim</TabsTrigger>
          </TabsList>
        </Tabs>

        {role === "seller" && payout && (
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="rounded-xl border bg-card p-3 text-center">
              <div className="flex justify-center mb-1">
                <Clock className="w-5 h-5 text-amber-500" />
              </div>
              <div className="text-xs text-muted-foreground mb-0.5">Letétben</div>
              <div className="font-bold text-sm">{formatPrice(payout.pendingEscrow ?? 0)}</div>
            </div>
            <div className="rounded-xl border bg-card p-3 text-center">
              <div className="flex justify-center mb-1">
                <Banknote className="w-5 h-5 text-emerald-500" />
              </div>
              <div className="text-xs text-muted-foreground mb-0.5">Folyamatban</div>
              <div className="font-bold text-sm">{formatPrice(payout.confirmedPayout ?? 0)}</div>
            </div>
            <div className="rounded-xl border bg-card p-3 text-center">
              <div className="flex justify-center mb-1">
                <Package className="w-5 h-5 text-primary" />
              </div>
              <div className="text-xs text-muted-foreground mb-0.5">Összes</div>
              <div className="font-bold text-sm">{formatPrice(payout.totalEarnings ?? 0)}</div>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="text-center py-16 text-muted-foreground">Betöltés...</div>
        ) : items.length ? (
          <div className="space-y-3">
            {items.map((tx) => (
              <TransactionCard
                key={tx.id}
                tx={tx}
                role={role}
                onConfirm={handleConfirm}
                onDispute={handleDispute}
                onOpenReview={setReviewTx}
                isConfirming={confirmingId === tx.id}
                isDisputing={disputingId === tx.id}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-20 text-muted-foreground">
            Nincs megjeleníthető tranzakció.
          </div>
        )}

        <ReviewModal
          isOpen={!!reviewTx}
          onClose={() => setReviewTx(null)}
          targetUserName={role === "buyer" ? reviewTx?.seller?.username || "Eladó" : reviewTx?.buyer?.username || "Vevő"}
          itemTitle={reviewTx?.listing?.title || "Termék"}
          onSubmitReview={(review) => {
            console.log("Review submitted:", review);
          }}
        />
      </div>
    </Layout>
  );
}
