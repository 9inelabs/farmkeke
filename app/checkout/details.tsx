// M-34 Delivery address (with M-35's drop-off pin) or the pickup summary,
// depending on M-33. Delivery has no time slot: the shopper can say when
// suits them in the note, and staff agree the time with the rider when they
// price the delivery. The bill comes by email and text, so guests give an
// email here if they didn't at the contact step.
import { api } from "@convex/_generated/api";
import { useQuery } from "convex/react";
import * as Location from "expo-location";
import { router } from "expo-router";
import { useRef, useState } from "react";
import { Pressable, StyleSheet, View, type TextInput } from "react-native";
import { CheckCircle, Home, Mail, Pin, PinCheck, Receipt, Shop, Truck, type IconComponent } from "@/components/icons";
import { Button, Skeleton, Text, TextField } from "@/components/ui";
import { Card, CheckoutShell } from "@/features/checkout/CheckoutShell";
import { useCheckoutDraft, type CheckoutDraft } from "@/features/checkout/draft";
import { groupByFarm, useQuote } from "@/features/checkout/useQuote";
import { formatHours } from "@/lib/hours";
import { formatNaira } from "@/lib/money";
import { isEmail } from "@/lib/session";
import { colors, radii, spacing } from "@/theme/tokens";

export default function Details() {
  const fulfilment = useCheckoutDraft((s) => s.fulfilment);
  return fulfilment === "pickup" ? <PickupDetails /> : <DeliveryDetails />;
}

const BILL_STEPS: { icon: IconComponent; title: string; body: string }[] = [
  { icon: Truck, title: "The farm accepts", body: "Farms have up to 24 hours. They start packing straight away." },
  { icon: Receipt, title: "We send your bill", body: "Products plus delivery, once a rider is arranged. By email, text and in the app." },
  { icon: Mail, title: "You pay within 12 hours", body: "Then the rider brings your order. Your money is held until you confirm." },
];

type Errors = Partial<Record<"street" | "landmark" | "email", string>>;

