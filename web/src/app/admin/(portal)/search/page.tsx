import type { Metadata } from "next";
import { Suspense } from "react";
import { TableSkeleton } from "@/components/admin/ui";
import { SearchView } from "./SearchView";

export const metadata: Metadata = { title: "Search" };
// Behind the staff gate, which only renders on the client (see the layout).
export const instant = false;

export default function AdminSearchPage() {
  return (
    <Suspense fallback={<TableSkeleton />}>
      <SearchView />
    </Suspense>
  );
}
