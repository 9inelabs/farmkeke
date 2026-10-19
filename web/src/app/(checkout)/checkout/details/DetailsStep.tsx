"use client";

// W-23 Address and time (home delivery) or W-24 Pickup point, depending on
// the choice made in W-22. Delivery windows come from checkout.deliveryWindows
// (days every farm in the cart can make); pickup points from checkout.pickupPoints.
import { useQuery } from "convex/react";
import { MapPin } from "lucide-react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { groupByFarm, useQuote } from "@/components/cart/parts";
import { draft, type CheckoutDraft } from "@/components/checkout/draft";
import {
  CheckoutShell,
  CheckoutSkeleton,
  checkoutCard,
  checkoutH1,
  FarmsSummary,
  StepActions,
  useCheckoutGuard,
} from "@/components/checkout/Shell";
import { hoursSummary, isoDayLabel } from "@/components/orders/format";
import { Button } from "@/components/ui/Button";
import { TextArea, TextField } from "@/components/ui/Field";
import { Skeleton } from "@/components/ui/Skeleton";
import { api } from "@/convex/api";
import type { SavedAddress } from "@/convex/returns/account";
import type { CheckoutPickupPoint, DeliveryWindows, SlotState } from "@/convex/returns/checkout";
import { areaPicker } from "@/lib/area";
import { useViewer } from "@/lib/auth";
import { clock, todayInLagos } from "@/lib/format";
import { routes } from "@/lib/routes";

// Real OpenStreetMap maps, loaded in the browser only (Leaflet needs window).
const PinMap = dynamic(() => import("@/components/maps/PinMap"), {
  ssr: false,
  loading: () => <Skeleton className="size-full" rounded={14} />,
});
const LetteredPointsMap = dynamic(() => import("@/components/maps/LetteredPointsMap"), {
  ssr: false,
  loading: () => <Skeleton className="size-full" rounded={16} />,
});
/** Owerri, until the area or the shopper gives a better place for the pin. */
const OWERRI = { latitude: 5.4836, longitude: 7.0333 };

export function DetailsStep() {
  const ready = useCheckoutGuard(3);
  const d = draft.use();
  if (!ready) return <CheckoutSkeleton />;
  return d.fulfilment === "pickup" ? <PickupDetails /> : <DeliveryDetails />;
}

/** The three windows the backend offers each day (convex/checkout.ts SLOTS). */
const SLOTS = [
  { from: "09:00", to: "12:00" },
  { from: "12:00", to: "15:00" },
  { from: "15:00", to: "18:00" },
];
const slotLabel = (s: { from: string; to: string }) => `${clock(s.from)} – ${clock(s.to)}`;

/** "Today, Sat 17 Oct" / "Tomorrow, Sun 18 Oct" / "Mon 19 Oct" */
export function dayHeading(day: string, now: number) {
  const today = todayInLagos(new Date(now));
  const tomorrow = todayInLagos(new Date(now + 86_400_000));
  return day === today ? `Today, ${isoDayLabel(day)}` : day === tomorrow ? `Tomorrow, ${isoDayLabel(day)}` : isoDayLabel(day);
}

/** The farms' delivery days, asked once with the time the page opened. */
function useWindows(farmIds: string[], serviceAreaId?: string) {
  const [now] = useState(() => Date.now());
  // With the area, slots that are full there say so (W-23 "Full")
  const windows = useQuery(api.checkout.deliveryWindows, farmIds.length ? { farmIds, now, serviceAreaId } : "skip") as
    | DeliveryWindows
    | undefined;
  return { windows, now };
}

// ---------------------------------------------------------------------------
// W-23 Address and time

type AddressErrors = Partial<Record<"street" | "landmark" | "window", string>>;

