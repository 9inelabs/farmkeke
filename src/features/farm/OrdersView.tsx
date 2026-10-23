// F-40 Orders: one tab per stage, with counts. New orders show the time left
// to reply; the rest show where they're up to.
import { api } from "@convex/_generated/api";
import type { FunctionReturnType } from "convex/server";
import { router } from "expo-router";
import { FlatList, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Box, Clipboard, Flag, Messages, TruckFast, Verified, Ban, type IconComponent } from "@/components/icons";
import { Skeleton } from "@/components/ui";
import { colors, radii, spacing } from "@/theme/tokens";
import { FARM_TABS, farmBadge, type FarmTab } from "./status";
import { EmptyCard, FarmHeader, FarmOrderRow, RoundButton, TabStrip } from "./ui";

type Row = FunctionReturnType<typeof api.orders.farmer.list>[number];

const EMPTY: Record<FarmTab, { icon: IconComponent; title: string; note: string }> = {
  new: { icon: Clipboard, title: "No new orders", note: "You'll have 24 hours to reply to each one." },
  to_prepare: { icon: Box, title: "Nothing to prepare", note: "Accepted orders wait here." },
  with_rider: { icon: TruckFast, title: "Nothing on the way", note: "Orders with a rider or buyer show here." },
  completed: { icon: Verified, title: "No completed orders", note: "Confirmed orders and their payouts." },
  disputed: { icon: Flag, title: "No problems reported", note: "Reports from buyers show here." },
  cancelled: { icon: Ban, title: "Nothing cancelled", note: "Declined and expired orders." },
};

export type OrdersProps = {
  tab: FarmTab;
  onTab: (tab: FarmTab) => void;
  counts: Partial<Record<FarmTab, number>> | undefined;
  orders: Row[] | undefined;
  unreadChats: number;
  now: number;
};

export function OrdersView({ tab, onTab, counts, orders, unreadChats, now }: OrdersProps) {
  const empty = EMPTY[tab];
  return (
    <SafeAreaView edges={["top"]} style={styles.screen}>
      <FarmHeader title="Orders" right={<RoundButton icon={Messages} label="Messages" dot={unreadChats > 0} onPress={() => router.push("/farm-messages")} />} />
      <View>
        <TabStrip tabs={FARM_TABS} value={tab} onChange={onTab} counts={counts} />
      </View>
      {orders === undefined ? (
        <View style={styles.list}>
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} height={78} radius={radii.lg + 2} />
          ))}
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(o) => o._id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={<EmptyCard icon={empty.icon} title={empty.title} note={empty.note} />}
          renderItem={({ item }) => (
            <FarmOrderRow
              o={item}
              now={now}
              showCountdown={tab === "new"}
              badge={farmBadge(item)}
              onPress={() => router.push({ pathname: "/farm-order/[id]", params: { id: item._id } })}
            />
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  list: { paddingHorizontal: spacing.screen, paddingTop: spacing.md, paddingBottom: spacing.xxxl, gap: spacing.sm },
});
