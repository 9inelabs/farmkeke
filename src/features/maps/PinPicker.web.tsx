// M-35 drop-off pin without a map (the web preview): sets the pin to where the
// shopper is standing now.
import { useState } from "react";
import { locate, pinSubtitle, type Coords } from "./pin";
import { PinRow } from "./PinRow";

export function PinPicker({ value, onChange }: { value: Coords | undefined; onChange: (c: Coords) => void }) {
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const here = async () => {
    setBusy(true);
    const r = await locate();
    setBusy(false);
    if ("error" in r) return setNote(r.error);
    onChange(r.coords);
    setNote("Pin set to where you are now. The rider will come to this spot.");
  };
  return <PinRow set={value !== undefined} subtitle={pinSubtitle(value, note)} buttonLabel={value ? "Update" : "Use my location"} loading={busy} onPress={() => void here()} />;
}
