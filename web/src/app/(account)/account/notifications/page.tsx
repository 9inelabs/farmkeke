import type { Metadata } from "next";
import { NotificationsView } from "./NotificationsView";

export const metadata: Metadata = { title: "Notifications", robots: { index: false } };

// W-48 Notification preferences
export default function NotificationsPage() {
  return <NotificationsView />;
}
