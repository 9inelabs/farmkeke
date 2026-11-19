// M-35 drop-off pin on a map: the shopper moves the map until the pin in the
// middle sits on their gate, or jumps to where they're standing. Apple Maps on
// iPhone; Google Maps on Android when the build has a key (app.config.js),
// otherwise the location-only row from PinPicker.web.
import { useRef, useState } from "react";
import { Modal, StyleSheet, View } from "react-native";
import MapView, { type Region } from "react-native-maps";
import { SafeAreaView } from "react-native-safe-area-context";
import { Close, Pin } from "@/components/icons";
import { Button, Text } from "@/components/ui";
import { colors, radii, spacing } from "@/theme/tokens";
import { locate, mapAvailable, pinSubtitle, startingPoint, type Coords } from "./pin";
import { PinPicker as LocationOnly } from "./PinPicker.web";
import { PinRow } from "./PinRow";

// About 300m across: close enough to see the street and the gate
const ZOOM = { latitudeDelta: 0.003, longitudeDelta: 0.003 };

export function PinPicker({ value, onChange }: { value: Coords | undefined; onChange: (c: Coords) => void }) {
  const [open, setOpen] = useState(false);
  const [start, setStart] = useState<Coords | null>(null);
  const [opening, setOpening] = useState(false);
  if (!mapAvailable) return <LocationOnly value={value} onChange={onChange} />;

  const show = async () => {
    setOpening(true);
    setStart(await startingPoint(value));
    setOpening(false);
    setOpen(true);
  };

  return (
    <>
      <PinRow set={value !== undefined} subtitle={pinSubtitle(value, null)} buttonLabel={value ? "Change" : "Set on map"} loading={opening} onPress={() => void show()} />
      {open && start ? (
        <PinMap
          start={start}
          onClose={() => setOpen(false)}
          onDone={(c) => {
            onChange(c);
            setOpen(false);
          }}
        />
      ) : null}
    </>
  );
}

function PinMap({ start, onClose, onDone }: { start: Coords; onClose: () => void; onDone: (c: Coords) => void }) {
  const map = useRef<MapView>(null);
  const centre = useRef<Coords>(start);
  const [note, setNote] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);

  const here = async () => {
    setLocating(true);
    const r = await locate();
    setLocating(false);
    if ("error" in r) return setNote(r.error);
    setNote(null);
    centre.current = r.coords;
    map.current?.animateToRegion({ ...r.coords, ...ZOOM }, 400);
  };

  return (
    <Modal visible animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <View style={styles.screen}>
        <MapView
          ref={map}
          style={StyleSheet.absoluteFill}
          initialRegion={{ ...start, ...ZOOM }}
          showsUserLocation
          showsMyLocationButton={false}
          toolbarEnabled={false}
          onRegionChangeComplete={(r: Region) => {
            centre.current = { latitude: r.latitude, longitude: r.longitude };
          }}
        />
        {/* The pin stays in the middle; its point marks the spot */}
        <View pointerEvents="none" style={styles.pinWrap}>
          <View style={styles.pin}>
            <Pin size={40} color={colors.forest} variant="solid" />
          </View>
        </View>

        <SafeAreaView edges={["top"]} style={styles.top}>
          <View style={styles.topCard}>
            <View style={styles.flex}>
              <Text variant="heading">Set your drop-off spot</Text>
              <Text variant="small">Move the map so the pin sits on your gate or door.</Text>
            </View>
            <Button label="Close" icon={Close} variant="secondary" size="small" onPress={onClose} />
          </View>
        </SafeAreaView>

        <SafeAreaView edges={["bottom"]} style={styles.bottom}>
          <View style={styles.bottomCard}>
            {note ? <Text variant="small" color={colors.error}>{note}</Text> : null}
            <Button label="Use my location" variant="secondary" fullWidth loading={locating} onPress={() => void here()} />
            <Button label="Use this spot" fullWidth onPress={() => onDone(centre.current)} />
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surfaceSoft },
  pinWrap: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0, alignItems: "center", justifyContent: "center" },
  // Lift the icon so its point, not its middle, is on the map's centre
  pin: { marginBottom: 40 },
  top: { position: "absolute", left: 0, right: 0, top: 0 },
  topCard: {
    margin: spacing.md,
    padding: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: colors.white,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  bottom: { position: "absolute", left: 0, right: 0, bottom: 0 },
  bottomCard: { margin: spacing.md, padding: spacing.md, borderRadius: radii.lg, backgroundColor: colors.white, gap: spacing.sm },
  flex: { flex: 1 },
});
