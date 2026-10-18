import type { Metadata } from "next";
import { CartView } from "./CartView";

export const metadata: Metadata = {
  title: "Your cart",
  robots: { index: false },
};

// W-20 Cart, W-20b Cart empty, W-20c Items changed. The cart lives in this
// browser, so the page is a client component checked against the server.
export default function CartPage() {
  return <CartView />;
}
