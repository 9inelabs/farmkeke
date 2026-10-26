// Where the Admin Portal lives. With NEXT_PUBLIC_ADMIN_HOST set (production:
// "admin.farmkeke.com") the portal sits at the root of that host
// (admin.farmkeke.com/orders): proxy.ts rewrites its requests to the
// app/admin routes and sends farmkeke.com/admin there. Unset (local dev,
// preview deployments) it stays at /admin on the same host.
//
// Paths come in two forms: the portal path ("/orders", what a page is inside
// the portal) and the browser path ("/orders" on the admin host, "/admin/orders"
// otherwise). During a rewritten render the router can report either form,
// so code that reads the pathname goes through portalPath() first.

/** The portal's own hostname, e.g. "admin.farmkeke.com", or null. */
export const ADMIN_HOST = process.env.NEXT_PUBLIC_ADMIN_HOST?.trim().toLowerCase() || null;

/** What portal paths start with in the browser. */
export const ADMIN_BASE = ADMIN_HOST ? "" : "/admin";

/** "/admin/orders/1" or "/orders/1" → "/orders/1". */
export function portalPath(pathname: string): string {
  const path = pathname.replace(/^\/admin(?=\/|\?|$)/, "");
  return path.startsWith("/") ? path : `/${path}`;
}

/** A portal path → the browser path ("/orders" → "/admin/orders" without an admin host). */
export function adminPath(path: string): string {
  if (path === "/" || path === "") return ADMIN_BASE || "/";
  return `${ADMIN_BASE}${path}`;
}
