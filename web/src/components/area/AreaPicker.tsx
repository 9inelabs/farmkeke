"use client";

// W-09 Choose your area, W-09b Outside service area, W-10 Location primer.
// Mounted once in the root layout and opened with areaPicker.open().
// Flow: pick a state and area (areas.listServedStates / listServiceAreas) and
// save it with area.set; or "Use my current location" shows the W-10 primer,
// then the browser's location prompt, then areas.matchLocation. A location
// outside every service area shows W-09b with "Notify me" (areas.requestArea,
// phone number or email). The saved area keeps a position for farm
// distances: the exact GPS position, or the chosen service area's centre.
import { useConvex, useMutation, useQuery } from "convex/react";
import { Check, LocateFixed, MapPin } from "lucide-react";
import { useEffect, useId, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Dialog";
import { Skeleton } from "@/components/ui/Skeleton";
import { api } from "@/convex/api";
import type { LocationMatch } from "@/convex/returns/area";
import type { ServiceArea } from "@/convex/returns/common";
import { area, areaPicker, type ChosenArea } from "@/lib/area";
import { errorCode } from "@/lib/auth";

type View = "choose" | "primer" | "outside";

/** The saved area for a service area: its centre is where distances are measured from. */
const fromServiceArea = (a: ServiceArea): ChosenArea => ({
  id: a._id,
  name: a.name,
  lga: a.lga,
  state: a.state,
  ...(typeof a.latitude === "number" && typeof a.longitude === "number"
    ? { latitude: a.latitude, longitude: a.longitude }
    : {}),
});

/**
 * The place name for a GPS position (W-09b "We're not delivering to Aba
 * yet"), from OpenStreetMap's Nominatim. Undefined when it can't be found.
 */
async function placeName(latitude: number, longitude: number): Promise<{ place: string; state?: string } | undefined> {
  try {
    const qs = new URLSearchParams({
      format: "jsonv2",
      zoom: "10",
      "accept-language": "en",
      lat: String(latitude),
      lon: String(longitude),
    });
    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?${qs.toString()}`, {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return undefined;
    const body = (await res.json()) as { address?: Record<string, string | undefined> };
    const a = body.address ?? {};
    const place = a.city ?? a.town ?? a.village ?? a.suburb ?? a.county ?? a.state_district ?? a.state;
    if (!place) return undefined;
    return { place, state: a.state?.replace(/ State$/, "") };
  } catch {
    return undefined;
  }
}

/**
 * Areas saved before positions were stored have no latitude/longitude. Fill
 * them in from the service area, so farm distances work without asking again.
 */
function useBackfillPosition() {
  const chosen = area.use();
  const missing = chosen !== null && typeof chosen.latitude !== "number";
  const areas = useQuery(api.areas.listServiceAreas, missing && chosen ? { state: chosen.state } : "skip") as
    | ServiceArea[]
    | undefined;
  useEffect(() => {
    if (!missing || !areas || !chosen) return;
    const match = areas.find((a) => a._id === chosen.id);
    if (match && typeof match.latitude === "number") area.set(fromServiceArea(match));
  }, [missing, areas, chosen]);
}

export function AreaPicker() {
  const open = areaPicker.useOpen();
  const chosen = area.use();
  const convex = useConvex();
  const [view, setView] = useState<View>("choose");
  const [stateSel, setStateSel] = useState<string>();
  const [text, setText] = useState("");
  const [selected, setSelected] = useState<string>();
  const [place, setPlace] = useState("your area");
  const [placeState, setPlaceState] = useState<string>();
  const [coords, setCoords] = useState<{ latitude: number; longitude: number }>();
  const [locating, setLocating] = useState(false);
  const [locError, setLocError] = useState<string>();
  useBackfillPosition();

  const states = useQuery(api.areas.listServedStates, open ? {} : "skip") as string[] | undefined;
  const state = stateSel ?? chosen?.state ?? states?.[0];
  const areas = useQuery(api.areas.listServiceAreas, open && state ? { state } : "skip") as ServiceArea[] | undefined;

  const close = () => {
    areaPicker.close();
    setView("choose");
    setText("");
    setSelected(undefined);
    setLocError(undefined);
    setLocating(false);
  };

  const active = (areas ?? []).filter((a) => a.active).sort((a, b) => a.sortOrder - b.sortOrder);
  const q = text.trim().toLowerCase();
  const matches = q ? active.filter((a) => `${a.name} ${a.lga}`.toLowerCase().includes(q)) : active;
  const pick = selected ?? chosen?.id;
  const pickedArea = active.find((a) => a._id === pick);

  const save = () => {
    if (!pickedArea) return;
    area.set(fromServiceArea(pickedArea));
    close();
  };

  const locate = () => {
    setLocError(undefined);
    if (!("geolocation" in navigator)) {
      setLocError("This browser can't share your location. Choose your area instead.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const c = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
        try {
          const match = (await convex.query(api.areas.matchLocation, c)) as LocationMatch;
          if (match.kind === "served") {
            // Distances are measured from where the shopper actually is.
            area.set({ id: match.area._id, name: match.area.name, lga: match.area.lga, state: match.area.state, ...c });
            close();
            return;
          }
          const named = await placeName(c.latitude, c.longitude);
          setCoords(c);
          setPlace(named?.place ?? "your area");
          setPlaceState(named?.state);
          setView("outside");
        } catch {
          setLocError("We couldn't check your location just now. Check your connection, or choose your area instead.");
        } finally {
          setLocating(false);
        }
      },
      (err) => {
        setLocating(false);
        setLocError(
          err.code === err.PERMISSION_DENIED
            ? "Location is turned off for this site. Allow it in your browser settings, or choose your area instead."
            : "We couldn't find your location. Try again, or choose your area instead.",
        );
      },
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 600000 },
    );
  };

  const primer = (
    <>
      <div className="-mx-6 -mt-1 m:-mx-4">
        <div className="relative flex h-[170px] items-center justify-center bg-tint">
          <div
            aria-hidden
            className="absolute inset-0 bg-[repeating-linear-gradient(0deg,rgba(30,59,22,0.06)_0_1px,transparent_1px_28px),repeating-linear-gradient(90deg,rgba(30,59,22,0.06)_0_1px,transparent_1px_28px)]"
          />
          <span aria-hidden className="relative flex size-[84px] items-center justify-center rounded-full bg-[rgba(169,214,84,0.35)]">
            <span className="flex size-14 items-center justify-center rounded-full bg-forest text-white">
              <MapPin className="size-[26px]" strokeWidth={1.75} />
            </span>
          </span>
        </div>
      </div>
      <div className="pt-7">
        <p aria-hidden className="m-0 font-display text-[22px] leading-[30px] font-bold">
          Find farms near you
        </p>
        <p className="mt-2 text-[15px] leading-[23px] text-muted">
          Your browser will ask to share your location. We use it to set your delivery area and show the closest farms.
        </p>
        <ul className="m-0 mt-5 flex list-none flex-col gap-3 p-0">
          {["Used only to choose your area. We don't track you.", "You can change your area at any time."].map((t) => (
            <li key={t} className="flex items-start gap-3 text-sm leading-[21px] text-ink-2">
              <span aria-hidden className="flex size-6 flex-none items-center justify-center rounded-full bg-tint text-forest">
                <Check className="size-3.5" strokeWidth={2.25} />
              </span>
              {t}
            </li>
          ))}
        </ul>
        {locError ? (
          <p role="alert" className="field-error">
            {locError}
          </p>
        ) : null}
        <div className="mt-6 flex flex-col gap-2.5">
          <Button onClick={locate} loading={locating} data-autofocus>
            Use my location
          </Button>
          <Button variant="ghost" onClick={() => setView("choose")}>
            Choose area instead
          </Button>
        </div>
      </div>
    </>
  );

  const outside = (
    <OutsideArea
      place={place}
      state={placeState}
      coords={coords}
      served={active.map((a) => a.name)}
      onChooseAnother={() => setView("choose")}
    />
  );

  const choose = (
    <div className="flex flex-col gap-4 pt-2">
      <button
        type="button"
        onClick={() => setView("primer")}
        className="flex min-h-11 w-full cursor-pointer items-center gap-3 rounded-[14px] border-0 bg-surface p-3.5 text-left text-[15px] font-semibold text-forest shadow-[inset_0_0_0_1px_var(--color-line-2)] hover:bg-soft"
      >
        <span aria-hidden className="flex size-9 items-center justify-center rounded-[10px] bg-tint">
          <LocateFixed className="size-5" strokeWidth={1.75} />
        </span>
        Use my current location
      </button>
      <div aria-hidden className="flex items-center gap-3 text-xs text-[#9A9E95]">
        <span className="h-px flex-1 bg-line-soft" />
        or choose it yourself
        <span className="h-px flex-1 bg-line-soft" />
      </div>
      <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-3 m:grid-cols-1">
        <label>
          <span className="lbl">State</span>
          {states ? (
            <select
              className="fin h-12"
              value={state ?? ""}
              onChange={(e) => {
                setStateSel(e.target.value);
                setSelected(undefined);
              }}
            >
              {states.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          ) : (
            <Skeleton className="h-12 w-full" rounded={12} />
          )}
        </label>
        <label>
          <span className="lbl">Area</span>
          <input
            className="fin h-12"
            type="search"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type your area"
            autoComplete="address-level2"
          />
        </label>
      </div>

      {areas === undefined ? (
        <div className="flex flex-col gap-2" role="status" aria-label="Loading areas">
          <Skeleton className="h-[60px] w-full" rounded={12} />
          <Skeleton className="h-[60px] w-full" rounded={12} />
          <Skeleton className="h-[60px] w-full" rounded={12} />
        </div>
      ) : matches.length ? (
        <div role="radiogroup" aria-label="Areas" className="-mx-1 flex max-h-[210px] flex-col gap-1 overflow-y-auto px-1 py-0.5">
          {matches.map((a) => {
            const on = a._id === pick;
            return (
              <button
                key={a._id}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => setSelected(a._id)}
                onDoubleClick={() => {
                  setSelected(a._id);
                  area.set(fromServiceArea(a));
                  close();
                }}
                className={`flex min-h-11 w-full cursor-pointer items-center gap-3 rounded-xl border-0 px-3.5 py-3 text-left text-ink ${
                  on ? "bg-tint shadow-[inset_0_0_0_1.5px_var(--color-forest)]" : "bg-transparent hover:bg-soft"
                }`}
              >
                <MapPin aria-hidden className="size-[18px] flex-none text-forest" strokeWidth={1.75} />
                <span className="flex-1">
                  <span className="block text-sm font-semibold">{a.name}</span>
                  <span className="block text-xs text-muted-2">{a.lga}</span>
                </span>
                {on ? <Check aria-hidden className="size-[18px] flex-none text-forest" strokeWidth={2.25} /> : null}
              </button>
            );
          })}
        </div>
      ) : (
        <div className="rounded-xl bg-soft px-4 py-3.5">
          <p className="m-0 text-sm font-semibold">
            {q ? `We don't deliver to “${text.trim()}” yet` : "No delivery areas in this state yet"}
          </p>
          <p className="cap mt-0.5">Leave your phone number or email and we&apos;ll tell you as soon as we arrive.</p>
          <Button
            variant="ghost"
            size="sm"
            className="mt-2.5"
            onClick={() => {
              setPlace(text.trim() || state || "your area");
              setPlaceState(state);
              setCoords(undefined);
              setView("outside");
            }}
          >
            Tell me when you do
          </Button>
        </div>
      )}
    </div>
  );

  // One Modal for all three screens, so switching between them doesn't
  // close and reopen the dialog.
  return (
    <Modal
      open={open}
      onClose={close}
      title={
        view === "primer" ? "Find farms near you" : view === "outside" ? `We're not delivering to ${place} yet` : "Where should we deliver?"
      }
      description={view === "choose" ? "We'll show farms, prices and delivery options for your area." : undefined}
      hideTitle={view !== "choose"}
      width={view === "primer" ? 480 : view === "outside" ? 520 : 560}
      footer={
        view === "choose" ? (
          <div className="flex items-center justify-between gap-4 m:flex-col-reverse m:items-stretch">
            <span className="text-[13px] text-muted-2 m:text-center">You can change this any time</span>
            <Button onClick={save} disabled={!pickedArea} className="min-w-[180px]">
              Save area
            </Button>
          </div>
        ) : undefined
      }
    >
      {view === "primer" ? primer : view === "outside" ? outside : choose}
    </Modal>
  );
}

