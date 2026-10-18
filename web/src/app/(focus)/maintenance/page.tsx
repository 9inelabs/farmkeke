import type { Metadata } from "next";
import { MaintenanceView } from "./MaintenanceView";

export const metadata: Metadata = {
  title: "We're making Farmkeke better",
  description: "The website and app are briefly offline while we make some improvements. We'll be back shortly.",
  robots: { index: false },
};

export default function MaintenancePage() {
  return <MaintenanceView />;
}
