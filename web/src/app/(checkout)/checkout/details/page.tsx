import type { Metadata } from "next";
import { DetailsStep } from "./DetailsStep";

export const metadata: Metadata = { title: "Checkout · Details", robots: { index: false } };

// W-23 Address and time, or W-24 Pickup point, depending on the choice in W-22.
export default function CheckoutDetailsPage() {
  return <DetailsStep />;
}
