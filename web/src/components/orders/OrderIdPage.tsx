// Reads the [orderId] route param inside a Suspense boundary (Cache
// Components: params are request data) and hands it to a client view.
import { Suspense, type ReactNode } from "react";

export type OrderParams = { params: Promise<{ orderId: string }> };

export function OrderIdPage({
  params,
  fallback,
  render,
}: OrderParams & { fallback: ReactNode; render: (orderId: string) => ReactNode }) {
  return (
    <Suspense fallback={fallback}>
      <Inner params={params} render={render} />
    </Suspense>
  );
}

async function Inner({ params, render }: OrderParams & { render: (orderId: string) => ReactNode }) {
  const { orderId } = await params;
  return render(orderId);
}
