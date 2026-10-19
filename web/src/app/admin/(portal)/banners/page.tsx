import type { Metadata } from "next";
import { BannersView } from "./BannersView";

export const metadata: Metadata = { title: "Home banners" };
// Behind the staff gate, which only renders on the client (see the layout).
export const instant = false;

// A-86 Home banners ("Harvest of the week").
export default function AdminBannersPage() {
  return <BannersView />;
}
