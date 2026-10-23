// Building blocks for farmer mode: a quieter, denser "console" look than the
// shop. Canvas background, white cards, one dark forest hero per screen, short
// labels, and numbers set large.
import { Image } from "expo-image";
import type { ReactNode } from "react";
import { Pressable, ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { ChevronRight, Clock, Pin, Truck, type IconComponent } from "@/components/icons";
import { StatusBadge, Text, type BadgeTone } from "@/components/ui";
import { formatNaira } from "@/lib/money";
import { colors, radii, spacing } from "@/theme/tokens";
import { fonts } from "@/theme/typography";

export const farmColors = { canvas: colors.canvas, card: colors.white, hero: colors.forest };

/** Screen title with a small caps line above it ("FARMER MODE"). */
export function FarmHeader({ eyebrow, title, right }: { eyebrow?: string; title: string; right?: ReactNode }) {
  return (
    <View style={styles.header}>
      <View style={styles.flex}>
        {eyebrow ? (
          <Text variant="overline" color={colors.limeInk}>
            {eyebrow}
          </Text>
        ) : null}
        <Text variant="screenTitle" accessibilityRole="header" numberOfLines={1}>
          {title}
        </Text>
      </View>
      {right}
    </View>
  );
}

/** A section heading with an optional link ("See all"). */
export function Section({ title, action, onAction, children }: { title: string; action?: string; onAction?: () => void; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHead}>
        <Text variant="heading" style={styles.flex}>
          {title}
        </Text>
        {action && onAction ? (
          <Pressable accessibilityRole="link" hitSlop={10} onPress={onAction}>
            <Text variant="label" color={colors.limeInk}>
              {action}
            </Text>
          </Pressable>
        ) : null}
      </View>
      {children}
    </View>
  );
}

export function Card({ children, style, onPress }: { children: ReactNode; style?: StyleProp<ViewStyle>; onPress?: () => void }) {
  if (onPress) {
    return (
      <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => [styles.card, style, pressed && styles.pressed]}>
        {children}
      </Pressable>
    );
  }
  return <View style={[styles.card, style]}>{children}</View>;
}

