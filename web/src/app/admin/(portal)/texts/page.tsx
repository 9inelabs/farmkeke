import type { Metadata } from "next";
import { TextsView } from "./TextsView";

export const metadata: Metadata = { title: "Text messages" };
// Behind the staff gate, which only renders on the client (see the layout).
export const instant = false;

// A-90 Text messages: every text and code call, and whether it arrived.
export default function AdminTextsPage() {
  return <TextsView />;
}