const CONTACT_HINT = "Enter your phone number or email, like 0803 123 4567 or name@example.com.";
const EMAIL_WRONG = "That email doesn't look right. Check it and try again, like name@example.com.";

function OutsideArea({
  place,
  state,
  coords,
  served,
  onChooseAnother,
}: {
  place: string;
  state?: string;
  coords?: { latitude: number; longitude: number };
  served: string[];
  onChooseAnother: () => void;
}) {
  const request = useMutation(api.areas.requestArea);
  const [contact, setContact] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [done, setDone] = useState<"phone" | "email">();
  const errId = useId();

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(undefined);
    const value = contact.trim();
    if (!value) {
      setError(CONTACT_HINT);
      return;
    }
    const isEmail = value.includes("@");
    if (isEmail && !/^\S+@\S+\.\S+$/.test(value)) {
      setError(EMAIL_WRONG);
      return;
    }
    setBusy(true);
    try {
      await request({
        ...(isEmail ? { email: value } : { phone: value }),
        place,
        ...(state ? { state } : {}),
        ...(coords ?? {}),
      });
      setDone(isEmail ? "email" : "phone");
    } catch (err) {
      const code = errorCode(err);
      setError(
        code === "INVALID_EMAIL"
          ? EMAIL_WRONG
          : code === "INVALID_PHONE"
            ? "That phone number doesn't look right. Enter a Nigerian number, like 0803 123 4567."
            : code === "CONTACT_REQUIRED"
              ? CONTACT_HINT
              : "We couldn't save that just now. Check your connection and try again.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="pt-1">
      <span aria-hidden className="flex size-16 items-center justify-center rounded-[20px] bg-pend-bg text-pend">
        <MapPin className="size-7" strokeWidth={1.75} />
      </span>
      <p aria-hidden className="m-0 mt-[18px] font-display text-[22px] leading-[30px] font-bold">
        We&apos;re not delivering to {place} yet
      </p>
      <p className="mt-2 text-[15px] leading-[23px] text-muted">
        Farmkeke is growing area by area. Leave your phone number or email and we&apos;ll tell you as soon as we arrive.
      </p>
      {done ? (
        <p role="status" className="mt-5 rounded-xl bg-ok-bg px-4 py-3 text-sm font-semibold text-ok">
          Thanks. We&apos;ll {done === "email" ? "email" : "text"} you as soon as we deliver to {place}.
        </p>
      ) : (
        <form className="mt-5 flex flex-col gap-2.5" onSubmit={submit} noValidate>
          <label htmlFor="notify-contact" className="text-[13px] font-semibold text-ink-2">
            Phone number or email
          </label>
          <div className="flex gap-2.5 m:flex-col">
            <input
              id="notify-contact"
              className="fin h-[50px]"
              type="text"
              autoComplete="tel"
              placeholder="0803 123 4567"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? errId : undefined}
            />
            <Button type="submit" loading={busy} className="h-[50px]">
              Notify me
            </Button>
          </div>
          {error ? (
            <span id={errId} role="alert" className="field-error -mt-1">
              {error}
            </span>
          ) : null}
        </form>
      )}
      {served.length ? (
        <div className="mt-6 pt-5 shadow-[inset_0_1px_0_var(--color-line-soft)]">
          <div className="text-[13px] font-semibold text-ink-2">Areas we deliver to now</div>
          <ul className="m-0 mt-2.5 flex list-none flex-wrap gap-1.5 p-0">
            {served.map((n) => (
              <li key={n} className="inline-flex h-[30px] items-center rounded-full bg-canvas px-3 text-[13px] font-medium text-ink-2">
                {n}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      <Button variant="ghost" fullWidth className="mt-6" onClick={onChooseAnother}>
        Choose another area
      </Button>
    </div>
  );
}
