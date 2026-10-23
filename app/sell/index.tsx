// F-01 Sell on Farmkeke (F-02 sign-in sheet for guests).
import { api } from "@convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { router } from "expo-router";
import { Bank, Camera, Cash, Document, IdCard, Lock, People, Truck, Verified, type IconComponent } from "@/components/icons";
import { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { Button, Notice, Screen, ScreenHeader, Text } from "@/components/ui";
import { SignInPromptSheet } from "@/features/auth/SignInPromptSheet";
import { nextStepPath } from "@/features/farmer/constants";
import { errorCode, errorData, errorMessage } from "@/lib/errors";
import { borders, colors, radii, spacing } from "@/theme/tokens";

const BENEFITS: { icon: IconComponent; title: string; body: string }[] = [
  { icon: People, title: "Reach buyers beyond your area", body: "Households across the city order from your farm on the app and farmkeke.com." },
  { icon: Truck, title: "We collect from your farm", body: "Farmkeke riders pick up each order at your farm gate. You don't deliver." },
  { icon: Lock, title: "Paid for every order", body: "Buyers pay before you prepare anything. Farmkeke holds the money and pays you once they confirm delivery." },
];

const REQUIREMENTS: { icon: IconComponent; text: string }[] = [
  { icon: IdCard, text: "A government ID (National ID, voter's card, driver's licence or passport)" },
  { icon: Camera, text: "At least 3 photos of your farm" },
  { icon: Document, text: "Proof of the farm's address" },
  { icon: Verified, text: "A letter or card from your farmers association" },
  { icon: Bank, text: "A Nigerian bank account for payouts" },
];

export default function SellOnFarmkeke() {
  const viewer = useQuery(api.users.viewer);
  const application = useQuery(api.farmerApplications.mine);
  const start = useMutation(api.farmerApplications.start);
  const [prompt, setPrompt] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const signedIn = viewer !== undefined && viewer !== null && !viewer.isGuest;
  const inProgress = application && (application.status === "draft" || application.status === "more_info");

  const apply = async () => {
    if (!signedIn) {
      setPrompt(true);
      return;
    }
    if (application && !inProgress && application.status !== "rejected") {
      router.replace("/sell/status");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await start({});
      router.push(inProgress && application ? nextStepPath(application.problems) : "/sell/apply/farm");
    } catch (e) {
      const code = errorCode(e);
      if (code === "REAPPLY_LATER") {
        const date = new Date(errorData<{ reapplyAfter: number }>(e).reapplyAfter ?? 0);
        setError(`You can apply again from ${date.toDateString()}.`);
      } else if (code === "ALREADY_FARMER") router.replace("/sell/status");
      else setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen
      header={<ScreenHeader title="Sell on Farmkeke" />}
      footer={
        <Button
          label={inProgress ? "Continue your application" : "Apply now"}
          fullWidth
          loading={busy || (signedIn && application === undefined)}
          onPress={() => void apply()}
        />
      }
    >
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <Text variant="display" accessibilityRole="header">
            Sell straight to households
          </Text>
          <Text variant="body" color={colors.inkSoft}>
            List your produce, get orders, and get paid safely. Everything happens in this app.
          </Text>
        </View>

        <View style={styles.list}>
          {BENEFITS.map(({ icon: Icon, title, body }) => (
            <View key={title} style={styles.benefit}>
              <View style={styles.icon}>
                <Icon size={18} color={colors.forest} />
              </View>
              <View style={styles.flex}>
                <Text variant="bodyMedium">{title}</Text>
                <Text variant="caption">{body}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text variant="overline">How payouts work</Text>
          <View style={styles.card}>
            {["A buyer pays. Farmkeke holds the money.", "You accept within 24 hours and prepare the order.", "A rider collects it and delivers.", "The buyer confirms, and the money is released to your bank account."].map(
              (line, i) => (
                <View key={line} style={styles.stepRow}>
                  <View style={styles.stepNumber}>
                    <Text variant="small" color={colors.forest}>
                      {i + 1}
                    </Text>
                  </View>
                  <Text variant="caption" color={colors.ink} style={styles.flex}>
                    {line}
                  </Text>
                </View>
              ),
            )}
          </View>
          <Notice icon={Cash}>
            Farmkeke takes a small commission on each sale. We'll confirm the rate with you before your first listing goes live.
          </Notice>
        </View>

        <View style={styles.section}>
          <Text variant="overline">What you'll need</Text>
          <View style={styles.card}>
            {REQUIREMENTS.map(({ icon: Icon, text }) => (
              <View key={text} style={styles.stepRow}>
                <Icon size={18} color={colors.forest} />
                <Text variant="caption" color={colors.ink} style={styles.flex}>
                  {text}
                </Text>
              </View>
            ))}
          </View>
          <Text variant="small">It takes about 10 minutes. You can stop and continue later; we save as you go.</Text>
        </View>

        {error !== null && <Notice tone="error">{error}</Notice>}
      </ScrollView>

      <SignInPromptSheet
        visible={prompt}
        onClose={() => setPrompt(false)}
        title="Sign in to apply"
        message="Your application is saved to your Farmkeke account, so you can finish it later and switch to farmer mode once approved."
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { gap: spacing.xl, paddingBottom: spacing.xxl },
  hero: { gap: spacing.sm, paddingTop: spacing.sm },
  list: { gap: spacing.lg },
  benefit: { flexDirection: "row", gap: spacing.md, alignItems: "flex-start" },
  icon: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    backgroundColor: colors.tint,
    alignItems: "center",
    justifyContent: "center",
  },
  flex: { flex: 1, gap: 2 },
  section: { gap: spacing.sm },
  card: {
    borderRadius: radii.lg,
    borderWidth: borders.hairline,
    borderColor: colors.lime,
    padding: spacing.md,
    gap: spacing.md,
  },
  stepRow: { flexDirection: "row", gap: spacing.md, alignItems: "center" },
  stepNumber: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.tint,
    alignItems: "center",
    justifyContent: "center",
  },
});
