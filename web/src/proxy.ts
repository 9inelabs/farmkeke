// The Admin Portal's own host (lib/adminHost.ts). With NEXT_PUBLIC_ADMIN_HOST
// set:
//   admin.farmkeke.com/orders  → rewritten to the app/admin/orders route
//   admin.farmkeke.com/admin/… → redirected to the same page without /admin
//   farmkeke.com/admin/…       → redirected to admin.farmkeke.com/…
// so the portal is only ever served on its own host. Every portal response is
// marked noindex and never cached, and the admin host's robots.txt blocks
// all crawling. Without an admin host nothing changes: the portal stays at
// /admin (local dev, preview deployments).
import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_HOST, portalPath } from "@/lib/adminHost";

const NOINDEX = "noindex, nofollow";

export function proxy(request: NextRequest) {
  if (ADMIN_HOST === null) return NextResponse.next();
  const url = request.nextUrl;
  const { pathname } = url;
  const underAdmin = pathname === "/admin" || pathname.startsWith("/admin/");
  // The Host header, not nextUrl: behind some servers nextUrl carries the
  // server's own name
  const host = (request.headers.get("host") ?? url.host).replace(/:\d+$/, "").toLowerCase();

  if (host !== ADMIN_HOST) {
    if (!underAdmin) return NextResponse.next();
    const to = url.clone();
    to.hostname = ADMIN_HOST;
    to.pathname = portalPath(pathname);
    return redirect(to);
  }

  if (pathname === "/robots.txt") {
    return new NextResponse("User-agent: *\nDisallow: /\n", {
      headers: { "Content-Type": "text/plain; charset=utf-8", "X-Robots-Tag": NOINDEX },
    });
  }
  if (pathname === "/sitemap.xml") return new NextResponse(null, { status: 404, headers: { "X-Robots-Tag": NOINDEX } });
  // Old /admin/… links and bookmarks: the same page, without the prefix
  if (underAdmin) {
    const to = url.clone();
    to.pathname = portalPath(pathname);
    return redirect(to);
  }

  const to = url.clone();
  to.pathname = pathname === "/" ? "/admin" : `/admin${pathname}`;
  const response = NextResponse.rewrite(to);
  response.headers.set("X-Robots-Tag", NOINDEX);
  response.headers.set("Cache-Control", "no-store");
  return response;
}

function redirect(to: URL) {
  const response = NextResponse.redirect(to, 308);
  response.headers.set("X-Robots-Tag", NOINDEX);
  return response;
}

export const config = {
  // Pages only: not Next's own files or anything with a file extension (images,
  // fonts, icons), except the two crawler files the admin host answers itself
  matcher: ["/((?!_next/|.*\\..*).*)", "/robots.txt", "/sitemap.xml"],
};
