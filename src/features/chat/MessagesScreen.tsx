// M-75 Messages (and F-83 for the farm), premium redesign (Nov 2026): a deep
// green header with the unread count, then every order chat in one white
// list, latest first, divided by crisp inset lines. Tapping one opens the
// order's chat.
import { api } from "@convex/_generated/api";
import { usePaginatedQuery } from "convex/react";
import { Image } from "expo-image";
import { router } from "expo-router";
import { FlatList, Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Messages as MessagesIcon } from "@/components/icons";
import { ForestBackdrop, Glass } from "@/components/premium";
import { Avatar, BackIcon, EmptyState, Skeleton, Text } from "@/components/ui";
import { dayMonth, hm, lagosDay } from "@/features/orders/format";
import { androidUi, ripple } from "@/theme/platform";
import { borders, colors, radii, spacing } from "@/theme/tokens";
import { fonts } from "@/theme/typography";
import { useLightStatusBar } from "@/theme/useLightStatusBar";

const PHOTO = 46;

export function MessagesScreen({ side }: { side: "shop" | "farm" }) {
  useLightStatusBar();
  const insets = useSafeAreaInsets();
  const shop = usePaginatedQuery(api.chat.listMine, side === "shop" ? {} : "skip", { initialNumItems: 30 });
  const farm = usePaginatedQuery(api.chat.listForFarm, side === "farm" ? {} : "skip", { initialNumItems: 30 });
  const { results, status, loadMore } = side === "farm" ? farm : shop;
  const unread = results.reduce((n, c) => n + (c.unread > 0 ? 1 : 0), 0);

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <ForestBackdrop />
        <Pressable accessibilityRole="button" accessibilityLabel="Back" hitSlop={8} onPress={() => (router.canGoBack() ? router.back() : router.replace(side === "farm" ? "/dashboard" : "/home"))} style={styles.backWrap}>
          <Glass style={styles.back}>
            <BackIcon color={colors.white} />
          </Glass>
        </Pressable>
        <View style={styles.titleRow}>
          <View style={styles.flex}>
            <Text accessibilityRole="header" style={styles.title}>
              Messages
            </Text>
            <Text style={styles.subtitle}>{side === "farm" ? "Buyers' questions about their orders" : "Your chats with farmers about orders"}</Text>
          </View>
          {unread > 0 ? (
            <View style={styles.unreadPill}>
              <Text style={styles.unreadPillText}>{unread} unread</Text>
            </View>
          ) : null}
        </View>
      </View>

      {status === "LoadingFirstPage" ? (
        <View style={[styles.list, styles.group]}>
          {[0, 1, 2].map((i) => (
            <View key={i} style={[styles.row, i > 0 && styles.divider]}>
              <Skeleton width={PHOTO} height={PHOTO} radius={PHOTO / 2} />
              <View style={[styles.flex, styles.skeletonCopy]}>
                <Skeleton width="55%" height={12} radius={6} />
                <Skeleton width="80%" height={10} radius={5} />
              </View>
            </View>
          ))}
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(c) => c.conversationId}
          contentContainerStyle={[styles.list, results.length === 0 && styles.emptyWrap, { paddingBottom: insets.bottom + spacing.xxl }]}
          showsVerticalScrollIndicator={false}
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
          renderItem={({ item: c, index }) => {
            const first = index === 0;
            const last = index === results.length - 1;
            const today = lagosDay(c.lastMessageAt) === lagosDay(Date.now());
            return (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${c.name}, order ${c.number}${c.unread ? `, ${c.unread} unread` : ""}`}
                onPress={() => router.push({ pathname: side === "farm" ? "/farm-order/[id]/chat" : "/order/[id]/chat", params: { id: c.orderId } })}
                android_ripple={ripple}
                style={({ pressed }) => [styles.row, styles.rowBg, first && styles.rowFirst, last && styles.rowLast, !first && styles.divider, pressed && !androidUi && styles.pressed]}
              >
                {c.photoUrl ? <Image source={{ uri: c.photoUrl }} style={styles.photo} contentFit="cover" /> : <Avatar name={c.name} size={PHOTO} />}
                <View style={styles.flex}>
                  <View style={styles.line}>
                    <Text numberOfLines={1} style={[styles.name, c.unread > 0 && styles.nameUnread]}>
                      {c.name}
                    </Text>
                    <Text style={[styles.time, c.unread > 0 && styles.timeUnread]}>{today ? hm(c.lastMessageAt) : dayMonth(c.lastMessageAt)}</Text>
                  </View>
                  <Text numberOfLines={1} style={styles.order}>
                    Order {c.number}
                  </Text>
                  <View style={styles.line}>
                    <Text numberOfLines={1} style={[styles.preview, c.unread > 0 && styles.previewUnread]}>
                      {c.preview ?? "No messages yet"}
                    </Text>
                    {c.unread > 0 ? (
                      <View style={styles.badge}>
                        <Text style={styles.badgeText}>{c.unread > 9 ? "9+" : c.unread}</Text>
                      </View>
                    ) : null}
                  </View>
                </View>
              </Pressable>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  flex: { flex: 1, minWidth: 0 },
  // Header
  header: { paddingHorizontal: spacing.screen, paddingBottom: spacing.xl, borderBottomLeftRadius: 26, borderBottomRightRadius: 26, overflow: "hidden", gap: spacing.md },
  backWrap: { alignSelf: "flex-start" },
  back: { width: 40, height: 40, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  titleRow: { flexDirection: "row", alignItems: "flex-end", gap: spacing.md },
  title: { fontFamily: fonts.displayBold, fontSize: 22, lineHeight: 28, letterSpacing: -0.5, color: colors.white },
  subtitle: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 16, color: colors.onForest },
  unreadPill: { height: 26, borderRadius: 13, paddingHorizontal: spacing.sm + 2, backgroundColor: colors.lime, justifyContent: "center" },
  unreadPillText: { fontFamily: fonts.bold, fontSize: 11, lineHeight: 14, color: colors.forestDeep },
  // List
  list: { paddingHorizontal: spacing.screen, paddingTop: spacing.lg },
  group: { marginHorizontal: spacing.screen, paddingHorizontal: 0, marginTop: spacing.lg, paddingTop: 0, backgroundColor: colors.white, borderRadius: radii.lg + 2, overflow: "hidden" },
  emptyWrap: { flexGrow: 1, justifyContent: "center" },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: spacing.md, paddingHorizontal: spacing.md + 2 },
  rowBg: { backgroundColor: colors.white, overflow: "hidden" },
  rowFirst: { borderTopLeftRadius: radii.lg + 2, borderTopRightRadius: radii.lg + 2 },
  rowLast: { borderBottomLeftRadius: radii.lg + 2, borderBottomRightRadius: radii.lg + 2 },
  divider: { borderTopWidth: borders.hairline, borderTopColor: "#F0F0EE" },
  pressed: { backgroundColor: colors.surfaceSoft },
  skeletonCopy: { gap: spacing.xs },
  photo: { width: PHOTO, height: PHOTO, borderRadius: PHOTO / 2, backgroundColor: colors.placeholder },
  line: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  name: { flex: 1, fontFamily: fonts.medium, fontSize: 14, lineHeight: 18, color: colors.ink },
  nameUnread: { fontFamily: fonts.bold },
  time: { fontFamily: fonts.regular, fontSize: 11, lineHeight: 14, color: colors.inkMuted },
  timeUnread: { fontFamily: fonts.semibold, color: colors.limeInk },
  order: { fontFamily: fonts.medium, fontSize: 11, lineHeight: 14, color: colors.limeInk, marginTop: 1 },
  preview: { flex: 1, fontFamily: fonts.regular, fontSize: 12.5, lineHeight: 17, color: colors.inkSoft, marginTop: 1 },
  previewUnread: { fontFamily: fonts.medium, color: colors.ink },
  badge: { minWidth: 20, height: 20, borderRadius: 10, paddingHorizontal: 6, backgroundColor: colors.forest, alignItems: "center", justifyContent: "center" },
  badgeText: { fontFamily: fonts.bold, fontSize: 10.5, lineHeight: 13, color: colors.lime },
});
