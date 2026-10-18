import type { Metadata } from "next";
import { AddressesView } from "./AddressesView";

export const metadata: Metadata = { title: "Addresses", robots: { index: false } };

// W-46 Addresses and W-46b Add or edit address
export default function AddressesPage() {
  return <AddressesView />;
}
