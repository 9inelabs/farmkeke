// F-09a Under review, F-09b More information needed, F-09c Approved,
// F-09d Not approved. Drafts (F-09e) continue at the next missing step.
import { api } from "@convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { Redirect, router } from "expo-router";
import { Celebrate, Clock, CloseCircle, DocumentAlert, Mail } from "@/components/icons";
import { useState } from "react";
import { Linking, StyleSheet, View } from "react-native";
import { Button, Notice, Screen, ScreenHeader, Skeleton, StatusScreen, Text } from "@/components/ui";
import { SUPPORT_EMAIL } from "@/content/help";
import { nextStepPath, STEPS } from "@/features/farmer/constants";
import { useSwitchMode } from "@/features/farmer/useSwitchMode";
import { errorMessage } from "@/lib/errors";
import { colors, radii, spacing } from "@/theme/tokens";

const day = (ms: number) => new Date(ms).toLocaleDateString("en-NG", { weekday: "short", day: "numeric", month: "short" });

export default function ApplicationStatus() {
  const app = useQuery(api.farmerApplications.mine);
  const start = useMutation(api.farmerApplications.start);
  const switchMode = useSwitchMode();
  const [error, setError] = useState<string | null>(null);

  if (app === undefined) {
    return (
      <Screen header={<ScreenHeader title="Your application" />}>
        <Skeleton height={240} radius={radii.lg} />
      </Screen>
    );
  }
  if (app === null) return <Redirect href="/sell" />;
  if (app.status === "draft") return <Redirect href={nextStepPath(app.problems)} />;

  const header = <ScreenHeader title="Your application" />;
  const reference = app.reference ? (
    <Text variant="small" align="center">
      Reference {app.reference}
    </Text>
  ) : null;

  if (app.status === "submitted") {
    return (
      <StatusScreen
        header={header}
        icon={Clock}
        tone="pending"
        title="Under review"
        message={`We received your application${app.submittedAt ? ` on ${day(app.submittedAt)}` : ""}. Expect a decision by ${
          app.expectedDecisionAt ? day(app.expectedDecisionAt) : "the next 2 working days"
        }.`}
        actions={<Button label="Back to shopping" variant="ghost" fullWidth onPress={() => router.back()} />}
      >
        {reference}
      </StatusScreen>
    );
  }

  if (app.status === "more_info") {
    const sections = STEPS.filter((s) => s.section !== "review" && app.moreInfo?.sections.includes(s.section));
    return (
      <Screen
        header={header}
        footer={<Button label="Review and resubmit" fullWidth onPress={() => router.push("/sell/apply/review")} />}
      >
        <View style={styles.body}>
          <View style={[styles.icon, { backgroundColor: colors.pendingSoft }]}>
            <DocumentAlert size={28} color={colors.pendingInk} />
          </View>
          <Text variant="displaySmall" accessibilityRole="header">
            We need a bit more
          </Text>
          <Notice tone="pending">{app.moreInfo?.note ?? "Farmkeke asked for changes."}</Notice>
          <Text variant="overline">Sections to update</Text>
          {sections.map((s) => (
            <Button key={s.path} label={`Update ${s.title.toLowerCase()}`} variant="secondary" onPress={() => router.push(s.path)} />
          ))}
          {reference}
        </View>
      </Screen>
    );
  }

  if (app.status === "approved") {
    return (
      <StatusScreen
        header={header}
        icon={Celebrate}
        tone="success"
        title="You're approved"
        message="Welcome to Farmkeke. Switch to farmer mode to finish setting up your farm, then add your first listing."
        actions={<Button label="Switch to farmer mode" fullWidth onPress={() => switchMode("farm")} />}
      >
        <View style={styles.steps}>
          {["Complete your farm profile", "Confirm when riders can collect", "Add your first listing"].map((line, i) => (
            <Text key={line} variant="caption" color={colors.ink}>
              {i + 1}. {line}
            </Text>
          ))}
        </View>
      </StatusScreen>
    );
  }

  // Rejected (F-09d)
  const canReapply = app.rejection ? app.rejection.reapplyAfter <= Date.now() : true;
  return (
    <StatusScreen
      header={header}
      icon={CloseCircle}
      tone="error"
      title="Not approved this time"
      message={app.rejection?.reason ?? "Your application wasn't approved."}
      actions={
        <>
          {canReapply && (
            <Button
              label="Start a new application"
              fullWidth
              onPress={() =>
                void start({})
                  .then(() => router.replace("/sell/apply/profile"))
                  .catch((e: unknown) => setError(errorMessage(e)))
              }
            />
          )}
          <Button
            label="Contact support"
            icon={Mail}
            variant={canReapply ? "ghost" : "primary"}
            fullWidth
            onPress={() => void Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=Application ${app.reference ?? ""}`)}
          />
        </>
      }
    >
      {app.rejection?.note ? <Text variant="caption" align="center">{app.rejection.note}</Text> : null}
      {!canReapply && app.rejection ? (
        <Text variant="small" align="center">
          You can apply again from {day(app.rejection.reapplyAfter)}. Your bank details are kept.
        </Text>
      ) : null}
      {error !== null && <Notice tone="error">{error}</Notice>}
      {reference}
    </StatusScreen>
  );
}

const styles = StyleSheet.create({
  body: { gap: spacing.md, paddingTop: spacing.md },
  icon: { width: 64, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center" },
  steps: { gap: spacing.xs, marginTop: spacing.sm, alignSelf: "stretch", paddingHorizontal: spacing.xl },
});
