"use client";

// A-90 Text messages: every text and code call Farmkeke sent through Termii,
// newest first, and whether the network delivered it. "Sent" only means
// Termii accepted it; the delivery report (convex/texts.ts) says whether the
// phone got it. Sign-up codes are listed without the code.
import { useQuery, usePaginatedQuery } from "convex/react";
import { CheckCircle2, Clock3, Phone, TriangleAlert, XCircle, type LucideIcon } from "lucide-react";
import { useState } from "react";
import { DataTable, FilterTabs, LoadMore, Notice, PageHeader, Panel, TableSkeleton, type Column } from "@/components/admin/ui";
import { admin } from "@/convex/admin";
import { dateTime } from "@/lib/format";

type TextRow = {
  id: string;
  at: number;
  to: string;
  body: string;
  kind: "code" | "notification" | "test";
  channel: "sms" | "voice";
  sent: "recorded" | "sent" | "failed";
  delivery: "pending" | "delivered" | "failed" | null;
  deliveryStatus: string | null;
  deliveryAt: number | null;
  error: string | null;
};

type Summary = { total: number; delivered: number; failed: number; pending: number; notSent: number; calls: number; capped: boolean };

const KIND: Record<TextRow["kind"], string> = { code: "Sign-up code", notification: "Order or account", test: "Test" };

/** "+2348031234567" → "0803 123 4567" */
const local = (to: string) => {
  const d = to.replace(/\D/g, "");
  const n = d.startsWith("234") ? `0${d.slice(3)}` : d;
  return n.length === 11 ? `${n.slice(0, 4)} ${n.slice(4, 7)} ${n.slice(7)}` : to;
};

function Outcome({ t }: { t: TextRow }) {
  const [label, cls, Icon]: [string, string, LucideIcon] =
    t.sent === "recorded"
      ? ["Not sent (texts off)", "b-held", Clock3]
      : t.sent === "failed"
        ? ["Not sent", "b-err", XCircle]
        : t.delivery === "delivered"
          ? ["Delivered", "b-ok", CheckCircle2]
          : t.delivery === "failed"
            ? ["Not delivered", "b-err", TriangleAlert]
            : ["Waiting for the network", "b-pend", Clock3];
  return (
    <span className="flex flex-col gap-1">
      <span className={`badge ${cls} inline-flex w-fit items-center gap-1`}>
        <Icon aria-hidden className="size-3.5" strokeWidth={2.2} />
        {label}
      </span>
      {t.sent === "failed" && t.error ? <span className="text-xs text-subtle">{t.error}</span> : null}
      {t.sent === "sent" && t.deliveryStatus ? (
        <span className="text-xs text-subtle">
          Termii: {t.deliveryStatus}
          {t.deliveryAt ? ` · ${dateTime(t.deliveryAt)}` : ""}
        </span>
      ) : null}
    </span>
  );
}

const columns: Column<TextRow>[] = [
  { key: "at", label: "Sent", className: "whitespace-nowrap", render: (t) => dateTime(t.at) },
  {
    key: "to",
    label: "To",
    className: "whitespace-nowrap",
    render: (t) => (
      <span className="flex items-center gap-2">
        {t.channel === "voice" ? <Phone aria-label="Voice call" className="size-3.5 text-forest" strokeWidth={2.2} /> : null}
        {local(t.to)}
      </span>
    ),
  },
  { key: "kind", label: "What", className: "whitespace-nowrap", render: (t) => (t.channel === "voice" ? `${KIND[t.kind]} (call)` : KIND[t.kind]) },
  { key: "body", label: "Message", className: "min-w-[240px]", render: (t) => <span className="line-clamp-2 text-muted">{t.body}</span> },
  { key: "outcome", label: "Delivery", className: "min-w-[200px]", render: (t) => <Outcome t={t} /> },
];

export function TextsView() {
  const [tab, setTab] = useState<"all" | "failed" | "pending" | "delivered">("all");
  const [since] = useState(() => Date.now() - 24 * 3_600_000);
  const summary = useQuery(admin.texts.summary, { since }) as Summary | undefined;
  const { results, status, loadMore } = usePaginatedQuery(admin.texts.list, tab === "all" ? {} : { delivery: tab }, { initialNumItems: 40 });
  const sentOut = summary ? summary.delivered + summary.failed + summary.pending : 0;

  return (
    <>
      <PageHeader
        title="Text messages"
        description="Every text and code call sent through Termii, and whether the network delivered it. Termii saying “sent” only means it accepted the text."
      />
      <div className="mb-5 grid grid-cols-4 gap-3 m:grid-cols-2">
        <Stat label="Last 24 hours" value={summary?.total} note={summary ? `${summary.calls} code ${summary.calls === 1 ? "call" : "calls"}` : undefined} />
        <Stat label="Delivered" value={summary?.delivered} note={summary && sentOut > 0 ? `${Math.round((summary.delivered / sentOut) * 100)}% of those sent` : undefined} tone="ok" />
        <Stat label="Not delivered" value={summary ? summary.failed + summary.notSent : undefined} note={summary ? `${summary.notSent} refused by Termii` : undefined} tone="err" />
        <Stat label="Waiting for the network" value={summary?.pending} note="No delivery report yet" tone="pend" />
      </div>
      {summary && summary.pending > 0 && summary.delivered === 0 && summary.failed === 0 ? (
        <div className="mb-5">
          <Notice tone="pend">
            No delivery reports yet. In the Termii dashboard, set the delivery report webhook to this deployment&apos;s
            /termii/delivery address with your TERMII_WEBHOOK_KEY (see the launch checklist).
          </Notice>
        </div>
      ) : null}
      <FilterTabs
        label="Show"
        value={tab}
        onChange={setTab}
        tabs={[
          { key: "all", label: "All" },
          { key: "failed", label: "Not delivered" },
          { key: "pending", label: "Waiting" },
          { key: "delivered", label: "Delivered" },
        ]}
      />
      <Panel padded={false}>
        {status === "LoadingFirstPage" ? (
          <TableSkeleton />
        ) : (
          <DataTable caption="Text messages" columns={columns} rows={results as TextRow[]} rowKey={(t) => t.id} empty="No texts here." />
        )}
      </Panel>
      <LoadMore status={status} onMore={() => loadMore(40)} />
    </>
  );
}

function Stat({ label, value, note, tone }: { label: string; value: number | undefined; note?: string; tone?: "ok" | "err" | "pend" }) {
  const color = tone === "ok" ? "text-ok" : tone === "err" ? "text-err" : tone === "pend" ? "text-pend" : "text-ink";
  return (
    <div className="rounded-[18px] bg-surface p-4 shadow-[inset_0_0_0_1px_var(--color-line)]">
      <p className="text-xs font-semibold text-muted">{label}</p>
      <p className={`mt-1 font-display text-[24px] leading-8 font-extrabold ${color}`}>{value ?? "–"}</p>
      {note ? <p className="text-xs text-subtle">{note}</p> : null}
    </div>
  );
}
