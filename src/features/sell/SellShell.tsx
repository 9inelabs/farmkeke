// The frame of the farmer sign-up screens (Sell on Farmkeke designs): a lime
// band with Back or Close, a light sheet with a big curved top corner, the
// tilted "Sell on farmkeke" sticker on its edge, a title whose last word is
// grey, a short line under it, the content, and the main button at the foot.
// Each screen's band shows the photo staff set for it in the Admin Portal
// (Site photos); without one, it stays lime.
import { api } from "@convex/_generated/api";
import type { FarmerScene } from "@convex/lib/sitePhotos";
import { useQuery } from "convex/react";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { Component, useEffect, useState, type ReactNode } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ChevronLeft } from "@/components/icons";
import { Text, Wordmark } from "@/components/ui";
import { colors, spacing } from "@/theme/tokens";
import { fonts } from "@/theme/typography";

const BAND = 96;
// A photo gets a taller band so the scene shows
const PHOTO_BAND = 150;
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
  /** Which screen this is, for its header photo (Admin Portal, Site photos) */
  scene?: FarmerScene;
};

export function SellShell({ children, footer, back = "back", onBack, curve = "left", sticker = "center", pinFooter = false, scene }: Props) {
  const [photo, setPhoto] = useState(false);
  const insets = useSafeAreaInsets();
  const leave = onBack ?? (() => (router.canGoBack() ? router.back() : router.replace("/home")));
  const stickerPos = sticker === "left" ? { left: "22%" as const } : sticker === "right" ? { right: spacing.screen } : { alignSelf: "center" as const };
  return (
    <View style={styles.screen}>
      <View style={[styles.band, { paddingTop: insets.top + spacing.md, height: insets.top + (photo ? PHOTO_BAND : BAND) + CURVE }]}>
        {scene ? (
          <Quiet>
            <BandPhoto scene={scene} onPhoto={setPhoto} />
          </Quiet>
        ) : null}
        <Pressable accessibilityRole="button" accessibilityLabel={back === "close" ? "Close" : "Back"} hitSlop={10} onPress={leave} style={styles.back}>
          <ChevronLeft size={18} color={photo ? colors.white : colors.ink} strokeWidth={2.4} />
          <Text style={[styles.backText, photo ? styles.backOnPhoto : null]}>{back === "close" ? "Close" : "Back"}</Text>
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

/** The scene's photo, cropped to the band, with a fade so Back reads on it. */
function BandPhoto({ scene, onPhoto }: { scene: FarmerScene; onPhoto: (on: boolean) => void }) {
  const photos = useQuery(api.sitePhotos.farmerSignup);
  const photo = photos?.[scene] ?? null;
  useEffect(() => onPhoto(photo !== null), [photo, onPhoto]);
  if (photo === null) return null;
  return (
    <>
      <Image source={{ uri: photo.url }} style={StyleSheet.absoluteFill} contentFit="cover" contentPosition={photo.focus} transition={250} accessible={false} />
      {/* Darker at the top, so Back reads on any photo */}
      <LinearGradient colors={["rgba(0,0,0,0.5)", "rgba(0,0,0,0.08)", "rgba(0,0,0,0)"]} locations={[0, 0.45, 1]} style={StyleSheet.absoluteFill} />
    </>
  );
}

/** If the photos can't be loaded (an older backend), the band just stays lime. */
class Quiet extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.lime },
  flex: { flex: 1 },
  band: { backgroundColor: colors.lime, paddingHorizontal: spacing.screen, overflow: "hidden" },
  back: { flexDirection: "row", alignItems: "center", gap: 2, alignSelf: "flex-start", marginLeft: -4 },
  backText: { fontFamily: fonts.semibold, fontSize: 17, lineHeight: 22, color: colors.ink },
  backOnPhoto: { color: colors.white, textShadowColor: "rgba(0,0,0,0.35)", textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 },
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
