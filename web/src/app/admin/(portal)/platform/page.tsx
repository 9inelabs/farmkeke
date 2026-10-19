import type { Metadata } from "next";
import { PlatformView } from "./PlatformView";

export const metadata: Metadata = { title: "Maintenance and app" };
// Behind the staff gate, which only renders on the client (see the layout).
export const instant = false;

// M-S4 Update required and M-S5 / W-S3 Maintenance switches.
export default function AdminPlatformPage() {
  return <PlatformView />;
}
