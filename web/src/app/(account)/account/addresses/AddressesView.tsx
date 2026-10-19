"use client";

// W-46 Addresses and W-46b Add / edit address (addresses.list, .create,
// .update, .remove), with the rider directions and the map pin stored on the
// address. Values an earlier version kept in this browser are moved to the
// account once (useMigrateLocalExtras), then forgotten.
import { useMutation, useQuery } from "convex/react";
import { Briefcase, House, MapPin, Plus } from "lucide-react";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { AccountShell, AccountTitle } from "@/components/account/AccountShell";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Dialog";
import { SelectField, TextField } from "@/components/ui/Field";
import { Skeleton } from "@/components/ui/Skeleton";
import { api, type Id } from "@/convex/api";
import type { SavedAddress } from "@/convex/returns/account";
import type { ServiceArea } from "@/convex/returns/common";
import { area as chosenArea } from "@/lib/area";
import { errorCode, useViewer } from "@/lib/auth";
import { displayPhone } from "@/lib/format";

export function AddressesView() {
  return (
    <AccountShell>
      <Addresses />
    </AccountShell>
  );
}

const LABELS = { home: "Home", work: "Work", other: "Other" } as const;
type Label = keyof typeof LABELS;
const ICONS = { home: House, work: Briefcase, other: MapPin };

// OpenStreetMap pin (W-46b "Set pin"), browser only
const PinMap = dynamic(() => import("@/components/maps/PinMap"), {
  ssr: false,
  loading: () => <Skeleton className="size-full" rounded={12} />,
});
const OWERRI = { latitude: 5.4836, longitude: 7.0333 };

// Where an earlier version kept directions and pins, per address id.
const OLD_EXTRAS_KEY = "fk.addressExtras.v1";
type OldExtra = { directions?: string; latitude?: number; longitude?: number };

/** Moves directions and pins saved in this browser onto the addresses, once. */
function useMigrateLocalExtras(list: SavedAddress[] | undefined) {
  const update = useMutation(api.addresses.update);
  const done = useRef(false);
  useEffect(() => {
    if (!list || done.current) return;
    done.current = true;
    let old: Record<string, OldExtra> = {};
    try {
      old = JSON.parse(window.localStorage.getItem(OLD_EXTRAS_KEY) ?? "{}") as Record<string, OldExtra>;
    } catch {
      return;
    }
    const work = list.filter((a) => old[a._id]);
    if (Object.keys(old).length === 0) return;
    void (async () => {
      try {
        for (const a of work) {
          const x = old[a._id]!;
          const pin =
            a.latitude === undefined && x.latitude !== undefined && x.longitude !== undefined
              ? { latitude: x.latitude, longitude: x.longitude }
              : {};
          const directions = !a.directions && x.directions ? { directions: x.directions } : {};
          if (!("latitude" in pin) && !("directions" in directions)) continue;
          await update({
            addressId: a._id as Id<"addresses">,
            label: a.label,
            street: a.street,
            landmark: a.landmark,
            serviceAreaId: a.serviceAreaId as Id<"serviceAreas">,
            isDefault: a.isDefault,
            ...pin,
            ...directions,
          });
        }
        window.localStorage.removeItem(OLD_EXTRAS_KEY);
      } catch {
        // Try again next visit.
      }
    })();
  }, [list, update]);
}

