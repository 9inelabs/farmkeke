"use client";

// Shop header (W-01 and every shop, cart, account and order page):
// wordmark · "Deliver to" area · search · Saved · Sign in/account · Cart,
// then the category bar. Icons always sit next to a text label.
import { ChevronDown, Heart, MapPin, Search, ShoppingCart, User } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState, type FormEvent } from "react";
import { HomeLogo } from "@/components/brand/Wordmark";
import { area, areaPicker } from "@/lib/area";
import { miniCart, useCart } from "@/lib/cart";
import { useViewer } from "@/lib/auth";
import { initials } from "@/lib/format";
import { m, pressable } from "@/lib/motion";
import { routes } from "@/lib/routes";

const hlink =
  "inline-flex min-h-11 items-center gap-2 rounded-full px-3 text-sm font-medium whitespace-nowrap text-white/85 hover:bg-white/8 hover:text-white";

export function ShopHeader() {
  return (
    <header className="shop-header dark-bar on-dark">
      <div className="wrap flex h-[76px] items-center gap-4 m:h-auto m:flex-wrap m:gap-x-2 m:gap-y-2 m:pt-2.5 m:pb-3">
        <HomeLogo height={22} tone="light" />
        <AreaChip />
        <Suspense fallback={<SearchBox initial="" />}>
          <SearchFromUrl />
        </Suspense>
        <Link href={routes.saved} className={`${hlink} m:hidden`}>
          <Heart aria-hidden className="size-5" strokeWidth={1.75} />
          Saved
        </Link>
        <AccountLink />
        <CartButton />
      </div>
    </header>
  );
}

function AreaChip() {
  const chosen = area.use();
  return (
    <button
      type="button"
      onClick={areaPicker.open}
      className="inline-flex h-[46px] cursor-pointer items-center gap-2 rounded-full bg-white/6 px-4 text-left text-sm whitespace-nowrap text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.16)] hover:bg-white/10 m:order-4 m:h-10 m:w-full m:px-3.5 m:text-[13px]"
      aria-haspopup="dialog"
    >
      <MapPin aria-hidden className="size-[18px] text-lime m:size-4" strokeWidth={1.75} />
      <span className="m:flex m:gap-1.5">
        <span className="block text-[11px] leading-3 text-white/60 m:text-xs m:leading-4">Deliver to</span>
        <span className="font-semibold">{chosen ? chosen.name : "Choose your area"}</span>
      </span>
      <ChevronDown aria-hidden className="size-4 m:ml-auto" />
    </button>
  );
}

function SearchFromUrl() {
  const params = useSearchParams();
  const pathname = usePathname();
  const initial = pathname.startsWith("/shop/search") ? (params.get("q") ?? "") : "";
  return <SearchBox key={initial} initial={initial} />;
}

function SearchBox({ initial }: { initial: string }) {
  const router = useRouter();
  const [text, setText] = useState(initial);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const q = text.trim();
    if (q) router.push(routes.search(q));
  };
  return (
    <form
      role="search"
      onSubmit={submit}
      className="flex h-[46px] flex-1 items-center gap-2.5 rounded-full bg-surface pr-1.5 pl-4 text-sm text-faint focus-within:shadow-[0_0_0_3px_rgba(169,214,84,0.6)] m:order-3 m:h-11 m:min-w-0 m:basis-full m:gap-2 m:pl-3.5 m:text-base"
    >
      <Search aria-hidden className="size-[18px] flex-none" />
      <input
        type="search"
        name="q"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Search tomatoes, yam, eggs or a farm"
        aria-label="Search Farmkeke"
        enterKeyHint="search"
        className="min-w-0 flex-1 border-0 bg-transparent text-ink outline-none placeholder:text-faint"
      />
      <m.button type="submit" className="btn sm dark min-h-9 m:min-h-8 m:px-3 m:text-[13px]" {...pressable}>
        Search
      </m.button>
    </form>
  );
}

function AccountLink() {
  const { status, viewer } = useViewer();
  if (status === "signed-in" && viewer) {
    const name = viewer.name?.split(" ")[0] || "Account";
    return (
      <Link href={routes.account} className={`${hlink} bg-white/8 m:ml-auto`}>
        <span
          aria-hidden
          className="flex size-[30px] items-center justify-center rounded-full bg-lime-soft text-xs font-bold text-forest"
        >
          {initials(viewer.name || viewer.email || "You")}
        </span>
        {name}
      </Link>
    );
  }
  return (
    <Link href={routes.signIn()} className={`${hlink} m:ml-auto`}>
      <User aria-hidden className="size-5" strokeWidth={1.75} />
      Sign in
    </Link>
  );
}

function CartButton() {
  const { count } = useCart();
  return (
    <m.button
      type="button"
      onClick={miniCart.open}
      className={`${hlink} cursor-pointer bg-white/8`}
      aria-haspopup="dialog"
      {...pressable}
    >
      <ShoppingCart aria-hidden className="size-5" strokeWidth={1.75} />
      Cart
      {count > 0 ? (
        <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-lime px-1.5 text-[11px] font-bold text-ink">
          {count}
          <span className="sr-only"> {count === 1 ? "item" : "items"}</span>
        </span>
      ) : null}
    </m.button>
  );
}
