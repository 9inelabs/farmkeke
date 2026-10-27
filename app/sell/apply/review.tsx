// Farmer sign-up: review your profile before sending it to Farmkeke. Each
// part can be edited, and comes back here. Also where an application Farmkeke
// asked more about is resubmitted.
import { api } from "@convex/_generated/api";
import { useMutation } from "convex/react";
import { Image } from "expo-image";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Bank, Call, Edit, IdCard, Info, Pin, Shop, User, type IconComponent } from "@/components/icons";
import { Avatar, Button, Checkbox, Skeleton, Text } from "@/components/ui";
import { useEditableApplication } from "@/features/farmer/useApplication";
import { SellShell, SellTitle } from "@/features/sell/SellShell";
import { errorCode, errorMessage } from "@/lib/errors";
import { displayPhone } from "@/lib/phone";
import { colors, radii, spacing } from "@/theme/tokens";
import { fonts } from "@/theme/typography";

function Line({ icon: Icon, label, value }: { icon: IconComponent; label: string; value: string | null }) {
  return (
    <View style={styles.line}>
      <Icon size={18} color={colors.inkSoft} />
      <View style={styles.flex}>
        <Text variant="small">{label}</Text>
        <Text variant="body" color={value ? colors.ink : colors.inkMuted} numberOfLines={2}>
          {value || "Not added yet"}
        </Text>
      </View>
    </View>
  );
}

function Section({ title, onEdit, problems, children }: { title: string; onEdit: () => void; problems: string[]; children: React.ReactNode }) {
  return (
    <View style={[styles.card, problems.length > 0 && styles.flagged]}>
      <View style={styles.cardHead}>
        <Text variant="label" style={styles.cardTitle}>
          {title}
        </Text>
        <Pressable accessibilityRole="button" accessibilityLabel={`Edit ${title}`} hitSlop={8} onPress={onEdit} style={styles.edit}>
          <Edit size={14} color={colors.forest} />
          <Text variant="label" color={colors.forest}>
            Edit
          </Text>
        </Pressable>
      </View>
      {children}
      {problems.map((p) => (
        <View key={p} style={styles.problem}>
          <Info size={14} color={colors.error} />
          <Text variant="small" color={colors.error}>
            {p}
          </Text>
        </View>
      ))}
    </View>
  );
}

