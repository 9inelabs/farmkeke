// The portal's sidebar. Each item shows only for roles with one of its
// permissions (the server checks again on every call).
import {
  Bell,
  Download,
  Power,
  ClipboardCheck,
  ClipboardList,
  FileCheck2,
  GalleryHorizontalEnd,
  ImagePlus,
  LayoutDashboard,
  Megaphone,
  ArrowLeftRight,
  Banknote,
  Bike,
  RotateCcw,
  Scale,
  Wallet,
  Headphones,
  MessageSquareWarning,
  Users,
  LayoutGrid,
  Map as MapIcon,
  Package,
  Receipt,
  SlidersHorizontal,
  Truck,
  Ruler,
  ShieldCheck,
  Tractor,
  UserCog,
  type LucideIcon,
} from "lucide-react";
import { adminPath, portalPath } from "@/lib/adminHost";
import { adminRoutes } from "./routes";

export type Badge =
  | "applications"
  | "alerts"
  | "farmerApplications"
  | "productReview"
  | "ridersPending"
  | "disputes"
  | "support"
  | "moneyProblems"
  | "deliveryToPrice";
export type NavItem = { href: string; label: string; icon: LucideIcon; any?: string[]; badge?: Badge };
export type NavGroup = { label: string; items: NavItem[] };

export const NAV: NavGroup[] = [
  {
    label: "Overview",
    items: [
      { href: adminRoutes.home, label: "Dashboard", icon: LayoutDashboard },
      { href: adminRoutes.alerts, label: "Alerts", icon: Bell, badge: "alerts" },
      { href: adminRoutes.exports, label: "Exports", icon: Download, any: ["orders.view", "money.view", "customers.view"] },
      { href: adminRoutes.platform, label: "Maintenance and app", icon: Power, any: ["platform.manage"] },
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
      { href: adminRoutes.sitePhotos, label: "Site photos", icon: ImagePlus, any: ["content.manage"] },
    ],
  },
  {
    label: "Operations",
    items: [
      { href: adminRoutes.orders, label: "Orders", icon: Receipt, any: ["orders.view"] },
      { href: adminRoutes.dispatch, label: "Dispatch", icon: Truck, any: ["dispatch.manage", "orders.view"], badge: "deliveryToPrice" },
      { href: adminRoutes.riders, label: "Riders", icon: Bike, any: ["riders.view"], badge: "ridersPending" },
      { href: adminRoutes.areas, label: "Delivery areas", icon: MapIcon, any: ["areas.manage", "fees.manage", "orders.view"] },
      { href: adminRoutes.rules, label: "Fees and rules", icon: SlidersHorizontal, any: ["fees.manage", "commission.manage", "money.view"] },
    ],
  },
  {
    label: "Customer care",
    items: [
      { href: adminRoutes.customers, label: "Customers", icon: Users, any: ["customers.view"] },
      { href: adminRoutes.disputes, label: "Problem reports", icon: MessageSquareWarning, any: ["disputes.view"], badge: "disputes" },
      { href: adminRoutes.support, label: "Support inbox", icon: Headphones, any: ["support.view"], badge: "support" },
      { href: adminRoutes.messages, label: "Messages", icon: Megaphone, any: ["messages.send"] },
    ],
  },
  {
    label: "Money",
    items: [
      { href: adminRoutes.money, label: "Release queue", icon: Wallet, any: ["money.view"] },
      { href: adminRoutes.escrow, label: "Escrow ledger", icon: ArrowLeftRight, any: ["money.view"] },
      { href: adminRoutes.payouts, label: "Payouts to farms", icon: Banknote, any: ["money.view"] },
      { href: adminRoutes.refunds, label: "Refunds", icon: RotateCcw, any: ["money.view"] },
      { href: adminRoutes.reconciliation, label: "Reconciliation", icon: Scale, any: ["money.view"], badge: "moneyProblems" },
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
export function activeHref(rawPathname: string, groups: NavGroup[]): string | null {
  const pathname = adminPath(portalPath(rawPathname));
  let best: string | null = null;
  for (const g of groups) {
    for (const i of g.items) {
      const match = i.href === adminRoutes.home ? pathname === i.href : pathname === i.href || pathname.startsWith(`${i.href}/`);
      if (match && (best === null || i.href.length > best.length)) best = i.href;
    }
  }
  return best;
}
