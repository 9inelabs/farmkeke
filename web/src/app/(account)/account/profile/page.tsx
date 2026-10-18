import type { Metadata } from "next";
import { ProfileView } from "./ProfileView";

export const metadata: Metadata = { title: "Profile and login", robots: { index: false } };

// W-45 Profile and login details
export default function ProfilePage() {
  return <ProfileView />;
}
