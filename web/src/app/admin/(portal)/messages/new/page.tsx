import type { Metadata } from "next";
import { NewMessageView } from "./NewMessageView";

export const metadata: Metadata = { title: "New message" };
// Behind the staff gate, which only renders on the client (see the layout).
export const instant = false;

// Compose a message to every shopper, every farmer, both, or one person.
export default function AdminNewMessagePage() {
  return <NewMessageView />;
}
