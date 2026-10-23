// M-87 Notifications for the shopping side: newest first, unread marked with
// a dot. Tapping one marks it read and opens what it's about.
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useMutation, usePaginatedQuery } from "convex/react";
import { router, type Href } from "expo-router";
import { FlatList, Pressable, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Bell } from "@/components/icons";
import { EmptyState, ScreenHeader, Skeleton, Text } from "@/components/ui";
import { colors, radii, spacing } from "@/theme/tokens";
import { fonts } from "@/theme/typography";

const PAGE = 20;

export default function Notifications() {
  const { results, status, loadMore } = usePaginatedQuery(api.notifications.list, { side: "shop" }, { initialNumItems: PAGE });
  const markRead = useMutation(api.notifications.markRead);
  const markAllRead = useMutation(api.notifications.markAllRead);
  const anyUnread = results.some((n) => !n.read);

  const open = (n: { _id: Id<"notifications">; href: string; read: boolean }) => {
    if (!n.read) void markRead({ notificationId: n._id });
    if (n.href) router.push(n.href as Href);
  };

  return (
    <SafeAreaView style={styles.screen}>
      <ScreenHeader
        title="Notifications"
        right={
          anyUnread ? (
            <Pressable accessibilityRole="button" hitSlop={8} onPress={() => void markAllRead({ side: "shop" })}>
              <Text variant="label" color={colors.limeInk}>
                Mark all read
              </Text>
            </Pressable>
          ) : null
        }
      />
      {status === "LoadingFirstPage" ? (
        <View style={styles.list}>
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} height={76} radius={radii.lg} />
          ))}
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(n) => n._id}
          contentContainerStyle={[styles.list, results.length === 0 && styles.emptyWrap]}
          onEndReached={() => status === "CanLoadMore" && loadMore(PAGE)}
          onEndReachedThreshold={0.5}
          ListEmptyComponent={
            <EmptyState icon={Bell} title="Nothing new yet" message="Order updates, bills and pickup codes will show up here." />
          }
          renderItem={({ item: n }) => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${n.read ? "" : "Unread. "}${n.title}. ${n.body}`}
              onPress={() => open(n)}
              style={({ pressed }) => [styles.row, !n.read && styles.unread, pressed && styles.pressed]}
            >
              <View style={[styles.icon, !n.read && styles.iconUnread]}>
                <Bell size={20} color={colors.forest} variant={n.read ? "line" : "solid"} />
              </View>
              <View style={styles.copy}>
                <View style={styles.titleRow}>
                  <Text variant="bodyMedium" numberOfLines={1} style={[styles.title, !n.read && styles.bold]}>
                    {n.title}
                  </Text>
                  <Text variant="small">{timeAgo(n.createdAt)}</Text>
                </View>
                <Text variant="caption" numberOfLines={2}>
                  {n.body}
                </Text>
              </View>
            </Pressable>
          )}
        />
      )}
    </SafeAreaView>
  );
}

function timeAgo(at: number) {
  const minutes = Math.round((Date.now() - at) / 60000);
  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d`;
  return new Date(at).toLocaleDateString("en-NG", { day: "numeric", month: "short" });
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.white },
  list: { paddingHorizontal: spacing.screen, paddingBottom: spacing.xxl, gap: spacing.sm },
  emptyWrap: { flexGrow: 1, justifyContent: "center" },
  row: { flexDirection: "row", gap: spacing.md, padding: spacing.md, borderRadius: radii.lg, backgroundColor: colors.surfaceSoft },
  unread: { backgroundColor: colors.tint },
  pressed: { opacity: 0.8 },
  icon: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.white, alignItems: "center", justifyContent: "center" },
  iconUnread: { backgroundColor: colors.lime },
  copy: { flex: 1, gap: 2 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  title: { flex: 1 },
  bold: { fontFamily: fonts.semibold },
});
