"use client";

// Admin → Messages → New message (design approved 30 Oct 2026): who gets it,
// what kind, the words and where tapping it goes, and when. Sent only in the
// app's Notifications and as a push alert. The preview shows it as a phone
// would, and "Who it reaches" counts the audience live before anything goes.
import { useMutation, useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { adminError, FormError } from "@/components/admin/errors";
import { adminRoutes } from "@/components/admin/routes";
import { ConfirmDialog, Notice, PageHeader } from "@/components/admin/ui";
import { Button } from "@/components/ui/Button";
import { SelectField, TextArea, TextField } from "@/components/ui/Field";
import { admin } from "@/convex/admin";
import type { MessageLinkTo, MessageReach, MessageSide } from "@/convex/returns/adminMessages";

const TITLE_MAX = 60;
const BODY_MAX = 200;

const SHOP_LINKS: { value: MessageLinkTo; label: string }[] = [
  { value: "message", label: "The message itself" },
  { value: "home", label: "Home" },
  { value: "orders", label: "Their orders" },
  { value: "product", label: "A product" },
  { value: "farm", label: "A farm" },
  { value: "category", label: "A category" },
];
const FARM_LINKS: { value: MessageLinkTo; label: string }[] = [
  { value: "message", label: "The message itself" },
  { value: "dashboard", label: "Their dashboard" },
  { value: "listings", label: "Their products" },
  { value: "sales", label: "Their orders" },
  { value: "earnings", label: "Their earnings" },
];

const WHO: Record<MessageSide, string> = { shop: "shoppers", farm: "farmers", both: "shoppers and farmers" };

function Section({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4 rounded-[14px] border border-line bg-surface p-5 m:p-4">
      <h2 className="m-0 font-display text-[17px] leading-6 font-bold">
        {n}. {title}
      </h2>
      {children}
    </section>
  );
}

function Choice({ on, onClick, children }: { on: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" className="chip" aria-pressed={on} onClick={onClick}>
      {children}
    </button>
  );
}

function KindCard({ on, onClick, title, note }: { on: boolean; onClick: () => void; title: string; note: string }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={`flex flex-col gap-1 rounded-[14px] p-3.5 text-left ${on ? "border-[1.5px] border-forest bg-tint" : "border border-line bg-surface hover:bg-soft"}`}
    >
      <span className="text-sm font-semibold text-ink">{title}</span>
      <span className="text-xs leading-4 text-muted">{note}</span>
    </button>
  );
}

const count = (n: number, capped: boolean) => `${n.toLocaleString("en-NG")}${capped ? "+" : ""}`;

