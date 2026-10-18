import type { Metadata } from "next";
import { DeliveryStep } from "./DeliveryStep";

export const metadata: Metadata = { title: "Checkout · Delivery or pickup", robots: { index: false } };

// W-22 Checkout · Delivery or pickup
export default function CheckoutDeliveryPage() {
  return <DeliveryStep />;
}
