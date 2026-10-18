import type { Metadata } from "next";
import { ReviewStep } from "./ReviewStep";

export const metadata: Metadata = { title: "Checkout · Review and pay", robots: { index: false } };

// W-25 Checkout · Review
export default function CheckoutReviewPage() {
  return <ReviewStep />;
}
