"use client";

import { usePaginatedQuery } from "convex/react";
import { ClipboardCheck } from "lucide-react";
import Link from "next/link";
import { adminRoutes } from "@/components/admin/routes";
import { LoadMore, PageHeader, Photo, TableSkeleton } from "@/components/admin/ui";
import { EmptyState } from "@/components/ui/EmptyState";
import { admin } from "@/convex/admin";
import type { QueueRow } from "@/convex/returns/adminFarms";
import { dateTime } from "@/lib/format";

export function ReviewView() {
  const { results, status, loadMore } = usePaginatedQuery(admin.listings.queue, {}, { initialNumItems: 24 });
  const rows = results as QueueRow[];
  return (
    <>
      <PageHeader
        title="Product review"
        description="New and edited products from farms that aren't trusted yet. The oldest is first. Check the photos, name, price and category."
      />
      {status === "LoadingFirstPage" ? (
        <TableSkeleton />
      ) : rows.length === 0 ? (
        <EmptyState icon={<ClipboardCheck className="size-7" strokeWidth={1.75} />} title="Nothing to review" body="New products will show here." />
      ) : (
        <ul className="m-0 grid list-none grid-cols-4 gap-4 p-0 m:grid-cols-2">
          {rows.map((r) => (
            <li key={r._id}>
              <Link href={adminRoutes.product(r._id)} className="card block overflow-hidden text-ink hover:shadow-[inset_0_0_0_1px_var(--color-forest)]">
                <Photo url={r.coverUrl} alt="" className="aspect-square w-full" />
                <span className="block p-3">
                  <span className="block text-[15px] leading-5 font-semibold">{r.name}</span>
                  <span className="mt-0.5 block text-sm text-muted">{r.farmName ?? "Unknown farm"}</span>
                  <span className="mt-1 block text-xs text-subtle">{r.submittedAt ? `Sent ${dateTime(r.submittedAt)}` : ""}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <LoadMore status={status} onMore={() => loadMore(24)} />
    </>
  );
}
