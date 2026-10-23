// Paying a delivery bill: from the order screen, or from the bill's link
// (farmkeke://pay/<token>) on any phone.
import { useLocalSearchParams } from "expo-router";
import { PayFlow } from "@/features/checkout/PayFlow";

export default function PayBill() {
  const { token } = useLocalSearchParams<{ token: string }>();
  return <PayFlow payToken={token} />;
}
