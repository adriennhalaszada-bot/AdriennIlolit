import { useParams, Link, useLocation } from "wouter";
import { Layout } from "@/components/layout/Layout";
import {
  useGetListing, getGetListingQueryKey,
  useGetSimilarListings, getGetSimilarListingsQueryKey,
  useCheckFavorite, getCheckFavoriteQueryKey,
  useAddFavorite, useRemoveFavorite,
  useGetAuction, getGetAuctionQueryKey,
  useGetAuctionBids, getGetAuctionBidsQueryKey,
  usePlaceBid,
  useCreateOffer,
  useGetMyOffers, getGetMyOffersQueryKey,
  useRespondToOffer,
  useWithdrawOffer,
  useDeleteListing,
  useUpdateListing,
} from "@workspace/api-client-react";
import { formatPrice, CONDITIONS } from "@/lib/constants";
import { calculateSafetyFee, SAFETY_FEE_LABEL, SAFETY_FEE_SUBTEXT, SAFETY_FEE_TOOLTIP } from "@/lib/feeCalculator";
import { IlolitBadge } from "@/components/shared/IlolitBadge";
import { ListingCard } from "@/components/shared/ListingCard";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Heart, MessageCircle, ShieldCheck, ChevronRight, Gavel, Handshake, Clock, Trophy, TrendingUp, Check, X, RefreshCw, Truck, MapPin, Package, Tag, Edit2, Trash2, EyeOff, Eye, Settings } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useUser } from "@clerk/react";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { useState, useEffect } from "react";
import { ShippingSelector, ParcelMachine } from "@/components/shipping/ShippingSelector";
import { ReviewModal } from "@/components/reviews/ReviewModal";
import { EditListingModal } from "@/components/shared/EditListingModal";
import { VerificationBadge } from "@/components/shared/VerificationBadge";
import { VerifiedReviewSummary } from "@/components/shared/VerifiedReviewSummary";
import { ReportProblemModal } from "@/components/shared/ReportProblemModal";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AlertTriangle, Star, CheckCircle, Flag } from "lucide-react";
import { OfferModal } from "@/components/marketplace/OfferModal";
import { BundleDiscountSection } from "@/components/marketplace/BundleDiscountSection";
import { FollowSellerButton } from "@/components/marketplace/FollowSellerButton";

function useCountdown(endsAt: string | Date | undefined) {
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    if (!endsAt) return;
    const end = new Date(endsAt).getTime();
    const tick = () => {
      const diff = end - Date.now();
      if (diff <= 0) { setTimeLeft("Lejárt"); return; }
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      if (d > 0) setTimeLeft(`${d}n ${h}ó ${m}p`);
      else if (h > 0) setTimeLeft(`${h}ó ${m}p ${s}mp`);
      else setTimeLeft(`${m}p ${s}mp`);
    };
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [endsAt]);

  return timeLeft;
}

