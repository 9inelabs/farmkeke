// F-49 Packing slip. The layout is SlipView.
import { api } from "@convex/_generated/api";
import { useQuery } from "convex/react";
import { router, useLocalSearchParams } from "expo-router";
import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Document } from "@/components/icons";
import { Button, ScreenHeader, Skeleton, StatusScreen } from "@/components/ui";
import { SlipView } from "@/features/farm/SlipView";
import { colors, radii, spacing } from "@/theme/tokens";

export default function PackingSlip() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const slip = useQuery(api.orders.farmer.packingSlip, { orderId: id ?? "" });
  if (slip === undefined) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.canvas }}>
        <ScreenHeader title="Packing slip" />
        <View style={{ paddingHorizontal: spacing.screen }}>
          <Skeleton height={360} radius={radii.lg + 6} />
        </View>
      </SafeAreaView>
    );
  }
  if (slip === null) {
    return (
      <StatusScreen
        icon={Document}
        tone="pending"
        header={<ScreenHeader title="Packing slip" />}
        title="No packing slip yet"
        message="It's ready once you accept the order."
        actions={<Button label="Back to the order" variant="dark" size="large" pill fullWidth onPress={() => router.back()} />}
      />
    );
  }
  return <SlipView slip={slip} />;
}