function DeliveryDetails() {
  const { quote, area } = useQuote("delivery");
  const viewer = useQuery(api.users.viewer);
  const signedIn = viewer != null && !viewer.isGuest;
  const saved = useQuery(api.addresses.list, signedIn ? {} : "skip");
  const draft = useCheckoutDraft();
  const [addr, setAddr] = useState<CheckoutDraft["address"]>(draft.address);
  const [email, setEmail] = useState(draft.contact.email);
  const needsEmail = viewer !== undefined && !signedIn && !draft.contact.email.trim();
  const [errors, setErrors] = useState<Errors>({});
  const [pinNote, setPinNote] = useState<string | null>(addr.latitude !== undefined ? "Drop-off pin set." : null);
  const [locating, setLocating] = useState(false);
  const landmarkRef = useRef<TextInput>(null);

  // Saved addresses in the chosen area, default first
  const inArea = (saved ?? []).filter((a) => a.serviceAreaId === area?.serviceAreaId);
  // Signed in with a saved address here and nothing typed yet: use it (once, when they arrive)
  const [prefilled, setPrefilled] = useState(false);
  if (!prefilled && saved !== undefined) {
    setPrefilled(true);
    const match = inArea[0];
    if (match && !addr.street) use(match);
  }
  function use(a: (typeof inArea)[number]) {
    setAddr((x) => ({ ...x, street: a.street, landmark: a.landmark, note: x.note || a.directions || "", latitude: a.latitude, longitude: a.longitude }));
    setErrors({});
    setPinNote(a.latitude !== undefined ? "Pin set from your saved address." : null);
  }

  const set = (k: "street" | "landmark" | "note") => (value: string) => {
    setAddr((a) => ({ ...a, [k]: value }));
    if (k !== "note" && errors[k]) setErrors((x) => ({ ...x, [k]: undefined }));
  };

  // M-35: the drop-off spot, from where the shopper is standing now
  const pinHere = async () => {
    setLocating(true);
    try {
      const { granted } = await Location.requestForegroundPermissionsAsync();
      if (!granted) {
        setPinNote("Location is off for Farmkeke. The rider will use your address and landmark.");
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setAddr((a) => ({ ...a, latitude: pos.coords.latitude, longitude: pos.coords.longitude }));
      setPinNote("Pin set to where you are now. The rider will come to this spot.");
    } catch {
      setPinNote("We couldn't get your location. The rider will use your address and landmark.");
    } finally {
      setLocating(false);
    }
  };

  const next = () => {
    const e: Errors = {};
    if (!addr.street.trim()) e.street = "Enter your street address, e.g. 12 Wetheral Road.";
    if (!addr.landmark.trim()) e.landmark = "Add a landmark near you, so the rider finds you first time.";
    if (needsEmail && !isEmail(email)) e.email = "Add your email so we can send your bill, e.g. ada@example.com.";
    setErrors(e);
    if (Object.keys(e).length > 0) return;
    if (!area) return router.push({ pathname: "/choose-area", params: { from: "checkout" } });
    draft.patch({
      address: { ...addr, street: addr.street.trim(), landmark: addr.landmark.trim() },
      ...(needsEmail ? { contact: { ...draft.contact, email: email.trim() } } : {}),
    });
    router.push("/checkout/review");
  };

  return (
    <CheckoutShell
      step={3}
      title="Where should we deliver?"
      subtitle="Add clear directions so our rider finds you first time."
      footer={<Button label="Continue to review" size="large" pill fullWidth onPress={next} />}
    >
      {inArea.length > 0 ? (
        <View style={styles.saved}>
          <Text variant="overline">Your saved addresses</Text>
          {inArea.map((a) => {
            const chosen = a.street === addr.street && a.landmark === addr.landmark;
            return (
              <Pressable
                key={a._id}
                accessibilityRole="radio"
                accessibilityState={{ checked: chosen }}
                onPress={() => use(a)}
                style={[styles.savedRow, chosen && styles.savedRowOn]}
              >
                <Home size={20} color={colors.forest} variant={chosen ? "solid" : "line"} />
                <View style={styles.flex}>
                  <Text variant="label" numberOfLines={1}>
                    {a.street}
                  </Text>
                  <Text variant="small" numberOfLines={1}>
                    {a.landmark}
                  </Text>
                </View>
                {chosen ? <CheckCircle size={20} color={colors.limeInk} variant="solid" /> : null}
              </Pressable>
            );
          })}
        </View>
      ) : null}

      <Card>
        <TextField label="Street address" placeholder="12 Wetheral Road" value={addr.street} onChangeText={set("street")} error={errors.street} autoComplete="street-address" returnKeyType="next" onSubmitEditing={() => landmarkRef.current?.focus()} />
        <TextField ref={landmarkRef} label="Nearest landmark" placeholder="Opposite the filling station" value={addr.landmark} onChangeText={set("landmark")} error={errors.landmark} returnKeyType="next" />
        <View style={styles.areaRow}>
          <View style={styles.flex}>
            <Text variant="small">Area</Text>
            <Text variant="bodyMedium">{area ? `${area.name}, ${area.state}` : "Not chosen yet"}</Text>
          </View>
          <Text variant="label" color={colors.limeInk} accessibilityRole="link" onPress={() => router.push({ pathname: "/choose-area", params: { from: "checkout" } })}>
            {area ? "Change" : "Choose area"}
          </Text>
        </View>
        <View style={styles.pin}>
          <View style={[styles.pinIcon, addr.latitude !== undefined && styles.pinIconOn]}>
            {addr.latitude !== undefined ? <PinCheck size={22} color={colors.forest} variant="solid" /> : <Pin size={22} color={colors.forest} />}
          </View>
          <View style={styles.flex}>
            <Text variant="label">Drop-off pin</Text>
            <Text variant="small">{pinNote ?? "Optional. Helps the rider find the exact gate."}</Text>
          </View>
          <Button label={addr.latitude !== undefined ? "Update" : "Use my location"} variant="secondary" size="small" loading={locating} onPress={() => void pinHere()} />
        </View>
        <TextField
          label="Note for the rider (optional)"
          placeholder="Blue gate. Call when you arrive. Best after 4pm."
          value={addr.note}
          onChangeText={set("note")}
          maxLength={200}
          multiline
        />
      </Card>

      <Card>
        <Text variant="heading">How you'll pay</Text>
        <Text variant="caption">
          Nothing to pay now. Products come to <Text variant="label">{formatNaira(quote?.itemsTotalKobo ?? 0)}</Text>; delivery is priced
          for your address once a rider is arranged.
        </Text>
        <View style={styles.steps}>
          {BILL_STEPS.map(({ icon: Icon, title, body }) => (
            <View key={title} style={styles.step}>
              <View style={styles.stepIcon}>
                <Icon size={18} color={colors.forest} />
              </View>
              <View style={styles.flex}>
                <Text variant="label">{title}</Text>
                <Text variant="small">{body}</Text>
              </View>
            </View>
          ))}
        </View>
        {needsEmail ? (
          <TextField
            label="Email for your bill"
            placeholder="ada@example.com"
            value={email}
            onChangeText={(t) => {
              setEmail(t);
              if (errors.email) setErrors((x) => ({ ...x, email: undefined }));
            }}
            error={errors.email}
            helper="We'll also text it to your phone."
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
          />
        ) : null}
      </Card>
    </CheckoutShell>
  );
}

function PickupDetails() {
  const { quote, lines } = useQuote("pickup");
  const farms = groupByFarm(lines);
  const quoted = new Map((quote?.farms ?? []).map((f) => [f.farmId as string, f]));
  const many = farms.length > 1;
  return (
    <CheckoutShell
      step={3}
      title={`Collect from the ${many ? "farms" : "farm"}`}
      subtitle={`You pay now. When ${many ? "each order is" : "your order is"} ready, we send the farm's address and your 4-digit pickup code. Show the code at the farm. You have 3 days to collect.`}
      footer={<Button label="Continue to review" size="large" pill fullWidth onPress={() => router.push("/checkout/review")} />}
    >
      {farms.map((g) => {
        const f = quoted.get(g.farmId);
        return (
          <Card key={g.farmId} style={styles.farm}>
            <View style={styles.stepIcon}>
              <Shop size={20} color={colors.forest} />
            </View>
            <View style={styles.flex}>
              <Text variant="heading">{g.farmName}</Text>
              {quote === undefined ? <Skeleton height={16} width={180} /> : <Text variant="caption">{f?.collectionArea ?? ""}</Text>}
              {f?.collectionHours && f.collectionHours.length > 0 ? (
                <Text variant="small">Hands over orders: {formatHours(f.collectionHours)}</Text>
              ) : null}
            </View>
          </Card>
        );
      })}
    </CheckoutShell>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  saved: { gap: spacing.sm },
  savedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.white,
  },
  savedRowOn: { borderColor: colors.lime },
  areaRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.md, borderRadius: radii.md, backgroundColor: colors.surfaceSoft },
  pin: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  pinIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.surfaceSoft, alignItems: "center", justifyContent: "center" },
  pinIconOn: { backgroundColor: colors.lime },
  steps: { gap: spacing.sm },
  step: { flexDirection: "row", gap: spacing.md, padding: spacing.md, borderRadius: radii.md, backgroundColor: colors.surfaceSoft },
  stepIcon: { width: 36, height: 36, borderRadius: radii.md, backgroundColor: colors.tint, alignItems: "center", justifyContent: "center" },
  farm: { flexDirection: "row", alignItems: "flex-start", gap: spacing.md },
});

