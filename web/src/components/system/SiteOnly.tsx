"use client";

// Renders its children everywhere except the Admin Portal (/admin), which
// has no cart, area picker, cookie banner or maintenance redirect (staff must
// reach the portal to turn maintenance off).
import { usePathname } from "next/navigation";
import { Suspense, type ReactNode } from "react";

export function SiteOnly({ children }: { children: ReactNode }) {
  // usePathname can suspend on routes with unknown params (Cache Components).
  return (
    <Suspense fallback={null}>
      <Inner>{children}</Inner>
    </Suspense>
  );
}

function Inner({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  if (pathname === "/admin" || pathname?.startsWith("/admin/")) return null;
  return <>{children}</>;
}
