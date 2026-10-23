// What the storefront queries need to know about this shopper: today's date
// on the phone (for "Picked today" and freshness) and the chosen area (for
// "Delivery to …" on product pages).
import { useState } from "react";
import { localDay } from "@/lib/day";
import { usePrefs } from "@/store/prefs";

export function useShopContext() {
  const [today] = useState(localDay);
  const area = usePrefs((s) => s.area);
  return { today, area, serviceAreaId: area?.serviceAreaId };
}
