// F-60 Earnings. The layout is EarningsView; this route gives it live data.
import { api } from "@convex/_generated/api";
import { usePaginatedQuery, useQuery } from "convex/react";
import { EarningsView } from "@/features/farm/EarningsView";

export default function Earnings() {
  const summary = useQuery(api.earnings.summary);
  const tx = usePaginatedQuery(api.earnings.transactions, {}, { initialNumItems: 12 });
  const payouts = useQuery(api.payments.payouts.list);
  return <EarningsView summary={summary} recent={tx.status === "LoadingFirstPage" ? undefined : tx.results.slice(0, 5)} payouts={payouts} />;
}
