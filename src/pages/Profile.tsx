import { useParams } from "wouter";
import { Layout } from "@/components/layout/Layout";
import {
  useGetUserByUsername, getGetUserByUsernameQueryKey,
  useGetUserListings, getGetUserListingsQueryKey,
  useGetUserReviews, getGetUserReviewsQueryKey
} from "@workspace/api-client-react";
import { ListingCard } from "@/components/shared/ListingCard";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MapPin, Calendar, Star } from "lucide-react";
import { format } from "date-fns";
import { hu } from "date-fns/locale";

export function Profile() {
  const { username } = useParams<{ username: string }>();

  const { data: user, isLoading: isUserLoading } = useGetUserByUsername(username || "", {
    query: { enabled: !!username, queryKey: getGetUserByUsernameQueryKey(username || "") }
  });

  const { data: listingsData, isLoading: isListingsLoading } = useGetUserListings(username || "", {}, {
    query: { enabled: !!username, queryKey: getGetUserListingsQueryKey(username || "", {}) }
  });

  const { data: reviewsData, isLoading: isReviewsLoading } = useGetUserReviews(username || "", {}, {
    query: { enabled: !!username, queryKey: getGetUserReviewsQueryKey(username || "", {}) }
  });

  if (isUserLoading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center gap-6 mb-8">
            <Skeleton className="w-24 h-24 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="w-48 h-8" />
              <Skeleton className="w-32 h-4" />
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (!user) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-20 text-center">
          <h1 className="text-2xl font-bold mb-2">Felhasználó nem található</h1>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        {/* Profile Header */}
        <div className="flex flex-col md:flex-row items-center md:items-start gap-6 mb-12 text-center md:text-left">
          <Avatar className="w-24 h-24 md:w-32 md:h-32 border-4 border-background shadow-lg">
            <AvatarImage src={user.avatarUrl || ""} />
            <AvatarFallback className="text-3xl">{user.username.substring(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          
          <div className="flex-1 space-y-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">{user.fullName || user.username}</h1>
              <p className="text-muted-foreground">@{user.username}</p>
            </div>
            
            {user.bio && (
              <p className="max-w-2xl text-sm">{user.bio}</p>
            )}

            <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 md:gap-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-1 font-medium text-foreground">
                <Star className="w-4 h-4 fill-primary text-primary" />
                <span>{user.rating?.toFixed(1) || "Nincs értékelés"}</span>
                <span className="text-muted-foreground font-normal">({user.reviewCount || 0})</span>
              </div>
              {user.location && (
                <div className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  {user.location}
                </div>
              )}
              <div className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                Csatlakozott: {format(new Date(user.createdAt), 'yyyy. MMMM', { locale: hu })}
              </div>
              <div>
                <span className="font-semibold text-foreground">{user.soldCount || 0}</span> eladás
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="listings" className="w-full">
          <TabsList className="mb-8 w-full justify-start h-12 bg-transparent border-b rounded-none p-0">
            <TabsTrigger 
              value="listings" 
              className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-full px-6"
            >
              Termékek ({user.listingCount || 0})
            </TabsTrigger>
            <TabsTrigger 
              value="reviews"
              className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-full px-6"
            >
              Értékelések ({user.reviewCount || 0})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="listings">
            {isListingsLoading ? (
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
                {Array.from({ length: 10 }).map((_, i) => (
                  <div key={i} className="space-y-3">
                    <Skeleton className="w-full aspect-[3/4] rounded-xl" />
                    <Skeleton className="w-3/4 h-4" />
                  </div>
                ))}
              </div>
            ) : listingsData?.items?.length ? (
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
                {listingsData.items.map(listing => (
                  <ListingCard key={listing.id} listing={listing} />
                ))}
              </div>
            ) : (
              <div className="text-center py-20 text-muted-foreground">
                Jelenleg nincsenek aktív termékek.
              </div>
            )}
          </TabsContent>

          <TabsContent value="reviews">
            <div className="max-w-3xl space-y-6">
              {isReviewsLoading ? (
                <Skeleton className="w-full h-32 rounded-xl" />
              ) : (Array.isArray(reviewsData) ? reviewsData : []).length ? (
                (Array.isArray(reviewsData) ? reviewsData : []).map(review => (
                  <div key={review.id} className="p-4 border rounded-xl space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar className="w-10 h-10">
                          <AvatarImage src={review.author?.avatarUrl || ""} />
                          <AvatarFallback>{review.author?.username.substring(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{review.author?.username}</div>
                          <div className="text-xs text-muted-foreground">
                            {format(new Date(review.createdAt), 'yyyy. MM. dd.', { locale: hu })}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-0.5">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star key={i} className={`w-4 h-4 ${i < review.rating ? "fill-primary text-primary" : "fill-muted text-muted-foreground"}`} />
                        ))}
                      </div>
                    </div>
                    {review.comment && (
                      <p className="text-sm">{review.comment}</p>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-center py-20 text-muted-foreground">
                  Még nincsenek értékelések.
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
