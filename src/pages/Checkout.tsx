import { Layout } from "@/components/layout/Layout";
import {
  useGetListing,
  getGetListingQueryKey,
  useCreateTransaction,
  useGetTransactions,
  getGetTransactionsQueryKey,
  useInitiatePayment,
  customFetch,
} from "@workspace/api-client-react";
import { useParams, useLocation, useSearch } from "wouter";
import { useState, useCallback } from "react";
import { formatPrice } from "@/lib/constants";
import { calculateSafetyFee, SAFETY_FEE_LABEL, SAFETY_FEE_TOOLTIP } from "@/lib/feeCalculator";
import { Button } from "@/components/ui/button";
import { ShieldCheck, CreditCard, ArrowLeft, CheckCircle2 } from "lucide-react";
import { loadStripe } from "@stripe/stripe-js";
import { ShippingSelector, ParcelMachine } from "@/components/shipping/ShippingSelector";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";

function PaymentForm({
  transactionId,
  onSuccess,
}: {
  transactionId: string;
  onSuccess: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setProcessing(true);
    setError(null);

    const { error: confirmError } = await stripe.confirmPayment({
      elements,
      redirect: "if_required",
      confirmParams: {
        return_url: `${window.location.origin}/checkout/success?tx=${transactionId}`,
      },
    });

    if (confirmError) {
      setError(confirmError.message ?? "Fizetési hiba");
      setProcessing(false);
    } else {
      onSuccess();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />
      {error && (
        <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg">
          {error}
        </p>
      )}
      <Button
        type="submit"
        className="w-full h-12 text-lg"
        disabled={!stripe || !elements || processing}
      >
        {processing ? "Feldolgozás…" : "Fizetés megerősítése"}
      </Button>
    </form>
  );
}

export function Checkout() {
  const { listingId } = useParams<{ listingId: string }>();
  const search = useSearch();
  const hasNegotiatedPrice =
    new URLSearchParams(search).has("offerId") ||
    new URLSearchParams(search).has("auctionId");
  const [, setLocation] = useLocation();
  const { data: listing, isLoading } = useGetListing(listingId || "", {
    query: {
      enabled: !!listingId,
      queryKey: getGetListingQueryKey(listingId || ""),
    },
  });
  const { data: draftTransactions, isLoading: isDraftLoading } =
    useGetTransactions(
      { listingId, role: "buyer" },
      {
        query: {
          enabled: !!listingId && hasNegotiatedPrice,
          queryKey: getGetTransactionsQueryKey({ listingId, role: "buyer" }),
        },
      },
    );

  const createTransaction = useCreateTransaction();
  const initiatePayment = useInitiatePayment();

  const [step, setStep] = useState<"summary" | "payment" | "success">("summary");
  const [selectedParcelPoint, setSelectedParcelPoint] = useState<ParcelMachine | null>(null);
  const [stripePromise, setStripePromise] = useState<ReturnType<
    typeof loadStripe
  > | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [transactionId, setTransactionId] = useState<string | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [isRedirecting, setIsRedirecting] = useState(false);

  const handleProceedToPayment = useCallback(async () => {
    if (!listing) return;
    setCheckoutError(null);
    setIsRedirecting(true);
    try {
      const result = await customFetch<{ checkoutUrl: string; transactionId: string }>("/api/billing/marketplace-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listingId: listing.id,
          parcelPoint: selectedParcelPoint,
          shippingAddress: selectedParcelPoint?.address || "Személyes átvétel",
        }),
      });
      if (!result.checkoutUrl) throw new Error("A Stripe fizetési oldal nem indítható.");
      window.location.assign(result.checkoutUrl);
    } catch (error: any) {
      setCheckoutError(error?.message || "A fizetés előkészítése sikertelen.");
      setIsRedirecting(false);
    }
  }, [listing, selectedParcelPoint]);

  if (isLoading || !listing || (hasNegotiatedPrice && isDraftLoading))
    return (
      <Layout>
        <div className="p-8 text-center">Betöltés…</div>
      </Layout>
    );

  const draftTransaction =
    draftTransactions?.items?.find((t) => t.status === "PENDING") ?? null;

  if (hasNegotiatedPrice && !draftTransaction) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8 max-w-lg text-center">
          <p className="text-muted-foreground">
            A tranzakció még nem áll készen, próbáld meg röviddel később.
          </p>
        </div>
      </Layout>
    );
  }

  const price = draftTransaction
    ? draftTransaction.listingPrice
    : listing.price;
  const safetyFee = draftTransaction?.ilolitFee ?? calculateSafetyFee(price);
  const shippingFee = draftTransaction?.shippingFee ?? 990;
  const total = draftTransaction?.totalAmount ?? price + safetyFee + shippingFee;

  if (step === "success") {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-16 max-w-lg text-center">
          <CheckCircle2 className="w-16 h-16 text-emerald-600 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Sikeres fizetés!</h1>
          <p className="text-muted-foreground mb-8">
            A megrendelésed rögzítve. Az eladó értesítést kapott.
          </p>
          <Button onClick={() => setLocation("/dashboard/transactions")}>
            Tranzakcióim
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-lg">
        {step === "payment" && (
          <button
            className="flex items-center gap-2 text-sm text-muted-foreground mb-6 hover:text-foreground transition"
            onClick={() => setStep("summary")}
          >
            <ArrowLeft className="w-4 h-4" /> Vissza az összegzéshez
          </button>
        )}

        <h1 className="text-2xl font-bold mb-8">Pénztár</h1>

        <div className="p-4 border rounded-xl mb-6">
          <div className="flex gap-4">
            <img
              src={(listing.images as unknown as { url: string }[])?.[0]?.url}
              className="w-20 h-20 object-cover rounded-md"
              alt={listing.title}
            />
            <div>
              <div className="font-semibold">{listing.title}</div>
              <div className="text-primary font-bold">{formatPrice(price)}</div>
            </div>
          </div>
        </div>

        <div className="bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-800 border p-4 rounded-xl mb-6 flex items-start gap-3">
          <ShieldCheck className="w-6 h-6 text-purple-600 shrink-0 mt-0.5" />
          <div>
            <div className="font-bold text-purple-900 dark:text-purple-200">{SAFETY_FEE_LABEL} – Garancia & Védelem</div>
            <div className="text-xs text-purple-700 dark:text-purple-300 font-medium">
              {SAFETY_FEE_TOOLTIP} (Összeg: {formatPrice(safetyFee)})
            </div>
          </div>
        </div>

        {step === "summary" && (
          <div className="mb-6">
            <ShippingSelector
              onSelectParcelPoint={setSelectedParcelPoint}
              selectedMachineId={selectedParcelPoint?.id}
            />
          </div>
        )}

        <div className="border rounded-2xl p-4 mb-6 space-y-2.5 bg-slate-50 dark:bg-slate-900">
          <div className="flex justify-between text-sm">
            <span className="font-medium text-slate-600 dark:text-slate-400">Termék ára</span>
            <span className="font-extrabold">{formatPrice(price)}</span>
          </div>
          <div className="flex justify-between text-sm text-purple-700 dark:text-purple-300 font-extrabold">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-4 h-4 text-purple-600" /> {SAFETY_FEE_LABEL}
            </span>
            <span>{formatPrice(safetyFee)}</span>
          </div>
          <div className="flex justify-between text-sm text-slate-600 dark:text-slate-400">
            <span className="font-medium">Szállítás</span>
            <span className="font-bold">{formatPrice(shippingFee)}</span>
          </div>
          <div className="flex justify-between font-black text-lg pt-2 border-t mt-2">
            <span>Fizetendő Végösszeg</span>
            <span className="text-emerald-600 dark:text-emerald-400">{formatPrice(total)}</span>
          </div>
        </div>

        {step === "summary" && (
          <Button
            className="w-full h-12 text-lg"
            onClick={handleProceedToPayment}
            disabled={
              createTransaction.isPending || initiatePayment.isPending || isRedirecting
            }
          >
            <CreditCard className="w-5 h-5 mr-2" />
            {createTransaction.isPending || initiatePayment.isPending || isRedirecting
              ? "Stripe megnyitása…"
              : `Tovább a fizetéshez (${formatPrice(total)})`}
          </Button>
        )}

        {step === "payment" && stripePromise && clientSecret && (
          <div className="border rounded-xl p-4">
            <h2 className="font-semibold mb-4 flex items-center gap-2">
              <CreditCard className="w-4 h-4" /> Kártyaadatok
            </h2>
            <Elements
              stripe={stripePromise}
              options={{ clientSecret, locale: "hu" }}
            >
              <PaymentForm
                transactionId={transactionId!}
                onSuccess={() => setStep("success")}
              />
            </Elements>
          </div>
        )}

        {(createTransaction.isError || initiatePayment.isError) && (
          <p className="text-sm text-destructive mt-3 text-center">
            Hiba történt. Kérjük próbáld újra.
          </p>
        )}
        {checkoutError && <p className="text-sm text-destructive mt-3 text-center">{checkoutError}</p>}
      </div>
    </Layout>
  );
}
