import type { Metadata } from "next";
import { SavedView } from "./SavedView";

export const metadata: Metadata = { title: "Saved items", robots: { index: false } };

// W-47 Saved items and W-47b Saved empty
export default function SavedPage() {
  return <SavedView />;
}
