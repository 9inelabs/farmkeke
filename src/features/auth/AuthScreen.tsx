// Layout shared by sign in, create account and the password screens (M-50 to
// M-57), from the approved premium redesign (Nov 2026): a deep green header
// with a round produce photo, the white wordmark and a big headline, then the
// form on a white sheet that rises over it. Scrolling (or the keyboard
// opening) slides the sheet up while the header photo drifts and fades.
import { Image, type ImageSource } from "expo-image";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import type { ReactNode } from "react";
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, View } from "react-native";
import Animated, { interpolate, useAnimatedScrollHandler, useAnimatedStyle, useSharedValue, Extrapolation } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowRight, Check, ChevronLeft, Close, Leaf } from "@/components/icons";
import { Stagger } from "@/components/motion/reveal";
import { ForestBackdrop, Glass } from "@/components/premium";
import { Button, Text, Wordmark } from "@/components/ui";
import { colors, spacing } from "@/theme/tokens";
import { fonts } from "@/theme/typography";
import { closeAuth } from "./navigation";

type Tab = "sign-in" | "create-account";

type Props = {
  title: string;
  subtitle?: string;
  /** Short benefits shown as chips under the title (create account). */
  chips?: string[];
  /** "close" for the first screen of the modal, "back" for later steps. */
  nav?: "close" | "back";
  /** Sign in adds "Keep shopping as a guest" and the farmer log-in card. */
  tab?: Tab;
  /** The round photo in the header. */
  photo?: ImageSource;
  children: ReactNode;
  /** The main button, straight under the fields. */
  footer: ReactNode;
  /** The line at the very bottom ("No account yet? Create one"). */
  bottom?: ReactNode;
};

const HEADER = 300;
const DEFAULT_PHOTO = require("../../../assets/photos/vegetables.jpg");

export function AuthScreen({ title, subtitle, chips, nav = "close", tab, photo = DEFAULT_PHOTO, children, footer, bottom }: Props) {
  const insets = useSafeAreaInsets();
  const scrollY = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((e) => {
    scrollY.value = e.contentOffset.y;
  });
  // The photo drifts up at half speed and fades as the sheet slides over it
  const photoStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [0, 180], [1, 0.25], Extrapolation.CLAMP),
    transform: [{ translateY: -scrollY.value * 0.5 }, { scale: interpolate(scrollY.value, [-120, 0], [1.15, 1], Extrapolation.CLAMP) }],
  }));
  const headerHeight = insets.top + HEADER;

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      <View style={[styles.header, { height: headerHeight + 60 }]} pointerEvents="none">
        <ForestBackdrop />
        <Animated.View style={[styles.photoWrap, { top: insets.top + 20 }, photoStyle]}>
          <Image source={photo} style={styles.photo} contentFit="cover" accessible={false} transition={300} />
          {/* Blends the photo's left edge into the green, behind the headline */}
          <View style={styles.photoFade} />
        </Animated.View>
      </View>

      <View style={[styles.topRow, { top: insets.top + 8 }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={nav === "close" ? "Close" : "Back"}
          hitSlop={8}
          onPress={nav === "close" ? closeAuth : () => router.back()}
        >
          <Glass style={styles.roundButton}>{nav === "close" ? <Close size={20} color={colors.white} strokeWidth={2} /> : <ChevronLeft size={20} color={colors.white} strokeWidth={2} />}</Glass>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={() => router.push("/help")} hitSlop={8}>
          <Glass style={styles.help}>
            <Text style={styles.helpText}>Need help?</Text>
          </Glass>
        </Pressable>
      </View>

      <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <Animated.ScrollView
          onScroll={onScroll}
          scrollEventThrottle={16}
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.intro, { paddingTop: insets.top + 78, minHeight: headerHeight - 30 }]}>
            <Stagger>
              <Wordmark width={104} tint={colors.white} style={styles.wordmark} />
              <Text style={styles.title} accessibilityRole="header">
                {title}
              </Text>
              {subtitle !== undefined ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
              {chips?.length ? (
                <View style={styles.chips}>
                  {chips.map((c) => (
                    <Glass key={c} style={styles.chip}>
                      <Check size={13} color={colors.lime} strokeWidth={2.5} />
                      <Text style={styles.chipText}>{c}</Text>
                    </Glass>
                  ))}
                </View>
              ) : null}
            </Stagger>
          </View>

          <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, spacing.lg) + spacing.lg }]}>
            <Stagger delay={120}>
              <View style={styles.form}>{children}</View>
              <View style={styles.footer}>{footer}</View>
              {tab === "sign-in" ? <SignInExtras /> : null}
            </Stagger>
            {bottom ? <View style={styles.bottom}>{bottom}</View> : null}
          </View>
        </Animated.ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

