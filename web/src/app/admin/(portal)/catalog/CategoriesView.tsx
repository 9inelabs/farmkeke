"use client";

// A-80 Categories. Changes show at once in the app and on the website.
// Pictures are bundled with the app, so a category uses one of them.
import { useMutation, useQuery } from "convex/react";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { useStaff } from "@/components/admin/context";
import { FormError } from "@/components/admin/errors";
import { Notice, PageHeader, Panel, ReasonDialog, TableSkeleton } from "@/components/admin/ui";
import { Button } from "@/components/ui/Button";
import { SelectField, TextField } from "@/components/ui/Field";
import { admin } from "@/convex/admin";
import type { Category } from "@/convex/returns/adminFarms";

const PICTURES = [
  { key: "vegetables", label: "Vegetables" },
  { key: "fruits", label: "Fruits" },
  { key: "grains-tubers", label: "Grains and tubers" },
  { key: "poultry-eggs", label: "Poultry and eggs" },
  { key: "meat-fish", label: "Meat and fish" },
  { key: "dairy", label: "Dairy" },
];
const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

type Dialog = { kind: "new" } | { kind: "edit" | "types" | "hide"; category: Category } | { kind: "order" } | null;

export function CategoriesView() {
  const me = useStaff();
  const canEdit = me.can("catalog.manage");
  const categories = useQuery(admin.catalog.listAllCategories, {}) as Category[] | undefined;
  const create = useMutation(admin.catalog.createCategory);
  const update = useMutation(admin.catalog.updateCategory);
  const setSubtypes = useMutation(admin.catalog.setSubtypes);
  const reorder = useMutation(admin.catalog.reorderCategories);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [order, setOrder] = useState<Category[] | null>(null);
  const [name, setName] = useState("");
  const [picture, setPicture] = useState(PICTURES[0].key);
  const [types, setTypes] = useState<{ slug: string; name: string }[]>([]);
  const [done, setDone] = useState<string | null>(null);

  if (categories === undefined) return <TableSkeleton />;
  const rows = order ?? categories;
  const move = (i: number, by: number) => {
    const next = [...rows];
    const [it] = next.splice(i, 1);
    next.splice(i + by, 0, it);
    setOrder(next);
  };

  return (
    <>
      <PageHeader
        title="Categories"
        description="What shoppers browse by in the app and on the website. Each category can have types, the chips under it (for example Tomatoes, Peppers)."
        actions={
          canEdit ? (
            <Button
              variant="lime"
              icon={<Plus aria-hidden className="size-[18px]" />}
              onClick={() => {
                setName("");
                setPicture(PICTURES[0].key);
                setDialog({ kind: "new" });
              }}
            >
              New category
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
          <Notice tone="pend">You&apos;re changing the order. Save it to update the shop.</Notice>
          <Button variant="lime" onClick={() => setDialog({ kind: "order" })}>
            Save order
          </Button>
          <Button variant="ghost" onClick={() => setOrder(null)}>
            Cancel
          </Button>
        </div>
      ) : null}
      <Panel padded={false}>
        <ul className="m-0 list-none p-0">
          {rows.map((c, i) => (
            <li key={c._id} className="flex flex-wrap items-center gap-3 px-6 py-4 shadow-[inset_0_-1px_0_var(--color-line-soft)] last:shadow-none m:px-4">
              <span className="w-7 text-sm font-semibold text-subtle">{i + 1}</span>
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="text-[15px] font-semibold text-ink">{c.name}</span>
                  {c.hidden ? <span className="badge b-grey">Hidden</span> : null}
                </span>
                <span className="block text-sm text-muted">
                  {(c.subtypes ?? []).length > 0 ? (c.subtypes ?? []).map((s) => s.name).join(", ") : "No types"} · picture:{" "}
                  {PICTURES.find((p) => p.key === c.illustration)?.label ?? c.illustration}
                </span>
              </span>
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
                      setName(c.name);
                      setPicture(c.illustration);
                      setDialog({ kind: "edit", category: c });
                    }}
                  >
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setTypes((c.subtypes ?? []).map((s) => ({ ...s })));
                      setDialog({ kind: "types", category: c });
                    }}
                  >
                    Types
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setDialog({ kind: "hide", category: c })}>
                    {c.hidden ? "Show" : "Hide"}
                  </Button>
                </span>
              ) : null}
            </li>
          ))}
        </ul>
      </Panel>

      <ReasonDialog
        open={dialog?.kind === "new" || dialog?.kind === "edit"}
        onClose={() => setDialog(null)}
        title={dialog?.kind === "edit" ? `Edit ${dialog.category.name}` : "New category"}
        confirmLabel={dialog?.kind === "edit" ? "Save" : "Create category"}
        variant="lime"
        onConfirm={async (reason) => {
          if (!name.trim()) throw new FormError("Add a name.");
          if (dialog?.kind === "edit") {
            await update({ categoryId: dialog.category._id, name, illustration: picture, reason });
            setDone("Category saved.");
          } else {
            await create({ slug: slugify(name), name, illustration: picture, reason });
            setDone("Category created. It shows at the end of the list.");
          }
        }}
      >
        <TextField label="Name" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} />
        <SelectField label="Picture" value={picture} onChange={(e) => setPicture(e.target.value)} hint="Pictures come with the app. A new picture needs an app update.">
          {PICTURES.map((p) => (
            <option key={p.key} value={p.key}>
              {p.label}
            </option>
          ))}
        </SelectField>
      </ReasonDialog>

      <ReasonDialog
        open={dialog?.kind === "types"}
        onClose={() => setDialog(null)}
        title={dialog?.kind === "types" ? `Types of ${dialog.category.name}` : ""}
        description="Shown as chips under the category. Farmers pick one for each product. Removing a type doesn't change existing products."
        confirmLabel="Save types"
        onConfirm={async (reason) => {
          if (dialog?.kind !== "types") return;
          const clean = types.map((t) => ({ name: t.name.trim(), slug: t.slug || slugify(t.name) })).filter((t) => t.name);
          await setSubtypes({ categoryId: dialog.category._id, subtypes: clean, reason });
          setDone("Types saved.");
        }}
      >
        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {types.map((t, i) => (
            <li key={i} className="flex items-end gap-2">
              <TextField
                label={`Type ${i + 1}`}
                value={t.name}
                className="flex-1"
                onChange={(e) => setTypes((all) => all.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))}
              />
              <Button variant="ghost" icon={<Trash2 aria-hidden className="size-4" />} onClick={() => setTypes((all) => all.filter((_, j) => j !== i))}>
                Remove
              </Button>
            </li>
          ))}
        </ul>
        <div>
          <Button variant="ghost" size="sm" icon={<Plus aria-hidden className="size-4" />} onClick={() => setTypes((all) => [...all, { slug: "", name: "" }])}>
            Add a type
          </Button>
        </div>
      </ReasonDialog>

      <ReasonDialog
        open={dialog?.kind === "hide"}
        onClose={() => setDialog(null)}
        title={dialog?.kind === "hide" ? `${dialog.category.hidden ? "Show" : "Hide"} ${dialog.category.name}` : ""}
        description={
          dialog?.kind === "hide" && !dialog.category.hidden
            ? "Shoppers won't see this category. Its products stay in search and on farm pages."
            : "Shoppers will see this category again."
        }
        confirmLabel={dialog?.kind === "hide" && dialog.category.hidden ? "Show category" : "Hide category"}
        onConfirm={async (reason) => {
          if (dialog?.kind !== "hide") return;
          await update({ categoryId: dialog.category._id, hidden: !dialog.category.hidden, reason });
          setDone(dialog.category.hidden ? "Category shown." : "Category hidden.");
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
          await reorder({ orderedIds: rows.map((c) => c._id), reason: reason || "Changed the order" });
          setOrder(null);
          setDone("Order saved.");
        }}
      />
    </>
  );
}
