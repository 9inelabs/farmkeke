// M-75 Messages (and F-83 for the farm): every order chat in one place,
// latest first, with unread counts. Tapping one opens the order's chat.
import { api } from "@convex/_generated/api";
import { usePaginatedQuery } from "convex/react";
import { Image } from "expo-image";
import { router } from "expo-router";
import { FlatList, Pressable, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Messages as MessagesIcon } from "@/components/icons";
import { Avatar, EmptyState, ScreenHeader, Skeleton, Text } from "@/components/ui";
import { dayMonth, hm, lagosDay } from "@/features/orders/format";
import { colors, radii, spacing } from "@/theme/tokens";
import { fonts } from "@/theme/typography";

export function MessagesScreen({ side }: { side: "shop" | "farm" }) {
  const shop = usePaginatedQuery(api.chat.listMine, side === "shop" ? {} : "skip", { initialNumItems: 30 });
  const farm = usePaginatedQuery(api.chat.listForFarm, side === "farm" ? {} : "skip", { initialNumItems: 30 });
  const { results, status, loadMore } = side === "farm" ? farm : shop;
  return (
    <SafeAreaView style={styles.screen}>
      <ScreenHeader title="Messages" />
      {status === "LoadingFirstPage" ? (
        <View style={styles.list}>
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} height={76} radius={radii.lg} />
          ))}
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(c) => c.conversationId}
          contentContainerStyle={[styles.list, results.length === 0 && styles.emptyWrap]}
          onEndReached={() => status === "CanLoadMore" && loadMore(30)}
          ListEmptyComponent={
            side === "farm" ? (
              <EmptyState icon={MessagesIcon} title="No messages yet" message="Buyers' questions about their orders show here." />
            ) : (
              <EmptyState
                icon={MessagesIcon}
                title="No messages yet"
                message="Questions about an order? Open the order and tap Message the farmer."
                actionLabel="See my orders"
                onAction={() => router.navigate("/orders")}
              />
            )
          }
          renderItem={({ item: c }) => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${c.name}, order ${c.number}${c.unread ? `, ${c.unread} unread` : ""}`}
              onPress={() => router.push({ pathname: side === "farm" ? "/farm-order/[id]/chat" : "/order/[id]/chat", params: { id: c.orderId } })}
              style={({ pressed }) => [styles.row, pressed && styles.pressed]}
            >
              {c.photoUrl ? <Image source={{ uri: c.photoUrl }} style={styles.photo} contentFit="cover" /> : <Avatar name={c.name} size={48} />}
              <View style={styles.flex}>
                <View style={styles.top}>
                  <Text variant="label" numberOfLines={1} style={[styles.flex, c.unread > 0 && styles.bold]}>
                    {c.name}
                  </Text>
                  <Text variant="small">{lagosDay(c.lastMessageAt) === lagosDay(Date.now()) ? hm(c.lastMessageAt) : dayMonth(c.lastMessageAt)}</Text>
                </View>
                <Text variant="small">Order {c.number}</Text>
                <View style={styles.top}>
                  <Text variant="caption" numberOfLines={1} color={c.unread ? colors.ink : colors.inkSoft} style={styles.flex}>
                    {c.preview ?? "No messages yet"}
                  </Text>
                  {c.unread > 0 ? (
                    <View style={styles.badge}>
                      <Text variant="small" color={colors.forest} style={styles.bold}>
                        {c.unread > 9 ? "9+" : c.unread}
                      </Text>
                    </View>
                  ) : null}
                </View>
              </View>
            </Pressable>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  flex: { flex: 1 },
  bold: { fontFamily: fonts.semibold },
  list: { paddingHorizontal: spacing.screen, paddingBottom: spacing.xxl, gap: spacing.sm },
  emptyWrap: { flexGrow: 1, justifyContent: "center" },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.md, borderRadius: radii.lg + 4, backgroundColor: colors.white },
  pressed: { opacity: 0.85 },
  photo: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.placeholder },
  top: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  badge: { minWidth: 22, height: 22, borderRadius: 11, paddingHorizontal: 6, backgroundColor: colors.lime, alignItems: "center", justifyContent: "center" },
});
