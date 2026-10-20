"use client";

// W-23 Address (home delivery) or W-24 Pickup at the farm, depending on the
// choice made in W-22. Delivery has no time slot: the shopper can say when
// suits them in the note, and staff agree the time with the rider when they
// price the delivery. The bill comes by email and text, so guests give an
// email here if they didn't at the contact step.
import { useQuery } from "convex/react";
import { Mail, MapPin, Receipt, Truck } from "lucide-react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";
import { groupByFarm, useQuote } from "@/components/cart/parts";
import { draft, looksLikeEmail, type CheckoutDraft } from "@/components/checkout/draft";
import {
  CheckoutShell,
  CheckoutSkeleton,
  checkoutCard,
  checkoutH1,
  FarmsSummary,
  StepActions,
  useCheckoutGuard,
} from "@/components/checkout/Shell";
import { hoursSummary } from "@/components/orders/format";
import { Button } from "@/components/ui/Button";
import { TextArea, TextField } from "@/components/ui/Field";
import { Skeleton } from "@/components/ui/Skeleton";
import { api } from "@/convex/api";
import type { SavedAddress } from "@/convex/returns/account";
import { areaPicker } from "@/lib/area";
import { useViewer } from "@/lib/auth";
import { naira } from "@/lib/format";
import { routes } from "@/lib/routes";

// Real OpenStreetMap maps, loaded in the browser only (Leaflet needs window).
const PinMap = dynamic(() => import("@/components/maps/PinMap"), {
  ssr: false,
  loading: () => <Skeleton className="size-full" rounded={14} />,
});
/** Owerri, until the area or the shopper gives a better place for the pin. */
const OWERRI = { latitude: 5.4836, longitude: 7.0333 };

export function DetailsStep() {
  const ready = useCheckoutGuard(3);
  const d = draft.use();
  if (!ready) return <CheckoutSkeleton />;
  return d.fulfilment === "pickup" ? <PickupDetails /> : <DeliveryDetails />;
}

// ---------------------------------------------------------------------------
// W-23 Address

type AddressErrors = Partial<Record<"street" | "landmark" | "email", string>>;

const BILL_STEPS = [
  { icon: Truck, title: "The farm accepts", body: "Farms have up to 24 hours. They start packing straight away." },
  { icon: Receipt, title: "We send your bill", body: "Products plus delivery, once a rider is arranged. By email, text and in the app." },
  { icon: Mail, title: "You pay within 12 hours", body: "Then the rider brings your order. Your money is held until you confirm." },
];

