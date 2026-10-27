import type { MetadataRoute } from "next";
import { routes } from "@/lib/routes";
import { SITE_URL } from "@/lib/siteUrl";

const siteUrl = SITE_URL;

// Shop and information pages are public; personal, checkout and order pages are not.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        routes.cart,
        routes.checkout,
        "/order-placed/",
        "/orders/",
        routes.account,
        routes.findOrder,
        routes.signIn(),
        routes.signUp(),
        routes.forgotPassword,
        routes.resetPassword,
        routes.checkEmail,
        routes.passwordChanged,
        routes.linkExpired,
        routes.accountCreated,
        routes.sessionExpired,
        routes.maintenance,
        "/admin",
      ],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
