// F-61 Activity: every money movement on the farm's orders, newest first.
import { api } from "@convex/_generated/api";
import { usePaginatedQuery } from "convex/react";
import { FlatList, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Receipt } from "@/components/icons";
import { ScreenHeader, Skeleton } from "@/components/ui";
import { EmptyCard } from "@/features/farm/ui";
import { TxRow } from "@/features/farm/money";
import { colors, radii, spacing } from "@/theme/tokens";

export default function Transactions() {
  const { results, status, loadMore } = usePaginatedQuery(api.earnings.transactions, {}, { initialNumItems: 40 });
  return (
    <SafeAreaView style={styles.screen}>
      <ScreenHeader title="Activity" />
      {status === "LoadingFirstPage" ? (
        <View style={styles.pad}>
          <Skeleton height={320} radius={radii.lg + 4} />
        </View>
      ) : results.length === 0 ? (
        <View style={styles.pad}>
          <EmptyCard icon={Receipt} title="No money moved yet" note="Released payments, fees and payouts show here." />
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(t) => t._id}
          style={styles.list}
          contentContainerStyle={styles.card}
          onEndReached={() => status === "CanLoadMore" && loadMore(40)}
          renderItem={({ item, index }) => <TxRow t={item} last={index === results.length - 1} />}
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
