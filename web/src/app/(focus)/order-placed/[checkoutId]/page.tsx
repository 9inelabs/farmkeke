import type { Metadata } from "next";
import { Suspense } from "react";
import { PlacedSkeleton, PlacedView } from "./PlacedView";

export const metadata: Metadata = { title: "Order placed", robots: { index: false } };

type Props = { params: Promise<{ checkoutId: string }> };

// W-30 Order confirmation
export default function OrderPlacedPage({ params }: Props) {
  return (
    <Suspense fallback={<PlacedSkeleton />}>
      <PlacedLoader params={params} />
    </Suspense>
  );
}

async function PlacedLoader({ params }: Props) {
  const { checkoutId } = await params;
  return <PlacedView checkoutId={checkoutId} />;
}
