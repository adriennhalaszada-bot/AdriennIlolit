import { customFetch, type Listing } from "@workspace/api-client-react";

export interface MyListingsResult {
  items: Listing[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export function getMyListings() {
  return customFetch<MyListingsResult>("/api/listings?mine=true&status=ALL&limit=100");
}
