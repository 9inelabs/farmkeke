import type { Metadata } from "next";
import { LinkExpiredView } from "./LinkExpiredView";

export const metadata: Metadata = { title: "This link has expired", robots: { index: false } };

// W-42e Link expired
export default function LinkExpiredPage() {
  return <LinkExpiredView />;
}