function DeliveryDetails() {
  const router = useRouter();
  const { quote, lines, area } = useQuote("delivery");
  const farmIds = groupByFarm(lines).map((g) => g.farmId);
  const { windows, now } = useWindows(farmIds, area?.id);
  const { status } = useViewer();
  const saved = useQuery(api.addresses.list, status === "signed-in" ? {} : "skip") as SavedAddress[] | undefined;

  const [addr, setAddr] = useState<CheckoutDraft["address"]>(() => draft.get().address);
  const [win, setWin] = useState<CheckoutDraft["window"]>(() => draft.get().window);
  const [errors, setErrors] = useState<AddressErrors>({});
  const [showAll, setShowAll] = useState(false);
  const [pinNote, setPinNote] = useState<string | null>(
    addr.latitude !== undefined ? "Pin set to where you were when you tapped Adjust pin." : null,
  );
  const [locating, setLocating] = useState(false);
  const streetRef = useRef<HTMLInputElement>(null);
  const landmarkRef = useRef<HTMLInputElement>(null);

  // Signed in with a default address in this area and nothing typed yet: use it
  // (adjusted during render, once, when the saved addresses arrive).
  const [prefilled, setPrefilled] = useState(false);
  if (!prefilled && saved && area) {
    setPrefilled(true);
    const match = saved.find((a) => a.serviceAreaId === area.id && a.isDefault) ?? saved.find((a) => a.serviceAreaId === area.id);
    if (match && !addr.street) {
      const { latitude, longitude } = match;
      setAddr({ ...addr, street: match.street, landmark: match.landmark, note: addr.note || match.directions || "", latitude, longitude });
      if (latitude !== undefined) setPinNote("Pin set from your saved address.");
    }
  }

  // Every day the farms can make, with each slot open, full or too soon. A
  // backend without allDays sends open slots only; the rest show as unavailable.
  const days: Array<{ day: string; slots: SlotState[] }> =
    windows?.allDays ??
    (windows?.days ?? []).map((d) => ({
      day: d.day,
      slots: SLOTS.map((s) => ({ ...s, open: d.slots.some((x) => x.from === s.from && x.to === s.to) })),
    }));
  // A chosen window that's no longer open doesn't count.
  const chosen =
    win && (!windows || days.some((d) => d.day === win.day && d.slots.some((s) => s.open && s.from === win.from && s.to === win.to)))
      ? win
      : null;
  const pinAt =
    addr.latitude !== undefined && addr.longitude !== undefined
      ? { latitude: addr.latitude, longitude: addr.longitude }
      : quote?.area?.latitude !== undefined && quote.area.longitude !== undefined
        ? { latitude: quote.area.latitude, longitude: quote.area.longitude }
        : OWERRI;

  const set = (k: "street" | "landmark" | "note") => (e: { target: { value: string } }) => {
    setAddr((a) => ({ ...a, [k]: e.target.value }));
    if (k !== "note" && errors[k]) setErrors((x) => ({ ...x, [k]: undefined }));
  };

  const adjustPin = () => {
    if (!("geolocation" in navigator)) {
      setPinNote("Your browser can't share your location. The rider will use your address and landmark.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        setAddr((a) => ({ ...a, latitude: pos.coords.latitude, longitude: pos.coords.longitude }));
        setPinNote("Pin set to your current location.");
      },
      () => {
        setLocating(false);
        setPinNote("We couldn't get your location. The rider will use your address and landmark.");
      },
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const next: AddressErrors = {};
    if (!addr.street.trim()) next.street = "Enter your street address, e.g. 12 Wetheral Road.";
    if (!addr.landmark.trim()) next.landmark = "Add a landmark near you, so the rider finds you first time.";
    if (!chosen) next.window = "Choose when you'd like your order delivered.";
    setErrors(next);
    if (next.street) return streetRef.current?.focus();
    if (next.landmark) return landmarkRef.current?.focus();
    if (next.window) return document.getElementById("windows")?.focus();
    if (!area) return areaPicker.open();
    draft.patch({ address: { ...addr, street: addr.street.trim(), landmark: addr.landmark.trim() }, window: chosen });
    router.push(routes.checkoutReview);
  };

  const shown = showAll ? days : days.slice(0, 2);

  return (
    <CheckoutShell step={3} aside={<FarmsSummary lines={lines} quote={quote} fulfilment="delivery" />}>
      <div className="flex flex-col gap-5">
        <section className={`${checkoutCard} p-8 m:p-5`}>
          <h1 className={checkoutH1}>Where should we deliver?</h1>
          <p className="p mt-1.5">Add clear directions so our rider finds you first time.</p>
          <form id="address-form" noValidate onSubmit={submit} className="mt-6 flex flex-col gap-[18px]">
            <TextField
              ref={streetRef}
              label="Street address"
              autoComplete="street-address"
              placeholder="12 Wetheral Road"
              value={addr.street}
              onChange={set("street")}
              error={errors.street}
            />
            <div className="grid grid-cols-2 gap-3.5 m:grid-cols-1">
              <div>
                <TextField
                  label="Area"
                  readOnly
                  value={area ? `${area.name}, ${area.state}` : "Not chosen yet"}
                  className="[&_input]:bg-soft"
                  aria-describedby="change-area"
                />
                <span className="hint" id="change-area">
                  <button
                    type="button"
                    onClick={areaPicker.open}
                    className="inline-flex min-h-11 cursor-pointer items-center border-0 bg-transparent p-0 font-semibold text-forest"
                  >
                    {area ? "Change area" : "Choose your area"}
                  </button>
                </span>
              </div>
              <TextField
                ref={landmarkRef}
                label="Nearest landmark"
                placeholder="Opposite the filling station"
                value={addr.landmark}
                onChange={set("landmark")}
                error={errors.landmark}
              />
            </div>
            <div>
              <span className="lbl" id="pin-label">
                Pin on the map
              </span>
              <div className="relative">
                <div
                  role="group"
                  aria-labelledby="pin-label"
                  aria-describedby={pinNote ? "pin-note" : undefined}
                  className="relative isolate h-[180px] overflow-hidden rounded-[14px] bg-[#EEF2E8] shadow-[inset_0_0_0_1px_#DCE0D6]"
                >
                  <PinMap
                    at={pinAt}
                    label="Your drop-off point"
                    onMove={(p) => {
                      setAddr((a) => ({ ...a, ...p }));
                      setPinNote("Pin moved. The rider will come to this spot.");
                    }}
                  />
                </div>
                <Button variant="ghost" size="sm" loading={locating} onClick={adjustPin} className="absolute right-3 bottom-3 z-[500]">
                  Adjust pin
                </Button>
              </div>
              {pinNote ? (
                <span id="pin-note" className="hint">
                  {pinNote}
                </span>
              ) : null}
            </div>
            <TextArea
              label="Note for the rider"
              labelNote="(optional)"
              rows={2}
              placeholder="Blue gate. Call when you arrive."
              value={addr.note}
              maxLength={200}
              onChange={set("note")}
              className="[&_textarea]:h-20 [&_textarea]:min-h-20 [&_textarea]:resize-none"
            />
          </form>
        </section>

        <section aria-labelledby="when-title" className={`${checkoutCard} p-8 m:p-5`}>
          <h2 id="when-title" className="h3 text-lg leading-[26px]">
            When should we deliver?
          </h2>
          <p className="p mt-1 text-sm">
            {groupByFarm(lines).length > 1
              ? "Both orders arrive in the window you choose, once the farms accept."
              : "Your order arrives in the window you choose, once the farm accepts."}
          </p>
          <div id="windows" tabIndex={-1} className="mt-[18px] outline-none" aria-describedby={errors.window ? "window-error" : undefined}>
            {windows === undefined ? (
              <div className="grid grid-cols-3 gap-2.5">
                {[0, 1, 2].map((i) => (
                  <Skeleton key={i} className="h-[62px]" rounded={12} />
                ))}
              </div>
            ) : days.length === 0 ? (
              <p className="sm">
                The farms in your cart can&apos;t deliver in the next two weeks. Try pickup instead, or come back later.
              </p>
            ) : (
              shown.map((d, i) => (
                <fieldset key={d.day} className="m-0 border-0 p-0">
                  <legend className={`cap mb-2 font-semibold text-ink-3 ${i > 0 ? "mt-4" : ""}`}>{dayHeading(d.day, now)}</legend>
                  <div className="grid grid-cols-3 gap-2.5 m:grid-cols-1">
                    {/* Slots already too soon aren't shown, as in the design's "Today" row */}
                    {d.slots.filter((s) => s.reason !== "too_soon").map((s) => {
                      const open = s.open;
                      const on = chosen?.day === d.day && chosen.from === s.from && chosen.to === s.to;
                      return (
                        <button
                          key={s.from}
                          type="button"
                          aria-pressed={on}
                          aria-disabled={!open || undefined}
                          onClick={() => {
                            if (!open) return;
                            setWin({ day: d.day, from: s.from, to: s.to });
                            setErrors((x) => ({ ...x, window: undefined }));
                          }}
                          className={`flex min-h-11 flex-col gap-0.5 rounded-xl border-0 px-3.5 py-3 text-left text-ink ${
                            !open
                              ? "cursor-not-allowed bg-surface opacity-45 shadow-[inset_0_0_0_1px_#DCE0D6]"
                              : on
                                ? "cursor-pointer bg-[#F7FAF1] shadow-[inset_0_0_0_2px_var(--color-forest)]"
                                : "cursor-pointer bg-surface shadow-[inset_0_0_0_1px_#DCE0D6]"
                          }`}
                        >
                          <span className="text-sm font-semibold">{slotLabel(s)}</span>
                          <span className={`cap ${on ? "text-forest" : ""}`}>
                            {!open ? (s.reason === "full" ? "Full" : "Not available") : on ? "Selected" : "Available"}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </fieldset>
              ))
            )}
            {days.length > 2 && !showAll ? (
              <Button variant="link" size="sm" className="mt-2" onClick={() => setShowAll(true)}>
                Show later days
              </Button>
            ) : null}
            {errors.window ? (
              <span id="window-error" role="alert" className="field-error">
                {errors.window}
              </span>
            ) : null}
          </div>
          <StepActions back={routes.checkoutDelivery}>
            <Button type="submit" form="address-form" variant="lime" size="lg" className="min-h-[54px] min-w-[220px] px-6 m:min-w-0">
              Continue to review
            </Button>
          </StepActions>
        </section>
      </div>
    </CheckoutShell>
  );
}

// ---------------------------------------------------------------------------
// W-24 Pickup point

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

function PickupDetails() {
  const router = useRouter();
  const { quote, lines, area } = useQuote("pickup");
  const farmIds = groupByFarm(lines).map((g) => g.farmId);
  const { windows, now } = useWindows(farmIds);
  const lat = quote?.area?.latitude;
  const lng = quote?.area?.longitude;
  // farmIds and now give each point its own "Ready from" day
  const points = useQuery(
    api.checkout.pickupPoints,
    area ? { serviceAreaId: area.id, latitude: lat, longitude: lng, farmIds, now } : { farmIds, now },
  ) as CheckoutPickupPoint[] | undefined;
  const [chosen, setChosen] = useState<string | null>(() => draft.get().pickupPointId);
  const [error, setError] = useState<string | null>(null);
  const list = (points ?? []).slice(0, 8);
  // A backend without per-point days: the first day the farms can make.
  const readyFor = (p: CheckoutPickupPoint) => {
    const day = p.readyDay === undefined ? windows?.readyDay : p.readyDay;
    return day ? `Ready from ${isoDayLabel(day)}` : "";
  };

  const onKey = (e: KeyboardEvent) => {
    const i = list.findIndex((p) => p._id === chosen);
    const step = e.key === "ArrowDown" || e.key === "ArrowRight" ? 1 : e.key === "ArrowUp" || e.key === "ArrowLeft" ? -1 : 0;
    if (!step || list.length === 0) return;
    e.preventDefault();
    const next = list[(Math.max(i, 0) + step + list.length) % list.length]!;
    setChosen(next._id);
    document.getElementById(`pp-${next._id}`)?.focus();
  };

  const proceed = () => {
    if (!chosen) {
      setError("Choose a pickup point to continue.");
      return;
    }
    draft.patch({ pickupPointId: chosen });
    router.push(routes.checkoutReview);
  };

  // Pins labelled like the list: A, B, C…
  const located = list
    .map((p, i) => ({ id: p._id, letter: LETTERS[i]!, name: p.name, latitude: p.latitude, longitude: p.longitude }))
    .filter((p) => Number.isFinite(p.latitude) && Number.isFinite(p.longitude));

  return (
    <CheckoutShell step={3} pickup aside={<FarmsSummary lines={lines} quote={quote} fulfilment="pickup" />}>
      <section className={`${checkoutCard} p-8 m:p-5`}>
        <h1 className={checkoutH1}>Choose a pickup point</h1>
        <p className="p mt-1.5">
          {farmIds.length > 1 ? "Both orders will wait for you here." : "Your order will wait for you here."} Bring your
          pickup code, which we&apos;ll send when {farmIds.length > 1 ? "they're" : "it's"} ready.
        </p>
        <div
          role="group"
          aria-label={`Map of pickup points near ${area?.name ?? "you"}`}
          className="relative isolate mt-[22px] h-[220px] overflow-hidden rounded-2xl bg-[#EEF2E8] shadow-[inset_0_0_0_1px_#DCE0D6]"
        >
          {points === undefined ? (
            <Skeleton className="size-full" rounded={16} />
          ) : (
            <LetteredPointsMap
              points={located}
              selectedId={chosen}
              onSelect={(id) => {
                setChosen(id);
                setError(null);
              }}
            />
          )}
        </div>
        {points === undefined ? (
          <div className="mt-4 flex flex-col gap-2.5">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-[92px]" rounded={16} />
            ))}
          </div>
        ) : list.length === 0 ? (
          <p className="sm mt-4">
            There are no pickup points open near you yet. Go back and choose home delivery instead.
          </p>
        ) : (
          <div role="radiogroup" aria-label="Pickup points" onKeyDown={onKey} className="mt-4 flex flex-col gap-2.5">
            {list.map((p, i) => {
              const on = p._id === chosen;
              const hours = hoursSummary(p.hours)?.replace(/, /g, " ");
              const ready = readyFor(p);
              return (
                <button
                  key={p._id}
                  id={`pp-${p._id}`}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  tabIndex={on || (!chosen && i === 0) ? 0 : -1}
                  onClick={() => {
                    setChosen(p._id);
                    setError(null);
                  }}
                  className={`flex w-full cursor-pointer items-start gap-3.5 rounded-2xl border-0 p-4 text-left text-ink ${
                    on ? "bg-[#F7FAF1] shadow-[inset_0_0_0_2px_var(--color-forest)]" : "bg-surface shadow-[inset_0_0_0_1px_#DCE0D6]"
                  }`}
                >
                  <span
                    aria-hidden
                    className={`mt-px flex size-[22px] flex-none items-center justify-center rounded-full ${
                      on ? "shadow-[inset_0_0_0_1.5px_var(--color-forest)]" : "shadow-[inset_0_0_0_1.5px_var(--color-radio)]"
                    }`}
                  >
                    {on ? <span className="size-3 rounded-full bg-forest" /> : null}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex justify-between gap-3">
                      <span className="text-[15px] font-bold">
                        {LETTERS[i]} · {p.name}
                      </span>
                      {p.distanceKm !== null ? <span className="cap flex-none">{p.distanceKm} km</span> : null}
                    </span>
                    <span className="mt-[3px] block text-[13px] text-muted">
                      {[p.address, p.lga].filter(Boolean).join(", ")}
                    </span>
                    {hours || ready ? (
                      <span className="mt-1.5 block text-xs text-subtle">{[hours, ready].filter(Boolean).join(" · ")}</span>
                    ) : null}
                  </span>
                </button>
              );
            })}
          </div>
        )}
        {error ? (
          <p role="alert" className="field-error mt-4">
            <MapPin aria-hidden className="mr-1 inline size-3.5" />
            {error}
          </p>
        ) : null}
        <StepActions back={routes.checkoutDelivery}>
          <Button variant="lime" size="lg" className="min-h-[54px] min-w-[220px] px-6 m:min-w-0" onClick={proceed}>
            Continue to review
          </Button>
        </StepActions>
      </section>
    </CheckoutShell>
  );
}
