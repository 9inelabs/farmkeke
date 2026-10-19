"use client";

// A-42 / A-43: one product. Staff with listings.review approve products
// waiting for review, send them back saying what to fix, or take a live
// product down. The farm is told each time (push, and email per F-75).
import { useMutation, useQuery } from "convex/react";
import Link from "next/link";
import { useState } from "react";
import { useStaff } from "@/components/admin/context";
import { FormError } from "@/components/admin/errors";
import { LISTING_STATUS } from "@/components/admin/labels";
import { adminRoutes } from "@/components/admin/routes";
import { ConfirmDialog, Facts, Notice, PageHeader, Panel, Photo, ReasonDialog, StatusBadge, TableSkeleton } from "@/components/admin/ui";
import { Button } from "@/components/ui/Button";
import { SelectField, TextArea } from "@/components/ui/Field";
import { admin } from "@/convex/admin";
import type { Id } from "@/convex/api";
import type { ListingDetail } from "@/convex/returns/adminFarms";
import { dateTime, naira } from "@/lib/format";

const EVENT: Record<string, string> = {
  created: "Created by the farm",
  submitted: "Sent for review",
  published_trusted: "Went live (trusted farm)",
  pricing_changed: "Prices or units changed",
  quick_update: "Stock or price updated",
  approved: "Approved",
  sent_back: "Sent back",
  unpublished: "Taken down",
  pause: "Paused by the farm",
  resume: "Resumed by the farm",
  out_of_stock: "Marked sold out",
  delete: "Deleted by the farm",
};
const eventLabel = (kind: string) => EVENT[kind] ?? kind.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());

function eventNote(details?: string) {
  if (!details) return null;
  try {
    const d = JSON.parse(details) as Record<string, unknown>;
    return [d.reason, d.note].filter((x) => typeof x === "string" && x).join(". ") || null;
  } catch {
    return null;
  }
}

