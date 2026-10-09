// Farm tab: the farm's settings, help, and Switch to shopping (F-13).
import { api } from "@convex/_generated/api";
import { useQuery } from "convex/react";
import { Image } from "expo-image";
import { router } from "expo-router";
import { BadgeCheck, BookOpen, CalendarDays, FileCheck2, FileText, Landmark, Mail, ShoppingBasket, Store, Truck } from "lucide-react-native";
import { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Avatar, Button, ListGroup, ListRow, Notice, Skeleton, StatusBadge, Text } from "@/components/ui";
import { LEAD_TIMES } from "@/features/farmer/constants";
import { SetupCard, setupDone } from "@/features/farmer/SetupCard";
import { SwitchModeSheet } from "@/features/farmer/SwitchModeSheet";
import { formatHours } from "@/lib/hours";
import { colors, radii, spacing } from "@/theme/tokens";

const DAY = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function FarmTab() {
  const farm = useQuery(api.farms.mine);
  const [switching, setSwitching] = useState(false);

  return (
    <SafeAreaView edges={["top"]} style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {farm ? (
          <View style={styles.profile}>
            {farm.photoUrl ? (
              <Image source={{ uri: farm.photoUrl }} style={styles.photo} contentFit="cover" accessibilityLabel={`${farm.name} photo`} />
            ) : (
              <Avatar name={farm.name} size={56} />
            )}
            <View style={styles.flex}>
              <Text variant="heading" numberOfLines={1}>
                {farm.name}
              </Text>
              <Text variant="small">
                {farm.lga}, {farm.state}
              </Text>
              <View style={styles.badges}>
                <StatusBadge label="Verified farm" tone="success" />
                {farm.trusted && <StatusBadge label="Trusted" tone="brand" />}
              </View>
            </View>
          </View>
        ) : (
          <Skeleton height={72} radius={radii.lg} />
        )}

        {farm && setupDone(farm.checklist) < 3 && <SetupCard checklist={farm.checklist} />}

        <ListGroup title="Your farm">
          <ListRow icon={Store} title="Business profile" subtitle="Name, photo, description and location" onPress={() => router.push("/farm-settings/profile")} />
          <ListRow
            icon={Truck}
            title="Fulfilment settings"
            subtitle={
              farm
                ? `${formatHours(farm.collectionHours)} · ${LEAD_TIMES.find((l) => l.value === farm.leadTimeHours)?.detail ?? ""} to prepare`
                : "When riders collect"
            }
            onPress={() => router.push("/farm-settings/fulfilment")}
          />
          <ListRow
            icon={CalendarDays}
            title="Availability"
            subtitle={farm ? (farm.holidayMode ? "Holiday mode is on" : `Open ${farm.openDays.map((d) => DAY[d]).join(", ")}`) : "Open days and holiday mode"}
            onPress={() => router.push("/farm-settings/availability")}
          />
          <ListRow icon={FileCheck2} title="Verification and documents" subtitle="ID, farm photos and letters" onPress={() => router.push("/farm-settings/documents")} />
        </ListGroup>

        {farm && (
          <Notice icon={Landmark}>
            {`Payouts go to ${farm.bankName} •••• ${farm.accountLast4} (${farm.accountName}). To change it, contact support; editing in the app arrives with live payments.`}
          </Notice>
        )}

        <ListGroup title="Help">
          <ListRow icon={BookOpen} title="Help and guides" subtitle="How to sell well on Farmkeke" onPress={() => router.push("/farm-settings/help")} />
          <ListRow icon={Mail} title="Contact support" subtitle="We reply within a day" onPress={() => router.push("/farm-settings/support")} />
          <ListRow icon={FileText} title="Farmer terms and policies" subtitle="Rules for sellers" onPress={() => router.push("/farm-settings/terms")} />
        </ListGroup>

        <Button label="Switch to shopping" icon={ShoppingBasket} variant="outline" fullWidth onPress={() => setSwitching(true)} />
        <View style={styles.verified}>
          <BadgeCheck size={14} color={colors.inkMuted} />
          <Text variant="small">Farmer mode</Text>
        </View>
      </ScrollView>
      <SwitchModeSheet visible={switching} onClose={() => setSwitching(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: spacing.screen, gap: spacing.xl, paddingBottom: spacing.xxxl },
  profile: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  photo: { width: 56, height: 56, borderRadius: 28 },
  flex: { flex: 1, gap: 2 },
  badges: { flexDirection: "row", gap: spacing.xs, marginTop: 4 },
  verified: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.xs },
});
