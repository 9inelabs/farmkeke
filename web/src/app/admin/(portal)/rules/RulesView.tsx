"use client";

// A-84 / A-85: Farmkeke's commission and the time limits every order
// follows. Changes apply to orders from now on, not to orders already paid.
import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { useStaff } from "@/components/admin/context";
import { FormError } from "@/components/admin/errors";
import { adminRoutes } from "@/components/admin/routes";
import { Facts, Notice, PageHeader, Panel, ReasonDialog, TableSkeleton } from "@/components/admin/ui";
import { Button, ButtonLink } from "@/components/ui/Button";
import { TextField } from "@/components/ui/Field";
import { admin } from "@/convex/admin";
import type { Rules } from "@/convex/returns/adminOps";
import { dateTime } from "@/lib/format";

const RULES = [
  { key: "farmerResponseHours", label: "Farm must accept within", unit: "hours", min: 1, max: 72, note: "Otherwise the order expires and the shopper is refunded." },
  { key: "unconfirmedAfterHours", label: "Delivered but not confirmed: flag after", unit: "hours", min: 1, max: 168, note: "The order shows under Orders, Needs attention." },
  { key: "pickupHoldDays", label: "Pickup orders wait at the point for", unit: "days", min: 1, max: 14, note: "A pickup point can set a longer time." },
  { key: "disputeReplyHours", label: "Farm must reply to a problem report within", unit: "hours", min: 1, max: 72, note: "After that, staff decide without the farm's reply." },
] as const;
type RuleKey = (typeof RULES)[number]["key"];

const pct = (bps: number) => `${(bps / 100).toLocaleString("en-NG", { maximumFractionDigits: 2 })}%`;

export function RulesView() {
  const me = useStaff();
  const rules = useQuery(admin.fees.get, {}) as Rules | undefined;
  const setRules = useMutation(admin.fees.setRules);
  const setCommission = useMutation(admin.fees.setCommission);
  const [editing, setEditing] = useState<"rules" | "commission" | null>(null);
  const [values, setValues] = useState<Record<RuleKey, string>>({ farmerResponseHours: "", unconfirmedAfterHours: "", pickupHoldDays: "", disputeReplyHours: "" });
  const [commission, setCommissionText] = useState("");
  const [done, setDone] = useState<string | null>(null);

  if (rules === undefined) return <TableSkeleton />;
  const canRules = me.can("fees.manage");
  const canCommission = me.can("commission.manage");

  return (
    <>
      <PageHeader
        title="Fees and rules"
        description="Farmkeke's commission and the time limits every order follows. Changes apply to new orders, not to orders already paid."
      />
      {done ? (
        <div className="mb-4">
          <Notice tone="ok">{done}</Notice>
        </div>
      ) : null}
      <div className="flex flex-col gap-6">
        <Panel
          title="Commission"
          description="Farmkeke's share of each order's product total. Delivery fees aren't included."
          actions={
            canCommission ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setCommissionText(String(rules.effectiveCommissionBps / 100));
                  setEditing("commission");
                }}
              >
                Change
              </Button>
            ) : null
          }
        >
          <Facts
            items={[
              { label: "Commission now", value: <strong className="font-display text-[22px]">{pct(rules.effectiveCommissionBps)}</strong> },
              {
                label: "Set",
                value:
                  rules.commissionBps === null
                    ? `Not set, so the default (${pct(rules.defaultCommissionBps)}) applies`
                    : rules.commissionEffectiveAt
                      ? `Since ${dateTime(rules.commissionEffectiveAt)}`
                      : "Yes",
              },
            ]}
          />
        </Panel>
        <Panel
          title="Order time limits"
          actions={
            canRules ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setValues({
                    farmerResponseHours: String(rules.farmerResponseHours),
                    unconfirmedAfterHours: String(rules.unconfirmedAfterHours),
                    pickupHoldDays: String(rules.pickupHoldDays),
                    disputeReplyHours: String(rules.disputeReplyHours),
                  });
                  setEditing("rules");
                }}
              >
                Change
              </Button>
            ) : null
          }
        >
          <ul className="m-0 flex list-none flex-col p-0">
            {RULES.map((r) => (
              <li key={r.key} className="flex flex-wrap items-baseline justify-between gap-2 py-3 shadow-[inset_0_-1px_0_var(--color-line-soft)] last:shadow-none">
                <span>
                  <span className="block text-[15px] font-semibold text-ink">{r.label}</span>
                  <span className="block text-sm text-muted">{r.note}</span>
                </span>
                <span className="text-[15px] font-bold whitespace-nowrap text-ink">
                  {rules[r.key]} {r.unit}
                  {rules[r.key] !== rules.defaults[r.key] ? <span className="ml-2 text-xs font-medium text-subtle">(default {rules.defaults[r.key]})</span> : null}
                </span>
              </li>
            ))}
          </ul>
        </Panel>
        <Panel title="Delivery fees" description="Each service area has its own delivery fee per farm.">
          <ButtonLink href={adminRoutes.areas} variant="ghost" size="sm">
            Go to areas and delivery fees
          </ButtonLink>
        </Panel>
      </div>

      <ReasonDialog
        open={editing === "rules"}
        onClose={() => setEditing(null)}
        title="Change order time limits"
        description="New limits apply to orders paid from now on."
        confirmLabel="Save"
        onConfirm={async (reason) => {
          const out: Partial<Record<RuleKey, number>> = {};
          for (const r of RULES) {
            const n = Number(values[r.key]);
            if (!Number.isInteger(n) || n < r.min || n > r.max) throw new FormError(`${r.label}: use ${r.min} to ${r.max} ${r.unit}.`);
            if (n !== rules[r.key]) out[r.key] = n;
          }
          if (Object.keys(out).length === 0) throw new FormError("Nothing changed.");
          await setRules({ ...out, reason });
          setDone("Time limits saved.");
        }}
      >
        <div className="grid grid-cols-2 gap-4 m:grid-cols-1">
          {RULES.map((r) => (
            <TextField
              key={r.key}
              label={`${r.label} (${r.unit})`}
              inputMode="numeric"
              value={values[r.key]}
              onChange={(e) => setValues((v) => ({ ...v, [r.key]: e.target.value }))}
              hint={`${r.min} to ${r.max}. Default ${rules.defaults[r.key]}.`}
            />
          ))}
        </div>
      </ReasonDialog>
      <ReasonDialog
        open={editing === "commission"}
        onClose={() => setEditing(null)}
        title="Change the commission"
        description="Applies to orders paid out from now on. Farms see it in their earnings."
        confirmLabel="Save commission"
        onConfirm={async (reason) => {
          const v = commission.trim();
          const bps = v === "" ? null : Math.round(Number(v) * 100);
          if (bps !== null && (!Number.isFinite(bps) || bps < 0 || bps > 5000)) throw new FormError("Use 0 to 50%.");
          await setCommission({ commissionBps: bps, reason });
          setDone("Commission saved.");
        }}
      >
        <TextField
          label="Commission (%)"
          inputMode="decimal"
          value={commission}
          onChange={(e) => setCommissionText(e.target.value)}
          hint={`Leave empty to use the default, ${pct(rules.defaultCommissionBps)}.`}
        />
      </ReasonDialog>
    </>
  );
}
