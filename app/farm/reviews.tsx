// F-80 Reviews. The layout is ReviewsView; this route gives it live data.
import { api } from "@convex/_generated/api";
import { usePaginatedQuery, useQuery } from "convex/react";
import { useState } from "react";
import { ReviewsView, type ReviewFilter } from "@/features/farm/ReviewsView";

export default function FarmReviews() {
  const [filter, setFilter] = useState<ReviewFilter>("all");
  const summary = useQuery(api.reviews.mySummary);
  const { results, status, loadMore } = usePaginatedQuery(api.reviews.listMine, filter === "all" ? {} : { stars: Number(filter) }, { initialNumItems: 20 });
  return (
    <ReviewsView
      summary={summary}
      reviews={status === "LoadingFirstPage" ? undefined : results}
      filter={filter}
      onFilter={setFilter}
      onLoadMore={() => status === "CanLoadMore" && loadMore(20)}
    />
  );
}
