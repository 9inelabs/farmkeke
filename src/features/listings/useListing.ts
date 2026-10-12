import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect } from "react";

/** The listing in the route (`/listing/[id]/…`) and whether this is an edit of one section. */
export function useListing() {
  const { id, edit } = useLocalSearchParams<{ id: string; edit?: string }>();
  const listing = useQuery(api.listings.get, { listingId: id as Id<"listings"> });
  useEffect(() => {
    if (listing === null) router.replace("/listings");
  }, [listing]);
  return { listingId: id as Id<"listings">, listing: listing ?? undefined, editing: edit === "1" };
}

export type Listing = NonNullable<ReturnType<typeof useListing>["listing"]>;
