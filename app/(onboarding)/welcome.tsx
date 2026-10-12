// M-03 Onboarding carousel, built to the Figma frames "Onboarding 1–3"
// (node 8:7 and its two siblings). Every position, size and font below is
// measured from those frames; useFigmaFrame scales them to the phone.
import { Image, type ImageSource } from "expo-image";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import {
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import { Reveal } from "@/components/motion/reveal";
import { colors } from "@/theme/tokens";
import { fonts } from "@/theme/typography";
import { useFigmaFrame } from "@/theme/useFigmaFrame";
import { useScreenWidth } from "@/theme/useScreenSize";

type Panel = {
  key: string;
  background: string;
  /** Left edge of the title and body text boxes. */
  textX: number;
  /** Left edge of the first progress dash (its line start, before the round cap). */
  dashX: number;
  /** Right edge of the Skip / Next button. */
  buttonRight: number;
  /** How many dashes are lime. */
  progress: number;
  button: "Skip" | "Next";
  title: string;
  body: { text: string; bold?: boolean }[];
  image: ImageSource;
  /** Where the 1024 x 1024 illustration is drawn in the frame. */
  art: { x: number; y: number; width: number; height: number };
  /** The illustration is only visible below this y (Onboarding 1). */
  clipTop?: number;
};

const PANELS: Panel[] = [
  {
    key: "fresh",
    background: colors.white,
    textX: 31,
    dashX: 32,
    buttonRight: 365,
    progress: 1,
    button: "Skip",
    title: "Fresh from the farm",
    body: [{ text: "Buy tomatoes, yam, ugwu and more straight from farmers near you, at farm prices." }],
    image: require("../../assets/illustrations/onboarding-fresh.jpg"),
    art: { x: -300.3, y: 59.61, width: 880.33, height: 879.53 },
    clipTop: 313,
  },
  {
    key: "delivery",
    background: "#ECF6DB",
    textX: 28,
    dashX: 29,
    buttonRight: 362,
    progress: 2,
    button: "Skip",
    title: "At your door, or ready to collect",
    body: [{ text: "A " }, { text: "Farmkeke", bold: true }, { text: " rider brings your order home, or you pick it up at a pickup point near you." }],
    image: require("../../assets/illustrations/onboarding-delivery.jpg"),
    art: { x: -78, y: 96, width: 863, height: 863 },
  },
  {
    key: "escrow",
    background: "#ECF5D8",
    textX: 28,
    dashX: 29,
    buttonRight: 362,
    progress: 3,
    button: "Next",
    title: "Your money stays safe",
    body: [{ text: "We hold your payment and only pay the farmer after you confirm you got everything." }],
    image: require("../../assets/illustrations/onboarding-escrow.jpg"),
    art: { x: -98, y: 161, width: 769, height: 769 },
  },
];

// Measured from the frames (390 x 844).
const TITLE_TOP = 110.6; // Montserrat SemiBold 40 / 40
const BODY_TOP = 202.4; // Inter Medium 14, natural line height
const BODY_LINE = 16.94; // Inter's ascender + descender at 14pt
const TEXT_RIGHT = 362; // title box right edge (wraps "At your door, or")
const BODY_RIGHT = 348; // body box right edge (keeps each frame's line breaks)
const DASH_Y = 76.5;
const DASH_LENGTH = 19;
const DASH_STEP = 24;
const BUTTON_TOP = 59;

export default function Welcome() {
  const width = useScreenWidth();
  // The carousel's real height, measured once it's laid out.
  const [height, setHeight] = useState(useWindowDimensions().height);
  const [index, setIndex] = useState(0);
  const finish = () => router.replace("/get-started");

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) =>
    setIndex(Math.round(e.nativeEvent.contentOffset.x / width));

  return (
    <View
      style={[styles.screen, { backgroundColor: PANELS[index].background }]}
      onLayout={(e) => setHeight(e.nativeEvent.layout.height)}
    >
      <StatusBar style="dark" />
      <FlatList
        data={PANELS}
        horizontal
        pagingEnabled
        bounces={false}
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScroll}
        keyExtractor={(p) => p.key}
        renderItem={({ item }) => <OnboardingPanel panel={item} width={width} height={height} onButton={finish} />}
      />
    </View>
  );
}