function Addresses() {
  const list = useQuery(api.addresses.list, {}) as SavedAddress[] | undefined;
  const { viewer } = useViewer();
  useMigrateLocalExtras(list);
  const update = useMutation(api.addresses.update);
  const [editing, setEditing] = useState<SavedAddress | "new" | null>(null);
  const [deleting, setDeleting] = useState<SavedAddress | null>(null);
  const [error, setError] = useState<string | null>(null);

  const makeDefault = async (a: SavedAddress) => {
    setError(null);
    try {
      await update({
        addressId: a._id as Id<"addresses">,
        label: a.label,
        street: a.street,
        landmark: a.landmark,
        serviceAreaId: a.serviceAreaId as Id<"serviceAreas">,
        isDefault: true,
      });
    } catch {
      setError("We couldn't change your default address. Try again.");
    }
  };

  return (
    <>
      <AccountTitle
        title="Addresses"
        sub="Saved addresses fill in at checkout. Your default is chosen first."
        aside={
          <Button variant="lime" className="text-sm" icon={<Plus aria-hidden className="size-[18px]" strokeWidth={2} />} onClick={() => setEditing("new")}>
            Add address
          </Button>
        }
      />
      {error ? (
        <p role="alert" className="field-error m-0">
          {error}
        </p>
      ) : null}
      {list === undefined ? (
        <div className="grid grid-cols-2 gap-4 m:grid-cols-1">
          <Skeleton className="h-[220px]" rounded={18} />
          <Skeleton className="h-[220px]" rounded={18} />
        </div>
      ) : list.length === 0 ? (
        <section className="card flex flex-col items-center gap-3 px-6 py-12 text-center">
          <span aria-hidden className="tile size-16 rounded-[20px]">
            <MapPin className="size-7" strokeWidth={1.5} />
          </span>
          <p className="p max-w-[420px]">You haven&apos;t saved an address yet. Add one and it fills in at checkout.</p>
          <Button variant="lime" onClick={() => setEditing("new")}>
            Add address
          </Button>
        </section>
      ) : (
        <ul className="m-0 grid list-none grid-cols-2 gap-4 p-0 m:grid-cols-1">
          {list.map((a) => {
            const Icon = ICONS[a.label] ?? MapPin;
            return (
              <li
                key={a._id}
                className={`card flex flex-col gap-3.5 p-[22px] ${a.isDefault ? "shadow-[inset_0_0_0_2px_var(--color-forest)]" : ""}`}
              >
                <div className="flex items-center gap-3">
                  <span
                    aria-hidden
                    className={`flex size-[42px] flex-none items-center justify-center rounded-xl ${a.isDefault ? "bg-tint text-forest" : "bg-canvas text-ink-3"}`}
                  >
                    <Icon className="size-5" strokeWidth={1.75} />
                  </span>
                  <h2 className="m-0 flex-1 text-base font-bold">{LABELS[a.label]}</h2>
                  {a.isDefault ? <span className="badge bg-forest text-white">Default</span> : null}
                </div>
                <div className="text-sm leading-[21px] text-ink-2">
                  {[a.street, a.area?.name, a.area?.state].filter(Boolean).join(", ")}
                  <br />
                  <span className="text-muted-2">{[a.landmark, a.directions].filter(Boolean).join(" · ")}</span>
                </div>
                {viewer?.name || viewer?.phone ? (
                  <div className="sm">
                    {[viewer?.name, viewer?.phone ? displayPhone(viewer.phone) : ""].filter(Boolean).join(" · ")}
                  </div>
                ) : null}
                <div className="flex flex-wrap gap-4 pt-3 shadow-[inset_0_1px_0_#EEF0EB]">
                  <LinkButton onClick={() => setEditing(a)} label={`Edit ${LABELS[a.label]} address`}>
                    Edit
                  </LinkButton>
                  {a.isDefault ? null : (
                    <LinkButton onClick={() => makeDefault(a)} label={`Set ${LABELS[a.label]} address as default`}>
                      Set as default
                    </LinkButton>
                  )}
                  <LinkButton onClick={() => setDeleting(a)} label={`Delete ${LABELS[a.label]} address`} danger>
                    Delete
                  </LinkButton>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <p className="sm m-0">Pickup points aren&apos;t saved here. You choose one at checkout.</p>

      {editing ? (
        <AddressModal
          key={editing === "new" ? "new" : editing._id}
          address={editing === "new" ? null : editing}
          first={(list?.length ?? 0) === 0}
          onClose={() => setEditing(null)}
        />
      ) : null}
      <DeleteModal address={deleting} onClose={() => setDeleting(null)} />
    </>
  );
}

function LinkButton({
  children,
  onClick,
  label,
  danger,
}: {
  children: string;
  onClick: () => void;
  label: string;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex min-h-11 cursor-pointer items-center border-0 bg-transparent p-0 text-[13px] font-semibold ${danger ? "text-err" : "text-forest"}`}
    >
      {children}
      <span className="sr-only"> ({label})</span>
    </button>
  );
}

type Errors = Partial<Record<"street" | "landmark" | "area" | "form", string>>;

function AddressModal({ address, first, onClose }: { address: SavedAddress | null; first: boolean; onClose: () => void }) {
  const create = useMutation(api.addresses.create);
  const update = useMutation(api.addresses.update);
  const states = useQuery(api.areas.listServedStates, {}) as string[] | undefined;
  const [label, setLabel] = useState<Label>(address?.label ?? "home");
  const [street, setStreet] = useState(address?.street ?? "");
  const [landmark, setLandmark] = useState(address?.landmark ?? "");
  const [directions, setDirections] = useState(address?.directions ?? "");
  const [state, setState] = useState<string | null>(address?.area?.state ?? chosenArea.get()?.state ?? null);
  const [areaId, setAreaId] = useState<string>(address?.serviceAreaId ?? chosenArea.get()?.id ?? "");
  const [isDefault, setIsDefault] = useState(address?.isDefault ?? first);
  const [pin, setPin] = useState<{ latitude: number; longitude: number } | null>(
    address?.latitude !== undefined && address.longitude !== undefined
      ? { latitude: address.latitude, longitude: address.longitude }
      : null,
  );
  const [pinNote, setPinNote] = useState<string | null>(null);
  const [showMap, setShowMap] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);
  const shownState = state ?? states?.[0] ?? null;
  const areas = useQuery(api.areas.listServiceAreas, shownState ? { state: shownState } : "skip") as ServiceArea[] | undefined;

  // "Set pin": open the map at the saved pin, your location, or the area, then drag the pin.
  const setPinHere = () => {
    setShowMap(true);
    const start = () => {
      const a = chosenArea.get();
      setPin((p) =>
        p ?? (a?.latitude !== undefined && a.longitude !== undefined ? { latitude: a.latitude, longitude: a.longitude } : OWERRI),
      );
      setPinNote("Drag the pin, or tap the map, to mark your gate.");
    };
    if (pin || !("geolocation" in navigator)) return start();
    setPinNote("Finding you…");
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setPin({ latitude: p.coords.latitude, longitude: p.coords.longitude });
        setPinNote("Pin set to your current location. Drag it to the exact spot.");
      },
      start,
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const n: Errors = {};
    if (!street.trim()) n.street = "Enter the building number and street.";
    if (!landmark.trim()) n.landmark = "Add a landmark near you, so riders find you first time.";
    if (!areaId) n.area = "Choose your area.";
    setErrors(n);
    if (Object.keys(n).length) return;
    setBusy(true);
    const fields = {
      label,
      street: street.trim(),
      landmark: landmark.trim(),
      serviceAreaId: areaId as Id<"serviceAreas">,
      isDefault,
      directions: directions.trim(),
      ...(pin ?? {}),
    };
    try {
      if (address) await update({ addressId: address._id as Id<"addresses">, ...fields });
      else await create(fields);
      onClose();
    } catch (err) {
      setBusy(false);
      const code = errorCode(err);
      setErrors(
        code === "AREA_NOT_SERVED"
          ? { area: "We don't deliver to that area yet. Choose another." }
          : code === "TOO_MANY_ADDRESSES"
            ? { form: "You've saved the most addresses we allow. Delete one to add another." }
            : code === "STREET_REQUIRED"
              ? { street: "Enter the building number and street." }
              : code === "LANDMARK_REQUIRED"
                ? { landmark: "Add a landmark near you." }
                : code === "DIRECTIONS_TOO_LONG"
                  ? { form: "Keep the directions for the rider to 200 characters." }
                  : { form: "We couldn't save this address. Check your connection and try again." },
      );
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      width={580}
      title={address ? "Edit address" : "Add an address"}
      titleClassName="m-0 font-display text-xl font-bold"
      headerClassName="flex items-center justify-between gap-4 px-7 py-6 shadow-[inset_0_-1px_0_#EEF0EB] m:px-4"
      bodyClassName="px-7 py-[22px] m:px-4"
      footerClassName="flex justify-end gap-2.5 px-7 pt-[18px] pb-6 shadow-[inset_0_1px_0_#EEF0EB] m:px-4"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} className="text-sm">
            Cancel
          </Button>
          <Button type="submit" form="address-form" variant="lime" loading={busy} className="min-w-[160px] text-sm">
            Save address
          </Button>
        </>
      }
    >
      <form id="address-form" noValidate onSubmit={submit} className="flex flex-col gap-4">
        <fieldset className="m-0 border-0 p-0">
          <legend className="lbl">Label</legend>
          <div className="flex gap-2" role="radiogroup" aria-label="Label">
            {(Object.keys(LABELS) as Label[]).map((l) => (
              <button
                key={l}
                type="button"
                role="radio"
                aria-checked={label === l}
                onClick={() => setLabel(l)}
                className={`inline-flex min-h-11 cursor-pointer items-center rounded-full border-0 px-4 text-sm font-semibold ${
                  label === l ? "bg-forest text-white" : "bg-surface text-ink shadow-[inset_0_0_0_1px_#DCE0D6]"
                }`}
              >
                {LABELS[l]}
              </button>
            ))}
          </div>
        </fieldset>
        <TextField
          label="Street address"
          autoComplete="street-address"
          placeholder="Building number and street"
          value={street}
          onChange={(e) => setStreet(e.target.value)}
          error={errors.street}
          className="[&_input]:h-12"
          data-autofocus
        />
        {states && states.length > 1 ? (
          <SelectField
            label="State"
            value={shownState ?? ""}
            onChange={(e) => {
              setState(e.target.value);
              setAreaId("");
            }}
            className="[&_select]:h-12"
          >
            {states.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </SelectField>
        ) : null}
        <div className="grid grid-cols-2 gap-3 m:grid-cols-1">
          <SelectField
            label="Area"
            value={areaId}
            onChange={(e) => setAreaId(e.target.value)}
            error={errors.area}
            className="[&_select]:h-12"
          >
            <option value="" disabled>
              {areas === undefined ? "Loading areas…" : "Choose your area"}
            </option>
            {(areas ?? [])
              .filter((a) => a.active)
              .map((a) => (
                <option key={a._id} value={a._id}>
                  {a.name}
                </option>
              ))}
          </SelectField>
          <TextField
            label="Nearest landmark"
            placeholder="Opposite the filling station"
            value={landmark}
            onChange={(e) => setLandmark(e.target.value)}
            error={errors.landmark}
            className="[&_input]:h-12"
          />
        </div>
        <div>
          <div className="flex flex-wrap items-center gap-3 rounded-xl bg-soft px-3.5 py-3">
            <MapPin aria-hidden className="size-5 text-forest" strokeWidth={1.75} />
            <span className="flex-1 text-sm">
              {pin ? "Your pin is set" : "Pin your exact location so riders find you faster"}
            </span>
            <Button variant="ghost" size="sm" onClick={setPinHere}>
              {pin ? "Update pin" : "Set pin"}
            </Button>
          </div>
          {showMap && pin ? (
            <div className="relative isolate mt-2.5 h-[200px] overflow-hidden rounded-xl shadow-[inset_0_0_0_1px_#DCE0D6]">
              <PinMap
                at={pin}
                label="Your address pin"
                onMove={(p) => {
                  setPin(p);
                  setPinNote("Pin moved. Save the address to keep it.");
                }}
              />
            </div>
          ) : null}
          {pinNote ? (
            <span role="status" className="hint">
              {pinNote}
            </span>
          ) : null}
        </div>
        <TextField
          label="Directions for the rider"
          labelNote="(optional)"
          placeholder="Ask for Adaeze at reception"
          value={directions}
          onChange={(e) => setDirections(e.target.value)}
          maxLength={200}
          className="[&_input]:h-12"
        />
        <label className="flex min-h-11 cursor-pointer items-center gap-2.5 text-sm">
          <input
            type="checkbox"
            checked={isDefault}
            disabled={address?.isDefault}
            onChange={(e) => setIsDefault(e.target.checked)}
            className="m-0 size-[18px] accent-forest"
          />
          Make this my default address
        </label>
        {errors.form ? (
          <p role="alert" className="field-error m-0">
            {errors.form}
          </p>
        ) : null}
      </form>
    </Modal>
  );
}

function DeleteModal({ address, onClose }: { address: SavedAddress | null; onClose: () => void }) {
  const remove = useMutation(api.addresses.remove);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const del = async () => {
    if (!address) return;
    setBusy(true);
    setError(null);
    try {
      await remove({ addressId: address._id as Id<"addresses"> });
      onClose();
    } catch {
      setError("We couldn't delete this address. Try again.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal
      open={!!address}
      onClose={onClose}
      width={460}
      title="Delete this address?"
      description={address ? `${LABELS[address.label]}: ${address.street}` : undefined}
      footer={
        <div className="flex justify-end gap-2.5">
          <Button variant="ghost" onClick={onClose}>
            Keep it
          </Button>
          <Button variant="danger" loading={busy} onClick={del}>
            Delete address
          </Button>
        </div>
      }
    >
      <p className="p">
        {address?.isDefault
          ? "This is your default address. Your next saved address becomes the default."
          : "You can add it again any time."}
      </p>
      {error ? (
        <p role="alert" className="field-error">
          {error}
        </p>
      ) : null}
    </Modal>
  );
}
