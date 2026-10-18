import type { Metadata } from "next";
import { FindOrderView } from "./FindOrderView";

export const metadata: Metadata = {
  title: "Find my order",
  description: "Ordered as a guest? Look up your Farmkeke order with the order number and the phone number you used.",
};

// W-50 Find my order
export default function FindOrderPage() {
  return <FindOrderView />;
}
