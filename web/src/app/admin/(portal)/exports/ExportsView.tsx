"use client";

// CSV downloads for spreadsheets: orders, payouts to farms, and customers,
// between two dates (Lagos time), up to 5,000 rows each.
import { useConvex } from "convex/react";
import { Download } from "lucide-react";
import { useState } from "react";
import { useStaff } from "@/components/admin/context";
import { adminError } from "@/components/admin/errors";
import { Notice, PageHeader, Panel } from "@/components/admin/ui";
import { Button } from "@/components/ui/Button";
import { SelectField, TextField } from "@/components/ui/Field";
import { admin } from "@/convex/admin";
import { todayInLagos } from "@/lib/format";

type Kind = "orders" | "payouts" | "customers";
const KINDS: { key: Kind; label: string; permission: string; description: string }[] = [
  { key: "orders", label: "Orders", permission: "orders.view", description: "Number, dates, status, money, farm, shopper and amounts in naira." },
  { key: "payouts", label: "Payouts to farms", permission: "money.view", description: "Date, farm, amount, status, Paystack reference and bank." },
  { key: "customers", label: "Customers", permission: "customers.view", description: "Accounts that joined: name, email, phone and whether blocked." },
];

/** "2026-10-19" (Lagos) → the timestamp of that midnight in Lagos (UTC+1). */
const lagosMidnight = (day: string) => Date.parse(`${day}T00:00:00+01:00`);
const iso = (ms: number | null) => (ms ? new Date(ms + 3_600_000).toISOString().slice(0, 16).replace("T", " ") : "");
const nairaPlain = (kobo: number) => (kobo / 100).toFixed(2);

function toCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return "";
  const head = Object.keys(rows[0]);
  const cell = (v: unknown) => {
    let s = v === null || v === undefined ? "" : String(v);
    // Names come from users: stop spreadsheets running them as formulas (phone numbers stay as they are)
    if (/^[=@\t\r]/.test(s) || (/^[+-]/.test(s) && !/^[+-]?[\d\s().]+$/.test(s))) s = `'${s}`;
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [head.join(","), ...rows.map((r) => head.map((h) => cell(r[h])).join(","))].join("\n");
}

export function ExportsView() {
  const me = useStaff();
  const convex = useConvex();
  const allowed = KINDS.filter((k) => me.can(k.permission));
  const today = todayInLagos();
  const monthStart = `${today.slice(0, 8)}01`;
  const [kind, setKind] = useState<Kind>(allowed[0]?.key ?? "orders");
  const [from, setFrom] = useState(monthStart);
  const [to, setTo] = useState(today);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: "ok" | "err" | "pend"; text: string } | null>(null);

  const download = async () => {
    setBusy(true);
    setMessage(null);
    try {
      const range = { from: lagosMidnight(from), to: lagosMidnight(to) + 24 * 3_600_000 };
      let rows: Record<string, unknown>[] = [];
      let capped = false;
      if (kind === "orders") {
        const r = (await convex.query(admin.exports.orders, range)) as { rows: Record<string, number | string | null>[]; capped: boolean };
        rows = r.rows.map((o) => ({
          order: o.number,
          placed: iso(o.placedAt as number),
          status: o.status,
          money: o.money,
          fulfilment: o.fulfilment,
          farm: o.farm,
          shopper: o.shopper,
          shopper_phone: o.shopperPhone,
          products_ngn: nairaPlain(o.itemsKobo as number),
          delivery_ngn: nairaPlain(o.deliveryKobo as number),
          total_ngn: nairaPlain(o.totalKobo as number),
          paid: iso(o.paidAt as number | null),
          delivered: iso(o.deliveredAt as number | null),
        }));
        capped = r.capped;
      } else if (kind === "payouts") {
        const r = (await convex.query(admin.exports.payouts, range)) as { rows: Record<string, number | string | boolean | null>[]; capped: boolean };
        rows = r.rows.map((p) => ({
          created: iso(p.createdAt as number),
          farm: p.farm,
          amount_ngn: nairaPlain(p.amountKobo as number),
          status: p.status,
          reference: p.reference,
          bank: p.bank,
          account_last4: p.accountLast4,
          sent: iso(p.sentAt as number | null),
          test: p.test ? "yes" : "no",
        }));
        capped = r.capped;
      } else {
        const r = (await convex.query(admin.exports.customers, range)) as { rows: Record<string, number | string | boolean>[]; capped: boolean };
        rows = r.rows.map((u) => ({ joined: iso(u.joinedAt as number), name: u.name, email: u.email, phone: u.phone, blocked: u.blocked ? "yes" : "no" }));
        capped = r.capped;
      }
      if (rows.length === 0) {
        setMessage({ tone: "pend", text: "Nothing in those dates." });
        return;
      }
      const blob = new Blob([`﻿${toCsv(rows)}`], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `farmkeke-${kind}-${from}-to-${to}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      setMessage({
        tone: capped ? "pend" : "ok",
        text: capped ? `Downloaded the newest 5,000 rows. Choose fewer days to get the rest.` : `Downloaded ${rows.length} rows.`,
      });
    } catch (e) {
      setMessage({ tone: "err", text: adminError(e) });
    } finally {
      setBusy(false);
    }
  };

  if (allowed.length === 0) {
    return (
      <>
        <PageHeader title="Exports" />
        <Notice tone="pend">Your role can&apos;t export anything.</Notice>
      </>
    );
  }
  return (
    <>
      <PageHeader title="Exports" description="Download a CSV file for Excel or Google Sheets. Dates are in Nigerian time." />
      <Panel className="max-w-[640px]">
        <div className="flex flex-col gap-4">
          <SelectField label="What to export" value={kind} onChange={(e) => setKind(e.target.value as Kind)} hint={KINDS.find((k) => k.key === kind)?.description}>
            {allowed.map((k) => (
              <option key={k.key} value={k.key}>
                {k.label}
              </option>
            ))}
          </SelectField>
          <div className="grid grid-cols-2 gap-4 m:grid-cols-1">
            <TextField label="From" type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} />
            <TextField label="To" type="date" value={to} min={from} max={today} onChange={(e) => setTo(e.target.value)} />
          </div>
          {message ? <Notice tone={message.tone}>{message.text}</Notice> : null}
          <div>
            <Button variant="lime" icon={<Download aria-hidden className="size-[18px]" />} loading={busy} onClick={download}>
              Download CSV
            </Button>
          </div>
        </div>
      </Panel>
    </>
  );
}
