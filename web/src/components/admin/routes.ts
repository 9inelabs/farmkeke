// Admin Portal routes (farmkeke.com/admin).
const q = (next?: string) => (next ? `?next=${encodeURIComponent(next)}` : "");

export const adminRoutes = {
  home: "/admin",
  signIn: (next?: string) => `/admin/signin${q(next)}`,
  apply: "/admin/apply",
  forgotPassword: "/admin/forgot-password",
  setPassword: "/admin/set-password",
  account: "/admin/account",
  alerts: "/admin/alerts",
  staff: "/admin/staff",
  member: (id: string) => `/admin/staff/${id}`,
  roles: "/admin/roles",
  newRole: "/admin/roles/new",
  role: (id: string) => `/admin/roles/${id}`,
  audit: "/admin/audit",
  applications: "/admin/farmers/applications",
  application: (id: string) => `/admin/farmers/applications/${id}`,
  farms: "/admin/farmers",
  farm: (id: string) => `/admin/farmers/${id}`,
  review: "/admin/products/review",
  products: "/admin/products",
  product: (id: string) => `/admin/products/${id}`,
  categories: "/admin/catalog",
  units: "/admin/catalog/units",
  banners: "/admin/banners",
  areas: "/admin/areas",
  pickupPoints: "/admin/pickup-points",
  rules: "/admin/rules",
  riders: "/admin/riders",
  rider: (id: string) => `/admin/riders/${id}`,
  dispatch: "/admin/dispatch",
  orders: "/admin/orders",
  order: (id: string) => `/admin/orders/${id}`,
} as const;

/** Only same-portal paths are followed after sign-in. */
export function safeAdminNext(raw: string | null | undefined): string {
  if (!raw || !raw.startsWith("/admin") || raw.startsWith("//")) return adminRoutes.home;
  if (/^\/admin\/(signin|apply|forgot-password|set-password)/.test(raw)) return adminRoutes.home;
  return raw;
}
