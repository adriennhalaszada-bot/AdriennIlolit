import { Layout } from "@/components/layout/Layout";
import { useUpdateListing, useDeleteListing } from "@workspace/api-client-react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Edit2, Trash2, Eye, EyeOff, Plus, Package } from "lucide-react";
import { queryClient } from "@/lib/queryClient";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { formatPrice, CONDITIONS } from "@/lib/constants";
import { EditListingModal, ListingItemData } from "@/components/shared/EditListingModal";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { getMyListings } from "@/lib/listingApi";

export function DashboardListings() {
  const { toast } = useToast();
  const [editingListing, setEditingListing] = useState<ListingItemData | null>(null);
  const { data, isLoading, isError } = useQuery({ queryKey: ["my-listings"], queryFn: getMyListings });

  const updateListing = useUpdateListing();
  const deleteListing = useDeleteListing();

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["my-listings"] });

  const handleToggleVisibility = (id: string, currentStatus: string) => {
    const newStatus = currentStatus === "HIDDEN" ? "ACTIVE" : "HIDDEN";
    // Optimistic update — UI changes instantly, reverts if API fails
    const qk = ["my-listings"];
    queryClient.setQueryData(qk, (old: any) =>
      old ? { ...old, items: old.items.map((item: any) => item.id === id ? { ...item, status: newStatus } : item) } : old
    );
    updateListing.mutate(
      { id, data: { status: newStatus } },
      {
        onSuccess: () => {
          toast({ title: newStatus === "HIDDEN" ? "Hirdetés elrejtve" : "Hirdetés visszaállítva" });
          invalidate();
        },
        onError: () => {
          invalidate(); // revert
          toast({ title: "Hiba történt", variant: "destructive" });
        }
      }
    );
  };

  const handleDelete = (id: string, title: string) => {
    if (!confirm(`Biztosan törölni szeretnéd ezt a hirdetést?\n\n"${title}"\n\nEz nem visszavonható.`)) return;
    deleteListing.mutate(
      { id },
      {
        onSuccess: () => {
          toast({ title: "Hirdetés törölve" });
          invalidate();
        },
        onError: (err: any) => toast({
          title: "Nem sikerült törölni",
          description: err?.response?.data?.error || "Ismeretlen hiba történt.",
          variant: "destructive"
        })
      }
    );
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold">Saját hirdetések</h1>
            {data?.items && (
              <p className="text-sm text-muted-foreground mt-1">{data.items.length} hirdetés</p>
            )}
          </div>
          <Button asChild>
            <Link href="/sell"><Plus className="w-4 h-4 mr-1" /> Új hirdetés</Link>
          </Button>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-28 rounded-2xl" />)}
          </div>
        ) : isError ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-8 text-center text-sm font-semibold text-rose-700">A saját hirdetéseid nem tölthetők be. Frissítsd az oldalt, vagy jelentkezz be újra.</div>
        ) : data?.items?.length ? (
          <div className="space-y-3">
            {data.items.map(listing => {
              const imageUrl = listing.images?.[0]?.url;
              const isHidden = listing.status === "HIDDEN";
              const isSold = listing.status === "ARCHIVED";

              return (
                <div
                  key={listing.id}
                  className={cn(
                    "flex items-center gap-4 p-4 bg-card border rounded-2xl transition-all",
                    isHidden && "opacity-60"
                  )}
                >
                  {/* Thumbnail */}
                  <Link href={`/product/${listing.id}`} className="flex-shrink-0">
                    <div className="w-20 h-20 rounded-xl overflow-hidden bg-muted">
                      {imageUrl ? (
                        <img src={imageUrl} alt={listing.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="w-8 h-8 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                  </Link>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <Link href={`/product/${listing.id}`} className="hover:text-primary transition-colors">
                      <h3 className="font-semibold truncate">{listing.title}</h3>
                    </Link>
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      <span className="text-lg font-bold text-primary">{formatPrice(listing.price)}</span>
                      <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                        {CONDITIONS[listing.condition as keyof typeof CONDITIONS]}
                      </span>
                      {isHidden && (
                        <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
                          Rejtett
                        </span>
                      )}
                      {isSold && (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                          Eladva
                        </span>
                      )}
                    </div>
                    {listing.category && (
                      <div className="text-xs text-muted-foreground mt-0.5">{listing.category.name}</div>
                    )}
                  </div>

                  {/* Actions — always visible, not hover-only */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Button
                      size="icon"
                      variant="ghost"
                      title={isHidden ? "Megjelenítés" : "Elrejtés"}
                      onClick={() => handleToggleVisibility(listing.id, listing.status)}
                      disabled={updateListing.isPending || isSold}
                      className="h-9 w-9 text-muted-foreground hover:text-foreground"
                    >
                      {isHidden ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      title="Szerkesztés"
                      onClick={() => setEditingListing({
                        id: listing.id,
                        title: listing.title,
                        price: String(listing.price),
                        category: listing.category?.name || "Ruhák",
                        condition: listing.condition,
                        size: listing.size || undefined,
                        brand: listing.brand || undefined,
                        description: listing.description || "",
                        images: (listing.images as any[])?.map((i) => i.url) || [],
                        status: listing.status as any || "active"
                      })}
                      className="h-9 w-9 text-muted-foreground hover:text-foreground"
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      title="Törlés"
                      onClick={() => handleDelete(listing.id, listing.title)}
                      disabled={deleteListing.isPending}
                      className="h-9 w-9 text-muted-foreground hover:text-red-500"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-20">
            <Package className="w-14 h-14 mx-auto text-muted-foreground/30 mb-4" />
            <h2 className="text-xl font-semibold mb-2">Még nincsenek hirdetéseid</h2>
            <p className="text-muted-foreground mb-6">Add el, amire már nincs szükséged!</p>
            <Button asChild>
              <Link href="/sell"><Plus className="w-4 h-4 mr-1" /> Első hirdetés feladása</Link>
            </Button>
          </div>
        )}

        <EditListingModal
          isOpen={!!editingListing}
          onClose={() => setEditingListing(null)}
          listing={editingListing}
          onSaveListing={(updated) => {
            toast({ title: "Hirdetés sikeresen frissítve!" });
            invalidate();
          }}
        />
      </div>
    </Layout>
  );
}
