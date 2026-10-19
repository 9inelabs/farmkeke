// The portal's sidebar. Each item shows only for roles with one of its
// permissions (the server checks again on every call).
import {
  Bell,
  ClipboardCheck,
  ClipboardList,
  FileCheck2,
  GalleryHorizontalEnd,
  LayoutDashboard,
  LayoutGrid,
  Package,
  Ruler,
  ShieldCheck,
  Tractor,
  UserCog,
  type LucideIcon,
} from "lucide-react";
import { adminRoutes } from "./routes";

export type Badge = "applications" | "alerts" | "farmerApplications" | "productReview";
export type NavItem = { href: string; label: string; icon: LucideIcon; any?: string[]; badge?: Badge };
export type NavGroup = { label: string; items: NavItem[] };

export const NAV: NavGroup[] = [
  {
    label: "Overview",
    items: [
      { href: adminRoutes.home, label: "Dashboard", icon: LayoutDashboard },
      { href: adminRoutes.alerts, label: "Alerts", icon: Bell, badge: "alerts" },
    ],
  },
  {
    label: "Farmers and products",
    items: [
      { href: adminRoutes.applications, label: "Farmer applications", icon: FileCheck2, any: ["farmers.view"], badge: "farmerApplications" },
      { href: adminRoutes.farms, label: "Farms", icon: Tractor, any: ["farmers.view"] },
      { href: adminRoutes.review, label: "Product review", icon: ClipboardCheck, any: ["listings.view"], badge: "productReview" },
      { href: adminRoutes.products, label: "All products", icon: Package, any: ["listings.view"] },
      { href: adminRoutes.categories, label: "Categories", icon: LayoutGrid, any: ["catalog.manage", "listings.view"] },
      { href: adminRoutes.units, label: "Units", icon: Ruler, any: ["catalog.manage", "listings.view"] },
      { href: adminRoutes.banners, label: "Home banners", icon: GalleryHorizontalEnd, any: ["content.manage"] },
    ],
  },
  {
    label: "Staff",
    items: [
      { href: adminRoutes.staff, label: "Staff and applications", icon: UserCog, any: ["staff.view"], badge: "applications" },
      { href: adminRoutes.roles, label: "Roles and permissions", icon: ShieldCheck, any: ["staff.view"] },
      { href: adminRoutes.audit, label: "Audit log", icon: ClipboardList, any: ["audit.view"] },
    ],
  },
];

export function visibleNav(can: (p: string) => boolean): NavGroup[] {
  return NAV.map((g) => ({ ...g, items: g.items.filter((i) => !i.any || i.any.some(can)) })).filter((g) => g.items.length > 0);
}

/** The nav item a path belongs to (longest matching prefix). */
export function activeHref(pathname: string, groups: NavGroup[]): string | null {
  let best: string | null = null;
  for (const g of groups) {
    for (const i of g.items) {
      const match = i.href === adminRoutes.home ? pathname === i.href : pathname === i.href || pathname.startsWith(`${i.href}/`);
      if (match && (best === null || i.href.length > best.length)) best = i.href;
    }
  }
  return best;
}