function DeliveryDetails() {
  const router = useRouter();
  const { quote, lines, area } = useQuote("delivery");
  const { status } = useViewer();
  const saved = useQuery(api.addresses.list, status === "signed-in" ? {} : "skip") as SavedAddress[] | undefined;

  const [addr, setAddr] = useState<CheckoutDraft["address"]>(() => draft.get().address);
  // Signed-in shoppers get the bill at their account email; guests need to give one
  const [email, setEmail] = useState(() => draft.get().contact.email);
  const needsEmail = status !== "signed-in" && !draft.get().contact.email.trim();
  const [errors, setErrors] = useState<AddressErrors>({});
  const [pinNote, setPinNote] = useState<string | null>(
    addr.latitude !== undefined ? "Pin set to where you were when you tapped Adjust pin." : null,
  );
  const [locating, setLocating] = useState(false);
  const streetRef = useRef<HTMLInputElement>(null);
  const landmarkRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);

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
    if (needsEmail && !looksLikeEmail(email)) next.email = "Add your email so we can send your bill, e.g. ada@example.com.";
    setErrors(next);
    if (next.street) return streetRef.current?.focus();
    if (next.landmark) return landmarkRef.current?.focus();
    if (next.email) return emailRef.current?.focus();
    if (!area) return areaPicker.open();
    const d = draft.get();
    draft.patch({
      address: { ...addr, street: addr.street.trim(), landmark: addr.landmark.trim() },
      ...(needsEmail ? { contact: { ...d.contact, email: email.trim() } } : {}),
    });
    router.push(routes.checkoutReview);
  };

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
              placeholder="Blue gate. Call when you arrive. Best after 4pm."
              value={addr.note}
              maxLength={200}
              onChange={set("note")}
              className="[&_textarea]:h-20 [&_textarea]:min-h-20 [&_textarea]:resize-none"
            />
          </form>
        </section>

        <section aria-labelledby="bill-title" className={`${checkoutCard} p-8 m:p-5`}>
          <h2 id="bill-title" className="h3 text-lg leading-[26px]">
            How you&apos;ll pay
          </h2>
          <p className="p mt-1 text-sm">
            Nothing to pay now. Products come to <strong className="text-ink">{naira(quote?.itemsTotalKobo ?? 0)}</strong>; delivery is
            priced for your address once a rider is arranged.
          </p>
          <ol className="m-0 mt-[18px] grid list-none grid-cols-3 gap-3 p-0 m:grid-cols-1">
            {BILL_STEPS.map(({ icon: Icon, title, body }) => (
              <li key={title} className="rounded-[14px] bg-soft p-3.5">
                <Icon aria-hidden className="size-5 text-forest" strokeWidth={1.75} />
                <div className="mt-1.5 text-sm font-semibold">{title}</div>
                <div className="cap mt-0.5">{body}</div>
              </li>
            ))}
          </ol>
          {needsEmail ? (
            <div className="mt-[18px]">
              <TextField
                ref={emailRef}
                form="address-form"
                label="Email for your bill"
                type="email"
                autoComplete="email"
                placeholder="ada@example.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (errors.email) setErrors((x) => ({ ...x, email: undefined }));
                }}
                error={errors.email}
                hint="We'll also text it to your phone."
              />
            </div>
          ) : null}
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
// W-24 Pickup at the farm

function PickupDetails() {
  const router = useRouter();
  const { quote, lines } = useQuote("pickup");
  const farms = groupByFarm(lines);
  const quoted = new Map((quote?.farms ?? []).map((f) => [f.farmId, f]));

  return (
    <CheckoutShell step={3} pickup aside={<FarmsSummary lines={lines} quote={quote} fulfilment="pickup" />}>
      <section className={`${checkoutCard} p-8 m:p-5`}>
        <h1 className={checkoutH1}>Collect from the {farms.length > 1 ? "farms" : "farm"}</h1>
        <p className="p mt-1.5">
          You pay now. When {farms.length > 1 ? "each order is" : "your order is"} ready, we send the farm&apos;s address and your
          4-digit pickup code. Show the code at the farm. You have 3 days to collect.
        </p>
        <ul className="m-0 mt-[22px] flex list-none flex-col gap-2.5 p-0">
          {farms.map((g) => {
            const f = quoted.get(g.farmId);
            const hours = f?.collectionHours ? hoursSummary(f.collectionHours) : undefined;
            return (
              <li key={g.farmId} className="flex items-start gap-3.5 rounded-2xl bg-surface p-4 shadow-[inset_0_0_0_1px_#DCE0D6]">
                <span aria-hidden className="tile size-10 flex-none rounded-xl">
                  <MapPin className="size-5" strokeWidth={1.75} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] font-bold">{g.farmName}</span>
                  {quote === undefined ? (
                    <Skeleton className="mt-1.5 h-4 w-48" />
                  ) : (
                    <span className="mt-[3px] block text-[13px] text-muted">{f?.collectionArea ?? ""}</span>
                  )}
                  {hours ? <span className="mt-1 block text-xs text-subtle">Hands over orders: {hours}</span> : null}
                </span>
              </li>
            );
          })}
        </ul>
        <StepActions back={routes.checkoutDelivery}>
          <Button variant="lime" size="lg" className="min-h-[54px] min-w-[220px] px-6 m:min-w-0" onClick={() => router.push(routes.checkoutReview)}>
            Continue to review
          </Button>
        </StepActions>
      </section>
    </CheckoutShell>
  );
}
