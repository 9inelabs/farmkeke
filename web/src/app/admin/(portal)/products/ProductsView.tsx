"use client";

import { usePaginatedQuery, useQuery } from "convex/react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { useDebounced } from "@/components/admin/debounce";
import { LISTING_STATUS } from "@/components/admin/labels";
import { adminRoutes } from "@/components/admin/routes";
import { DataTable, FilterTabs, LoadMore, PageHeader, Panel, Photo, SearchField, StatusBadge, TableSkeleton, type Column } from "@/components/admin/ui";
import { admin } from "@/convex/admin";
import type { Id } from "@/convex/api";
import type { Category, ListingRow, ListingStatus } from "@/convex/returns/adminFarms";
import { dayMonth } from "@/lib/format";

const columns: Column<ListingRow>[] = [
  {
    key: "name",
    label: "Product",
    render: (r) => (
      <span className="flex items-center gap-3">
        <Photo url={r.coverUrl} alt="" className="size-10 flex-none rounded-lg" />
        {r.name}
      </span>
    ),
  },
  { key: "farm", label: "Farm", render: (r) => r.farmName ?? "–" },
  {
    key: "status",
    label: "Status",
    render: (r) => (
      <span className="flex flex-wrap gap-1.5">
        <StatusBadge map={LISTING_STATUS} status={r.status} />
        {r.outOfStock && r.status === "live" ? <span className="badge b-grey">Sold out</span> : null}
      </span>
    ),
  },
  { key: "live", label: "Live since", render: (r) => (r.liveAt ? dayMonth(r.liveAt) : "–") },
];

export function ProductsView() {
  const params = useSearchParams();
  const farm = params.get("farm") as Id<"farms"> | null;
  const [tab, setTab] = useState<ListingStatus>("live");
  const [category, setCategory] = useState("");
  const [search, setSearch] = useState("");
  const q = useDebounced(search.trim());
  const categories = useQuery(admin.catalog.listAllCategories, {}) as Category[] | undefined;
  const { results, status, loadMore } = usePaginatedQuery(
    admin.listings.list,
    {
      status: tab,
      ...(category ? { categoryId: category as Id<"categories"> } : {}),
      ...(farm && !category ? { farmId: farm } : {}),
      ...(q ? { search: q } : {}),
    },
    { initialNumItems: 30 },
  );
  const rows = results as ListingRow[];
  return (
    <>
      <PageHeader title="All products" description="Every product on Farmkeke. Open one to see its photos and history, or to take it down." />
      {farm ? (
        <p className="mb-4 text-sm text-muted">
          Showing one farm&apos;s products.{" "}
          <Link href={adminRoutes.products} className="font-semibold">
            Show every farm
          </Link>
        </p>
      ) : null}
      <FilterTabs
        label="Status"
        value={tab}
        onChange={setTab}
        tabs={(["live", "under_review", "needs_changes", "paused", "draft"] as ListingStatus[]).map((s) => ({ key: s, label: LISTING_STATUS[s][1] }))}
      />
      <div className="flex flex-wrap items-start gap-x-4 m:flex-col m:gap-0 m:[&>*]:w-full m:[&>*]:max-w-none">
        <SearchField label="Search products by name" value={search} onChange={setSearch} />
        <select
          aria-label="Category"
          className="fin mb-4 w-[260px] cursor-pointer m:w-full"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          <option value="">All categories</option>
          {(categories ?? []).map((c) => (
            <option key={c._id} value={c._id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
      <Panel padded={false}>
        {status === "LoadingFirstPage" ? (
          <TableSkeleton />
        ) : (
          <DataTable
            caption="Products"
            columns={columns}
            rows={rows}
            rowKey={(r) => r._id}
            rowHref={(r) => adminRoutes.product(r._id)}
            empty="No products here."
          />
        )}
      </Panel>
      <LoadMore status={status} onMore={() => loadMore(30)} />
    </>
  );
}
