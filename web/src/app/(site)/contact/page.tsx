// W-86 Contact: chat, the support line (calls and WhatsApp), email and the contact form.
import { ArrowRight, CircleHelp, Clock, Mail, MapPin, MessageCircle, Phone, ShieldAlert } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ContactForm, ContactFormFromLink, SUPPORT_EMAIL } from "@/components/site/ContactForm";
import { Eyebrow, S, Tile, h3b } from "@/components/site/ui";
import { FadeUp } from "@/lib/motion";
import { routes } from "@/lib/routes";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Get help from Farmkeke support. Chat, call, WhatsApp or email us, Monday to Saturday, 8am to 8pm. We usually reply within a few hours.",
};

/** The support line (calls and WhatsApp). Set SUPPORT_PHONE_TEL to null to disable the call button. */
const SUPPORT_PHONE_LABEL = "+234 816 040 4686";
const SUPPORT_PHONE_TEL: string | null = "+2348160404686";

const cardBtn = "btn sm ghost mt-1 self-start px-4 m:mt-1.5 m:min-h-9 m:justify-self-start m:text-[13px]";
// Phones: icon on the left, everything else beside it
const contactCard =
  "flex flex-col gap-3 p-[26px] m:grid m:grid-cols-[auto_minmax(0,1fr)] m:gap-x-3.5 m:gap-y-1 m:p-4 m:[&>*:not(:first-child)]:col-start-2 m:[&>:first-child]:row-span-5";

export default function ContactPage() {
  return (
    <div className="wrap-site pt-14 m:pt-8">
      <FadeUp>
        <div className="max-w-[680px]">
          <Eyebrow icon={Mail}>Contact</Eyebrow>
          <h1 className="mt-3.5 font-display text-[44px] leading-[52px] font-extrabold tracking-[-0.03em] m:mt-3 m:text-[30px] m:leading-[37px]">
            We&apos;re here to help
          </h1>
          <p className="m-0 mt-2.5 text-lg leading-[29px] text-muted m:mt-2 m:text-[15px] m:leading-[23px]">
            Support is open Monday to Saturday, 8am to 8pm. We usually reply within a few hours.
          </p>
        </div>
        <div className="mt-9 grid grid-cols-3 gap-5 m:mt-6 m:grid-cols-1 m:gap-2.5">
          <div className={`${S.card} ${contactCard}`}>
            <Tile icon={MessageCircle} />
            <h2 className={`${h3b} text-[17px] leading-[25px] m:text-[15px] m:leading-[21px]`}>Chat with us</h2>
            <p className="m-0 text-sm leading-6 text-muted m:text-[13px] m:leading-5">The fastest way to get help with an order.</p>
            <div className="text-[15px] font-semibold m:text-sm">In the app or on your order page</div>
            <Link href={routes.myOrders} className={cardBtn}>
              <MessageCircle aria-hidden size={16} strokeWidth={2} />
              Start a chat
            </Link>
          </div>
          <div className={`${S.card} ${contactCard}`}>
            <Tile icon={Phone} />
            <h2 className={`${h3b} text-[17px] leading-[25px] m:text-[15px] m:leading-[21px]`}>Call or WhatsApp</h2>
            <p className="m-0 text-sm leading-6 text-muted m:text-[13px] m:leading-5">Speak to someone on our support team.</p>
            <div className="text-[15px] font-semibold m:text-sm">{SUPPORT_PHONE_LABEL}</div>
            {SUPPORT_PHONE_TEL ? (
              <a href={`tel:${SUPPORT_PHONE_TEL}`} className={cardBtn}>
                <Phone aria-hidden size={16} strokeWidth={2} />
                Call support
              </a>
            ) : (
              <span className={cardBtn} aria-disabled="true">
                <Phone aria-hidden size={16} strokeWidth={2} />
                Call support
              </span>
            )}
          </div>
          <div className={`${S.card} ${contactCard}`}>
            <Tile icon={Mail} />
            <h2 className={`${h3b} text-[17px] leading-[25px] m:text-[15px] m:leading-[21px]`}>Email</h2>
            <p className="m-0 text-sm leading-6 text-muted m:text-[13px] m:leading-5">For anything that is not urgent, or to send documents.</p>
            <div className="text-[15px] font-semibold break-all m:text-sm">{SUPPORT_EMAIL}</div>
            <a href={`mailto:${SUPPORT_EMAIL}`} className={cardBtn}>
              <Mail aria-hidden size={16} strokeWidth={2} />
              Send an email
            </a>
          </div>
        </div>
      </FadeUp>

      <FadeUp className="mt-6 grid grid-cols-[minmax(0,7fr)_minmax(0,5fr)] items-start gap-6 m:mt-3 m:grid-cols-1 m:gap-3">
        <Suspense fallback={<ContactForm />}>
          <ContactFormFromLink />
        </Suspense>
        <aside className="flex flex-col gap-4 m:gap-3">
          <div className={`${S.card} p-[26px] m:p-4`}>
            <h2 className={`${h3b} text-[17px] leading-[25px] m:text-[15px] m:leading-[21px]`}>Office</h2>
            <ul className="m-0 mt-3.5 flex list-none flex-col gap-3 p-0 text-sm text-ink-3 m:mt-2.5 m:gap-2.5 m:text-[13px]">
              <li className="flex gap-2.5">
                <MapPin aria-hidden size={18} strokeWidth={2} className="flex-none text-forest" />
                <span>Owerri, Imo State, Nigeria</span>
              </li>
              <li className="flex gap-2.5">
                <Clock aria-hidden size={18} strokeWidth={2} className="flex-none text-forest" />
                <span>Monday to Saturday, 8am to 8pm</span>
              </li>
              <li className="flex gap-2.5">
                <Mail aria-hidden size={18} strokeWidth={2} className="flex-none text-forest" />
                <span>
                  <a href="mailto:info@farmkeke.com">info@farmkeke.com</a> for partnerships and press
                </span>
              </li>
            </ul>
          </div>
          <div className={`${S.card} flex gap-3.5 p-[26px] m:gap-3 m:p-4`}>
            <Tile icon={CircleHelp} size={40} iconSize={20} />
            <div>
              <h2 className="m-0 text-[15px] font-semibold">Quick answers</h2>
              <p className="m-0 mt-0.5 text-sm leading-6 text-muted m:text-[13px] m:leading-5">Many questions are answered in our help centre.</p>
              <Link href={routes.help} className="mt-2 inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold m:mt-0.5 m:min-h-10 m:text-[13px]">
                Visit help and FAQ
                <ArrowRight aria-hidden size={16} strokeWidth={2} />
              </Link>
            </div>
          </div>
          <div className="flex gap-3 rounded-2xl bg-pend-bg px-5 py-[18px] text-[13px] leading-[19px] text-[#5E3E08] m:px-4 m:py-3.5 m:text-xs m:leading-[18px]">
            <ShieldAlert aria-hidden size={18} strokeWidth={2} className="flex-none text-pend" />
            <span>Farmkeke staff will never ask for your card PIN, password or a one-time code.</span>
          </div>
        </aside>
      </FadeUp>
    </div>
  );
}
