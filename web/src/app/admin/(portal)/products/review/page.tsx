import type { Metadata } from "next";
import { ReviewView } from "./ReviewView";

export const metadata: Metadata = { title: "Product review" };
// Behind the staff gate, which only renders on the client (see the layout).
export const instant = false;

// A-41 Listing review queue: oldest first.
export default function AdminProductReviewPage() {
  return <ReviewView />;
}
