"use client";

// A portal page that fails while rendering shows this inside the portal frame
// (sidebar and top bar stay), instead of the shop's error page. The usual
// cause after a release: the website was deployed before the Convex backend,
// so the page calls a function the backend doesn't have yet.
import { RotateCcw, ServerCrash, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";
import { adminRoutes } from "@/components/admin/routes";

export default function PortalError({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  const message = error instanceof Error ? error.message : String(error);
  const missing = /Could not find public function/i.test(message);
  const name = /for '([^']+)'/.exec(message)?.[1];
  const Icon = missing ? ServerCrash : TriangleAlert;

  return (
    <div className="mx-auto mt-10 max-w-[560px] rounded-[22px] bg-surface p-8 text-center shadow-[inset_0_0_0_1px_var(--color-line)] m:p-5">
      <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-tint text-forest">
        <Icon aria-hidden className="size-6" strokeWidth={1.8} />
      </span>
      <h1 className="mt-5 font-display text-[22px] leading-7 font-bold text-ink">
        {missing ? "This page needs the latest backend" : "This page didn't load"}
      </h1>
      <p className="mx-auto mt-2 max-w-[440px] text-sm leading-[22px] text-muted">
        {missing
          ? "The website has been updated, but the Convex backend it talks to hasn't been deployed yet. Deploy it (npx convex deploy), then try again."
          : "Something went wrong on our side. Try again in a moment. If it keeps happening, the details are in the browser console."}
      </p>
      {missing && name ? <p className="mt-3 font-mono text-xs text-subtle">Missing: {name}</p> : null}
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <button type="button" onClick={retry} className="btn dark sm">
          <RotateCcw aria-hidden className="size-4" />
          Try again
        </button>
        <Link href={adminRoutes.home} className="btn ghost sm">
          Back to the dashboard
        </Link>
      </div>
    </div>
  );
}
