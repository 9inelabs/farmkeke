import type { Metadata } from "next";
import { ParamPage } from "@/components/admin/ParamPage";
import { TableSkeleton } from "@/components/admin/ui";
import { ProductView } from "./ProductView";

export const metadata: Metadata = { title: "Product" };
// Behind the staff gate, which only renders on the client (see the layout).
export const instant = false;

// A-42 Listing detail, A-43 Send back or unpublish.
export default function AdminProductPage({ params }: { params: Promise<{ listingId: string }> }) {
  return <ParamPage params={params} name="listingId" fallback={<TableSkeleton />} render={(id) => <ProductView listingId={id} />} />;
}