function OnboardingPanel({
  panel,
  width,
  height,
  onButton,
}: {
  panel: Panel;
  width: number;
  height: number;
  onButton: () => void;
}) {
  const f = useFigmaFrame();
  const clipTop = panel.clipTop ?? panel.art.y;

  return (
    <View style={[styles.panel, { width, height, backgroundColor: panel.background }]}>
      {/* Illustration first, so the text sits on top of it as in the frame. */}
      <Reveal index={2} pointerEvents="none" style={[styles.artClip, { top: f.y(clipTop) }]}>
        <Image
          source={panel.image}
          accessible={false}
          contentFit="fill"
          style={{
            position: "absolute",
            left: f.x(panel.art.x),
            top: f.size(panel.art.y - clipTop),
            width: f.size(panel.art.width),
            height: f.size(panel.art.height),
          }}
        />
      </Reveal>

      {/* Progress dashes: 19pt lines, 2pt round-capped, 24pt apart. */}
      <View
        style={{ position: "absolute", top: f.y(DASH_Y - 1), left: f.x(panel.dashX - 1), flexDirection: "row" }}
        accessible
        accessibilityLabel={`Page ${panel.progress} of 3`}
      >
        {[1, 2, 3].map((n) => (
          <View
            key={n}
            style={{
              width: f.size(DASH_LENGTH + 2),
              height: f.size(2),
              borderRadius: f.size(1),
              marginRight: f.size(DASH_STEP - DASH_LENGTH - 2),
              backgroundColor: n <= panel.progress ? colors.lime : colors.tint,
            }}
          />
        ))}
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={panel.button === "Next" ? "Next" : "Skip the introduction"}
        onPress={onButton}
        style={{
          position: "absolute",
          top: f.y(BUTTON_TOP),
          left: f.x(panel.buttonRight - 67),
          width: f.size(67),
          height: f.size(37),
          borderRadius: f.size(13),
          backgroundColor: colors.lime,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text
          allowFontScaling={false}
          style={[styles.noPadding, { fontFamily: fonts.semibold, fontSize: f.size(14), lineHeight: f.size(BODY_LINE), color: colors.forest }]}
        >
          {panel.button}
        </Text>
      </Pressable>

      <Reveal
        index={0}
        style={{ position: "absolute", top: f.y(TITLE_TOP), left: f.x(panel.textX), width: f.size(TEXT_RIGHT - panel.textX) }}
      >
        <Text
          accessibilityRole="header"
          allowFontScaling={false}
          style={[styles.noPadding, { fontFamily: fonts.displaySemibold, fontSize: f.size(40), lineHeight: f.size(40), color: colors.ink }]}
        >
          {panel.title}
        </Text>
      </Reveal>

      <Reveal
        index={1}
        style={{ position: "absolute", top: f.y(BODY_TOP), left: f.x(panel.textX), width: f.size(BODY_RIGHT - panel.textX) }}
      >
        <Text
          maxFontSizeMultiplier={1.2}
          style={[styles.noPadding, { fontFamily: fonts.medium, fontSize: f.size(14), lineHeight: f.size(BODY_LINE), color: colors.inkSoft }]}
        >
          {panel.body.map((part, i) => (
            <Text key={i} style={part.bold ? { fontFamily: fonts.semibold } : undefined}>
              {part.text}
            </Text>
          ))}
        </Text>
      </Reveal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  // Sized by explicit width and height (see OnboardingPanel), never by flex.
  panel: { overflow: "hidden" },
  artClip: { position: "absolute", left: 0, right: 0, bottom: 0, overflow: "hidden" },
  // Android adds extra space above text by default; the frames don't have it.
  noPadding: Platform.select({ android: { includeFontPadding: false }, default: {} }),
});
