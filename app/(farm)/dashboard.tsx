// F-10 Dashboard. The layout is DashboardView; this route gives it live data.
import { api } from "@convex/_generated/api";
import { useQuery } from "convex/react";
import { DashboardView } from "@/features/farm/DashboardView";
import { LOW_STOCK, stockLabel } from "@/features/listings/status";
import { greeting } from "@/lib/greeting";
import { useNow } from "@/lib/useNow";

export default function Dashboard() {
  const farm = useQuery(api.farms.mine);
  const viewer = useQuery(api.users.viewer);
  const listings = useQuery(api.listings.mine);
  const dash = useQuery(api.orders.farmer.dashboard);
  const rating = useQuery(api.reviews.mySummary);
  const unreadAlerts = useQuery(api.notifications.unreadCount, { side: "farm" }) ?? 0;
  const unreadChats = useQuery(api.chat.unread, { side: "farm" }) ?? 0;
  // Countdowns tick once a minute
  const now = useNow();

  const first = viewer?.name?.split(/\s+/)[0];
  const lowStock = (listings ?? [])
    .filter((l) => l.status === "live")
    .flatMap((l) =>
      l.units
        .filter((u) => u.stock <= LOW_STOCK)
        .map((u) => ({ key: `${l._id}-${u.unitId}`, listingId: l._id, name: l.name, note: u.stock === 0 ? `sold out per ${u.singular}` : stockLabel(u).toLowerCase() })),
    );

  return (
    <DashboardView
      greeting={first ? `${greeting()}, ${first}` : greeting()}
      farmName={farm?.name}
      checklist={farm?.checklist}
      holidayMode={farm?.holidayMode === true}
      dash={dash}
      rating={rating}
      unreadAlerts={unreadAlerts}
      unreadChats={unreadChats}
      lowStock={lowStock}
      now={now}
    />
  );
}
