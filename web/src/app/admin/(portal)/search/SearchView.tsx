"use client";

// Global search: an order number, an exact email or phone, or part of a farm
// or product name. Sections only appear for roles that can open them.
import { useQuery } from "convex/react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { ORDER_STATUS } from "@/components/admin/labels";
import { adminRoutes } from "@/components/admin/routes";
import { PageHeader, Panel, StatusBadge, TableSkeleton } from "@/components/admin/ui";
import { Button } from "@/components/ui/Button";
import { admin } from "@/convex/admin";

type Results = {
  orders: { _id: string; number: string; status: string }[];
  people: { _id: string; name: string; detail: string }[];
  farms: { _id: string; name: string; detail: string }[];
  products: { _id: string; name: string; detail: string }[];
};

export function SearchView() {
  const params = useSearchParams();
  const router = useRouter();
  const q = (params.get("q") ?? "").trim();
  const [text, setText] = useState(q);
  const results = useQuery(admin.search.find, q.length >= 2 ? { query: q } : "skip") as Results | undefined;
  const submit = (e: FormEvent) => {
    e.preventDefault();
    router.replace(adminRoutes.search(text.trim()));
  };
  const total = results ? results.orders.length + results.people.length + results.farms.length + results.products.length : 0;
  return (
    <>
      <PageHeader title="Search" description="An order number (FK-10234), an exact email or phone number, or part of a customer, farm or product name." />
      <form onSubmit={submit} role="search" className="mb-6 flex max-w-[560px] gap-2">
        <label htmlFor="search-page" className="sr-only">
          Search
        </label>
        <input id="search-page" type="search" className="fin" value={text} onChange={(e) => setText(e.target.value)} autoFocus />
        <Button type="submit" variant="dark">
          Search
        </Button>
      </form>
      {q.length < 2 ? null : results === undefined ? (
        <TableSkeleton />
      ) : total === 0 ? (
        <p className="p">Nothing found for &ldquo;{q}&rdquo;. Emails and phone numbers must be complete.</p>
      ) : (
        <div className="grid grid-cols-2 gap-6 m:grid-cols-1">
          {results.orders.length > 0 ? (
            <Section title="Orders">
              {results.orders.map((o) => (
                <Row key={o._id} href={adminRoutes.order(o._id)} name={o.number} detail={<StatusBadge map={ORDER_STATUS} status={o.status} />} />
              ))}
            </Section>
          ) : null}
          {results.people.length > 0 ? (
            <Section title="People">
              {results.people.map((p) => (
                <Row key={p._id} href={adminRoutes.customer(p._id)} name={p.name} detail={p.detail} />
              ))}
            </Section>
          ) : null}
          {results.farms.length > 0 ? (
            <Section title="Farms">
              {results.farms.map((f) => (
                <Row key={f._id} href={adminRoutes.farm(f._id)} name={f.name} detail={f.detail} />
              ))}
            </Section>
          ) : null}
          {results.products.length > 0 ? (
            <Section title="Products">
              {results.products.map((p) => (
                <Row key={p._id} href={adminRoutes.product(p._id)} name={p.name} detail={p.detail} />
              ))}
            </Section>
          ) : null}
        </div>
      )}
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Panel title={title}>
      <ul className="m-0 list-none p-0">{children}</ul>
    </Panel>
  );
}

function Row({ href, name, detail }: { href: string; name: string; detail: React.ReactNode }) {
  return (
    <li className="shadow-[inset_0_-1px_0_var(--color-line-soft)] last:shadow-none">
      <Link href={href} className="flex min-h-12 flex-wrap items-center justify-between gap-2 py-2 text-ink hover:text-forest">
        <span className="font-semibold">{name}</span>
        <span className="text-sm text-muted">{detail}</span>
      </Link>
    </li>
  );
}