/** Dark hero with a big figure and up to three supporting figures. */
export function Hero({ label, value, sub, stats, children }: { label: string; value: string; sub?: string; stats?: { label: string; value: string }[]; children?: ReactNode }) {
  return (
    <View style={styles.hero}>
      <View style={styles.heroGlow} />
      <Text variant="small" color="rgba(255,255,255,0.7)" style={styles.medium}>
        {label}
      </Text>
      <Text style={styles.heroValue} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      {sub ? (
        <Text variant="small" color={colors.lime}>
          {sub}
        </Text>
      ) : null}
      {stats && stats.length > 0 ? (
        <View style={styles.heroStats}>
          {stats.map((s, i) => (
            <View key={s.label} style={[styles.heroStat, i > 0 && styles.heroDivider]}>
              <Text variant="small" color="rgba(255,255,255,0.65)" numberOfLines={1}>
                {s.label}
              </Text>
              <Text variant="bodyMedium" color={colors.white} style={styles.bold} numberOfLines={1}>
                {s.value}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
      {children}
    </View>
  );
}

/** Small tile: an icon, a figure and a label. */
export function Tile({ icon: Icon, value, label, tone = "plain", onPress }: { icon: IconComponent; value: string; label: string; tone?: "plain" | "alert"; onPress?: () => void }) {
  return (
    <Pressable disabled={!onPress} onPress={onPress} accessibilityRole={onPress ? "button" : undefined} accessibilityLabel={`${label}: ${value}`} style={({ pressed }) => [styles.tile, pressed && styles.pressed]}>
      <View style={[styles.tileIcon, tone === "alert" && styles.tileIconAlert]}>
        <Icon size={18} color={tone === "alert" ? colors.pendingInk : colors.forest} />
      </View>
      <Text style={styles.tileValue}>{value}</Text>
      <Text variant="small" numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

/** "21h 14m left", turning amber under 6 hours and red under 2. */
export function Countdown({ until, now }: { until: number; now: number }) {
  const ms = until - now;
  const h = Math.floor(ms / 3_600_000);
  const m = Math.max(0, Math.floor((ms % 3_600_000) / 60_000));
  const label = ms <= 0 ? "Time's up" : h > 0 ? `${h}h ${m}m left` : `${m}m left`;
  const tone: BadgeTone = ms < 2 * 3_600_000 ? "error" : ms < 6 * 3_600_000 ? "pending" : "brand";
  return <StatusBadge label={label} tone={tone} />;
}

type OrderRowLike = {
  _id: string;
  number: string;
  fulfilment: "delivery" | "pickup";
  summary: string;
  itemCount: number;
  imageUrl: string | null;
  itemsTotalKobo: number;
  placedAt: number;
  respondBy?: number | null;
  consumerFirstName?: string;
  area?: string | null;
};

/** One order in a farmer list: photo, number, buyer, items, what you earn, and a status or countdown. */
export function FarmOrderRow({ o, now, badge, onPress, showCountdown = false }: { o: OrderRowLike; now: number; badge?: { label: string; tone: BadgeTone }; onPress: () => void; showCountdown?: boolean }) {
  const Way = o.fulfilment === "pickup" ? Pin : Truck;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`Order ${o.number}`} onPress={onPress} style={({ pressed }) => [styles.order, pressed && styles.pressed]}>
      {o.imageUrl ? <Image source={{ uri: o.imageUrl }} style={styles.orderThumb} contentFit="cover" /> : <View style={styles.orderThumb} />}
      <View style={styles.flex}>
        <View style={styles.orderTop}>
          <Text variant="label" style={styles.semibold} numberOfLines={1}>
            {o.number}
          </Text>
          {o.consumerFirstName ? (
            <Text variant="small" numberOfLines={1} style={styles.shrink}>
              · {o.consumerFirstName}
            </Text>
          ) : null}
        </View>
        <Text variant="small" numberOfLines={1}>
          {o.summary}
        </Text>
        <View style={styles.orderMeta}>
          <Way size={13} color={colors.inkMuted} />
          <Text variant="small" numberOfLines={1} style={styles.shrink}>
            {o.fulfilment === "pickup" ? "Pickup" : o.area ? `Delivery · ${o.area}` : "Delivery"}
          </Text>
        </View>
      </View>
      <View style={styles.orderRight}>
        <Text variant="bodyMedium" style={styles.bold}>
          {formatNaira(o.itemsTotalKobo)}
        </Text>
        {showCountdown && o.respondBy ? <Countdown until={o.respondBy} now={now} /> : badge ? <StatusBadge label={badge.label} tone={badge.tone} /> : null}
      </View>
    </Pressable>
  );
}

/** A settings-style row: icon, label, value, chevron. */
export function LinkRow({ icon: Icon, label, value, onPress, last = false }: { icon: IconComponent; label: string; value?: string; onPress: () => void; last?: boolean }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.link, !last && styles.linkDivider, pressed && styles.pressedRow]}>
      <View style={styles.linkIcon}>
        <Icon size={18} color={colors.forest} />
      </View>
      <Text variant="bodyMedium" style={styles.flex} numberOfLines={1}>
        {label}
      </Text>
      {value ? (
        <Text variant="caption" numberOfLines={1} style={styles.linkValue}>
          {value}
        </Text>
      ) : null}
      <ChevronRight size={16} color={colors.inkMuted} />
    </Pressable>
  );
}

/** A label and an amount on one line ("Farmkeke fee  −₦450"). */
export function MoneyLine({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <View style={styles.moneyLine}>
      <Text variant={strong ? "bodyMedium" : "caption"} style={strong && styles.semibold}>
        {label}
      </Text>
      <Text variant={strong ? "heading" : "label"} style={strong && styles.bold}>
        {value}
      </Text>
    </View>
  );
}

export function EmptyCard({ icon: Icon, title, note }: { icon: IconComponent; title: string; note?: string }) {
  return (
    <View style={[styles.card, styles.empty]}>
      <View style={styles.emptyIcon}>
        <Icon size={22} color={colors.forest} />
      </View>
      <Text variant="label">{title}</Text>
      {note ? (
        <Text variant="small" align="center">
          {note}
        </Text>
      ) : null}
    </View>
  );
}

/** Scrolling tab pills with counts ("New 3"). The chosen one is forest. */
export function TabStrip<T extends string>({ tabs, value, onChange, counts }: { tabs: readonly { key: T; label: string }[]; value: T; onChange: (key: T) => void; counts?: Partial<Record<T, number>> }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.strip} accessibilityRole="tablist">
      {tabs.map((t) => {
        const on = t.key === value;
        const n = counts?.[t.key];
        return (
          <Pressable
            key={t.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            accessibilityLabel={n ? `${t.label}, ${n}` : t.label}
            onPress={() => onChange(t.key)}
            style={({ pressed }) => [styles.pill, on && styles.pillOn, pressed && !on && styles.pressedRow]}
          >
            <Text variant="label" color={on ? colors.white : colors.ink}>
              {t.label}
            </Text>
            {n ? (
              <View style={[styles.count, on && styles.countOn]}>
                <Text variant="small" color={on ? colors.forest : colors.inkSoft} style={styles.semibold}>
                  {n > 999 ? "999+" : n}
                </Text>
              </View>
            ) : null}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

/** A white circle with an icon (call, message) for headers and cards. */
export function RoundButton({ icon: Icon, label, onPress, tone = "white", dot = false }: { icon: IconComponent; label: string; onPress: () => void; tone?: "white" | "tint"; dot?: boolean }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} hitSlop={6} onPress={onPress} style={({ pressed }) => [styles.round, tone === "tint" && styles.roundTint, pressed && styles.pressed]}>
      <Icon size={20} color={colors.forest} />
      {dot ? <View style={styles.roundDot} /> : null}
    </Pressable>
  );
}

/** A small caps label over a value, for fact grids ("BUYER  Ada"). */
export function Fact({ label, value, style }: { label: string; value: string; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[styles.fact, style]}>
      <Text variant="small">{label}</Text>
      <Text variant="label" numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

export { Clock };

const styles = StyleSheet.create({
  flex: { flex: 1 },
  shrink: { flexShrink: 1 },
  medium: { fontFamily: fonts.medium },
  semibold: { fontFamily: fonts.semibold },
  bold: { fontFamily: fonts.bold },
  pressed: { opacity: 0.85, transform: [{ scale: 0.99 }] },
  pressedRow: { backgroundColor: colors.surfaceSoft },
  header: { flexDirection: "row", alignItems: "flex-end", gap: spacing.md, paddingHorizontal: spacing.screen, paddingTop: spacing.lg, paddingBottom: spacing.sm },
  section: { gap: spacing.sm },
  sectionHead: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  card: { backgroundColor: colors.white, borderRadius: radii.lg + 4, padding: spacing.lg, gap: spacing.sm },
  hero: { backgroundColor: colors.forest, borderRadius: radii.lg + 10, padding: spacing.xl, gap: 2, overflow: "hidden" },
  heroGlow: { position: "absolute", right: -60, top: -60, width: 180, height: 180, borderRadius: 90, backgroundColor: "rgba(169,214,84,0.14)" },
  heroValue: { fontFamily: fonts.displayBold, fontSize: 36, lineHeight: 44, color: colors.white, letterSpacing: -0.6 },
  heroStats: { flexDirection: "row", marginTop: spacing.lg, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.12)" },
  heroStat: { flex: 1, gap: 2 },
  heroDivider: { paddingLeft: spacing.md, borderLeftWidth: 1, borderLeftColor: "rgba(255,255,255,0.12)" },
  tile: { flex: 1, backgroundColor: colors.white, borderRadius: radii.lg + 2, padding: spacing.md, gap: 4 },
  tileIcon: { width: 32, height: 32, borderRadius: radii.sm + 2, backgroundColor: colors.tint, alignItems: "center", justifyContent: "center", marginBottom: spacing.xs },
  tileIconAlert: { backgroundColor: colors.pendingSoft },
  tileValue: { fontFamily: fonts.displayBold, fontSize: 24, lineHeight: 30, color: colors.ink },
  order: { flexDirection: "row", alignItems: "center", gap: spacing.md, backgroundColor: colors.white, borderRadius: radii.lg + 2, padding: spacing.md },
  orderThumb: { width: 52, height: 52, borderRadius: radii.md, backgroundColor: colors.placeholder },
  orderTop: { flexDirection: "row", alignItems: "center", gap: 4 },
  orderMeta: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  orderRight: { alignItems: "flex-end", gap: spacing.xs },
  link: { flexDirection: "row", alignItems: "center", gap: spacing.md, minHeight: 56, paddingHorizontal: spacing.lg },
  linkDivider: { borderBottomWidth: 1, borderBottomColor: colors.surfaceSoft },
  linkIcon: { width: 32, height: 32, borderRadius: radii.sm + 2, backgroundColor: colors.tint, alignItems: "center", justifyContent: "center" },
  linkValue: { maxWidth: "45%" },
  moneyLine: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.md },
  empty: { alignItems: "center", paddingVertical: spacing.xl },
  strip: { paddingHorizontal: spacing.screen, gap: spacing.xs, paddingVertical: spacing.xs },
  pill: { flexDirection: "row", alignItems: "center", gap: 6, height: 38, paddingHorizontal: spacing.md + 2, borderRadius: 19, backgroundColor: colors.white },
  pillOn: { backgroundColor: colors.forest },
  count: { minWidth: 20, height: 20, borderRadius: 10, paddingHorizontal: 5, alignItems: "center", justifyContent: "center", backgroundColor: colors.surfaceSoft },
  countOn: { backgroundColor: colors.lime },
  round: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.white, alignItems: "center", justifyContent: "center" },
  roundTint: { backgroundColor: colors.tint },
  roundDot: { position: "absolute", top: 9, right: 10, width: 8, height: 8, borderRadius: 4, backgroundColor: colors.badge, borderWidth: 1.5, borderColor: colors.white },
  fact: { flex: 1, gap: 2, minWidth: "40%" },
  emptyIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.tint, alignItems: "center", justifyContent: "center", marginBottom: spacing.xs },
});
