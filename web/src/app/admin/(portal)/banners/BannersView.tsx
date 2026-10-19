"use client";

// A-86 Home banners: the featured card at the top of Home in the app and on
// the website. The shop shows the first banner that's on and whose product
// can be bought, so the others wait as back-ups.
import { useMutation, usePaginatedQuery, useQuery } from "convex/react";
import { ArrowDown, ArrowUp, GalleryHorizontalEnd, Plus } from "lucide-react";
import { useState } from "react";
import { useStaff } from "@/components/admin/context";
import { useDebounced } from "@/components/admin/debounce";
import { FormError } from "@/components/admin/errors";
import { Notice, PageHeader, Panel, Photo, ReasonDialog, TableSkeleton } from "@/components/admin/ui";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { TextField } from "@/components/ui/Field";
import { Switch } from "@/components/ui/Switch";
import { admin } from "@/convex/admin";
import type { Id } from "@/convex/api";
import type { BannerRow, ListingRow } from "@/convex/returns/adminFarms";

type Form = { tag: string; title: string; buttonLabel: string; listingId: string; listingName: string; active: boolean };
const EMPTY: Form = { tag: "Harvest of the week", title: "", buttonLabel: "Shop now", listingId: "", listingName: "", active: true };
type Dialog = { kind: "new" } | { kind: "edit"; banner: BannerRow } | { kind: "delete"; banner: BannerRow } | { kind: "order" } | null;

function ListingPicker({ value, onPick }: { value: string; onPick: (l: ListingRow) => void }) {
  const [search, setSearch] = useState("");
  const q = useDebounced(search.trim());
  const { results, status } = usePaginatedQuery(admin.listings.list, { status: "live", ...(q ? { search: q } : {}) }, { initialNumItems: 8 });
  return (
    <fieldset className="m-0 border-0 p-0">
      <legend className="lbl">Product</legend>
      <input type="search" className="fin" placeholder="Search live products" aria-label="Search live products" value={search} onChange={(e) => setSearch(e.target.value)} />
      <ul className="m-0 mt-2 flex max-h-64 list-none flex-col overflow-y-auto p-0">
        {status === "LoadingFirstPage" ? (
          <li className="sm py-2">Loading…</li>
        ) : results.length === 0 ? (
          <li className="sm py-2">No live products match.</li>
        ) : (
          (results as ListingRow[]).map((l) => (
            <li key={l._id}>
              <label className="flex min-h-12 cursor-pointer items-center gap-3 rounded-xl px-2 hover:bg-soft">
                <input type="radio" name="banner-listing" className="size-5 accent-forest" checked={value === l._id} onChange={() => onPick(l)} />
                <Photo url={l.coverUrl} alt="" className="size-10 flex-none rounded-lg" />
                <span className="min-w-0 text-sm">
                  <span className="block font-semibold text-ink">{l.name}</span>
                  <span className="block text-muted">{l.farmName}</span>
                </span>
              </label>
            </li>
          ))
        )}
      </ul>
    </fieldset>
  );
}

