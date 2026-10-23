// F-63 Payouts: every transfer to the farm's bank, newest first.
import { api } from "@convex/_generated/api";
import { useQuery } from "convex/react";
import { router } from "expo-router";
import { FlatList, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Bank } from "@/components/icons";
import { ScreenHeader, Skeleton } from "@/components/ui";
import { PayoutRow } from "@/features/farm/money";
import { EmptyCard } from "@/features/farm/ui";
import { colors, radii, spacing } from "@/theme/tokens";

export default function Payouts() {
  const payouts = useQuery(api.payments.payouts.list);
  return (
    <SafeAreaView style={styles.screen}>
      <ScreenHeader title="Payouts" />
      {payouts === undefined ? (
        <View style={styles.pad}>
          <Skeleton height={240} radius={radii.lg + 4} />
        </View>
      ) : payouts.length === 0 ? (
        <View style={styles.pad}>
          <EmptyCard icon={Bank} title="No payouts yet" note="Released money is sent to your bank automatically." />
        </View>
      ) : (
        <FlatList
          data={payouts}
          keyExtractor={(p) => p._id}
          style={styles.list}
          contentContainerStyle={styles.card}
          renderItem={({ item, index }) => (
            <PayoutRow p={item} last={index === payouts.length - 1} onPress={() => router.push({ pathname: "/payouts/[id]", params: { id: item._id } })} />
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  pad: { paddingHorizontal: spacing.screen },
  list: { marginHorizontal: spacing.screen, marginBottom: spacing.lg },
  card: { backgroundColor: colors.white, borderRadius: radii.lg + 4, overflow: "hidden" },
});
