"use client";

// W-S3 Maintenance gate. Mounted in the root layout.
// Reads api.appConfig.get and, while maintenanceActive is true, sends visitors
// to /maintenance (remembering where they were so the page can offer a way
// back). Nothing happens while the config is still loading.
import { useQuery } from "convex/react";
import { usePathname, useRouter } from "next/navigation";
import { Suspense, useEffect } from "react";
import { api } from "@/convex/api";
import type { AppConfig } from "@/convex/returns/system";
import { routes } from "@/lib/routes";

/** sessionStorage key: the page the visitor was on when maintenance started. */
export const MAINTENANCE_FROM_KEY = "fk.maintenance.from";

export function MaintenanceGate() {
  // usePathname can suspend on routes with unknown params (Cache Components),
  // so the gate has its own boundary and never holds the page back.
  return (
    <Suspense fallback={null}>
      <Gate />
    </Suspense>
  );
}

function Gate() {
  const config = useQuery(api.appConfig.get, {}) as AppConfig | null | undefined;
  const pathname = usePathname();
  const router = useRouter();
  const active = config?.maintenanceActive === true;

  useEffect(() => {
    if (!active || pathname === routes.maintenance) return;
    try {
      window.sessionStorage.setItem(MAINTENANCE_FROM_KEY, window.location.pathname + window.location.search);
    } catch {
      // Storage blocked: the page falls back to the shop.
    }
    router.replace(routes.maintenance);
  }, [active, pathname, router]);

  return null;
}
