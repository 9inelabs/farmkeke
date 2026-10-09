import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { useFonts } from "expo-font";
import { router, Stack, type ErrorBoundaryProps } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { AlertCircle, RefreshCw } from "lucide-react-native";
import { useEffect } from "react";
import { Linking } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Button, StatusScreen } from "@/components/ui";
import { AppGate } from "@/features/system/AppGate";
import { SessionWatcher } from "@/features/system/SessionWatcher";
import { convex, secureTokenStorage } from "@/lib/convex";
import { colors } from "@/theme/tokens";
import { fontAssets } from "@/theme/typography";

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
      <SafeAreaProvider>
        <ConvexAuthProvider client={convex} storage={secureTokenStorage}>
          <StatusBar style="dark" />
          <AppGate>
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: colors.white },
                animation: "slide_from_right",
              }}
            >
              <Stack.Screen name="index" options={{ animation: "fade" }} />
              <Stack.Screen name="(shop)" options={{ animation: "fade" }} />
              <Stack.Screen name="(farm)" options={{ animation: "fade" }} />
              <Stack.Screen name="(auth)" options={{ presentation: "modal", animation: "slide_from_bottom" }} />
            </Stack>
            <SessionWatcher />
          </AppGate>
        </ConvexAuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

/** M-S2 Something went wrong: any uncaught error in a screen lands here. */
export function ErrorBoundary({ retry }: ErrorBoundaryProps) {
  return (
    <StatusScreen
      icon={AlertCircle}
      tone="error"
      title="Something went wrong"
      message="We couldn't load this page. It isn't anything you did."
      actions={
        <>
          <Button label="Try again" icon={RefreshCw} fullWidth onPress={() => void retry()} />
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
