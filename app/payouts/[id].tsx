// F-63 Payout detail (also /payouts/<id> from payout notifications). The layout is PayoutView.
import { api } from "@convex/_generated/api";
import { useQuery } from "convex/react";
import { router, useLocalSearchParams } from "expo-router";
import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Bank } from "@/components/icons";
import { Button, ScreenHeader, Skeleton, StatusScreen } from "@/components/ui";
import { PayoutView } from "@/features/farm/PayoutView";
import { colors, radii, spacing } from "@/theme/tokens";

export default function PayoutDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const payout = useQuery(api.payments.payouts.get, { payoutId: id ?? "" });
  if (payout === undefined) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.canvas }}>
        <ScreenHeader title="Payout" />
        <View style={{ paddingHorizontal: spacing.screen, gap: spacing.md }}>
          <Skeleton height={150} radius={radii.lg + 10} />
          <Skeleton height={220} radius={radii.lg + 4} />
        </View>
      </SafeAreaView>
    );
  }
  if (payout === null) {
    return (
      <StatusScreen
        icon={Bank}
        tone="pending"
        header={<ScreenHeader title="Payout" />}
        title="We couldn't find this payout"
        message="It may belong to another farm."
        actions={<Button label="See your payouts" variant="dark" size="large" pill fullWidth onPress={() => router.replace("/payouts")} />}
      />
    );
  }
  return <PayoutView p={payout} />;
}
