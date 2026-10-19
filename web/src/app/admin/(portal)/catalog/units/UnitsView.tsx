"use client";

// A-81 Units. New units appear at once in the farmer's listing form. Retired
// units can't be picked for new prices but stay on old listings and orders.
import { useMutation, useQuery } from "convex/react";
import { Plus } from "lucide-react";
import { useState } from "react";
import { useStaff } from "@/components/admin/context";
import { FormError } from "@/components/admin/errors";
import { DataTable, Notice, PageHeader, Panel, ReasonDialog, TableSkeleton, type Column } from "@/components/admin/ui";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/Field";
import { admin } from "@/convex/admin";
import type { Unit } from "@/convex/returns/adminFarms";

type Dialog = { kind: "new" } | { kind: "edit" | "retire"; unit: Unit } | null;
const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

export function UnitsView() {
  const me = useStaff();
  const canEdit = me.can("catalog.manage");
  const units = useQuery(admin.catalog.listAllUnits, {}) as Unit[] | undefined;
  const create = useMutation(admin.catalog.createUnit);
  const update = useMutation(admin.catalog.updateUnit);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [singular, setSingular] = useState("");
  const [pluralName, setPlural] = useState("");
  const [done, setDone] = useState<string | null>(null);

  const columns: Column<Unit>[] = [
    { key: "one", label: "One", render: (u) => u.singular },
    { key: "many", label: "Many", render: (u) => u.plural },
    { key: "status", label: "Status", render: (u) => (u.retired ? <span className="badge b-grey">Retired</span> : <span className="badge b-ok">In use</span>) },
    ...(canEdit
      ? [
          {
            key: "actions",
            label: "Change",
            render: (u: Unit) => (
              <span className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setSingular(u.singular);
                    setPlural(u.plural);
                    setDialog({ kind: "edit", unit: u });
                  }}
                >
                  Rename
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setDialog({ kind: "retire", unit: u })}>
                  {u.retired ? "Bring back" : "Retire"}
                </Button>
              </span>
            ),
          },
        ]
      : []),
  ];

  return (
    <>
      <PageHeader
        title="Units"
        description="The units farmers sell in, like basket, crate of 30 or kg."
        actions={
          canEdit ? (
            <Button
              variant="lime"
              icon={<Plus aria-hidden className="size-[18px]" />}
              onClick={() => {
                setSingular("");
                setPlural("");
                setDialog({ kind: "new" });
              }}
            >
              New unit
            </Button>
          ) : null
        }
      />
      {done ? (
        <div className="mb-4">
          <Notice tone="ok">{done}</Notice>
        </div>
      ) : null}
      <Panel padded={false}>
        {units === undefined ? <TableSkeleton /> : <DataTable caption="Units" columns={columns} rows={units} rowKey={(u) => u._id} />}
      </Panel>

      <ReasonDialog
        open={dialog?.kind === "new" || dialog?.kind === "edit"}
        onClose={() => setDialog(null)}
        title={dialog?.kind === "edit" ? `Rename ${dialog.unit.singular}` : "New unit"}
        description={dialog?.kind === "edit" ? "The new name shows on every product that uses this unit." : undefined}
        confirmLabel={dialog?.kind === "edit" ? "Save" : "Create unit"}
        variant="lime"
        onConfirm={async (reason) => {
          if (!singular.trim() || !pluralName.trim()) throw new FormError("Add both names.");
          if (dialog?.kind === "edit") {
            await update({ unitId: dialog.unit._id, singular, plural: pluralName, reason });
            setDone("Unit saved.");
          } else {
            await create({ slug: slugify(singular), singular, plural: pluralName, reason });
            setDone("Unit created. Farmers can use it straight away.");
          }
        }}
      >
        <div className="grid grid-cols-2 gap-4 m:grid-cols-1">
          <TextField label="One" placeholder="basket" value={singular} onChange={(e) => setSingular(e.target.value)} />
          <TextField label="Many" placeholder="baskets" value={pluralName} onChange={(e) => setPlural(e.target.value)} />
        </div>
      </ReasonDialog>
      <ReasonDialog
        open={dialog?.kind === "retire"}
        onClose={() => setDialog(null)}
        title={dialog?.kind === "retire" ? `${dialog.unit.retired ? "Bring back" : "Retire"} ${dialog.unit.singular}` : ""}
        description={
          dialog?.kind === "retire" && !dialog.unit.retired
            ? "Farmers can't choose it for new prices. Products that already use it keep it."
            : "Farmers can choose it again."
        }
        confirmLabel={dialog?.kind === "retire" && dialog.unit.retired ? "Bring back" : "Retire"}
        onConfirm={async (reason) => {
          if (dialog?.kind !== "retire") return;
          await update({ unitId: dialog.unit._id, retired: !dialog.unit.retired, reason });
          setDone(dialog.unit.retired ? "Unit brought back." : "Unit retired.");
        }}
      />
    </>
  );
}
