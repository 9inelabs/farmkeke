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
} as const;

/** Only same-portal paths are followed after sign-in. */
export function safeAdminNext(raw: string | null | undefined): string {
  if (!raw || !raw.startsWith("/admin") || raw.startsWith("//")) return adminRoutes.home;
  if (/^\/admin\/(signin|apply|forgot-password|set-password)/.test(raw)) return adminRoutes.home;
  return raw;
}