export default function Review() {
  const app = useEditableApplication();
  const submit = useMutation(api.farmerApplications.submit);
  const [terms, setTerms] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const incomplete = app ? Object.keys(app.problems).length > 0 : true;
  const farmPhotos = (app?.documents ?? []).filter((d) => d.kind === "farm_photo" && d.status !== "rejected" && d.status !== "expired");

  const send = async () => {
    if (!terms) return setError("Tick the box to agree to the farmer terms.");
    setBusy(true);
    setError(null);
    try {
      const { reference } = await submit({ acceptTerms: true });
      router.replace({ pathname: "/sell/submitted", params: { reference } });
    } catch (e) {
      const code = errorCode(e);
      setError(code === "PHONE_TAKEN" ? "That phone number is used by another Farmkeke account." : code === "INCOMPLETE" ? "Some details are missing. Fix the parts marked in red." : errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const edit = (path: "/sell/apply/profile" | "/sell/apply/photos" | "/sell/apply/bank") => router.push({ pathname: path, params: { from: "review" } });

  return (
    <SellShell
      scene="review"
      curve="both"
      sticker="center"
      footer={
        <>
          <Checkbox label="I agree to the Farmkeke farmer terms" checked={terms} onChange={(v) => { setTerms(v); setError(null); }} />
          <Pressable accessibilityRole="link" hitSlop={6} onPress={() => router.push("/farm-settings/terms")}>
            <Text variant="small" color={colors.limeInk} style={styles.link}>
              Read the farmer terms
            </Text>
          </Pressable>
          {error ? (
            <Text variant="small" color={colors.error}>
              {error}
            </Text>
          ) : null}
          <Button label={app?.status === "more_info" ? "Resubmit Application" : "Submit Application"} variant="black" size="large" fullWidth loading={busy} disabled={incomplete} onPress={() => void send()} />
        </>
      }
    >
      <SellTitle title="Review your" accent="Profile" note="Check your details. Tap Edit to change anything." />
      {app?.status === "more_info" && app.moreInfo ? (
        <View style={styles.admin}>
          <Text variant="label">Farmkeke asked for more information</Text>
          <Text variant="small" color={colors.inkSoft}>
            {app.moreInfo.note}
          </Text>
        </View>
      ) : null}
      {app === undefined ? (
        <>
          <Skeleton height={220} radius={radii.lg + 2} />
          <Skeleton height={140} radius={radii.lg + 2} />
        </>
      ) : (
        <>
          <Section title="You and your farm" onEdit={() => edit("/sell/apply/profile")} problems={app.problems.farm ?? []}>
            <View style={styles.who}>
              {app.photoUrl ? <Image source={{ uri: app.photoUrl }} style={styles.photo} contentFit="cover" /> : <Avatar name={app.fullName ?? "?"} size={56} />}
              <View style={styles.flex}>
                <Text variant="heading" numberOfLines={1}>
                  {app.fullName || "Your name"}
                </Text>
                <Text variant="small">{app.farmName || "Your farm"}</Text>
              </View>
            </View>
            <Line icon={User} label="Full name" value={app.fullName ?? null} />
            <Line icon={Shop} label="Farm" value={app.farmName ?? null} />
            <Line icon={Call} label="Phone" value={app.phone ? displayPhone(app.phone) : null} />
            <Line icon={IdCard} label="NIN" value={app.nin ? `•••••••${app.nin.slice(-4)}` : null} />
            <Line icon={Pin} label="Location" value={[app.address, app.lga, app.state].filter(Boolean).join(", ") || null} />
          </Section>
          <Section title="Farm photos" onEdit={() => edit("/sell/apply/photos")} problems={app.problems.documents ?? []}>
            {farmPhotos.length > 0 ? (
              <View style={styles.photos}>
                {farmPhotos.map((d) => (d.url ? <Image key={d._id} source={{ uri: d.url }} style={styles.farmPhoto} contentFit="cover" /> : <View key={d._id} style={styles.farmPhoto} />))}
              </View>
            ) : (
              <Text variant="body" color={colors.inkMuted}>
                Not added yet
              </Text>
            )}
          </Section>
          <Section title="Bank details" onEdit={() => edit("/sell/apply/bank")} problems={app.problems.payout ?? []}>
            <Line icon={Bank} label="Bank" value={app.bankName && app.accountNumber ? `${app.bankName} ••${app.accountNumber.slice(-4)}` : null} />
            <Line icon={User} label="Account name" value={app.accountName ?? null} />
          </Section>
        </>
      )}
    </SellShell>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, gap: 1 },
  card: { backgroundColor: colors.white, borderRadius: radii.lg + 2, padding: spacing.lg, gap: spacing.md, borderWidth: 1.5, borderColor: "transparent" },
  flagged: { borderColor: colors.errorSoft },
  cardHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  cardTitle: { fontFamily: fonts.semibold, fontSize: 15 },
  edit: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: radii.pill, backgroundColor: colors.tint },
  who: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingBottom: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.surfaceSoft },
  photo: { width: 56, height: 56, borderRadius: 28, borderWidth: 2, borderColor: colors.lime },
  line: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  problem: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  admin: { backgroundColor: colors.pendingSoft, borderRadius: radii.lg, padding: spacing.lg, gap: 4 },
  link: { fontFamily: fonts.semibold, textDecorationLine: "underline" },
  photos: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs },
  farmPhoto: { width: 64, height: 64, borderRadius: radii.md, backgroundColor: colors.placeholder },
});