/** "or", Keep shopping as a guest, and the card that sends farmers to their phone-and-PIN log in. */
function SignInExtras() {
  return (
    <View style={styles.extras}>
      <View style={styles.orRow}>
        <View style={styles.rule} />
        <Text variant="small">or</Text>
        <View style={styles.rule} />
      </View>
      <Button label="Keep shopping as a guest" variant="outline" size="hero" fullWidth onPress={closeAuth} style={styles.guest} />
      <Pressable accessibilityRole="button" accessibilityLabel="Selling on Farmkeke? Log in with your phone and PIN" onPress={() => router.push("/sell/login")} style={({ pressed }) => [styles.farmer, pressed && styles.pressed]}>
        <View style={styles.farmerIcon}>
          <Leaf size={18} color={colors.forest} strokeWidth={1.8} />
        </View>
        <View style={styles.fill}>
          <Text style={styles.farmerSmall}>Selling on Farmkeke?</Text>
          <Text style={styles.farmerBold}>Log in with your phone and PIN</Text>
        </View>
        <ArrowRight size={20} color={colors.forest} strokeWidth={1.8} />
      </Pressable>
    </View>
  );
}

/** "No account yet? Create one": the prompt in grey, the action in bold forest. */
export function AuthSwitchLink({ prompt, action, onPress }: { prompt: string; action: string; onPress: () => void }) {
  return (
    <Text style={styles.switchText} align="center" accessibilityRole="link" onPress={onPress}>
      {prompt} <Text style={styles.switchAction}>{action}</Text>
    </Text>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.forestDeep },
  fill: { flex: 1 },
  header: { position: "absolute", left: 0, right: 0, top: 0, overflow: "hidden" },
  photoWrap: { position: "absolute", right: -130, width: 270, height: 270 },
  photo: { width: 270, height: 270, borderRadius: 135 },
  photoFade: { position: "absolute", left: 0, right: 0, top: 0, bottom: 0, borderRadius: 135, borderWidth: 26, borderColor: "rgba(11, 26, 7, 0.35)" },
  topRow: { position: "absolute", left: spacing.screen, right: spacing.screen, zIndex: 5, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  roundButton: { width: 42, height: 42, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  help: { height: 32, paddingHorizontal: 12, borderRadius: 99, justifyContent: "center" },
  helpText: { fontFamily: fonts.semibold, fontSize: 12.5, lineHeight: 16, color: colors.white },
  scroll: { flexGrow: 1 },
  intro: { paddingHorizontal: spacing.screen + 4, paddingBottom: 54, gap: 0, maxWidth: 280 },
  wordmark: { opacity: 0.92, marginBottom: 14 },
  title: { fontFamily: fonts.displayHeavy, fontSize: 32, lineHeight: 38, letterSpacing: -1, color: colors.white, textShadowColor: "rgba(11, 26, 7, 0.45)", textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 10 },
  subtitle: { fontFamily: fonts.regular, fontSize: 14.5, lineHeight: 21, color: colors.onForest, marginTop: 8 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 12 },
  chip: { flexDirection: "row", alignItems: "center", gap: 6, height: 28, paddingHorizontal: 10, borderRadius: 99 },
  chipText: { fontFamily: fonts.semibold, fontSize: 12, lineHeight: 15, color: colors.white },
  sheet: {
    flexGrow: 1,
    marginTop: -24,
    backgroundColor: colors.white,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingHorizontal: spacing.screen,
    paddingTop: 26,
  },
  form: { gap: spacing.lg },
  footer: { gap: spacing.md, marginTop: 22 },
  bottom: { marginTop: "auto", paddingTop: spacing.xxl },
  extras: { gap: spacing.md, marginTop: spacing.lg },
  orRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, marginBottom: 2 },
  rule: { flex: 1, height: 1, backgroundColor: colors.line },
  guest: { borderColor: colors.line },
  farmer: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: colors.tint, borderRadius: 16, padding: 12, paddingHorizontal: 14 },
  farmerIcon: { width: 36, height: 36, borderRadius: 11, backgroundColor: colors.white, alignItems: "center", justifyContent: "center" },
  farmerSmall: { fontFamily: fonts.medium, fontSize: 13, lineHeight: 18, color: colors.forest },
  farmerBold: { fontFamily: fonts.bold, fontSize: 13, lineHeight: 18, color: colors.forest },
  pressed: { opacity: 0.85 },
  switchText: { fontFamily: fonts.medium, fontSize: 14, lineHeight: 20, color: colors.inkSoft, paddingVertical: spacing.xs },
  switchAction: { fontFamily: fonts.bold, color: colors.forest },
});
