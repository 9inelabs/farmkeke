// The frame of the farmer sign-up screens (Sell on Farmkeke designs): a lime
// band with Back or Close, a light sheet with a big curved top corner, the
// tilted "Sell on farmkeke" sticker on its edge, a title whose last word is
// grey, a short line under it, the content, and the main button at the foot.
import { router } from "expo-router";
import type { ReactNode } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ChevronLeft } from "@/components/icons";
import { Text, Wordmark } from "@/components/ui";
import { colors, spacing } from "@/theme/tokens";
import { fonts } from "@/theme/typography";

const BAND = 96;
const CURVE = 64;

/** The white "Sell on farmkeke" tag, tilted, as on every sign-up screen. */
export function SellSticker({ tilt = -6 }: { tilt?: number }) {
  return (
    <View style={[styles.sticker, { transform: [{ rotate: `${tilt}deg` }] }]} accessibilityLabel="Sell on Farmkeke">
      <Text style={styles.stickerText}>Sell on</Text>
      <Wordmark width={58} />
    </View>
  );
}

/** "Input your Phone Number": the last word in grey. */
export function SellTitle({ title, accent, note }: { title: string; accent?: string; note?: string }) {
  return (
    <View style={styles.titleWrap}>
      <Text style={styles.title} accessibilityRole="header">
        {title}
        {accent ? <Text style={[styles.title, styles.accent]}>{` ${accent}`}</Text> : null}
      </Text>
      {note ? (
        <Text variant="small" color={colors.inkSoft} align="center" style={styles.note}>
          {note}
        </Text>
      ) : null}
    </View>
  );
}

type Props = {
  children: ReactNode;
  /** The main button (and anything under it) */
  footer?: ReactNode;
  back?: "back" | "close";
  onBack?: () => void;
  /** Which top corner of the sheet curves (the designs vary) */
  curve?: "left" | "right" | "both";
  /** Where the sticker sits along the sheet's edge */
  sticker?: "left" | "center" | "right" | "none";
  /** Keep the footer at the bottom of the screen instead of after the content */
  pinFooter?: boolean;
};

export function SellShell({ children, footer, back = "back", onBack, curve = "left", sticker = "center", pinFooter = false }: Props) {
  const insets = useSafeAreaInsets();
  const leave = onBack ?? (() => (router.canGoBack() ? router.back() : router.replace("/home")));
  const stickerPos = sticker === "left" ? { left: "22%" as const } : sticker === "right" ? { right: spacing.screen } : { alignSelf: "center" as const };
  return (
    <View style={styles.screen}>
      <View style={[styles.band, { paddingTop: insets.top + spacing.md, height: insets.top + BAND + CURVE }]}>
        <Pressable accessibilityRole="button" accessibilityLabel={back === "close" ? "Close" : "Back"} hitSlop={10} onPress={leave} style={styles.back}>
          <ChevronLeft size={18} color={colors.ink} strokeWidth={2.4} />
          <Text style={styles.backText}>{back === "close" ? "Close" : "Back"}</Text>
        </Pressable>
      </View>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View
          style={[
            styles.sheet,
            { marginTop: -CURVE },
            curve !== "right" && { borderTopLeftRadius: CURVE },
            curve !== "left" && { borderTopRightRadius: CURVE },
          ]}
        >
          {sticker !== "none" ? (
            <View style={[styles.stickerSlot, stickerPos]} pointerEvents="none">
              <SellSticker tilt={sticker === "right" ? -8 : sticker === "left" ? 6 : -5} />
            </View>
          ) : null}
          <ScrollView contentContainerStyle={[styles.content, pinFooter && styles.grow]} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            {children}
            {footer && !pinFooter ? <View style={styles.footerInline}>{footer}</View> : null}
          </ScrollView>
          {footer && pinFooter ? <View style={[styles.footerPinned, { paddingBottom: Math.max(insets.bottom, spacing.lg) }]}>{footer}</View> : null}
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.lime },
  flex: { flex: 1 },
  band: { backgroundColor: colors.lime, paddingHorizontal: spacing.screen },
  back: { flexDirection: "row", alignItems: "center", gap: 2, alignSelf: "flex-start", marginLeft: -4 },
  backText: { fontFamily: fonts.semibold, fontSize: 17, lineHeight: 22, color: colors.ink },
  sheet: { flex: 1, backgroundColor: colors.canvas },
  stickerSlot: { position: "absolute", top: -12, zIndex: 2 },
  sticker: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: colors.white,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 4,
    boxShadow: "0px 2px 8px 0px rgba(0, 0, 0, 0.12)",
  },
  stickerText: { fontFamily: fonts.displayBold, fontSize: 10, lineHeight: 14, color: colors.ink },
  content: { paddingHorizontal: spacing.screen + 4, paddingTop: spacing.xxl + spacing.sm, paddingBottom: spacing.xl, gap: spacing.lg },
  grow: { flexGrow: 1 },
  footerInline: { marginTop: spacing.md, gap: spacing.sm },
  footerPinned: { paddingHorizontal: spacing.screen + 4, paddingTop: spacing.sm, gap: spacing.sm },
  titleWrap: { alignItems: "center", gap: 4, marginBottom: spacing.xs },
  title: { fontFamily: fonts.displayBold, fontSize: 22, lineHeight: 28, color: colors.ink, textAlign: "center" },
  accent: { color: "#5F5F5F" },
  note: { maxWidth: 300 },
});
