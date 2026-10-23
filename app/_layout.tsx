import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { useFonts } from "expo-font";
import { router, Stack, type ErrorBoundaryProps } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { Info, Refresh } from "@/components/icons";
import { useEffect, type ReactNode } from "react";
import { Linking, Platform, StyleSheet, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Button, StatusScreen } from "@/components/ui";
import { AddedToast } from "@/features/shop/AddedToast";
import { AddToCartSheet } from "@/features/shop/AddToCartSheet";
import { AppGate } from "@/features/system/AppGate";
import { SessionWatcher } from "@/features/system/SessionWatcher";
import { convex, secureTokenStorage } from "@/lib/convex";
import { modalRise, sectionFade, stackScreenOptions } from "@/theme/navigation";
import { colors } from "@/theme/tokens";
import { fontAssets } from "@/theme/typography";
import { WEB_MAX_WIDTH } from "@/theme/useScreenSize";

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts(fontAssets);
  const ready = fontsLoaded || fontError !== null;

  useEffect(() => {
    if (ready) void SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <PhoneColumn>
      <SafeAreaProvider>
        <ConvexAuthProvider client={convex} storage={secureTokenStorage}>
          <StatusBar style="dark" />
          <AppGate>
            <Stack
              screenOptions={{ ...stackScreenOptions, contentStyle: { backgroundColor: colors.white } }}
            >
              <Stack.Screen name="index" options={sectionFade} />
              <Stack.Screen name="(shop)" options={sectionFade} />
              <Stack.Screen name="(farm)" options={sectionFade} />
              <Stack.Screen name="(auth)" options={modalRise} />
            </Stack>
            <SessionWatcher />
            {/* M-19 and M-20, opened from any product card or page */}
            <AddToCartSheet />
            <AddedToast />
          </AppGate>
        </ConvexAuthProvider>
      </SafeAreaProvider>
      </PhoneColumn>
    </GestureHandlerRootView>
  );
}

/**
 * Web only: the app is a phone design, so a desktop browser shows it as a
 * centred phone-width column instead of stretching it across the window.
 * Android and iOS render the app directly.
 */
function PhoneColumn({ children }: { children: ReactNode }) {
  if (Platform.OS !== "web") return children;
  return (
    <View style={webStyles.page}>
      <View style={webStyles.column}>{children}</View>
    </View>
  );
}

const webStyles = StyleSheet.create({
  page: { flex: 1, alignItems: "center", backgroundColor: colors.surfaceMuted },
  column: { flex: 1, width: "100%", maxWidth: WEB_MAX_WIDTH, backgroundColor: colors.white, overflow: "hidden" },
});

/** M-S2 Something went wrong: any uncaught error in a screen lands here. */
export function ErrorBoundary({ retry }: ErrorBoundaryProps) {
  return (
    <StatusScreen
      icon={Info}
      tone="error"
      title="Something went wrong"
      message="We couldn't load this page. It isn't anything you did."
      actions={
        <>
          <Button label="Try again" icon={Refresh} fullWidth onPress={() => void retry()} />
          <Button
            label="Go to Home"
            variant="ghost"
            fullWidth
            onPress={() => {
              router.replace("/home");
              void retry();
            }}
          />
          <Button
            label="Contact support"
            variant="ghost"
            fullWidth
            onPress={() => void Linking.openURL("mailto:support@farmkeke.com")}
          />
        </>
      }
    />
  );
}
