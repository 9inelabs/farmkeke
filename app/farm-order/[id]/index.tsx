// F-41 to F-47: one order, as the farm sees it. The layout is FarmOrderView;
// this route loads the order and wires each step to the backend.
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { router, useLocalSearchParams } from "expo-router";
import { StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Clipboard } from "@/components/icons";
import { Button, ScreenHeader, Skeleton, StatusScreen } from "@/components/ui";
import { FarmOrderView } from "@/features/farm/FarmOrderView";
import { useNow } from "@/lib/useNow";
import { colors, radii, spacing } from "@/theme/tokens";

export default function FarmOrder() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const order = useQuery(api.orders.farmer.get, { orderId: id ?? "" });
  const accept = useMutation(api.orders.farmer.accept);
  const decline = useMutation(api.orders.farmer.decline);
  const startPreparing = useMutation(api.orders.farmer.startPreparing);
  const markPacked = useMutation(api.orders.farmer.markPacked);
  const ready = useMutation(api.orders.farmer.readyForRider);
  const handover = useMutation(api.orders.farmer.confirmHandover);
  const collect = useMutation(api.orders.farmer.confirmCollection);
  const now = useNow();

  if (order === undefined) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.body}>
          <Skeleton height={42} width={42} radius={21} />
          <Skeleton height={64} width={220} />
          <Skeleton height={170} radius={radii.lg + 10} />
          <Skeleton height={150} radius={radii.lg + 4} />
        </View>
      </SafeAreaView>
    );
  }
  if (order === null) {
    return (
      <StatusScreen
        icon={Clipboard}
        tone="pending"
        header={<ScreenHeader title="Order" />}
        title="We couldn't open this order"
        message="It may belong to another farm, or the link is wrong."
        actions={<Button label="See your orders" variant="dark" size="large" pill fullWidth onPress={() => router.replace("/sales")} />}
      />
    );
  }

  const orderId = order._id as Id<"orders">;
  return (
    <FarmOrderView
      order={order}
      now={now}
      actions={{
        accept: () => accept({ orderId }),
        decline: (reason, note) => decline({ orderId, reason, note }),
        startPreparing: () => startPreparing({ orderId }),
        markPacked: () => markPacked({ orderId }),
        ready: () => ready({ orderId }),
        handover: () => handover({ orderId }),
        collect: (code) => collect({ orderId, code }),
      }}
    />
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  body: { paddingHorizontal: spacing.screen, paddingTop: spacing.sm, gap: spacing.md },
});
