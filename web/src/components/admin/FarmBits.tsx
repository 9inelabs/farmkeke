"use client";

// Pieces shared by the farmer application and farm pages: documents with
// their photos, collection hours, and the decision history.
import { ExternalLink } from "lucide-react";
import type { ReactNode } from "react";
import type { AuditEntry, FarmDocument, Hours } from "@/convex/returns/adminFarms";
import { clock, dateTime } from "@/lib/format";
import { auditLabel, DAYS, DOCUMENT_KIND, DOCUMENT_STATUS } from "./labels";
import { Photo, StatusBadge } from "./ui";

export function DocumentGrid({ documents, actions }: { documents: FarmDocument[]; actions?: (d: FarmDocument) => ReactNode }) {
  if (documents.length === 0) return <p className="sm">No documents uploaded.</p>;
  return (
    <ul className="m-0 grid list-none grid-cols-3 gap-4 p-0 m:grid-cols-1">
      {documents.map((d) => (
        <li key={d._id} className="overflow-hidden rounded-2xl shadow-[inset_0_0_0_1px_var(--color-line)]">
          {d.url ? (
            <a href={d.url} target="_blank" rel="noreferrer" className="block" aria-label={`Open ${DOCUMENT_KIND[d.kind]} full size (new tab)`}>
              <Photo url={d.url} alt={DOCUMENT_KIND[d.kind]} className="h-44 w-full" />
            </a>
          ) : (
            <Photo url={null} alt="" className="h-44 w-full" />
          )}
          <div className="flex flex-col gap-2 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm font-semibold text-ink">{DOCUMENT_KIND[d.kind]}</span>
              <StatusBadge map={DOCUMENT_STATUS} status={d.status} />
            </div>
            {d.note ? <p className="m-0 text-xs text-muted">{d.note}</p> : null}
            {d.url ? (
              <a href={d.url} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold">
                <ExternalLink aria-hidden className="size-4" />
                Open full size
              </a>
            ) : null}
            {actions?.(d)}
          </div>
        </li>
      ))}
    </ul>
  );
}

export function HoursList({ hours }: { hours: Hours[] }) {
  if (hours.length === 0) return <>Not set</>;
  return (
    <ul className="m-0 list-none p-0">
      {[...hours]
        .sort((a, b) => a.day - b.day || a.opens.localeCompare(b.opens))
        .map((h, i) => (
          <li key={i}>
            {DAYS[h.day]}: {clock(h.opens)} – {clock(h.closes)}
          </li>
        ))}
    </ul>
  );
}

export function History({ entries }: { entries: AuditEntry[] }) {
  if (entries.length === 0) return <p className="sm">Nothing yet.</p>;
  return (
    <ol className="m-0 flex list-none flex-col gap-4 p-0">
      {entries.map((h) => (
        <li key={h._id} className="text-sm leading-5">
          <p className="font-semibold text-ink">{auditLabel(h.action)}</p>
          <p className="text-muted">{dateTime(h._creationTime)}</p>
          <p className="mt-0.5 text-ink-2">{h.reason}</p>
        </li>
      ))}
    </ol>
  );
}

/** "4.81, 7.02" with a map link, when the farm shared its location. */
export function MapLink({ lat, lng }: { lat?: number; lng?: number }) {
  if (lat === undefined || lng === undefined) return <>Not shared</>;
  return (
    <a href={`https://www.google.com/maps?q=${lat},${lng}`} target="_blank" rel="noreferrer" className="font-semibold">
      Open in Google Maps
    </a>
  );
}
