// M-63 Order tracking, with the pickup code (M-64 opens it full screen) and
// M-71 for orders that ended early (declined, expired, cancelled). Opened
// through Find my order on another phone, it's view-only. Delivery orders are
// paid by bill once the delivery is priced, so an unpaid one shows where its
// bill stands and, when it's ready, Pay.
import { router, useLocalSearchParams } from "expo-router";
import { StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Help } from "@/components/icons";
import { Button, ScreenHeader, Skeleton, StatusScreen } from "@/components/ui";
import { OrderView } from "@/features/orders/OrderView";
import { useOrder } from "@/features/orders/useOrder";
import { colors, radii, spacing } from "@/theme/tokens";

export default function OrderScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const access = useOrder(id);

  if (access.state === "loading") {
    return (
      <SafeAreaView style={styles.screen}>
        <ScreenHeader title="Order" />
        <View style={styles.body}>
          <Skeleton height={64} width={240} />
          <Skeleton height={140} radius={radii.lg + 4} />
          <Skeleton height={320} radius={radii.lg + 4} />
        </View>
      </SafeAreaView>
    );
  }
  if (access.state === "missing") {
    return (
      <StatusScreen
        icon={Help}
        tone="pending"
        header={<ScreenHeader title="Order" />}
        title="We couldn't open this order"
        message="It may belong to another account or phone. Look it up with the order number and phone number, or sign in to see your orders."
        actions={
          <>
            <Button label="Find my order" variant="dark" size="large" pill fullWidth onPress={() => router.replace("/find-order")} />
            <Button label="Sign in" variant="ghost" fullWidth onPress={() => router.push("/sign-in")} />
          </>
        }
      />
    );
  }
  return <OrderView order={access.order} />;
}


const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  body: { paddingHorizontal: spacing.screen, paddingBottom: spacing.xxxl, gap: spacing.md },
});
