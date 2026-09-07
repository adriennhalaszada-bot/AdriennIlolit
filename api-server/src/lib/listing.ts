import { db } from "@workspace/db";
import {
  listingsTable,
  listingImagesTable,
  favoritesTable,
  usersTable,
  categoriesTable,
  subcategoriesTable,
  auctionsTable,
} from "@workspace/db";
import { eq, and } from "drizzle-orm";

export async function formatListing(
  listing: typeof listingsTable.$inferSelect,
  currentUserId?: string,
) {
  const [images, seller, category, subcategory, auction] = await Promise.all([
    db.query.listingImagesTable.findMany({
      where: eq(listingImagesTable.listingId, listing.id),
      orderBy: (i, { asc }) => asc(i.order),
    }),
    db.query.usersTable.findFirst({
      where: eq(usersTable.id, listing.userId),
    }),
    db.query.categoriesTable.findFirst({
      where: eq(categoriesTable.id, listing.categoryId),
    }),
    listing.subcategoryId
      ? db.query.subcategoriesTable.findFirst({
          where: eq(subcategoriesTable.id, listing.subcategoryId),
        })
      : Promise.resolve(null),
    listing.listingType === "AUCTION"
      ? db.query.auctionsTable.findFirst({
          where: eq(auctionsTable.listingId, listing.id),
        })
      : Promise.resolve(null),
  ]);

  let isFavorited = false;
  if (currentUserId) {
    const fav = await db.query.favoritesTable.findFirst({
      where: and(
        eq(favoritesTable.userId, currentUserId),
        eq(favoritesTable.listingId, listing.id),
      ),
    });
    isFavorited = !!fav;
  }

  let auctionData = null;
  if (auction) {
    let winner = null;
    if (auction.winnerId) {
      winner = await db.query.usersTable.findFirst({
        where: eq(usersTable.id, auction.winnerId),
      });
    }
    auctionData = {
      id: auction.id,
      listingId: auction.listingId,
      startingPrice: auction.startingPrice,
      currentPrice: auction.currentPrice,
      minBidIncrement: auction.minBidIncrement,
      bidCount: auction.bidCount,
      status: auction.status,
      autoExtend: auction.autoExtend,
      winnerId: auction.winnerId,
      winner: winner
        ? { id: winner.id, username: winner.username, avatarUrl: winner.avatarUrl }
        : null,
      endsAt: auction.endsAt,
      createdAt: auction.createdAt,
    };
  }

  return {
    id: listing.id,
    title: listing.title,
    description: listing.description,
    price: listing.price,
    originalPrice: listing.originalPrice,
    currency: listing.currency,
    condition: listing.condition,
    listingType: listing.listingType,
    brand: listing.brand,
    size: listing.size,
    color: listing.color,
    shippingModes: listing.shippingModes ?? [],
    bundleDiscountPercent: listing.bundleDiscountPercent ?? null,
    status: listing.status,
    isSold: listing.isSold,
    viewCount: listing.viewCount,
    favoriteCount: listing.favoriteCount,
    isFavorited,
    isOwner: currentUserId ? currentUserId === listing.userId : false,
    auction: auctionData,
    images: images.map((img) => ({
      id: img.id,
      url: img.url,
      thumbnail: img.thumbnail,
      alt: img.alt,
      order: img.order,
    })),
    user: seller
      ? {
          id: seller.id,
          username: seller.username,
          fullName: seller.fullName,
          avatarUrl: seller.avatarUrl,
          rating: seller.rating,
          reviewCount: seller.reviewCount,
          isVerified: seller.isVerified,
        }
      : null,
    category: category
      ? { id: category.id, name: category.name, slug: category.slug }
      : null,
    subcategory: subcategory
      ? {
          id: subcategory.id,
          name: subcategory.name,
          slug: subcategory.slug,
        }
      : null,
    createdAt: listing.createdAt,
    updatedAt: listing.updatedAt,
  };
}
