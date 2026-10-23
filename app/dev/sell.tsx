// The farmer sign-up screens with a sample application, for the browser
// preview: /dev/sell?s=profile (bank, review, more). Saving from here would
// reach the backend, so look, don't submit.
import type { Id } from "@convex/_generated/dataModel";
import { router, useLocalSearchParams } from "expo-router";
import { ScrollView, StyleSheet, View } from "react-native";
import { Chip } from "@/components/ui";
import { SampleApplication, type Application } from "@/features/farmer/useApplication";
import { colors, spacing } from "@/theme/tokens";
import Bank from "../sell/apply/bank";
import Profile from "../sell/apply/profile";
import Review from "../sell/apply/review";

const base = {
  _id: "app" as Id<"farmerApplications">,
  _creationTime: Date.now(),
  userId: "u" as Id<"users">,
  status: "draft",
  phone: "+2349023453382",
  categoryIds: [],
  seasons: [],
  collectionHours: [],
  documents: [],
  problems: {},
  photoUrl: null,
  expectedDecisionAt: null,
};

const SAMPLES: Record<string, { label: string; app: object; Screen: () => React.ReactElement }> = {
  profile: { label: "Empty profile", app: { ...base, problems: { farm: ["Add your full name"] } }, Screen: Profile },
  filled: { label: "Filled profile", app: { ...base, fullName: "Okafor John", farmName: "Okafor's Farm", state: "Imo", lga: "Owerri North", address: "Km 4 Owerri–Aba Road" }, Screen: Profile },
  bank: { label: "Bank", app: { ...base, problems: { payout: ["Choose your bank"] } }, Screen: Bank },
  review: {
    label: "Review",
    app: { ...base, fullName: "Okafor John", farmName: "Okafor's Farm", state: "Imo", lga: "Owerri North", address: "Km 4 Owerri–Aba Road", bankCode: "044", bankName: "Access Bank", accountNumber: "0123454821", accountName: "OKAFOR JOHN" },
    Screen: Review,
  },
  missing: { label: "Review, missing", app: { ...base, fullName: "Okafor John", problems: { farm: ["Add your farm's name", "Choose where your farm is"], payout: ["Choose your bank"] } }, Screen: Review },
};

export default function SellSamples() {
  const { s = "profile" } = useLocalSearchParams<{ s?: string }>();
  const sample = SAMPLES[s] ?? SAMPLES.profile!;
  return (
    <View style={styles.screen}>
      <View style={styles.picker}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {Object.entries(SAMPLES).map(([key, v]) => (
            <Chip key={key} label={v.label} selected={key === s} onPress={() => router.setParams({ s: key })} />
          ))}
        </ScrollView>
      </View>
      <View style={styles.flex}>
        <SampleApplication.Provider key={s} value={sample.app as unknown as Application}>
          <sample.Screen />
        </SampleApplication.Provider>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  flex: { flex: 1 },
  picker: { paddingVertical: spacing.xs, backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.line },
  chips: { gap: spacing.sm, paddingHorizontal: spacing.md },
});
