import type { Metadata } from "next";
import { SitePhotosView } from "./SitePhotosView";

export const metadata: Metadata = { title: "Site photos" };
// Behind the staff gate, which only renders on the client (see the layout).
export const instant = false;

// A-87 Site photos: the pictures on the website's sign-in and sign-up pages.
export default function AdminSitePhotosPage() {
  return <SitePhotosView />;
}
