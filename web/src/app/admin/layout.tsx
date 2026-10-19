import type { Metadata } from "next";

// farmkeke.com/admin: the Farmkeke Admin Portal, for Farmkeke staff only.
// Never indexed. The shop's overlays (mini-cart, area picker, cookie banner,
// maintenance redirect) are switched off under /admin by SiteOnly.
export const metadata: Metadata = {
  title: { default: "Admin portal", template: "%s · Farmkeke Admin" },
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return children;
}
