"use client";

// Admin Portal building blocks, in the website's design language: cards,
// page headers, tables that turn into stacked cards under 760px, status
// badges, tabs and the "reason" dialog every logged action uses.
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { useId, useState, type ReactNode } from "react";
import { Button, type ButtonVariant } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Dialog";
import { TextArea } from "@/components/ui/Field";
import { Skeleton } from "@/components/ui/Skeleton";
import type { MemberStatus } from "@/convex/returns/admin";
import { adminError } from "./errors";

export function PageHeader({
  title,
  description,
  actions,
  back,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  back?: { href: string; label: string };
}) {
  return (
    <header className="mb-6 m:mb-5">
      {back ? (
        <Link href={back.href} className="mb-2 inline-flex min-h-11 items-center gap-1 text-sm font-semibold">
          <ChevronLeft aria-hidden className="size-4" strokeWidth={2.25} />
          {back.label}
        </Link>
      ) : null}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="m-0 font-display text-[28px] leading-9 font-extrabold tracking-[-0.02em] m:text-[24px] m:leading-8">
            {title}
          </h1>
          {description ? <p className="p mt-1 max-w-[720px]">{description}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
      </div>
    </header>
  );
}

export function Panel({
  title,
  description,
  actions,
  children,
  className,
  padded = true,
}: {
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  padded?: boolean;
}) {
  return (
    <section className={`card ${padded ? "p-6 m:p-4" : ""} ${className ?? ""}`}>
      {title ? (
        <div className={`mb-4 flex flex-wrap items-start justify-between gap-3 ${padded ? "" : "px-6 pt-6 m:px-4 m:pt-4"}`}>
          <div>
            <h2 className="h3">{title}</h2>
            {description ? <p className="sm mt-1">{description}</p> : null}
          </div>
          {actions}
        </div>
      ) : null}
      {children}
    </section>
  );
}

/** Label / value pairs, two columns on wide screens. */
export function Facts({ items }: { items: { label: string; value: ReactNode }[] }) {
  return (
    <dl className="m-0 grid grid-cols-2 gap-x-6 gap-y-4 m:grid-cols-1">
      {items.map((it) => (
        <div key={it.label} className="min-w-0">
          <dt className="cap font-semibold tracking-[0.02em] uppercase">{it.label}</dt>
          <dd className="m-0 mt-1 text-[15px] break-words text-ink">{it.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export type Column<T> = {
  key: string;
  label: string;
  render: (row: T) => ReactNode;
  className?: string;
};

/**
 * A table on wide screens; under 760px each row becomes a card with the
 * column labels. With rowHref, the first column links to the row's page.
 */
export function DataTable<T>({
  columns,
  rows,
  rowKey,
  rowHref,
  caption,
  empty,
}: {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  rowHref?: (row: T) => string;
  caption: string;
  empty?: ReactNode;
}) {
  if (rows.length === 0) {
    return <div className="px-6 py-10 text-center text-[15px] text-muted m:px-4">{empty ?? "Nothing here yet."}</div>;
  }
  const first = (row: T) => {
    const content = columns[0].render(row);
    return rowHref ? (
      <Link href={rowHref(row)} className="font-semibold text-ink underline-offset-2 hover:underline">
        {content}
      </Link>
    ) : (
      content
    );
  };
  return (
    <>
      <div className="overflow-x-auto m:hidden">
        <table className="w-full border-collapse text-left text-sm">
          <caption className="sr-only">{caption}</caption>
          <thead>
            <tr className="shadow-[inset_0_-1px_0_var(--color-line)]">
              {columns.map((c) => (
                <th key={c.key} scope="col" className={`px-4 py-3 text-xs font-semibold tracking-[0.02em] text-subtle uppercase first:pl-6 last:pr-6 ${c.className ?? ""}`}>
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={rowKey(row)} className="shadow-[inset_0_-1px_0_var(--color-line-soft)] last:shadow-none hover:bg-soft">
                {columns.map((c, i) => (
                  <td key={c.key} className={`px-4 py-3.5 align-top text-ink-2 first:pl-6 last:pr-6 ${c.className ?? ""}`}>
                    {i === 0 ? first(row) : c.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul className="m-0 hidden list-none p-0 m:block" aria-label={caption}>
        {rows.map((row) => (
          <li key={rowKey(row)} className="px-4 py-4 shadow-[inset_0_-1px_0_var(--color-line-soft)] last:shadow-none">
            <div className="text-[15px]">{first(row)}</div>
            <dl className="m-0 mt-2 grid grid-cols-2 gap-x-4 gap-y-2">
              {columns.slice(1).map((c) => (
                <div key={c.key} className="min-w-0">
                  <dt className="cap">{c.label}</dt>
                  <dd className="m-0 text-sm break-words text-ink-2">{c.render(row)}</dd>
                </div>
              ))}
            </dl>
          </li>
        ))}
      </ul>
    </>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-3 p-6 m:p-4" aria-hidden>
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className="h-10 w-full" />
      ))}
    </div>
  );
}

const MEMBER_BADGE: Record<MemberStatus, [string, string]> = {
  email_unconfirmed: ["b-grey", "Email not confirmed"],
  pending: ["b-pend", "Waiting for review"],
  more_info: ["b-pend", "More information asked"],
  approved: ["b-ok", "Active"],
  rejected: ["b-err", "Rejected"],
  deactivated: ["b-grey", "Access removed"],
};

export function MemberBadge({ status }: { status: MemberStatus }) {
  const [cls, label] = MEMBER_BADGE[status];
  return <span className={`badge ${cls}`}>{label}</span>;
}

/** Chip tabs that filter a list (state lives in the page). */
export function FilterTabs<K extends string>({
  tabs,
  value,
  onChange,
  label,
}: {
  tabs: { key: K; label: string; count?: number }[];
  value: K;
  onChange: (key: K) => void;
  label: string;
}) {
  return (
    <div role="group" aria-label={label} className="mb-4 flex flex-wrap gap-2">
      {tabs.map((t) => (
        <button key={t.key} type="button" className="chip" aria-pressed={value === t.key} onClick={() => onChange(t.key)}>
          {t.label}
          {typeof t.count === "number" ? (
            <span className={`rounded-full px-1.5 text-xs font-bold ${value === t.key ? "bg-white/20" : "bg-sunk"}`}>{t.count}</span>
          ) : null}
        </button>
      ))}
    </div>
  );
}

export function Notice({ tone = "info", children }: { tone?: "info" | "ok" | "err" | "pend"; children: ReactNode }) {
  const cls = { info: "bg-tint text-forest", ok: "bg-ok-bg text-ok", err: "bg-err-bg text-err", pend: "bg-pend-bg text-pend" }[tone];
  return (
    <div role={tone === "err" ? "alert" : "status"} className={`rounded-xl px-4 py-3 text-sm leading-[21px] font-medium ${cls}`}>
      {children}
    </div>
  );
}

/**
 * Confirms an action and asks why. The reason is saved in the audit log
 * (and sometimes emailed), so it's required unless `optional` is set.
 */
export function ReasonDialog({
  open,
  onClose,
  title,
  description,
  label = "Reason",
  hint = "Saved in the audit log.",
  confirmLabel,
  variant = "dark",
  optional = false,
  children,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: ReactNode;
  label?: string;
  hint?: string;
  confirmLabel: string;
  variant?: ButtonVariant;
  optional?: boolean;
  /** Extra fields above the reason (e.g. a role picker) */
  children?: ReactNode;
  onConfirm: (reason: string) => Promise<unknown>;
}) {
  const id = useId();
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const close = () => {
    if (busy) return;
    setReason("");
    setError(null);
    onClose();
  };
  const submit = async () => {
    if (!optional && reason.trim().length === 0) {
      setError("Add a reason. It's saved in the audit log.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await onConfirm(reason.trim());
      setReason("");
      onClose();
    } catch (e) {
      setError(adminError(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal
      open={open}
      onClose={close}
      title={title}
      description={description}
      footer={
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="ghost" onClick={close} disabled={busy}>
            Cancel
          </Button>
          <Button variant={variant} onClick={submit} loading={busy}>
            {confirmLabel}
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        {children}
        <TextArea
          id={id}
          label={label}
          labelNote={optional ? "(optional)" : undefined}
          hint={hint}
          rows={4}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="[&_textarea]:h-auto [&_textarea]:py-3"
          // Extra fields come first; otherwise start in the reason
          data-autofocus={children ? undefined : true}
        />
        {error ? <Notice tone="err">{error}</Notice> : null}
      </div>
    </Modal>
  );
}

/**
 * A confirmation, or a small form (children) with one confirm button.
 * Errors from onConfirm show inside the dialog.
 */
export function ConfirmDialog({
  open,
  onClose,
  title,
  description,
  confirmLabel,
  variant = "dark",
  width,
  children,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: ReactNode;
  confirmLabel: string;
  variant?: ButtonVariant;
  width?: number;
  children?: ReactNode;
  onConfirm: () => Promise<unknown>;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <Modal
      open={open}
      onClose={() => !busy && onClose()}
      title={title}
      description={description}
      width={width}
      footer={
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button
            variant={variant}
            loading={busy}
            onClick={async () => {
              setBusy(true);
              setError(null);
              try {
                await onConfirm();
                onClose();
              } catch (e) {
                setError(adminError(e));
              } finally {
                setBusy(false);
              }
            }}
          >
            {confirmLabel}
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        {children}
        {error ? <Notice tone="err">{error}</Notice> : null}
      </div>
    </Modal>
  );
}

export function StatusBadge({ map, status }: { map: Record<string, [string, string]>; status: string }) {
  const [cls, label] = map[status] ?? ["b-grey", status];
  return <span className={`badge ${cls}`}>{label}</span>;
}

/** Search box for a list; the page debounces or filters as it likes. */
export function SearchField({ value, onChange, label, placeholder }: { value: string; onChange: (v: string) => void; label: string; placeholder?: string }) {
  const id = useId();
  return (
    <div className="mb-4 max-w-[420px]">
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <input
        id={id}
        type="search"
        className="fin"
        placeholder={placeholder ?? label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

export function LoadMore({ status, onMore }: { status: string; onMore: () => void }) {
  if (status !== "CanLoadMore" && status !== "LoadingMore") return null;
  return (
    <div className="mt-4 flex justify-center">
      <Button variant="ghost" onClick={onMore} loading={status === "LoadingMore"}>
        Show more
      </Button>
    </div>
  );
}

/** A photo from Convex storage (or a grey tile when there isn't one). */
export function Photo({ url, alt, className }: { url: string | null | undefined; alt: string; className?: string }) {
  if (!url) return <span aria-hidden className={`block bg-sunk ${className ?? ""}`} />;
  // eslint-disable-next-line @next/next/no-img-element -- storage URLs are signed and short-lived
  return <img src={url} alt={alt} className={`block object-cover ${className ?? ""}`} loading="lazy" />;
}
