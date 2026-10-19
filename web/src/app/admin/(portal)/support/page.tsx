import type { Metadata } from "next";
import { SupportView } from "./SupportView";

export const metadata: Metadata = { title: "Support inbox" };
// Behind the staff gate, which only renders on the client (see the layout).
export const instant = false;

// A-75 Support tickets: shoppers and farmers in one queue.
export default function AdminSupportPage() {
  return <SupportView />;
}
