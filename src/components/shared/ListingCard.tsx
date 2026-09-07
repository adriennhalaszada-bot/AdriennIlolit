import { Link } from "wouter";
import { formatPrice, CONDITIONS } from "@/lib/constants";
import { Listing } from "@workspace/api-client-react";
import { Heart, Gavel, Handshake } from "lucide-react";
import { cn } from "@/lib/utils";
import { VerificationBadge } from "@/components/shared/VerificationBadge";

interface ListingCardProps {
  listing: Listing;
}

export function ListingCard({ listing }: ListingCardProps) {
  const imageUrl = listing.images?.[0]?.url || "https://placehold.co/400x500/e2e8f0/1e293b?text=Nincs+kép";
  const listingType = (listing as any).listingType as string | undefined;
  
  return (
    <Link href={`/product/${listing.id}`} className="group block space-y-2">
      <div className="relative aspect-[3/4] overflow-hidden rounded-xl bg-muted">
        <img 
          src={imageUrl} 
          alt={listing.title}
          className="object-cover w-full h-full transition-transform duration-300 group-hover:scale-105"
        />
        <div className="absolute top-2 left-2 flex flex-col gap-1">
          {listingType === "AUCTION" ? (
            <span className="flex items-center gap-1 bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
              <Gavel className="w-2.5 h-2.5" /> LICIT
            </span>
          ) : listingType === "NEGOTIABLE" ? (
            <span className="flex items-center gap-1 bg-primary text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
              <Handshake className="w-2.5 h-2.5" /> DEAL
            </span>
          ) : null}
          {(listing as any).status === "RESERVED" && (
            <span className="bg-amber-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
              FOGLALT
            </span>
          )}
          {(listing as any).status === "SOLD" && (
            <span className="bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
              ELADVA
            </span>
          )}
        </div>
        <div className="absolute top-2 right-2 flex items-center justify-center w-8 h-8 rounded-full bg-white/80 text-muted-foreground hover:text-primary hover:bg-white transition-colors">
          <Heart className={cn("w-5 h-5", listing.isFavorited && "fill-primary text-primary")} />
        </div>
      </div>
      <div className="space-y-1">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-medium text-sm truncate">{listing.title}</h3>
          <span className="font-bold text-sm whitespace-nowrap">
            {listingType === "AUCTION" ? (
              <span className="text-amber-600">{formatPrice(listing.price)}</span>
            ) : (
              formatPrice(listing.price)
            )}
          </span>
        </div>
        <div className="flex items-center justify-between text-xs text-muted-foreground pt-0.5">
          <div className="flex items-center gap-1.5 truncate">
            <span className="font-semibold text-slate-700 dark:text-slate-300 truncate">{listing.user?.username || 'Ismeretlen'}</span>
            <VerificationBadge verifications={{ email: true, phone: true, identity: true, sellerStatus: true }} showText={false} size="sm" />
          </div>
          <span>{CONDITIONS[listing.condition as keyof typeof CONDITIONS]}</span>
        </div>
      </div>
    </Link>
  );
}
