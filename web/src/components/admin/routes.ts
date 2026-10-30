// Admin Portal routes: admin.farmkeke.com/…, or /admin/… without an admin
// host (lib/adminHost.ts).
import { adminPath, portalPath } from "@/lib/adminHost";

const q = (next?: string) => (next ? `?next=${encodeURIComponent(next)}` : "");

export const adminRoutes = {
  home: adminPath("/"),
  signIn: (next?: string) => adminPath(`/signin${q(next)}`),
  apply: adminPath("/apply"),
  forgotPassword: adminPath("/forgot-password"),
  setPassword: adminPath("/set-password"),
  account: adminPath("/account"),
  alerts: adminPath("/alerts"),
  staff: adminPath("/staff"),
  member: (id: string) => adminPath(`/staff/${id}`),
  roles: adminPath("/roles"),
  newRole: adminPath("/roles/new"),
  role: (id: string) => adminPath(`/roles/${id}`),
  audit: adminPath("/audit"),
  applications: adminPath("/farmers/applications"),
  application: (id: string) => adminPath(`/farmers/applications/${id}`),
  farms: adminPath("/farmers"),
  farm: (id: string) => adminPath(`/farmers/${id}`),
  review: adminPath("/products/review"),
  products: adminPath("/products"),
  product: (id: string) => adminPath(`/products/${id}`),
  categories: adminPath("/catalog"),
  units: adminPath("/catalog/units"),
  banners: adminPath("/banners"),
  sitePhotos: adminPath("/site-photos"),
  areas: adminPath("/areas"),
  rules: adminPath("/rules"),
  riders: adminPath("/riders"),
  rider: (id: string) => adminPath(`/riders/${id}`),
  dispatch: adminPath("/dispatch"),
  orders: adminPath("/orders"),
  order: (id: string) => adminPath(`/orders/${id}`),
  orderChat: (id: string) => adminPath(`/orders/${id}/chat`),
  customers: adminPath("/customers"),
  customer: (id: string) => adminPath(`/customers/${id}`),
  disputes: adminPath("/disputes"),
  dispute: (id: string) => adminPath(`/disputes/${id}`),
  support: adminPath("/support"),
  ticket: (id: string) => adminPath(`/support/${id}`),
  money: adminPath("/money"),
  escrow: adminPath("/money/escrow"),
  payouts: adminPath("/money/payouts"),
  payout: (id: string) => adminPath(`/money/payouts/${id}`),
  refunds: adminPath("/money/refunds"),
  reconciliation: adminPath("/money/reconciliation"),
  search: (q?: string) => adminPath(`/search${q ? `?q=${encodeURIComponent(q)}` : ""}`),
  exports: adminPath("/exports"),
  platform: adminPath("/platform"),
} as const;

/** Only same-portal paths are followed after sign-in. */
export function safeAdminNext(raw: string | null | undefined): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//") || raw.startsWith("/\\")) return adminRoutes.home;
  const path = portalPath(raw);
  if (/^\/(signin|apply|forgot-password|set-password)/.test(path)) return adminRoutes.home;
  return adminPath(path);
}
