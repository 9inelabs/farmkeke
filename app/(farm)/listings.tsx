// F-20 Listings: status tabs, search, bulk select and Add listing.
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { Image } from "expo-image";
import { router } from "expo-router";
import { Check, Leaf, Plus, Search, Sprout } from "@/components/icons";
import { useMemo, useState } from "react";
import { FlatList, Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button, Chip, EmptyState, Skeleton, StatusBadge, Text } from "@/components/ui";
import { ConfirmActionSheet, type ListingAction } from "@/features/listings/ConfirmActionSheet";
import { priceSummary, STATUS_BADGE, TABS, tabOf, type ListingTab } from "@/features/listings/status";
import { fonts } from "@/theme/typography";
import { borders, colors, radii, spacing } from "@/theme/tokens";

const EMPTY: Record<ListingTab, string> = {
  live: "Nothing is live yet. Approved listings show here.",
  under_review: "Nothing waiting for review.",
  needs_changes: "No listings need changes.",
  out_of_stock: "Nothing is out of stock.",
  paused: "No paused listings.",
  draft: "No drafts. Listings you start and don't finish wait here.",
};

export default function Listings() {
  const listings = useQuery(api.listings.mine);
  const [tab, setTab] = useState<ListingTab>("live");
  const [search, setSearch] = useState("");
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<Id<"listings">[]>([]);
  const [action, setAction] = useState<ListingAction | null>(null);

  const counts = useMemo(() => {
    const c = Object.fromEntries(TABS.map((t) => [t.key, 0])) as Record<ListingTab, number>;
    for (const l of listings ?? []) c[tabOf(l)]++;
    return c;
  }, [listings]);

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (listings ?? []).filter((l) => tabOf(l) === tab && (term === "" || l.name.toLowerCase().includes(term)));
  }, [listings, tab, search]);

  const toggle = (id: Id<"listings">) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const stopSelecting = () => {
    setSelecting(false);
    setSelected([]);
  };

  // Bulk actions that make sense for this tab (F-30).
  const bulkActions: { action: ListingAction; label: string }[] = [
    ...(tab === "live" ? [{ action: "pause" as const, label: "Pause" }] : []),
    ...(tab === "paused" ? [{ action: "resume" as const, label: "Resume" }] : []),
    ...(tab !== "draft" && tab !== "out_of_stock" ? [{ action: "out_of_stock" as const, label: "Out of stock" }] : []),
    { action: "delete", label: "Delete" },
  ];

  return (
    <SafeAreaView edges={["top"]} style={styles.screen}>
      <View style={styles.header}>
        <Text variant="screenTitle" accessibilityRole="header">
          Listings
        </Text>
        {listings && listings.length > 0 ? (
          selecting ? (
            <Button label="Done" variant="ghost" size="small" onPress={stopSelecting} />
          ) : (
            <View style={styles.headerActions}>
              <Button label="Select" variant="ghost" size="small" onPress={() => setSelecting(true)} />
              <Button label="Add" icon={Plus} size="small" onPress={() => router.push("/listing/new")} />
            </View>
          )
        ) : null}
      </View>

      {listings === undefined ? (
        <View style={styles.pad}>
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} height={84} radius={radii.lg} />
          ))}
        </View>
      ) : listings.length === 0 ? (
        <View style={styles.center}>
          <EmptyState
            icon={Sprout}
            title="No listings yet"
            message="Photograph your produce, set a price and stock, and buyers near you can order it."
            actionLabel="Add your first listing"
            onAction={() => router.push("/listing/new")}
          />
        </View>
      ) : (
        <>
          <View style={styles.searchWrap}>
            <View style={styles.search}>
              <Search size={18} color={colors.inkMuted} />
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Search your listings"
                placeholderTextColor={colors.inkMuted}
                selectionColor={colors.forest}
                accessibilityLabel="Search your listings"
                style={styles.searchInput}
              />
            </View>
          </View>
          <View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
              {TABS.map((t) => (
                <Chip
                  key={t.key}
                  label={`${t.label} · ${counts[t.key]}`}
                  selected={tab === t.key}
                  onPress={() => {
                    setTab(t.key);
                    setSelected([]);
                  }}
                />
              ))}
            </ScrollView>
          </View>
          <FlatList
            data={visible}
            keyExtractor={(l) => l._id}
            contentContainerStyle={styles.list}
            ListEmptyComponent={
              <Text variant="caption" align="center" style={styles.empty}>
                {search.trim() ? `No ${TABS.find((t) => t.key === tab)?.label.toLowerCase()} listings match “${search.trim()}”.` : EMPTY[tab]}
              </Text>
            }
            renderItem={({ item }) => {
              const isSelected = selected.includes(item._id);
              const badge = STATUS_BADGE[tabOf(item)];
              return (
                <Pressable
                  accessibilityRole={selecting ? "checkbox" : "button"}
                  accessibilityState={selecting ? { checked: isSelected } : undefined}
                  accessibilityLabel={`${item.name || "Untitled"}, ${badge.label}`}
                  onPress={() => (selecting ? toggle(item._id) : router.push(`/listing/${item._id}`))}
                  onLongPress={() => {
                    setSelecting(true);
                    toggle(item._id);
                  }}
                  style={[styles.row, isSelected && styles.rowSelected]}
                >
                  {selecting && <View style={[styles.box, isSelected && styles.boxOn]}>{isSelected && <Check size={14} color={colors.white} strokeWidth={3} />}</View>}
                  {item.coverUrl ? (
                    <Image source={{ uri: item.coverUrl }} style={styles.thumb} contentFit="cover" />
                  ) : (
                    <View style={[styles.thumb, styles.thumbEmpty]}>
                      <Leaf size={20} color={colors.inkMuted} />
                    </View>
                  )}
                  <View style={styles.flex}>
                    <Text variant="bodyMedium" numberOfLines={1}>
                      {item.name || "Untitled listing"}
                    </Text>
                    <Text variant="small" numberOfLines={1}>
                      {priceSummary(item.units)}
                    </Text>
                    <StatusBadge label={badge.label} tone={badge.tone} />
                  </View>
                </Pressable>
              );
            }}
          />
          {selecting && selected.length > 0 && (
            <View style={styles.bulkBar}>
              <Text variant="label">{selected.length} selected</Text>
              <View style={styles.bulkActions}>
                {bulkActions.map((b) => (
                  <Button key={b.action} label={b.label} size="small" variant={b.action === "delete" ? "danger" : "secondary"} onPress={() => setAction(b.action)} />
                ))}
              </View>
            </View>
          )}
        </>
      )}

      <ConfirmActionSheet action={action} listingIds={selected} onClose={() => setAction(null)} onDone={stopSelecting} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.screen,
    paddingTop: spacing.screen,
    paddingBottom: spacing.sm,
  },
  headerActions: { flexDirection: "row", gap: spacing.xs },
  pad: { padding: spacing.screen, gap: spacing.md },
  center: { flex: 1, justifyContent: "center" },
  searchWrap: { paddingHorizontal: spacing.screen, paddingBottom: spacing.sm },
  search: {
    height: 46,
    borderRadius: radii.pill,
    borderWidth: borders.hairline,
    borderColor: colors.inkSoft,
    paddingHorizontal: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  searchInput: { flex: 1, fontFamily: fonts.regular, fontSize: 15, color: colors.ink },
  tabs: { paddingHorizontal: spacing.screen, gap: spacing.sm, paddingBottom: spacing.sm },
  list: { padding: spacing.screen, paddingTop: spacing.sm, gap: spacing.sm, paddingBottom: 120 },
  empty: { marginTop: spacing.xxl },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.sm,
    borderRadius: radii.lg,
    borderWidth: borders.hairline,
    borderColor: colors.line,
  },
  rowSelected: { borderColor: colors.forest, backgroundColor: colors.tint },
  thumb: { width: 68, height: 68, borderRadius: radii.md },
  thumbEmpty: { backgroundColor: colors.placeholder, alignItems: "center", justifyContent: "center" },
  flex: { flex: 1, gap: 4 },
  box: { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, borderColor: colors.inkMuted, alignItems: "center", justifyContent: "center" },
  boxOn: { backgroundColor: colors.forest, borderColor: colors.forest },
  bulkBar: {
    position: "absolute",
    left: spacing.screen,
    right: spacing.screen,
    bottom: spacing.md,
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    borderWidth: borders.hairline,
    borderColor: colors.line,
    padding: spacing.md,
    gap: spacing.sm,
    shadowColor: colors.ink,
    shadowOpacity: 0.1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  bulkActions: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
});