export function ProductView({ listingId }: { listingId: string }) {
  const me = useStaff();
  const id = listingId as Id<"listings">;
  const data = useQuery(admin.listings.get, { listingId: id }) as ListingDetail | null | undefined;
  const approve = useMutation(admin.listings.approve);
  const sendBack = useMutation(admin.listings.sendBack);
  const unpublish = useMutation(admin.listings.unpublish);
  const [dialog, setDialog] = useState<"approve" | "back" | "down" | null>(null);
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [photo, setPhoto] = useState(0);
  const [done, setDone] = useState<string | null>(null);

  if (data === undefined) return <TableSkeleton />;
  if (data === null) {
    return (
      <>
        <PageHeader title="Not found" back={{ href: adminRoutes.products, label: "All products" }} />
        <Notice tone="err">This product no longer exists.</Notice>
      </>
    );
  }
  const l = data.listing;
  const canReview = me.can("listings.review");
  const waiting = l.status === "under_review";
  const live = l.status === "live" || l.status === "paused";
  const openForm = (d: "back" | "down") => {
    setReason("");
    setNote("");
    setDialog(d);
  };
  const urls = data.photoUrls;

  return (
    <>
      <PageHeader
        title={l.name}
        description={data.farm ? data.farm.name : undefined}
        back={waiting ? { href: adminRoutes.review, label: "Product review" } : { href: adminRoutes.products, label: "All products" }}
        actions={<StatusBadge map={LISTING_STATUS} status={l.status} />}
      />
      {done ? (
        <div className="mb-4">
          <Notice tone="ok">{done}</Notice>
        </div>
      ) : null}
      {l.reviewNote && l.status === "needs_changes" ? (
        <div className="mb-4">
          <Notice tone="pend">Sent back: {l.reviewNote}</Notice>
        </div>
      ) : null}
      <div className="grid grid-cols-[1fr_320px] gap-6 m:grid-cols-1">
        <div className="flex flex-col gap-6">
          <Panel title="Photos" description={`${urls.length} photo${urls.length === 1 ? "" : "s"}. The first is the cover.`}>
            {urls.length === 0 ? (
              <p className="sm">No photos.</p>
            ) : (
              <>
                <a href={urls[photo] ?? undefined} target="_blank" rel="noreferrer" aria-label="Open photo full size (new tab)">
                  <Photo url={urls[photo]} alt={`${l.name}, photo ${photo + 1}`} className="aspect-[4/3] w-full rounded-2xl" />
                </a>
                {urls.length > 1 ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {urls.map((u, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setPhoto(i)}
                        aria-label={`Show photo ${i + 1}`}
                        aria-pressed={photo === i}
                        className={`cursor-pointer overflow-hidden rounded-xl p-0 ${photo === i ? "shadow-[0_0_0_3px_var(--color-forest)]" : ""}`}
                      >
                        <Photo url={u} alt="" className="size-16" />
                      </button>
                    ))}
                  </div>
                ) : null}
              </>
            )}
          </Panel>
          <Panel title="Details">
            <Facts
              items={[
                {
                  label: "Farm",
                  value: data.farm ? (
                    <Link href={adminRoutes.farm(data.farm._id)} className="font-semibold">
                      {data.farm.name}
                      {data.farm.trusted ? " (trusted)" : ""}
                    </Link>
                  ) : (
                    "–"
                  ),
                },
                { label: "Category", value: [data.category, l.subtype].filter(Boolean).join(" · ") || "–" },
                { label: "Harvested", value: l.harvestedOn ?? "–" },
                { label: "Ways to get it", value: [l.delivery && "Delivery", l.pickup && "Pickup"].filter(Boolean).join(" and ") || "–" },
                { label: "Sent for review", value: l.submittedAt ? dateTime(l.submittedAt) : "–" },
                { label: "Live since", value: l.liveAt ? dateTime(l.liveAt) : "Not live" },
              ]}
            />
            {l.description ? <p className="p mt-4 whitespace-pre-line">{l.description}</p> : null}
          </Panel>
          <Panel title="Prices and stock" padded={false}>
            <table className="w-full border-collapse text-left text-sm">
              <caption className="sr-only">Prices and stock</caption>
              <thead>
                <tr className="shadow-[inset_0_-1px_0_var(--color-line)]">
                  {["Unit", "Price", "Stock", "Minimum"].map((h) => (
                    <th key={h} scope="col" className="px-4 py-3 text-xs font-semibold text-subtle uppercase first:pl-6 last:pr-6 m:first:pl-4 m:last:pr-4">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.units.map((u) => (
                  <tr key={u.unitId} className="shadow-[inset_0_-1px_0_var(--color-line-soft)] last:shadow-none">
                    <td className="px-4 py-3 pl-6 m:pl-4">{u.unit}</td>
                    <td className="px-4 py-3 font-semibold">{naira(u.priceKobo)}</td>
                    <td className="px-4 py-3">{u.stock}</td>
                    <td className="px-4 py-3 pr-6 m:pr-4">{u.minOrder}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Panel>
          <Panel title="History">
            {data.history.length === 0 ? (
              <p className="sm">Nothing yet.</p>
            ) : (
              <ol className="m-0 flex list-none flex-col gap-4 p-0">
                {data.history.map((h) => (
                  <li key={h._id} className="text-sm leading-5">
                    <p className="font-semibold text-ink">{eventLabel(h.kind)}</p>
                    <p className="text-muted">{dateTime(h._creationTime)}</p>
                    {eventNote(h.details) ? <p className="mt-0.5 text-ink-2">{eventNote(h.details)}</p> : null}
                  </li>
                ))}
              </ol>
            )}
          </Panel>
        </div>
        <Panel title="Review" className="self-start m:order-first">
          {!canReview ? (
            <p className="sm">Your role can&apos;t review products.</p>
          ) : waiting ? (
            <div className="flex flex-col gap-2.5">
              <Button variant="lime" fullWidth onClick={() => setDialog("approve")}>
                Approve
              </Button>
              <Button variant="ghost" fullWidth onClick={() => openForm("back")}>
                Send back
              </Button>
            </div>
          ) : live ? (
            <Button variant="danger" fullWidth onClick={() => openForm("down")}>
              Take down
            </Button>
          ) : (
            <p className="sm">Nothing to review. The farm is working on it.</p>
          )}
        </Panel>
      </div>

      <ReasonDialog
        open={dialog === "approve"}
        onClose={() => setDialog(null)}
        title={`Approve ${l.name}`}
        description="It goes live in the shop straight away, and the farm is told."
        label="Note"
        optional
        confirmLabel="Approve"
        variant="lime"
        onConfirm={async (r) => {
          await approve({ listingId: id, reason: r || "Approved" });
          setDone("Approved. It's live in the shop.");
        }}
      />
      <ConfirmDialog
        open={dialog === "back" || dialog === "down"}
        onClose={() => setDialog(null)}
        title={dialog === "down" ? `Take down ${l.name}` : `Send back ${l.name}`}
        description={
          dialog === "down"
            ? "It disappears from the shop. The farm sees what to fix, then sends it for review again."
            : "The farm sees what to fix, then sends it for review again."
        }
        confirmLabel={dialog === "down" ? "Take down" : "Send back"}
        variant={dialog === "down" ? "danger" : "dark"}
        onConfirm={async () => {
          if (!reason) throw new FormError("Choose what's wrong.");
          if (dialog === "down") await unpublish({ listingId: id, reason, note: note || undefined });
          else await sendBack({ listingId: id, reason, note: note || undefined });
          setDone(dialog === "down" ? "Taken down. The farm has been told." : "Sent back. The farm has been told.");
        }}
      >
        <SelectField label="What's wrong" value={reason} onChange={(e) => setReason(e.target.value)}>
          <option value="">Choose a reason</option>
          {data.sendBackReasons.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </SelectField>
        <TextArea
          label="Note to the farm"
          labelNote="(optional)"
          rows={3}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="[&_textarea]:h-auto [&_textarea]:py-3"
        />
      </ConfirmDialog>
    </>
  );
}