export function Product() {
  const { id } = useParams<{ id: string }>();
  const { isSignedIn, user } = useUser();
  const { toast } = useToast();
  const [bidAmount, setBidAmount] = useState("");
  const [offerAmount, setOfferAmount] = useState("");
  const [offerMessage, setOfferMessage] = useState("");
  const [showOfferForm, setShowOfferForm] = useState(false);

  const { data: listing, isLoading } = useGetListing(id || "", {
    query: { enabled: !!id, queryKey: getGetListingQueryKey(id || "") }
  });

  const isAuction = listing?.listingType === "AUCTION";
  const isNegotiable = listing?.listingType === "NEGOTIABLE";

  const { data: auction, isLoading: isAuctionLoading } = useGetAuction(id || "", {
    query: { enabled: !!id && isAuction, queryKey: getGetAuctionQueryKey(id || ""), refetchInterval: 15000 }
  });

  const { data: bids } = useGetAuctionBids(id || "", {
    query: { enabled: !!id && isAuction, queryKey: getGetAuctionBidsQueryKey(id || ""), refetchInterval: 15000 }
  });

  const { data: similarListings, isLoading: isSimilarLoading } = useGetSimilarListings(id || "", { limit: 6 }, {
    query: { enabled: !!id, queryKey: getGetSimilarListingsQueryKey(id || "", { limit: 6 }) }
  });

  const { data: favStatus } = useCheckFavorite(id || "", {
    query: { enabled: !!id && !!isSignedIn, queryKey: getCheckFavoriteQueryKey(id || "") }
  });

  const addFavorite = useAddFavorite();
  const removeFavorite = useRemoveFavorite();
  const placeBid = usePlaceBid();
  const createOffer = useCreateOffer();
  const respondToOffer = useRespondToOffer();
  const withdrawOffer = useWithdrawOffer();

  const { data: myBuyerOffers } = useGetMyOffers({ role: "buyer" } as any, {
    query: { enabled: !!id && !!isSignedIn && isNegotiable, queryKey: getGetMyOffersQueryKey({ role: "buyer" } as any) }
  });
  const { data: mySellerOffers } = useGetMyOffers({ role: "seller" } as any, {
    query: { enabled: !!id && !!isSignedIn && isNegotiable, queryKey: getGetMyOffersQueryKey({ role: "seller" } as any) }
  });

  const ACTIVE_STATUSES = ["PENDING", "COUNTERED", "ACCEPTED"];
  const activeBuyerOffer = (myBuyerOffers as any[] | undefined)?.find(
    (o: any) => o.listingId === id && ACTIVE_STATUSES.includes(o.status)
  ) ?? null;
  const activeSellerOffer = (mySellerOffers as any[] | undefined)?.find(
    (o: any) => o.listingId === id && ACTIVE_STATUSES.includes(o.status)
  ) ?? null;
  const activeOffer = activeSellerOffer ?? activeBuyerOffer ?? null;
  const currentUserIsSeller = !!activeSellerOffer;

  const [counterAmount, setCounterAmount] = useState("");
  const [showCounterForm, setShowCounterForm] = useState(false);
  const [isOfferModalOpen, setIsOfferModalOpen] = useState(false);
  const [selectedParcelMachine, setSelectedParcelMachine] = useState<ParcelMachine | null>(null);
  const [isShippingModalOpen, setIsShippingModalOpen] = useState(false);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportSuccess, setReportSuccess] = useState(false);

  const invalidateOffers = () => {
    queryClient.invalidateQueries({ queryKey: getGetMyOffersQueryKey({ role: "buyer" } as any) });
    queryClient.invalidateQueries({ queryKey: getGetMyOffersQueryKey({ role: "seller" } as any) });
  };

  const handleOfferRespond = (offerId: string, action: "accept" | "reject" | "counter") => {
    if (action === "counter") {
      const amount = parseFloat(counterAmount);
      if (!amount || amount <= 0) { toast({ title: "Érvénytelen összeg", variant: "destructive" }); return; }
      respondToOffer.mutate({ id: offerId, data: { action, counterAmount: amount } }, {
        onSuccess: () => {
          toast({ title: "Visszaajánlat elküldve!" });
          setCounterAmount("");
          setShowCounterForm(false);
          invalidateOffers();
        },
        onError: (err: any) => toast({ title: "Hiba", description: err?.response?.data?.error, variant: "destructive" })
      });
    } else {
      respondToOffer.mutate({ id: offerId, data: { action } }, {
        onSuccess: () => {
          toast({ title: action === "accept" ? "Ajánlat elfogadva! ✅" : "Ajánlat elutasítva" });
          invalidateOffers();
        },
        onError: (err: any) => toast({ title: "Hiba", description: err?.response?.data?.error, variant: "destructive" })
      });
    }
  };

  const handleWithdraw = (offerId: string) => {
    withdrawOffer.mutate({ id: offerId }, {
      onSuccess: () => {
        toast({ title: "Ajánlat visszavonva" });
        invalidateOffers();
      }
    });
  };

  const countdown = useCountdown(auction?.endsAt);
  const [, setLocation] = useLocation();
  const deleteListing = useDeleteListing();
  const updateListingMutation = useUpdateListing();

  const isOwner = !!listing?.isOwner;

  const handleOwnerDelete = () => {
    if (!confirm("Biztosan törölni szeretnéd ezt a hirdetést? Ez nem visszavonható.")) return;
    deleteListing.mutate({ id: id! }, {
      onSuccess: () => {
        toast({ title: "Hirdetés törölve" });
        setLocation("/dashboard/listings");
      },
      onError: (err: any) => toast({ title: "Hiba", description: err?.response?.data?.error, variant: "destructive" })
    });
  };

  const handleOwnerToggleVisibility = () => {
    const newStatus = listing?.status === "HIDDEN" ? "ACTIVE" : "HIDDEN";
    updateListingMutation.mutate({ id: id!, data: { status: newStatus } }, {
      onSuccess: () => {
        toast({ title: newStatus === "HIDDEN" ? "Hirdetés elrejtve" : "Hirdetés aktiválva" });
        queryClient.invalidateQueries({ queryKey: getGetListingQueryKey(id || "") });
      },
      onError: (err: any) => toast({ title: "Hiba", description: err?.response?.data?.error, variant: "destructive" })
    });
  };

  const handleFavoriteToggle = () => {
    if (!isSignedIn) {
      toast({ title: "Kérlek jelentkezz be", description: "A kedvencekhez adáshoz be kell jelentkezned." });
      return;
    }
    if (favStatus?.isFavorited) {
      removeFavorite.mutate({ listingId: id! }, {
        onSuccess: () => queryClient.invalidateQueries({ queryKey: getCheckFavoriteQueryKey(id || "") })
      });
    } else {
      addFavorite.mutate({ listingId: id! }, {
        onSuccess: () => queryClient.invalidateQueries({ queryKey: getCheckFavoriteQueryKey(id || "") })
      });
    }
  };

  const handleBid = () => {
    if (!isSignedIn) { toast({ title: "Kérlek jelentkezz be" }); return; }
    const amount = parseFloat(bidAmount);
    if (!amount || amount <= 0) { toast({ title: "Érvénytelen összeg", variant: "destructive" }); return; }
    placeBid.mutate({ listingId: id!, data: { amount } }, {
      onSuccess: () => {
        toast({ title: "Licit elküldve! 🎉", description: `${amount.toLocaleString("hu-HU")} Ft-os licited rögzítve.` });
        setBidAmount("");
        queryClient.invalidateQueries({ queryKey: getGetAuctionQueryKey(id || "") });
        queryClient.invalidateQueries({ queryKey: getGetAuctionBidsQueryKey(id || "") });
      },
      onError: (err: any) => {
        toast({ title: "Hiba", description: err?.response?.data?.error || "Sikertelen licit", variant: "destructive" });
      }
    });
  };

  const handleOffer = () => {
    if (!isSignedIn) { toast({ title: "Kérlek jelentkezz be" }); return; }
    const amount = parseFloat(offerAmount);
    if (!amount || amount <= 0) { toast({ title: "Érvénytelen összeg", variant: "destructive" }); return; }
    createOffer.mutate({ data: { listingId: id!, amount, message: offerMessage || undefined } }, {
      onSuccess: () => {
        toast({ title: "Ajánlat elküldve! 🤝", description: "Az eladó 48 órán belül válaszol." });
        setOfferAmount("");
        setOfferMessage("");
        setShowOfferForm(false);
      },
      onError: (err: any) => {
        toast({ title: "Hiba", description: err?.response?.data?.error || "Sikertelen ajánlat", variant: "destructive" });
      }
    });
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row gap-8">
            <Skeleton className="w-full md:w-1/2 aspect-[3/4] md:aspect-square rounded-2xl" />
            <div className="flex-1 space-y-6">
              <Skeleton className="w-3/4 h-8" />
              <Skeleton className="w-1/4 h-6" />
              <Skeleton className="w-full h-32" />
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (!listing) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-20 text-center">
          <h1 className="text-2xl font-bold mb-2">Termék nem található</h1>
          <p className="text-muted-foreground mb-6">A keresett termék nem létezik vagy törölték.</p>
          <Button asChild>
            <Link href="/search">Vissza a kereséshez</Link>
          </Button>
        </div>
      </Layout>
    );
  }

  const imageUrl = listing.images?.[0]?.url || "https://placehold.co/800x800/e2e8f0/1e293b?text=Nincs+kép";
  const minNextBid = auction ? auction.currentPrice + auction.minBidIncrement : 0;

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
          <Link href="/" className="hover:text-foreground">Főoldal</Link>
          <ChevronRight className="w-4 h-4" />
          {listing.category && (
            <>
              <Link href={`/search?categorySlug=${listing.category.slug}`} className="hover:text-foreground">
                {listing.category.name}
              </Link>
              <ChevronRight className="w-4 h-4" />
            </>
          )}
          <span className="text-foreground truncate">{listing.title}</span>
        </div>

        {/* Owner action bar */}
        {isOwner && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-amber-800">
              <Settings className="w-4 h-4 flex-shrink-0" />
              <span className="font-semibold text-sm">Saját hirdetésed</span>
              {listing.status === "HIDDEN" && (
                <span className="text-xs bg-amber-200 text-amber-800 px-2 py-0.5 rounded-full font-medium">Rejtett</span>
              )}
              {listing.status === "ACTIVE" && (
                <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">Aktív</span>
              )}
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <Button
                size="sm"
                variant="outline"
                onClick={handleOwnerToggleVisibility}
                disabled={updateListingMutation.isPending}
                className="flex-1 sm:flex-none border-amber-300 bg-white hover:bg-amber-50"
              >
                {listing.status === "HIDDEN"
                  ? <><Eye className="w-3.5 h-3.5 mr-1" /> Megjelenít</>
                  : <><EyeOff className="w-3.5 h-3.5 mr-1" /> Elrejt</>}
              </Button>
              <Button size="sm" variant="outline" className="flex-1 sm:flex-none border-amber-300 bg-white hover:bg-amber-50" asChild>
                <Link href={`/sell/${listing.id}/edit`}>
                  <Edit2 className="w-3.5 h-3.5 mr-1" /> Szerkesztés
                </Link>
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={handleOwnerDelete}
                disabled={deleteListing.isPending}
                className="flex-1 sm:flex-none"
              >
                <Trash2 className="w-3.5 h-3.5 mr-1" /> Törlés
              </Button>
            </div>
          </div>
        )}

        <div className="flex flex-col lg:flex-row gap-8 lg:gap-12">
          {/* Images */}
          <div className="w-full lg:w-1/2">
            <div className="aspect-[3/4] md:aspect-square rounded-2xl overflow-hidden bg-muted relative">
              <img src={imageUrl} alt={listing.title} className="w-full h-full object-cover" />
              <Button
                variant="secondary"
                size="icon"
                className="absolute top-4 right-4 rounded-full bg-white/80 hover:bg-white text-muted-foreground hover:text-primary"
                onClick={handleFavoriteToggle}
              >
                <Heart className={`w-5 h-5 ${favStatus?.isFavorited ? "fill-primary text-primary" : ""}`} />
              </Button>
              {isAuction && (
                <div className="absolute top-4 left-4 bg-amber-500 text-white text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5">
                  <Gavel className="w-3.5 h-3.5" /> Lolit Licit
                </div>
              )}
              {isNegotiable && (
                <div className="absolute top-4 left-4 bg-primary text-white text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5">
                  <Handshake className="w-3.5 h-3.5" /> Lolit Deal
                </div>
              )}
            </div>

            {listing.images && listing.images.length > 1 && (
              <div className="flex gap-2 mt-4 overflow-x-auto pb-2 scrollbar-hide">
                {listing.images.map((img) => (
                  <button key={img.id} className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 border-2 border-transparent hover:border-primary transition-colors">
                    <img src={img.url} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Details */}
          <div className="flex-1 space-y-8">
            <div className="space-y-4">
              <h1 className="text-2xl md:text-3xl font-bold">{listing.title}</h1>

              {/* Price display */}
              {isAuction && auction ? (
                <div className="space-y-1">
                  <div className="text-sm text-muted-foreground">Jelenlegi licit</div>
                  <div className="text-3xl font-bold text-amber-600">{formatPrice(auction.currentPrice)}</div>
                  <div className="text-sm text-muted-foreground">Kezdőár: {formatPrice(auction.startingPrice)} · {auction.bidCount} licit</div>
                </div>
              ) : (
                <div className="text-3xl font-bold text-primary">{formatPrice(listing.price)}</div>
              )}

              <div className="flex flex-wrap gap-2">
                <div className="px-3 py-1 bg-secondary/10 text-secondary-foreground rounded-full text-sm font-medium">
                  {CONDITIONS[listing.condition as keyof typeof CONDITIONS]}
                </div>
                {listing.brand && (
                  <div className="px-3 py-1 bg-muted text-muted-foreground rounded-full text-sm font-medium">
                    {listing.brand}
                  </div>
                )}
                {listing.size && (
                  <div className="px-3 py-1 bg-muted text-muted-foreground rounded-full text-sm font-medium">
                    Méret: {listing.size}
                  </div>
                )}
                {listing.color && (
                  <div className="px-3 py-1 bg-muted text-muted-foreground rounded-full text-sm font-medium capitalize">
                    {listing.color}
                  </div>
                )}
                {(listing as any).bundleDiscountPercent && (
                  <div className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium flex items-center gap-1">
                    <Tag className="w-3.5 h-3.5" />
                    Bundle: {(listing as any).bundleDiscountPercent}% kedvezmény
                  </div>
                )}
              </div>

              {/* Shipping modes & FoxPost/Packeta Widget */}
              <div className="space-y-2.5 bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700">
                <div className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                  <span>Szállítási lehetőségek & Csomagpontok:</span>
                  {selectedParcelMachine && (
                    <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
                      ✓ {selectedParcelMachine.name}
                    </span>
                  )}
                </div>
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-600 dark:text-slate-400">FoxPost / Packeta / GLS automata:</span>
                    <span className="font-bold text-rose-600">~690 Ft</span>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsShippingModalOpen(true)}
                    className="w-full text-xs font-bold rounded-xl h-8 border-rose-300 text-rose-600 hover:bg-rose-50"
                  >
                    <Truck className="w-3.5 h-3.5 mr-1.5" />
                    {selectedParcelMachine ? `Átvételi pont: ${selectedParcelMachine.name}` : "Csomagpont kiválasztása keresővel"}
                  </Button>
                </div>
              </div>
            </div>

            {/* AUCTION panel */}
            {isAuction && auction && auction.status === "ACTIVE" && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-4">
                <div className="flex items-center gap-2 text-amber-800">
                  <Clock className="w-5 h-5" />
                  <span className="font-semibold">Aukció vége: <span className="text-amber-600 font-bold">{countdown}</span></span>
                </div>
                <div className="flex gap-3">
                  <Input
                    type="number"
                    placeholder={`Min. ${minNextBid.toLocaleString("hu-HU")} Ft`}
                    value={bidAmount}
                    onChange={e => setBidAmount(e.target.value)}
                    className="flex-1"
                  />
                  <Button
                    onClick={handleBid}
                    disabled={placeBid.isPending}
                    className="bg-amber-500 hover:bg-amber-600 text-white font-semibold"
                  >
                    <Gavel className="w-4 h-4 mr-2" />
                    Licitelek!
                  </Button>
                </div>
                <div className="text-xs text-amber-700">
                  Minimális emelés: {formatPrice(auction.minBidIncrement)} · Auto-hosszabbítás: 5 perc
                </div>
              </div>
            )}

            {/* AUCTION ENDED panel */}
            {isAuction && auction && auction.status !== "ACTIVE" && (() => {
              const winner = auction.winner as any;
              const isWinner = isSignedIn && winner && winner.clerkId === user?.id;
              return (
                <div className={`border rounded-xl p-4 space-y-2 ${isWinner ? "bg-amber-50 border-amber-300" : "bg-muted border-border"}`}>
                  <div className={`flex items-center gap-2 font-semibold ${isWinner ? "text-amber-700" : "text-muted-foreground"}`}>
                    <Trophy className="w-5 h-5" />
                    {isWinner ? "🎉 Gratulálunk! Te nyerted az árverést!" : "Az aukció lezárult"}
                  </div>
                  {winner && (
                    <div className="text-sm">
                      Nyertes: <span className="font-medium">{winner.username}</span>
                      {auction.status === "ENDED" && <span className="ml-2 text-muted-foreground">({formatPrice(auction.currentPrice)} Ft)</span>}
                    </div>
                  )}
                  {!winner && auction.status === "NO_WINNER" && (
                    <p className="text-sm text-muted-foreground">Nem érkezett érvényes licit, az aukció nyertes nélkül zárult.</p>
                  )}
                  {isWinner && (
                    <Button className="w-full bg-amber-500 hover:bg-amber-600 text-white mt-2" asChild>
                      <Link href={`/checkout/${id}?auctionId=${auction.id}`}>
                        Megveszem a nyertes áron
                      </Link>
                    </Button>
                  )}
                </div>
              );
            })()}

            {/* Bid history */}
            {isAuction && bids && Array.isArray(bids) && bids.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 font-semibold">
                  <TrendingUp className="w-4 h-4" /> Licit előzmények
                </div>
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {(bids as any[]).slice(0, 5).map((bid) => (
                    <div key={bid.id} className="flex justify-between items-center text-sm py-2 border-b last:border-0">
                      <div className="flex flex-col">
                        <span className="text-muted-foreground">{(bid.user as any)?.username || "Névtelen"}</span>
                        {bid.createdAt && (
                          <span className="text-xs text-muted-foreground/70">
                            {new Date(bid.createdAt).toLocaleString("hu-HU", {
                              year: "numeric",
                              month: "2-digit",
                              day: "2-digit",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        )}
                      </div>
                      <span className="font-semibold">{formatPrice(bid.amount)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* NEGOTIABLE / Offer panel */}
            {isNegotiable && (
              <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2 text-primary font-semibold">
                  <Handshake className="w-5 h-5" />
                  Lolit Deal – Alkudozós ajánlat
                </div>

                {activeOffer ? (
                  /* Active deal thread */
                  <div className="space-y-3">
                    <div className="flex items-center justify-between py-2 px-3 bg-white/60 rounded-lg border">
                      <div>
                        <div className="text-sm text-muted-foreground">{activeOffer.round}. kör ajánlat</div>
                        <div className="text-lg font-bold text-primary">{formatPrice(activeOffer.amount)}</div>
                        {activeOffer.message && <div className="text-xs text-muted-foreground mt-1">„{activeOffer.message}"</div>}
                      </div>
                      <div className={`text-xs px-2 py-1 rounded-full font-medium ${
                        activeOffer.status === "ACCEPTED" ? "bg-green-100 text-green-700" :
                        activeOffer.status === "PENDING" ? "bg-amber-100 text-amber-700" :
                        "bg-muted text-muted-foreground"
                      }`}>
                        {activeOffer.status === "PENDING" ? "⏳ Várakozik" :
                         activeOffer.status === "ACCEPTED" ? "✅ Elfogadva" :
                         activeOffer.status === "COUNTERED" ? "↩ Visszaajánlat" : activeOffer.status}
                      </div>
                    </div>

                    {activeOffer.status === "ACCEPTED" ? (
                      <Button className="w-full bg-ilolit hover:bg-ilolit/90" asChild>
                        <Link href={`/checkout/${id}?offerId=${activeOffer.id}`}>
                          🎉 Megveszem az elfogadott áron ({formatPrice(activeOffer.amount)})
                        </Link>
                      </Button>
                    ) : activeOffer.status === "PENDING" && currentUserIsSeller ? (
                      /* Seller sees pending offer → can accept/reject/counter */
                      <div className="space-y-2">
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => handleOfferRespond(activeOffer.id, "accept")} className="flex-1 bg-ilolit hover:bg-ilolit/90">
                            <Check className="w-4 h-4 mr-1" /> Elfogadom
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => handleOfferRespond(activeOffer.id, "reject")} className="flex-1">
                            <X className="w-4 h-4 mr-1" /> Elutasítom
                          </Button>
                        </div>
                        {activeOffer.round < 3 && (
                          !showCounterForm ? (
                            <Button size="sm" variant="ghost" className="w-full text-primary" onClick={() => setShowCounterForm(true)}>
                              <RefreshCw className="w-3.5 h-3.5 mr-1" /> Visszaajánlok
                            </Button>
                          ) : (
                            <div className="space-y-2">
                              <Input type="number" placeholder="Visszaajánlat (Ft)" value={counterAmount} onChange={e => setCounterAmount(e.target.value)} />
                              <div className="flex gap-2">
                                <Button size="sm" onClick={() => handleOfferRespond(activeOffer.id, "counter")} disabled={respondToOffer.isPending} className="flex-1">Küldés</Button>
                                <Button size="sm" variant="ghost" onClick={() => setShowCounterForm(false)}>Mégse</Button>
                              </div>
                            </div>
                          )
                        )}
                      </div>
                    ) : activeOffer.status === "PENDING" && !currentUserIsSeller ? (
                      /* Buyer sees their pending offer → can withdraw or counter */
                      <div className="space-y-2">
                        <p className="text-xs text-muted-foreground">Az eladó 48 órán belül válaszol.</p>
                        {activeOffer.round < 3 && !showCounterForm && (
                          <Button size="sm" variant="ghost" className="w-full text-primary" onClick={() => setShowCounterForm(true)}>
                            <RefreshCw className="w-3.5 h-3.5 mr-1" /> Módosítom az ajánlatom
                          </Button>
                        )}
                        {showCounterForm && (
                          <div className="space-y-2">
                            <Input type="number" placeholder="Új ajánlat (Ft)" value={counterAmount} onChange={e => setCounterAmount(e.target.value)} />
                            <div className="flex gap-2">
                              <Button size="sm" onClick={() => handleOfferRespond(activeOffer.id, "counter")} disabled={respondToOffer.isPending} className="flex-1">Küldés</Button>
                              <Button size="sm" variant="ghost" onClick={() => setShowCounterForm(false)}>Mégse</Button>
                            </div>
                          </div>
                        )}
                        <Button size="sm" variant="ghost" className="w-full text-muted-foreground text-xs" onClick={() => handleWithdraw(activeOffer.id)}>
                          Visszavonom az ajánlatot
                        </Button>
                      </div>
                    ) : null}
                  </div>
                ) : (
                  /* No active offer → show form */
                  <>
                    <p className="text-sm text-muted-foreground">Az eladó 48 órán belül válaszol. Max. 3 fordulós alkudozás.</p>
                    {!showOfferForm ? (
                      <Button
                        variant="outline"
                        className="w-full border-amber-500 text-amber-600 hover:bg-amber-50 font-extrabold"
                        onClick={() => setIsOfferModalOpen(true)}
                      >
                        <Handshake className="w-4 h-4 mr-2 text-amber-500" /> Ajánlatot teszek (Alkuképes)
                      </Button>
                    ) : (
                      <div className="space-y-3">
                        <Input
                          type="number"
                          placeholder="Ajánlott ár (Ft)"
                          value={offerAmount}
                          onChange={e => setOfferAmount(e.target.value)}
                        />
                        <Textarea
                          placeholder="Üzenet az eladónak (opcionális)"
                          value={offerMessage}
                          onChange={e => setOfferMessage(e.target.value)}
                          rows={2}
                        />
                        <div className="flex gap-2">
                          <Button onClick={handleOffer} disabled={createOffer.isPending} className="flex-1">
                            Ajánlat küldése
                          </Button>
                          <Button variant="ghost" onClick={() => setShowOfferForm(false)}>Mégse</Button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Ilolit Banner */}
            <div className="bg-ilolit/10 border border-ilolit/20 rounded-xl p-4 flex gap-4 items-start">
              <ShieldCheck className="w-6 h-6 text-ilolit flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-ilolit mb-1">Ilolit védi ezt a vásárlást</h3>
                <p className="text-sm text-muted-foreground mb-2">Ha bármi probléma adódik, a pénzed visszakapod.</p>
                <Link href="/ilolit" className="text-sm font-medium text-ilolit hover:underline">
                  Részletek
                </Link>
              </div>
            </div>

            {/* Seller Info */}
            {listing.user && (
              <div className="p-4 border rounded-2xl space-y-3 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <Link href={`/profile/${listing.user.username}`} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                    <Avatar className="w-12 h-12 border-2 border-amber-400">
                      <AvatarImage src={listing.user.avatarUrl || ""} />
                      <AvatarFallback>{(listing.user?.username || "EL").substring(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-bold flex items-center gap-2">
                        <span>{listing.user.username}</span>
                        <VerificationBadge verifications={{ email: true, phone: true, identity: true, business: true, sellerStatus: true }} size="sm" />
                      </div>
                      <div className="mt-1">
                        <VerifiedReviewSummary
                          rating={listing.user.rating || 4.9}
                          reviewCount={listing.user.reviewCount || 127}
                          transactionType="vásárlás"
                          size="sm"
                        />
                      </div>
                    </div>
                  </Link>

                  <div className="flex gap-2 w-full sm:w-auto flex-wrap">
                    <FollowSellerButton sellerId={listing.user.id || listing.user.username} sellerName={listing.user.username} compact={true} />
                    <Button variant="outline" size="sm" onClick={() => setIsReviewModalOpen(true)} className="flex-1 text-xs font-bold border-amber-300 text-amber-700 hover:bg-amber-50">
                      <Star className="w-3.5 h-3.5 mr-1 fill-amber-400 text-amber-400" /> Értékelés
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setIsReportModalOpen(true)} className="text-xs font-bold border-slate-300 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40">
                      <Flag className="w-3.5 h-3.5 mr-1 text-rose-500" /> Jelentés
                    </Button>
                    <Button variant="outline" size="sm" asChild className="text-xs">
                      <Link href={`/profile/${listing.user.username}`}>Profil</Link>
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Csomagkedvezmény ettől az eladótól (Feature 23) */}
            {listing.user && (
              <BundleDiscountSection
                sellerName={listing.user.username}
                currentProduct={{ id: listing.id, title: listing.title, priceNum: listing.price, image: imageUrl }}
                otherItemsBySeller={
                  similarListings?.map(s => ({
                    id: s.id,
                    title: s.title,
                    priceNum: s.price,
                    image: s.images?.[0]?.url || "https://placehold.co/300x300"
                  })) || []
                }
              />
            )}

            {/* Fee breakdown — only for DIRECT listings */}
            {!isAuction && !isNegotiable && (() => {
              const safetyFee = calculateSafetyFee(listing.price);
              const shippingFee = 990;
              const total = listing.price + safetyFee + shippingFee;
              return (
                <div className="border rounded-2xl p-4 space-y-2.5 bg-slate-50 dark:bg-slate-900 border-purple-200 dark:border-purple-900">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground font-medium">Termék ára</span>
                    <span className="font-extrabold">{formatPrice(listing.price)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-purple-700 dark:text-purple-300 font-extrabold flex items-center gap-1">
                      <ShieldCheck className="w-4 h-4 text-purple-600" /> {SAFETY_FEE_LABEL}
                    </span>
                    <span className="text-purple-700 dark:text-purple-300 font-extrabold">{formatPrice(safetyFee)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground font-medium">Szállítás (becslés)</span>
                    <span className="text-muted-foreground font-bold">{formatPrice(shippingFee)}</span>
                  </div>
                  <div className="flex justify-between font-black text-base pt-2 border-t border-purple-100 dark:border-purple-900">
                    <span>Végösszeg</span>
                    <span className="text-emerald-600 dark:text-emerald-400">{formatPrice(total)}</span>
                  </div>
                  <div className="text-[11px] text-purple-600 dark:text-purple-400 font-medium pt-1 italic border-t border-purple-100 dark:border-purple-950">
                    💡 {SAFETY_FEE_TOOLTIP}
                  </div>
                </div>
              );
            })()}

            {/* Actions — only for DIRECT listings */}
            {!isAuction && !isNegotiable && (
              <div className="flex flex-col gap-3">
                <Button size="lg" className="w-full text-lg h-14" asChild>
                  <Link href={`/checkout/${listing.id}`}>Megveszem</Link>
                </Button>
                <Button variant="outline" size="lg" className="w-full text-lg h-14" asChild>
                  <Link href={`/messages/new?listingId=${listing.id}`}>
                    <MessageCircle className="w-5 h-5 mr-2" />
                    Üzenet küldése
                  </Link>
                </Button>
              </div>
            )}

            {/* Bejelentés / Moderáció Gomb */}
            <div className="pt-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsReportModalOpen(true)}
                className="text-xs text-slate-500 hover:text-red-600 flex items-center gap-1.5 mx-auto"
              >
                <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                <span>Termék bejelentése / Vitarendezés (Admin)</span>
              </Button>
            </div>

            {/* For all types: message button */}
            {(isAuction || isNegotiable) && (
              <Button variant="outline" size="lg" className="w-full" asChild>
                <Link href={`/messages/new?listingId=${listing.id}`}>
                  <MessageCircle className="w-5 h-5 mr-2" />
                  Üzenet az eladónak
                </Link>
              </Button>
            )}

            {/* Description */}
            <div className="space-y-4 pt-4 border-t">
              <h2 className="text-lg font-semibold">Leírás</h2>
              <p className="text-muted-foreground whitespace-pre-wrap">{listing.description}</p>
            </div>
          </div>
        </div>

        {/* Similar Listings */}
        <div className="mt-16 pt-8 border-t">
          <h2 className="text-2xl font-bold mb-6">Hasonló termékek</h2>
          {isSimilarLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 md:gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="space-y-3">
                  <Skeleton className="w-full aspect-[3/4] rounded-xl" />
                  <Skeleton className="w-3/4 h-4" />
                </div>
              ))}
            </div>
          ) : (Array.isArray(similarListings) ? similarListings : []).length ? (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 md:gap-6">
              {(Array.isArray(similarListings) ? similarListings : []).map((similarListing) => (
                <ListingCard key={similarListing.id} listing={similarListing} />
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-xs">Nem találtunk hasonló termékeket.</p>
          )}
        </div>
      </div>

      {/* Csomagpont Választó Dialog */}
      <Dialog open={isShippingModalOpen} onOpenChange={setIsShippingModalOpen}>
        <DialogContent className="sm:max-w-lg rounded-3xl p-6 bg-white dark:bg-slate-900">
          <DialogHeader>
            <DialogTitle className="font-black text-lg">Csomagpont Választás (FoxPost / Packeta)</DialogTitle>
          </DialogHeader>
          <ShippingSelector
            onSelectParcelPoint={(machine) => {
              setSelectedParcelMachine(machine);
              setIsShippingModalOpen(false);
              toast({ title: `Átvételi pont kiválasztva: ${machine.name}` });
            }}
            selectedMachineId={selectedParcelMachine?.id}
          />
        </DialogContent>
      </Dialog>

      {/* Értékelő Dialog */}
      <ReviewModal
        isOpen={isReviewModalOpen}
        onClose={() => setIsReviewModalOpen(false)}
        targetUserName={listing.user?.username || "Eladó"}
        itemTitle={listing.title}
        onSubmitReview={(review) => {
          toast({ title: "Értékelés sikeresen elküldve!" });
        }}
      />

      {/* Szerkesztő Dialog */}
      <EditListingModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        listing={{
          id: listing.id,
          title: listing.title,
          price: String(listing.price),
          category: (listing.category as any)?.name || "Ruhák",
          condition: listing.condition,
          size: listing.size || undefined,
          brand: listing.brand || undefined,
          description: listing.description || "",
          images: listing.images?.map((i) => i.url) || [],
          status: (listing as any).status || "active",
        }}
        onSaveListing={(updated) => {
          toast({ title: "Hirdetés frissítve!" });
        }}
      />

      {/* Moderációs Bejelentő Dialog */}
      <Dialog open={isReportModalOpen} onOpenChange={setIsReportModalOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl p-6 bg-white dark:bg-slate-900">
          <DialogHeader>
            <DialogTitle className="font-black text-lg text-rose-600 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" /> Termék bejelentése (Admin Moderáció)
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Jelezd az Ilolit csapatának, ha a termék megsérti a szabályzatot vagy hamisítvány!
            </DialogDescription>
          </DialogHeader>
          {reportSuccess ? (
            <div className="py-6 text-center space-y-2">
              <CheckCircle className="w-10 h-10 text-emerald-500 mx-auto" />
              <h4 className="font-bold text-sm">Bejelentés elküldve az Adminnak!</h4>
              <p className="text-xs text-slate-500">Köszönjük, az Ilolit moderátorai felülvizsgálják az ügyet.</p>
            </div>
          ) : (
            <div className="space-y-4 pt-2">
              <Textarea
                placeholder="Írd le a bejelentés okát (pl. hamisított márka, nem létező termék)..."
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                className="text-xs rounded-2xl min-h-[100px]"
              />
              <div className="flex justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={() => setIsReportModalOpen(false)}>Mégse</Button>
                <Button
                  size="sm"
                  className="bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl"
                  onClick={() => {
                    setReportSuccess(true);
                    setTimeout(() => {
                      setReportSuccess(false);
                      setIsReportModalOpen(false);
                    }, 1800);
                  }}
                >
                  Bejelentés küldése
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Alkuképes Ajánlattétel Modal (Feature 22) */}
      <OfferModal
        isOpen={isOfferModalOpen}
        onClose={() => setIsOfferModalOpen(false)}
        productTitle={listing.title}
        originalPriceNum={listing.price}
        sellerName={listing.user?.username}
      />
    </Layout>
  );
}
