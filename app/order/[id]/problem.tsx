// M-67 Report a problem (disputes.open). Only for a delivered or collected
// order, from the account or phone that placed it. The payment stays held.
// Each item can be partly affected ("1 of 2 baskets"), so the amount at stake
// is the value of those units, never the delivery fee.
import { router, useLocalSearchParams } from "expo-router";
import { Flag } from "@/components/icons";
import { Button, Screen, ScreenHeader, Skeleton, StatusScreen } from "@/components/ui";
import { ProblemForm } from "@/features/orders/ProblemForm";
import { useOrder } from "@/features/orders/useOrder";
import { radii } from "@/theme/tokens";

export default function ReportProblem() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const access = useOrder(id);
  if (access.state === "loading") {
    return (
      <Screen header={<ScreenHeader title="Report a problem" />}>
        <Skeleton height={300} radius={radii.lg} />
      </Screen>
    );
  }
  const o = access.state === "ok" ? access.order : null;
  const why = !o || o.viewOnly ? "other-phone" : o.disputeId ? "reported" : !o.canReport ? (o.status === "completed" ? "completed" : "not-yet") : null;
  if (why) {
    const text = {
      "other-phone": "Only the account or phone that placed this order can report a problem with it. Contact support and we'll help.",
      reported: "You've already reported a problem with this order. Follow the case to see where it's up to.",
      completed: "You've confirmed this order, so the payment has gone to the farm. Contact support and we'll help.",
      "not-yet": "You can report a problem once your order has been delivered or collected.",
    }[why];
    return (
      <StatusScreen
        icon={Flag}
        tone="pending"
        header={<ScreenHeader title="Report a problem" />}
        title="Report a problem"
        message={text}
        actions={
          why === "reported" ? (
            <Button label="Follow this case" variant="dark" size="large" pill fullWidth onPress={() => router.replace({ pathname: "/order/[id]/dispute", params: { id } })} />
          ) : why === "not-yet" ? (
            <Button label="Back to the order" variant="dark" size="large" pill fullWidth onPress={() => router.back()} />
          ) : (
            <Button label="Contact support" variant="dark" size="large" pill fullWidth onPress={() => router.replace({ pathname: "/support", params: { orderId: id } })} />
          )
        }
      />
    );
  }
  return <ProblemForm o={o!} />;
}

