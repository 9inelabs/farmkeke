// Pickup is now at the farm, so the old pickup-points page sends visitors to
// How it works, which explains delivery and pickup.
import { permanentRedirect } from "next/navigation";
import { routes } from "@/lib/routes";

export default function PickupLocationsPage() {
  permanentRedirect(routes.howItWorks);
}