export function BannersView() {
  const me = useStaff();
  const canEdit = me.can("content.manage");
  const banners = useQuery(admin.banners.list, {}) as BannerRow[] | undefined;
  const create = useMutation(admin.banners.create);
  const update = useMutation(admin.banners.update);
  const reorder = useMutation(admin.banners.reorder);
  const remove = useMutation(admin.banners.remove);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [form, setForm] = useState<Form>(EMPTY);
  const [order, setOrder] = useState<BannerRow[] | null>(null);
  const [done, setDone] = useState<string | null>(null);

  if (banners === undefined) return <TableSkeleton />;
  const rows = order ?? banners;
  const move = (i: number, by: number) => {
    const next = [...rows];
    const [it] = next.splice(i, 1);
    next.splice(i + by, 0, it);
    setOrder(next);
  };
  const set = (k: "tag" | "title" | "buttonLabel") => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <>
      <PageHeader
        title="Home banners"
        description="The featured card at the top of Home in the app and on the website. Shoppers see the first banner that's on and whose product can be bought."
        actions={
          canEdit ? (
            <Button
              variant="lime"
              icon={<Plus aria-hidden className="size-[18px]" />}
              onClick={() => {
                setForm(EMPTY);
                setDialog({ kind: "new" });
              }}
            >
              New banner
            </Button>
          ) : null
        }
      />
      {done ? (
        <div className="mb-4">
          <Notice tone="ok">{done}</Notice>
        </div>
      ) : null}
      {order ? (
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <Notice tone="pend">You&apos;re changing the order. Save it to update Home.</Notice>
          <Button variant="lime" onClick={() => setDialog({ kind: "order" })}>
            Save order
          </Button>
          <Button variant="ghost" onClick={() => setOrder(null)}>
            Cancel
          </Button>
        </div>
      ) : null}
      {rows.length === 0 ? (
        <EmptyState icon={<GalleryHorizontalEnd className="size-7" strokeWidth={1.75} />} title="No banners yet" body="Home shows no featured card until you add one." />
      ) : (
        <Panel padded={false}>
          <ul className="m-0 list-none p-0">
            {rows.map((b, i) => (
              <li key={b._id} className="flex flex-wrap items-center gap-4 px-6 py-4 shadow-[inset_0_-1px_0_var(--color-line-soft)] last:shadow-none m:px-4">
                <Photo url={b.listing?.coverUrl} alt="" className="size-16 flex-none rounded-xl" />
                <div className="min-w-0 flex-1">
                  <p className="m-0 text-xs font-bold tracking-[0.04em] text-forest uppercase">{b.tag}</p>
                  <p className="m-0 text-[15px] font-semibold text-ink">{b.title}</p>
                  <p className="m-0 text-sm text-muted">
                    {b.listing ? `${b.listing.name} · ${b.listing.farmName ?? ""}` : "No product"} · button &ldquo;{b.buttonLabel}&rdquo;
                  </p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {b.shown ? <span className="badge b-ok">Showing now</span> : null}
                    {!b.active ? <span className="badge b-grey">Off</span> : null}
                    {b.active && b.problem ? <span className="badge b-err">Hidden: {b.problem}</span> : null}
                  </div>
                </div>
                {canEdit ? (
                  <span className="flex flex-wrap gap-2">
                    <Button size="sm" variant="ghost" icon={<ArrowUp aria-hidden className="size-4" />} disabled={i === 0} onClick={() => move(i, -1)}>
                      Up
                    </Button>
                    <Button size="sm" variant="ghost" icon={<ArrowDown aria-hidden className="size-4" />} disabled={i === rows.length - 1} onClick={() => move(i, 1)}>
                      Down
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setForm({
                          tag: b.tag,
                          title: b.title,
                          buttonLabel: b.buttonLabel,
                          listingId: b.listing?._id ?? "",
                          listingName: b.listing?.name ?? "",
                          active: b.active,
                        });
                        setDialog({ kind: "edit", banner: b });
                      }}
                    >
                      Edit
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setDialog({ kind: "delete", banner: b })}>
                      Delete
                    </Button>
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        </Panel>
      )}

      <ReasonDialog
        open={dialog?.kind === "new" || dialog?.kind === "edit"}
        onClose={() => setDialog(null)}
        title={dialog?.kind === "edit" ? "Edit banner" : "New banner"}
        confirmLabel={dialog?.kind === "edit" ? "Save" : "Create banner"}
        variant="lime"
        label="Note"
        optional
        onConfirm={async (reason) => {
          if (!form.listingId) throw new FormError("Choose the product the banner shows.");
          const payload = {
            tag: form.tag,
            title: form.title,
            buttonLabel: form.buttonLabel,
            listingId: form.listingId as Id<"listings">,
            active: form.active,
            reason: reason || (dialog?.kind === "edit" ? "Edited the banner" : "Added a banner"),
          };
          if (dialog?.kind === "edit") await update({ bannerId: dialog.banner._id, ...payload });
          else await create(payload);
          setDone("Banner saved.");
        }}
      >
        <TextField label="Small heading" value={form.tag} onChange={set("tag")} maxLength={40} hint="For example: Harvest of the week" />
        <TextField label="Title" value={form.title} onChange={set("title")} maxLength={80} placeholder="New-season yam from Okigwe" />
        <TextField label="Button" value={form.buttonLabel} onChange={set("buttonLabel")} maxLength={30} placeholder="Shop yam" />
        {form.listingName ? <p className="sm m-0">Showing: {form.listingName}</p> : null}
        <ListingPicker value={form.listingId} onPick={(l) => setForm((f) => ({ ...f, listingId: l._id, listingName: l.name }))} />
        <div className="flex items-center justify-between gap-3">
          <span className="text-[15px] font-semibold text-ink">Banner is on</span>
          <Switch label="Banner is on" checked={form.active} onChange={(active) => setForm((f) => ({ ...f, active }))} />
        </div>
      </ReasonDialog>
      <ReasonDialog
        open={dialog?.kind === "delete"}
        onClose={() => setDialog(null)}
        title="Delete this banner?"
        description="This can't be undone. To stop showing it for now, edit it and turn it off instead."
        confirmLabel="Delete"
        variant="danger"
        onConfirm={async (reason) => {
          if (dialog?.kind !== "delete") return;
          await remove({ bannerId: dialog.banner._id, reason });
          setDone("Banner deleted.");
        }}
      />
      <ReasonDialog
        open={dialog?.kind === "order"}
        onClose={() => setDialog(null)}
        title="Save the new order"
        optional
        label="Note"
        confirmLabel="Save order"
        variant="lime"
        onConfirm={async (reason) => {
          await reorder({ orderedIds: rows.map((b) => b._id), reason: reason || "Changed the order" });
          setOrder(null);
          setDone("Order saved.");
        }}
      />
    </>
  );
}
