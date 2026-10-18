import type { Metadata } from "next";
import { ContactStep } from "./ContactStep";

export const metadata: Metadata = { title: "Checkout · Contact", robots: { index: false } };

// W-21 Checkout · Contact
export default function CheckoutContactPage() {
  return <ContactStep />;
}
