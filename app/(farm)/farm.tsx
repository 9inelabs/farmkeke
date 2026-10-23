// Farm tab: the farm's profile and settings, money, buyers, help, and
// Switch to shopping (F-13).
import { api } from "@convex/_generated/api";
import { useQuery } from "convex/react";
import { Image } from "expo-image";
import { router } from "expo-router";
import { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Bank, Basket, Bell, Book, Calendar, ChevronRight, Document, DocumentCheck, Headphone, Messages, Receipt, Shop, Sliders, Star, Truck, Wallet } from "@/components/icons";
import { Stagger } from "@/components/motion/reveal";
import { Avatar, Button, Skeleton, StatusBadge, Text } from "@/components/ui";
import { Card, FarmHeader, LinkRow, Section } from "@/features/farm/ui";
import { LEAD_TIMES } from "@/features/farmer/constants";
import { SetupCard, setupDone } from "@/features/farmer/SetupCard";
import { SwitchModeSheet } from "@/features/farmer/SwitchModeSheet";
import { usePush } from "@/store/push";
import { colors, radii, spacing } from "@/theme/tokens";

export default function FarmTab() {
  const farm = useQuery(api.farms.mine);
  const rating = useQuery(api.reviews.mySummary);
  const unreadChats = useQuery(api.chat.unread, { side: "farm" }) ?? 0;
  const unreadAlerts = useQuery(api.notifications.unreadCount, { side: "farm" }) ?? 0;
  const pushStatus = usePush((s) => s.status);
  const [switching, setSwitching] = useState(false);
  const lead = farm ? LEAD_TIMES.find((l) => l.value === farm.leadTimeHours)?.detail : undefined;

  return (
    <SafeAreaView edges={["top"]} style={styles.screen}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <FarmHeader title="Farm" />
        <View style={styles.content}>
          <Stagger>
            {farm ? (
              <Card onPress={() => router.push("/farm-settings/profile")}>
                <View style={styles.profile}>
                  {farm.photoUrl ? <Image source={{ uri: farm.photoUrl }} style={styles.photo} contentFit="cover" accessibilityLabel={`${farm.name} photo`} /> : <Avatar name={farm.name} size={60} />}
                  <View style={styles.flex}>
                    <Text variant="heading" numberOfLines={1}>
                      {farm.name}
                    </Text>
                    <Text variant="small">
                      {farm.lga}, {farm.state}
                    </Text>
                    <View style={styles.badges}>
                      <StatusBadge label="Verified" tone="success" />
                      {farm.trusted ? <StatusBadge label="Trusted" tone="brand" /> : null}
                      {farm.holidayMode ? <StatusBadge label="On holiday" tone="pending" /> : null}
                    </View>
                  </View>
                  <ChevronRight size={18} color={colors.inkMuted} />
                </View>
              </Card>
            ) : (
              <Skeleton height={96} radius={radii.lg + 4} />
            )}

            {farm && setupDone(farm.checklist) < 3 ? <SetupCard checklist={farm.checklist} /> : null}

            <Section title="Settings">
              <Card style={styles.flush}>
                <LinkRow icon={Shop} label="Business profile" onPress={() => router.push("/farm-settings/profile")} />
                <LinkRow icon={Truck} label="Fulfilment" value={lead ? `${lead} to prepare` : undefined} onPress={() => router.push("/farm-settings/fulfilment")} />
                <LinkRow icon={Calendar} label="Availability" value={farm ? (farm.holidayMode ? "Holiday" : `${farm.openDays.length} days a week`) : undefined} onPress={() => router.push("/farm-settings/availability")} />
                <LinkRow icon={DocumentCheck} label="Documents" onPress={() => router.push("/farm-settings/documents")} />
              <LinkRow icon={Sliders} label="Alerts" value={pushStatus === "granted" ? "Push on" : pushStatus === "unavailable" ? undefined : "Push off"} onPress={() => router.push({ pathname: "/settings/notifications", params: { side: "farm" } })} last />
              </Card>
            </Section>

            <Section title="Money">
              <Card style={styles.flush}>
                <LinkRow icon={Bank} label="Payout account" value={farm ? `${farm.bankName} ••${farm.accountLast4}` : undefined} onPress={() => router.push("/farm/payout-account")} />
                <LinkRow icon={Wallet} label="Payouts" onPress={() => router.push("/payouts")} />
                <LinkRow icon={Receipt} label="Activity" onPress={() => router.push("/farm/transactions")} last />
              </Card>
            </Section>

            <Section title="Buyers">
              <Card style={styles.flush}>
                <LinkRow icon={Star} label="Reviews" value={rating?.average != null ? `${rating.average.toFixed(1)} · ${rating.count}` : undefined} onPress={() => router.push("/farm/reviews")} />
                <LinkRow icon={Messages} label="Messages" value={unreadChats > 0 ? `${unreadChats} unread` : undefined} onPress={() => router.push("/farm-messages")} />
                <LinkRow icon={Bell} label="Inbox" value={unreadAlerts > 0 ? `${unreadAlerts} new` : undefined} onPress={() => router.push({ pathname: "/notifications", params: { side: "farm" } })} last />
              </Card>
            </Section>

            <Section title="Help">
              <Card style={styles.flush}>
                <LinkRow icon={Book} label="Guides" onPress={() => router.push("/farm-settings/help")} />
                <LinkRow icon={Headphone} label="Contact support" onPress={() => router.push("/farm-settings/support")} />
                <LinkRow icon={Document} label="Farmer terms" onPress={() => router.push("/farm-settings/terms")} last />
              </Card>
            </Section>

            <Button label="Switch to shopping" icon={Basket} variant="outline" pill fullWidth onPress={() => setSwitching(true)} />
          </Stagger>
        </View>
      </ScrollView>
      <SwitchModeSheet visible={switching} onClose={() => setSwitching(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  flex: { flex: 1, gap: 2 },
  scroll: { paddingBottom: spacing.xxxl },
  content: { paddingHorizontal: spacing.screen, paddingTop: spacing.sm, gap: spacing.xl },
  profile: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  photo: { width: 60, height: 60, borderRadius: 30 },
  badges: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs, marginTop: 4 },
  flush: { padding: 0, gap: 0, overflow: "hidden" },
});
