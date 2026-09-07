import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { CreditCard, CheckCircle2, ShieldCheck, Sparkles, Receipt, Download, Coins, Percent } from "lucide-react";
import { formatPrice } from "@/lib/constants";
import { useUserAccountStore } from "@/lib/userAccountStore";
import { useToast } from "@/hooks/use-toast";

interface BeautyPaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bookingDetails: {
    providerName: string;
    services: { name: string; price: number; duration: number }[];
    totalPrice: number;
    bookingDate: string;
    bookingTime: string;
  };
  onPaymentComplete: (receiptData: any) => void;
}

export function BeautyPaymentModal({
  open,
  onOpenChange,
  bookingDetails,
  onPaymentComplete,
}: BeautyPaymentModalProps) {
  const { toast } = useToast();
  const { currentUser, deductLoyaltyPoints, addLoyaltyPoints } = useUserAccountStore();

  const [paymentType, setPaymentType] = useState<"full" | "deposit">("full");
  const [usePoints, setUsePoints] = useState(false);
  const [cardNumber, setCardNumber] = useState("4532 •••• •••• 8892");
  const [cardHolder, setCardHolder] = useState(currentUser?.realName || currentUser?.nickname || "Vendég");
  const [expiry, setExpiry] = useState("12/28");
  const [cvv, setCvv] = useState("•••");
  const [isProcessing, setIsProcessing] = useState(false);
  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; percent: number } | null>(null);
  const [receiptObj, setReceiptObj] = useState<any | null>(null);

  const availablePoints = currentUser?.loyaltyPoints ?? 1500;
  const isFirstVisit = true; // First visit -10% discount check
  const discountRate = isFirstVisit ? 0.10 : 0;
  const firstVisitDiscountAmount = Math.round(bookingDetails.totalPrice * discountRate);

  const couponDiscountAmount = appliedCoupon
    ? Math.round((bookingDetails.totalPrice - firstVisitDiscountAmount) * (appliedCoupon.percent / 100))
    : 0;

  const subtotal = Math.max(0, bookingDetails.totalPrice - firstVisitDiscountAmount - couponDiscountAmount);
  const pointsDiscount = usePoints ? Math.min(availablePoints, subtotal) : 0;
  const finalPrice = Math.max(0, subtotal - pointsDiscount);
  const depositAmount = Math.round(finalPrice * 0.20); // 20% deposit

  const payableAmount = paymentType === "deposit" ? depositAmount : finalPrice;

  const handleApplyCoupon = () => {
    const clean = couponInput.trim().toUpperCase();
    if (!clean) return;
    if (clean === "KEDVEZMÉNY10" || clean === "KEDVEZMENY10") {
      setAppliedCoupon({ code: "KEDVEZMÉNY10", percent: 10 });
      toast({ title: "Kuponkód Elfogadva! 🎉", description: "10% exkluzív kedvezmény levonva." });
    } else if (clean === "SZÉPSÉG20" || clean === "SZEPSEG20") {
      setAppliedCoupon({ code: "SZÉPSÉG20", percent: 20 });
      toast({ title: "Kuponkód Elfogadva! 🎉", description: "20% szalon kedvezmény levonva." });
    } else {
      toast({ title: "Érvénytelen kuponkód", description: "Próbáld a KEDVEZMÉNY10 vagy SZÉPSÉG20 kódot!", variant: "destructive" });
    }
  };

  const handlePay = () => {
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);

      if (usePoints && pointsDiscount > 0) {
        deductLoyaltyPoints(pointsDiscount);
      }

      // Earn 10% loyalty points on booking!
      const earnedPoints = Math.round(payableAmount * 0.10);
      addLoyaltyPoints(earnedPoints);

      const generatedReceipt = {
        invoiceNumber: `INV-BEAUTY-${Date.now()}`,
        date: new Date().toLocaleDateString("hu-HU"),
        providerName: bookingDetails.providerName,
        customerName: currentUser?.nickname || "Vendég",
        customerEmail: currentUser?.email || "vevo@example.hu",
        services: bookingDetails.services,
        originalTotal: bookingDetails.totalPrice,
        firstVisitDiscount: firstVisitDiscountAmount,
        pointsUsed: pointsDiscount,
        amountPaid: payableAmount,
        paymentMethod: "Bankkártya (SimplePay / Stripe)",
        earnedPoints,
      };

      setReceiptObj(generatedReceipt);
      onPaymentComplete(generatedReceipt);

      toast({
        title: "Sikeres Fizetés & Számlázás! 🎉",
        description: `Befizetve: ${formatPrice(payableAmount)}. Szerztél +${earnedPoints} hűségpontot!`,
      });
    }, 1200);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-3xl p-6">
        {!receiptObj ? (
          <>
            <DialogHeader>
              <DialogTitle className="text-xl font-extrabold flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-rose-500" /> Online Fizetés & Hűségpontok
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-2 text-xs">
              {/* First Visit Discount Banner */}
              {isFirstVisit && (
                <div className="bg-gradient-to-r from-amber-500 to-rose-500 text-white p-3 rounded-2xl flex items-center justify-between font-bold shadow-md">
                  <div className="flex items-center gap-2">
                    <Percent className="w-4 h-4" />
                    <span>Első Látogatói Kedvezmény (-10%)</span>
                  </div>
                  <span>-{formatPrice(firstVisitDiscountAmount)}</span>
                </div>
              )}

              {/* Payment Type Switcher */}
              <div className="grid grid-cols-2 gap-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl">
                <button
                  type="button"
                  onClick={() => setPaymentType("full")}
                  className={`py-2 rounded-xl font-extrabold text-xs transition ${
                    paymentType === "full"
                      ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow"
                      : "text-slate-500"
                  }`}
                >
                  Teljes Összeg ({formatPrice(finalPrice)})
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentType("deposit")}
                  className={`py-2 rounded-xl font-extrabold text-xs transition ${
                    paymentType === "deposit"
                      ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow"
                      : "text-slate-500"
                  }`}
                >
                  Előleg (20% = {formatPrice(depositAmount)})
                </button>
              </div>

              {/* Loyalty Points Redemption Toggle */}
              <div className="flex items-center justify-between p-3 rounded-2xl border bg-amber-50/50 dark:bg-amber-950/20 border-amber-200">
                <div className="flex items-center gap-2">
                  <Coins className="w-4 h-4 text-amber-500" />
                  <div>
                    <div className="font-bold text-slate-900 dark:text-slate-100">
                      Hűségpontok Felhasználása ({availablePoints} pt)
                    </div>
                    <div className="text-[10px] text-slate-500">1 pont = 1 Ft kedvezmény</div>
                  </div>
                </div>
                <Switch checked={usePoints} onCheckedChange={setUsePoints} />
              </div>

              {/* Coupon Code Input */}
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Kuponkód (pl. KEDVEZMÉNY10)"
                  value={couponInput}
                  onChange={(e) => setCouponInput(e.target.value)}
                  className="uppercase text-xs"
                />
                <Button type="button" variant="secondary" size="sm" onClick={handleApplyCoupon} className="font-bold text-xs">
                  Beváltás
                </Button>
              </div>

              {/* Price Calculation Summary */}
              <div className="bg-slate-50 dark:bg-slate-800 p-3.5 rounded-2xl space-y-1.5 border font-semibold">
                <div className="flex justify-between text-slate-600 dark:text-slate-300">
                  <span>Eredeti Ár:</span>
                  <span>{formatPrice(bookingDetails.totalPrice)}</span>
                </div>
                {firstVisitDiscountAmount > 0 && (
                  <div className="flex justify-between text-rose-500">
                    <span>Első Látogatói Kedvezmény (-10%):</span>
                    <span>-{formatPrice(firstVisitDiscountAmount)}</span>
                  </div>
                )}
                {couponDiscountAmount > 0 && (
                  <div className="flex justify-between text-emerald-600">
                    <span>Kupon Kedvezmény ({appliedCoupon?.code}):</span>
                    <span>-{formatPrice(couponDiscountAmount)}</span>
                  </div>
                )}
                {usePoints && pointsDiscount > 0 && (
                  <div className="flex justify-between text-amber-600">
                    <span>Hűségpont Kedvezmény:</span>
                    <span>-{formatPrice(pointsDiscount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-extrabold text-slate-900 dark:text-slate-100 pt-2 border-t">
                  <span>Fizetendő Összeg ({paymentType === "deposit" ? "20% Előleg" : "Teljes"}):</span>
                  <span className="text-rose-600 dark:text-rose-400">{formatPrice(payableAmount)}</span>
                </div>
              </div>

              {/* Card Inputs Simulation */}
              <div className="space-y-2 pt-1">
                <label className="text-[11px] font-bold text-slate-700 block">Kártya Adatai (PCI-DSS Biztonságos)</label>
                <Input value={cardNumber} onChange={(e) => setCardNumber(e.target.value)} className="font-mono text-xs" />
                <div className="grid grid-cols-2 gap-2">
                  <Input value={expiry} onChange={(e) => setExpiry(e.target.value)} placeholder="MM/YY" className="text-xs" />
                  <Input value={cvv} onChange={(e) => setCvv(e.target.value)} placeholder="CVV" className="text-xs" />
                </div>
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>Mégse</Button>
              <Button
                onClick={handlePay}
                disabled={isProcessing}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold shadow-lg"
              >
                {isProcessing ? "Fizetés Feldolgozása..." : `Fizetés · ${formatPrice(payableAmount)}`}
              </Button>
            </DialogFooter>
          </>
        ) : (
          /* Receipt / Digital Invoice View */
          <div className="space-y-4 py-2 text-xs">
            <div className="text-center space-y-1">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
              <h3 className="text-lg font-black">Fizetés Sikeres!</h3>
              <p className="text-slate-500">Digitális Számla & Nyugta Elkészült</p>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl border space-y-2 font-mono">
              <div className="flex justify-between border-b pb-2">
                <span className="text-slate-500">Számlaszám:</span>
                <span className="font-bold text-slate-900 dark:text-slate-100">{receiptObj.invoiceNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Szolgáltató:</span>
                <span>{receiptObj.providerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Vevő (Becenév):</span>
                <span>{receiptObj.customerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Fizetve:</span>
                <span className="font-bold text-emerald-600">{formatPrice(receiptObj.amountPaid)}</span>
              </div>
              <div className="flex justify-between text-amber-600 font-bold pt-1 border-t">
                <span>Jóváírt Hűségpontok:</span>
                <span>+{receiptObj.earnedPoints} pt</span>
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  toast({ title: "Számla letöltve PDF formátumban!" });
                  onOpenChange(false);
                }}
                className="w-full"
              >
                <Download className="w-4 h-4 mr-2" /> Számla Letöltése (.pdf)
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
