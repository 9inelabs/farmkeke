// M-66 Payment released: after confirming receipt. Rating the order (M-73)
// comes with batch D; until then, Buy again and Keep shopping.
import { router, useLocalSearchParams } from "expo-router";
import { Check } from "@/components/icons";
import { Button, StatusScreen } from "@/components/ui";
import { useOrder } from "@/features/orders/useOrder";
import { formatNaira } from "@/lib/money";

export default function Released() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const access = useOrder(id);
  const o = access.state === "ok" ? access.order : null;
  const released = o && (o.escrow === "released" || o.status === "completed");
  return (
    <StatusScreen
      icon={Check}
      title="Thanks for confirming"
      message={
        !o
          ? "Your order is complete."
          : released
            ? `${formatNaira(o.totalKobo)} has been released to ${o.farmName} for order ${o.number}.`
            : `${formatNaira(o.totalKobo)} goes to ${o.farmName} for order ${o.number} once our team's check is done.`
      }
      actions={
        <>
          {o ? <Button label={`Buy again from ${o.farmName}`} size="large" pill fullWidth onPress={() => router.replace(`/farm/${o.farmId}`)} /> : null}
          <Button label="Back to my orders" variant="ghost" fullWidth onPress={() => router.replace("/orders")} />
        </>
      }
    />
  );
}