export function NewMessageView() {
  const router = useRouter();
  const send = useMutation(admin.messages.send);
  const sendTest = useMutation(admin.messages.sendTest);
  const categories = useQuery(admin.catalog.listAllCategories, {}) as { slug: string; name: string; hidden: boolean }[] | undefined;

  const [side, setSide] = useState<MessageSide>("shop");
  const [audience, setAudience] = useState<"everyone" | "one">("everyone");
  const [contact, setContact] = useState("");
  const [kind, setKind] = useState<"update" | "offer">("update");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [linkTo, setLinkTo] = useState<MessageLinkTo>("message");
  const [linkId, setLinkId] = useState("");
  const [when, setWhen] = useState<"now" | "later">("now");
  const [sendAt, setSendAt] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [testNote, setTestNote] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);
  const [reviewing, setReviewing] = useState(false);

  const reach = useQuery(admin.messages.reach, {
    side,
    audience,
    ...(audience === "one" ? { contact } : {}),
  }) as MessageReach | undefined;

  const links = side === "farm" ? FARM_LINKS : side === "both" ? SHOP_LINKS.slice(0, 1) : SHOP_LINKS;
  const needsId = linkTo === "product" || linkTo === "farm" || linkTo === "category";

  const pickSide = (s: MessageSide) => {
    setSide(s);
    if (s === "both") setAudience("everyone");
    // A link from the other app doesn't fit
    setLinkTo("message");
    setLinkId("");
  };

  /** The message as the backend takes it; throws a FormError for what's missing. */
  const draft = () => {
    if (!title.trim() || !body.trim()) throw new FormError("Add a title and a message.");
    if (title.trim().length > TITLE_MAX || body.trim().length > BODY_MAX) throw new FormError("Keep the title to 60 characters and the message to 200.");
    if (audience === "one" && !contact.trim()) throw new FormError("Enter the person's phone number or email.");
    if (needsId && !linkId.trim()) throw new FormError(linkTo === "category" ? "Choose the category." : `Paste the ${linkTo}'s ID.`);
    return {
      side,
      audience,
      ...(audience === "one" ? { contact: contact.trim() } : {}),
      kind,
      title: title.trim(),
      body: body.trim(),
      link: needsId ? { to: linkTo, id: linkId.trim() } : { to: linkTo },
    };
  };

  const scheduledAt = () => {
    if (when === "now") return undefined;
    const at = new Date(sendAt).getTime();
    if (!sendAt || Number.isNaN(at)) throw new FormError("Choose the date and time to send it.");
    if (at < Date.now() + 2 * 60_000) throw new FormError("Choose a time at least a few minutes from now.");
    return at;
  };

  const review = () => {
    setError(null);
    try {
      draft();
      scheduledAt();
      if (audience === "one" && reach !== undefined && reach.person === null) throw new FormError("No account matches that phone number or email.");
      setReviewing(true);
    } catch (e) {
      setError(adminError(e));
    }
  };

  const test = async () => {
    setError(null);
    setTestNote(null);
    setTesting(true);
    try {
      await sendTest(draft());
      setTestNote("Sent to your own account. Open the Farmkeke app signed in as you to see it.");
    } catch (e) {
      setError(adminError(e));
    } finally {
      setTesting(false);
    }
  };

  const people = reach ? count(reach.people, reach.capped) : "…";
  const later = when === "later";

  return (
    <>
      <PageHeader
        back={{ href: adminRoutes.messages, label: "Messages" }}
        title="New message"
        description="It lands in the app's Notifications, and as a push alert on phones that allow it."
      />

      <div className="flex flex-wrap items-start gap-6">
        <div className="flex min-w-0 flex-[999_1_520px] flex-col gap-4">
          <Section n={1} title="Who gets it">
            <div role="group" aria-label="Send to" className="flex flex-wrap gap-2">
              <Choice on={side === "shop"} onClick={() => pickSide("shop")}>
                Shoppers
              </Choice>
              <Choice on={side === "farm"} onClick={() => pickSide("farm")}>
                Farmers
              </Choice>
              <Choice on={side === "both"} onClick={() => pickSide("both")}>
                Shoppers and farmers
              </Choice>
            </div>
            <SelectField label={side === "farm" ? "Which farmers" : side === "both" ? "Who" : "Which shoppers"} value={audience} onChange={(e) => setAudience(e.target.value as "everyone" | "one")} disabled={side === "both"}>
              <option value="everyone">Everyone</option>
              {side !== "both" ? <option value="one">One person (phone number or email)</option> : null}
            </SelectField>
            {audience === "one" ? (
              <TextField
                label="Their phone number or email"
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                placeholder="0803 123 4567 or ada@example.com"
                hint={
                  !contact.trim()
                    ? undefined
                    : reach?.person
                      ? `Found: ${[reach.person.name, reach.person.phone ?? reach.person.email].filter(Boolean).join(" · ")}`
                      : reach
                        ? side === "farm"
                          ? "No farmer has that phone number or email."
                          : "No account has that phone number or email."
                        : "Looking…"
                }
              />
            ) : null}
          </Section>

          <Section n={2} title="What kind of message">
            <div className="grid grid-cols-[repeat(2,minmax(0,1fr))] gap-3 m:grid-cols-1">
              <KindCard
                on={kind === "update"}
                onClick={() => setKind("update")}
                title="Service update"
                note="Something people need to know: delivery paused, new hours, a holiday. Pushes to everyone in the audience."
              />
              <KindCard
                on={kind === "offer"}
                onClick={() => setKind("offer")}
                title="Offer or news"
                note={`Seasonal produce, promotions, tips. Everyone sees it in the app; only people who turned on ${side === "farm" ? "Farmkeke news" : side === "both" ? "offers or Farmkeke news" : "Offers and news"} get a push.`}
              />
            </div>
          </Section>

          <Section n={3} title="The message">
            <TextField label="Title" value={title} maxLength={TITLE_MAX} onChange={(e) => setTitle(e.target.value)} placeholder="No deliveries on Monday 2 November" hint={`${title.length} / ${TITLE_MAX}`} />
            <TextArea
              label="Message"
              value={body}
              maxLength={BODY_MAX}
              rows={3}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Our riders are off for the public holiday. Orders placed on Monday are delivered on Tuesday."
              hint={`${body.length} / ${BODY_MAX}`}
            />
            <SelectField
              label="When they tap it, open"
              value={linkTo}
              onChange={(e) => {
                setLinkTo(e.target.value as MessageLinkTo);
                setLinkId("");
              }}
              disabled={side === "both"}
              hint={side === "both" ? "A message to shoppers and farmers opens the message itself." : undefined}
            >
              {links.map((l) => (
                <option key={l.value} value={l.value}>
                  {l.label}
                </option>
              ))}
            </SelectField>
            {linkTo === "category" ? (
              <SelectField label="Category" value={linkId} onChange={(e) => setLinkId(e.target.value)}>
                <option value="">Choose a category</option>
                {(categories ?? [])
                  .filter((c) => !c.hidden)
                  .map((c) => (
                    <option key={c.slug} value={c.slug}>
                      {c.name}
                    </option>
                  ))}
              </SelectField>
            ) : needsId ? (
              <TextField
                label={linkTo === "product" ? "Product ID" : "Farm ID"}
                value={linkId}
                onChange={(e) => setLinkId(e.target.value)}
                hint={`Open the ${linkTo} in the Admin Portal and copy the last part of the page address.`}
              />
            ) : null}
          </Section>

          <Section n={4} title="How it's sent">
            <ul className="m-0 flex list-none flex-col gap-2 p-0 text-sm">
              <li>
                <span className="font-semibold">In-app Notifications</span> · always
              </li>
              <li>
                <span className="font-semibold">Push alert</span> · to phones that allow notifications
              </li>
            </ul>
            <div className="h-px bg-line-soft" />
            <div role="group" aria-label="When" className="flex flex-wrap gap-2">
              <Choice on={when === "now"} onClick={() => setWhen("now")}>
                Send now
              </Choice>
              <Choice on={later} onClick={() => setWhen("later")}>
                Schedule
              </Choice>
            </div>
            {later ? <TextField label="Send on" type="datetime-local" value={sendAt} onChange={(e) => setSendAt(e.target.value)} hint="Lagos time. Up to 30 days ahead." /> : null}
          </Section>
        </div>

        <aside className="sticky top-6 flex max-w-[380px] flex-[1_1_340px] flex-col gap-4 m:static m:max-w-none">
          <section className="flex flex-col gap-3.5 rounded-[14px] border border-line bg-surface p-5">
            <div className="text-xs font-semibold tracking-[0.06em] text-muted">PREVIEW ON A PHONE</div>
            <div className="rounded-[20px] bg-forest p-4">
              <div className="flex gap-2.5 rounded-2xl bg-white/95 p-3">
                <div aria-hidden className="flex size-9 flex-none items-center justify-center rounded-[9px] bg-lime font-display text-sm font-extrabold text-forest">
                  fk
                </div>
                <div className="min-w-0">
                  <div className="flex justify-between gap-2 text-xs text-ink-3">
                    <span className="font-semibold">FARMKEKE</span>
                    <span>now</span>
                  </div>
                  <div className="mt-0.5 text-sm font-semibold text-ink">{title.trim() || "Your title"}</div>
                  <div className="line-clamp-2 text-sm leading-5 text-ink-3">{body.trim() || "Your message shows here."}</div>
                </div>
              </div>
            </div>
            <p className="m-0 text-xs leading-4 text-muted">Phones cut long messages short. The full text shows in Notifications.</p>
          </section>

          <section className="flex flex-col gap-2.5 rounded-[14px] border border-line bg-surface p-5">
            <div className="text-xs font-semibold tracking-[0.06em] text-muted">WHO IT REACHES</div>
            <div className="flex justify-between text-sm">
              <span>{audience === "one" ? "One person" : `All ${WHO[side]}`}</span>
              <span className="font-display font-extrabold text-forest">{people}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>With push alerts on a phone</span>
              <span className="font-display font-extrabold text-forest">{reach ? count(reach.withPush, reach.capped) : "…"}</span>
            </div>
            <p className="m-0 mt-1 text-xs leading-4 text-muted">
              {kind === "offer" ? "Offers only push to people who turned them on, so fewer phones may buzz." : "Counted live from the audience you chose."}
            </p>
          </section>

          {testNote ? <Notice tone="ok">{testNote}</Notice> : null}
          {error ? <Notice tone="err">{error}</Notice> : null}
          <Button variant="ghost" size="lg" fullWidth loading={testing} onClick={() => void test()}>
            Send a test to my phone
          </Button>
          <Button variant="dark" size="lg" fullWidth onClick={review}>
            Review and send
          </Button>
          <p className="m-0 text-center text-xs leading-4 text-muted">You confirm the number of people before it goes. Every message is logged with who sent it.</p>
        </aside>
      </div>

      <ConfirmDialog
        open={reviewing}
        onClose={() => setReviewing(false)}
        title={later ? "Schedule this message?" : "Send this message?"}
        description={
          audience === "one"
            ? `"${title.trim()}" goes to ${reach?.person?.name ?? "this person"}${later ? " at the time you chose" : " now"}.`
            : `"${title.trim()}" goes to ${people} ${WHO[side]}${later ? " at the time you chose" : " now"}. A push alert can't be taken back once it's shown.`
        }
        confirmLabel={later ? "Schedule" : audience === "one" ? "Send" : `Send to ${people}`}
        onConfirm={async () => {
          await send({ ...draft(), sendAt: scheduledAt() });
          router.push(adminRoutes.messages);
        }}
      />
    </>
  );
}
