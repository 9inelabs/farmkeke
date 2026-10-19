import { Suspense } from "react";
import { AdminGate, PortalSkeleton } from "@/components/admin/AdminGate";

// Every portal page sits behind the gate (signed in, approved, and this
// session verified with the emailed code).
// Pages render only after the browser confirms staff access, so the server
// can't prerender them; navigations here (and each page, which also says
// `instant = false`) are allowed to wait for that.
export const instant = false;
export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<PortalSkeleton />}>
      <AdminGate>{children}</AdminGate>
    </Suspense>
  );
}
