import type { Metadata } from "next";
import { Suspense } from "react";
import { TableSkeleton } from "@/components/admin/ui";
import { ProductsView } from "./ProductsView";

export const metadata: Metadata = { title: "All products" };
// Behind the staff gate, which only renders on the client (see the layout).
export const instant = false;

// A-40 All listings, by status, category or farm (?farm=…).
export default function AdminProductsPage() {
  return (
    <Suspense fallback={<TableSkeleton />}>
      <ProductsView />
    </Suspense>
  );
}
