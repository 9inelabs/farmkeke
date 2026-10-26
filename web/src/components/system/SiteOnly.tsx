"use client";

// Renders its children everywhere except the Admin Portal, which has no cart,
// area picker, cookie banner or maintenance redirect (staff must reach the
// portal to turn maintenance off). Reads the route segment, not the URL: on
// admin.farmkeke.com the URL has no /admin (proxy.ts rewrites it), but the
// route is still app/admin, on the server and in the browser alike.
import { useSelectedLayoutSegment } from "next/navigation";
import { Suspense, type ReactNode } from "react";

export function SiteOnly({ children }: { children: ReactNode }) {
  // The segment can suspend on routes with unknown params (Cache Components).
  return (
    <Suspense fallback={null}>
      <Inner>{children}</Inner>
    </Suspense>
  );
}

function Inner({ children }: { children: ReactNode }) {
  if (useSelectedLayoutSegment() === "admin") return null;
  return <>{children}</>;
}
