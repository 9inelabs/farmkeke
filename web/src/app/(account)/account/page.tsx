import type { Metadata } from "next";
import { OverviewView } from "./OverviewView";

export const metadata: Metadata = { title: "Your account", robots: { index: false } };

// W-43 Account overview
export default function OverviewPage() {
  return <OverviewView />;
}
