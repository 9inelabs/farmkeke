// The selling entry in Account (M-80 / M-81): Sell on Farmkeke, the
// application status cards (F-09a, F-09b, F-09d, F-09e), or Switch to farmer
// mode once approved (F-13).
import { api } from "@convex/_generated/api";
import { useQuery } from "convex/react";
import { router } from "expo-router";
import { ChevronRight, Clock, CloseCircle, DocumentAlert, Shop, Sprout, type IconComponent } from "@/components/icons";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { ListGroup, ListRow, Text } from "@/components/ui";
import { colors, radii, spacing } from "@/theme/tokens";
import { nextStepPath } from "./constants";
import { SwitchModeSheet } from "./SwitchModeSheet";

const SECTIONS = 5;

export function SellingEntry({ signedIn }: { signedIn: boolean }) {
  const application = useQuery(api.farmerApplications.mine, signedIn ? {} : "skip");
  const farm = useQuery(api.farms.mine, signedIn ? {} : "skip");
  const [switching, setSwitching] = useState(false);

  if (!signedIn) {
    return (
      <ListGroup title="Selling">
        <ListRow icon={Sprout} title="Sell on Farmkeke" subtitle="Are you a farmer? Sign in to apply" onPress={() => router.push("/sell")} />
      </ListGroup>
    );
  }
  if (application === undefined || farm === undefined) return null;

  if (farm !== null) {
    return (
      <ListGroup title="Selling">
        <ListRow icon={Shop} title="Switch to farmer mode" subtitle={farm.name} onPress={() => setSwitching(true)} />
        <SwitchModeSheet visible={switching} onClose={() => setSwitching(false)} />
      </ListGroup>
    );
  }

  if (application === null) {
    return (
      <ListGroup title="Selling">
        <ListRow icon={Sprout} title="Sell on Farmkeke" subtitle="Are you a farmer? Apply to sell" onPress={() => router.push("/sell")} />
      </ListGroup>
    );
  }

  const done = SECTIONS - Object.keys(application.problems).length;
  const cards: Record<string, { icon: IconComponent; title: string; body: string; tone: string; path: string }> = {
    draft: {
      icon: Sprout,
      title: "Continue your application",
      body: `${done} of ${SECTIONS} sections done`,
      tone: colors.tint,
      path: nextStepPath(application.problems),
    },
    submitted: {
      icon: Clock,
      title: "Application under review",
      body: application.reference ? `Reference ${application.reference}` : "We'll decide within 2 working days",
      tone: colors.pendingSoft,
      path: "/sell/status",
    },
    more_info: {
      icon: DocumentAlert,
      title: "Farmkeke needs more information",
      body: "Update your application and resubmit",
      tone: colors.pendingSoft,
      path: "/sell/status",
    },
    rejected: {
      icon: CloseCircle,
      title: "Application not approved",
      body: "See why, and when you can apply again",
      tone: colors.errorSoft,
      path: "/sell/status",
    },
    approved: { icon: Shop, title: "You're approved", body: "Open farmer mode", tone: colors.successSoft, path: "/sell/status" },
  };
  const card = cards[application.status];
  const Icon = card.icon;

  return (
    <View style={styles.wrap}>
      <Text variant="overline">Selling</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${card.title}. ${card.body}`}
        onPress={() => router.push(card.path)}
        style={[styles.card, { backgroundColor: card.tone }]}
      >
        <Icon size={22} color={colors.forest} />
        <View style={styles.flex}>
          <Text variant="bodyMedium">{card.title}</Text>
          <Text variant="small">{card.body}</Text>
          {application.status === "draft" && (
            <View style={styles.track}>
              <View style={[styles.fill, { width: `${(done / SECTIONS) * 100}%` }]} />
            </View>
          )}
        </View>
        <ChevronRight size={18} color={colors.inkMuted} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  card: { flexDirection: "row", alignItems: "center", gap: spacing.md, borderRadius: radii.lg, padding: spacing.lg },
  flex: { flex: 1, gap: 2 },
  track: { height: 6, borderRadius: 3, backgroundColor: colors.white, marginTop: spacing.xs, overflow: "hidden" },
  fill: { height: 6, borderRadius: 3, backgroundColor: colors.lime },
});
