// Scans the buyer's pickup QR code (their 4-digit code, PickupQr) with the
// back camera, full screen over the code sheet. A code is handed back once;
// anything else on screen gets a hint. Typing the code stays the fallback.
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from "expo-camera";
import { useEffect, useRef, useState } from "react";
import { Linking, Modal, Pressable, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Camera, Close } from "@/components/icons";
import { Button, Text } from "@/components/ui";
import { colors, radii, spacing } from "@/theme/tokens";
import { fonts } from "@/theme/typography";

const FRAME = 240;

export function PickupScanner({ visible, onClose, onCode }: { visible: boolean; onClose: () => void; onCode: (code: string) => void }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [hint, setHint] = useState<string | null>(null);
  // The camera reports the same code many times a second; take it once
  const done = useRef(false);

  useEffect(() => {
    if (!visible) return;
    done.current = false;
    setHint(null);
    if (permission && !permission.granted && permission.canAskAgain) void requestPermission();
    // Ask once each time the scanner opens
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const scanned = ({ data }: BarcodeScanningResult) => {
    if (done.current) return;
    const code = data.trim();
    if (/^\d{4}$/.test(code)) {
      done.current = true;
      onCode(code);
    } else {
      setHint("That isn't a Farmkeke pickup code. Scan the code on the buyer's order screen.");
    }
  };

  const granted = permission?.granted === true;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} presentationStyle="fullScreen" statusBarTranslucent>
      <View style={styles.screen}>
        {granted ? (
          <CameraView style={StyleSheet.absoluteFill} facing="back" barcodeScannerSettings={{ barcodeTypes: ["qr"] }} onBarcodeScanned={visible ? scanned : undefined} />
        ) : null}
        <SafeAreaView style={styles.overlay} edges={["top", "bottom"]}>
          <View style={styles.top}>
            <Pressable accessibilityRole="button" accessibilityLabel="Close the scanner" hitSlop={10} onPress={onClose} style={styles.close}>
              <Close size={20} color={colors.white} />
            </Pressable>
          </View>

          {granted ? (
            <View style={styles.middle}>
              <Text style={styles.title}>Scan the buyer's code</Text>
              <Text variant="caption" color="rgba(255,255,255,0.8)" align="center">
                Ask them to open the order and show the QR code.
              </Text>
              <View style={styles.frame} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
                <View style={[styles.corner, styles.tl]} />
                <View style={[styles.corner, styles.tr]} />
                <View style={[styles.corner, styles.bl]} />
                <View style={[styles.corner, styles.br]} />
              </View>
              {hint ? (
                <Text variant="small" color={colors.white} align="center" style={styles.hint} accessibilityLiveRegion="polite">
                  {hint}
                </Text>
              ) : null}
            </View>
          ) : (
            <View style={styles.middle}>
              <View style={styles.askIcon}>
                <Camera size={28} color={colors.forest} />
              </View>
              <Text style={styles.title}>Allow the camera</Text>
              <Text variant="caption" color="rgba(255,255,255,0.8)" align="center">
                Farmkeke uses the camera only to read the buyer's pickup code.
              </Text>
              {permission && !permission.canAskAgain ? (
                <Button label="Open settings" variant="primary" pill onPress={() => void Linking.openSettings()} />
              ) : (
                <Button label="Allow camera" variant="primary" pill onPress={() => void requestPermission()} />
              )}
            </View>
          )}

          <View style={styles.bottom}>
            <Button label="Type the code instead" variant="outline" pill fullWidth onPress={onClose} style={styles.typeInstead} />
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const CORNER = 34;
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#000" },
  overlay: { flex: 1, justifyContent: "space-between", paddingHorizontal: spacing.screen },
  top: { flexDirection: "row", justifyContent: "flex-end", paddingTop: spacing.sm },
  close: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(0,0,0,0.45)", alignItems: "center", justifyContent: "center" },
  middle: { alignItems: "center", gap: spacing.md },
  title: { fontFamily: fonts.displayBold, fontSize: 20, lineHeight: 26, color: colors.white, textAlign: "center" },
  frame: { width: FRAME, height: FRAME, marginTop: spacing.md },
  corner: { position: "absolute", width: CORNER, height: CORNER, borderColor: colors.lime },
  tl: { top: 0, left: 0, borderTopWidth: 4, borderLeftWidth: 4, borderTopLeftRadius: radii.lg },
  tr: { top: 0, right: 0, borderTopWidth: 4, borderRightWidth: 4, borderTopRightRadius: radii.lg },
  bl: { bottom: 0, left: 0, borderBottomWidth: 4, borderLeftWidth: 4, borderBottomLeftRadius: radii.lg },
  br: { bottom: 0, right: 0, borderBottomWidth: 4, borderRightWidth: 4, borderBottomRightRadius: radii.lg },
  hint: { backgroundColor: "rgba(0,0,0,0.55)", borderRadius: radii.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, overflow: "hidden" },
  askIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.tint, alignItems: "center", justifyContent: "center" },
  bottom: { paddingBottom: spacing.md },
  typeInstead: { borderColor: "rgba(255,255,255,0.6)" },
});
