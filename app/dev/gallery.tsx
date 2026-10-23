// Dev-only catalogue of the shared components, for checking them against the
// Figma frames. Not reachable in release builds.
import { Redirect, router } from "expo-router";
import { BoxOpen, Cart, Home, Key, Logout, Pin, Truck } from "@/components/icons";
import { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import {
  Avatar,
  Checkbox,
  ListGroup,
  ListRow,
  Notice,
  PasswordRules,
  RadioRow,
  AlertsPill,
  Button,
  CategoryTile,
  Chip,
  EmptyState,
  EscrowCard,
  LocationChip,
  ProductCard,
  QuantityStepper,
  Screen,
  ScreenHeader,
  SearchPill,
  Skeleton,
  StatusBadge,
  Text,
  TextField,
} from "@/components/ui";
import { SignInPromptSheet } from "@/features/auth/SignInPromptSheet";
import { colors, spacing } from "@/theme/tokens";

export default function Gallery() {
  const [quantity, setQuantity] = useState(1);
  const [unit, setUnit] = useState("basket");
  const [prompt, setPrompt] = useState(false);
  const [checked, setChecked] = useState(true);
  const [radio, setRadio] = useState("a");
  if (!__DEV__) return <Redirect href="/" />;

  return (
    <Screen scroll header={<ScreenHeader title="Components" />}>
      <Section title="Design review shortcuts">
        <Button label="Open onboarding (M-03)" variant="secondary" onPress={() => router.push("/welcome")} />
        <Button label="Open Get started (M-04)" variant="secondary" onPress={() => router.push("/get-started")} />
        <Button label="Open Home with sample content (M-10)" variant="secondary" onPress={() => router.push("/dev/home-preview")} />
      </Section>
      <Section title="Type">
        <Text variant="display">Fresh from the farm</Text>
        <Text variant="title">Screen title</Text>
        <Text variant="section">Fresh Picks</Text>
        <Text variant="body">Body text in Inter, 15pt.</Text>
        <Text variant="caption">Caption, ink at 70%.</Text>
        <Text variant="small">Small, ink at 50%.</Text>
        <Text variant="overline">Overline</Text>
      </Section>

      <Section title="Home header">
        <View style={styles.between}>
          <LocationChip label="New Owerri, Imo" onPress={() => {}} />
          <AlertsPill unread={2} onPress={() => {}} />
        </View>
        <SearchPill mode="button" onPress={() => {}} />
        <EscrowCard />
      </Section>

      <Section title="Buttons">
        <Button label="Start Shopping" onPress={() => {}} />
        <Button label="Add To Cart" icon={Cart} size="large" onPress={() => {}} />
        <Button label="Confirm area" variant="dark" onPress={() => {}} />
        <Button label="View Farmer" variant="secondary" onPress={() => {}} />
        <Button label="Get directions" variant="outline" onPress={() => {}} />
        <Button label="Keep shopping as a guest" variant="ghost" onPress={() => {}} />
        <Button label="Delete my account" variant="danger" onPress={() => {}} />
        <Button label="Loading" loading onPress={() => {}} />
        <Button label="Disabled" disabled onPress={() => {}} />
      </Section>

      <Section title="Fields">
        <TextField label="Email" placeholder="you@example.com" keyboardType="email-address" />
        <TextField label="Password" password helper="At least 8 characters, one number and one letter." />
        <TextField label="Phone number" prefix="+234" placeholder="803 123 4567" keyboardType="phone-pad" />
        <TextField label="Email" defaultValue="adaeze@gmail" error="Enter a full email address." />
      </Section>

      <Section title="Chips, stepper, badges">
        <View style={styles.wrap}>
          {["basket", "derica", "kg", "paint bucket"].map((u) => (
            <Chip key={u} label={u} selected={u === unit} onPress={() => setUnit(u)} />
          ))}
        </View>
        <View style={[styles.stepperBg]}>
          <QuantityStepper value={quantity} onChange={setQuantity} />
        </View>
        <View style={styles.wrap}>
          <StatusBadge label="Out for delivery" tone="success" />
          <StatusBadge label="Paid · held" tone="brand" />
          <StatusBadge label="Waiting for farm" tone="pending" />
          <StatusBadge label="Declined" tone="error" />
          <StatusBadge label="Draft" tone="neutral" />
        </View>
      </Section>

      <Section title="Category tiles">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.wrap}>
          <CategoryTile name="Vegetables" illustration="vegetables" selected onPress={() => {}} />
          <CategoryTile name="Fruits" illustration="fruits" onPress={() => {}} />
          <CategoryTile name="Grains & Tubers" illustration="grains-tubers" onPress={() => {}} />
          <CategoryTile name="Herbs & Spices" illustration="herbs-spices" onPress={() => {}} />
          <CategoryTile name="Dairy" illustration="dairy" onPress={() => {}} />
        </ScrollView>
      </Section>

      <Section title="Product cards">
        <View style={styles.wrap}>
          <ProductCard name="Fresh tomatoes" priceKobo={450000} unit="basket" onPress={() => {}} onAdd={() => {}} />
          <ProductCard name="Yam tubers" priceKobo={550000} unit="tuber" onPress={() => {}} onAdd={() => {}} />
        </View>
      </Section>

      <Section title="Loading and empty">
        <View style={styles.wrap}>
          <Skeleton width={127} height={190} radius={16} />
          <View style={styles.skeletonLines}>
            <Skeleton height={16} />
            <Skeleton height={16} width="70%" />
            <Skeleton height={16} width="40%" />
          </View>
        </View>
        <EmptyState
          icon={BoxOpen}
          title="No orders yet"
          message="When you order, you can follow it here, from the farm to your door."
          actionLabel="Start shopping"
          onAction={() => router.back()}
        />
      </Section>

      <Section title="Rows, notices, choices">
        <View style={styles.wrap}>
          <Avatar name="Adaeze Okonkwo" />
          <Avatar name="Okafor Family Farms" size={36} />
        </View>
        <ListGroup title="Account">
          <ListRow icon={Pin} title="Saved addresses" subtitle="2 addresses" onPress={() => {}} />
          <ListRow icon={Key} title="Login details" subtitle="Email and password" onPress={() => {}} />
          <ListRow icon={Logout} title="Sign out" tone="danger" onPress={() => {}} />
        </ListGroup>
        <Notice>No account needed. This phone will remember your order.</Notice>
        <Notice tone="error">That email and password don't match. Check them and try again.</Notice>
        <Notice tone="pending">Viewing only. Confirm delivery on the phone that placed this order.</Notice>
        <PasswordRules password="fresh1" />
        <Checkbox label="Make this my default address" checked={checked} onChange={setChecked} />
        <ListGroup>
          <RadioRow title="New Owerri" subtitle="Owerri North" selected={radio === "a"} onPress={() => setRadio("a")} />
          <RadioRow title="Ikenegbu" subtitle="Owerri Municipal" selected={radio === "b"} onPress={() => setRadio("b")} />
        </ListGroup>
        <Button label="Show sign-in prompt (M-59)" variant="secondary" onPress={() => setPrompt(true)} />
        <SignInPromptSheet
          visible={prompt}
          onClose={() => setPrompt(false)}
          title="Sign in to save items"
          message="Your saved items stay with your account, on any phone."
        />
      </Section>

      <Section title="Icons">
        <View style={styles.wrap}>
          <Home color={colors.forest} />
          <Truck color={colors.forest} />
        </View>
      </Section>
    </Screen>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text variant="overline">{title}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.md, marginTop: spacing.xxl },
  between: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md, alignItems: "flex-start" },
  stepperBg: { backgroundColor: colors.placeholder, padding: spacing.lg, borderRadius: 16 },
  skeletonLines: { flex: 1, gap: spacing.sm },
});
