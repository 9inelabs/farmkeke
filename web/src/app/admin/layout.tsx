import type { Metadata } from "next";

// The Farmkeke Admin Portal, for Farmkeke staff only: admin.farmkeke.com, which
// proxy.ts rewrites to these routes (farmkeke.com/admin without an admin host).
// Never indexed. The shop's overlays (mini-cart, area picker, cookie banner,
// maintenance redirect) are switched off in the portal by SiteOnly.
export const metadata: Metadata = {
  title: { default: "Admin portal", template: "%s · Farmkeke Admin" },
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return children;
}
