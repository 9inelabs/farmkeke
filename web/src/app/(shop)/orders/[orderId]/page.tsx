import type { Metadata } from "next";
import { OrderIdPage, type OrderParams } from "@/components/orders/OrderIdPage";
import { OrderSkeleton, OrderView } from "./OrderView";

export const metadata: Metadata = { title: "Your order", robots: { index: false } };

// W-51 Order tracking (delivery), W-51b (pickup code) and W-51c (view only).
export default function OrderPage({ params }: OrderParams) {
  return <OrderIdPage params={params} fallback={<OrderSkeleton />} render={(id) => <OrderView orderId={id} />} />;
}
