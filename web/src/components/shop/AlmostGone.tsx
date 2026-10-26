// W-01 "Almost Gone": products with 3 or fewer left, drawn unlike the other
// rows so it reads as urgent. A warm panel with a timer badge, and wide
// cards that say how many are left with a draining bar.
import { Sprout, Timer } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { HomeSection } from "@/convex/returns/storefront";
import { naira, tintFor } from "@/lib/format";
import { routes } from "@/lib/routes";

const MAX_LEFT = 3;

export function AlmostGone({ row }: { row: HomeSection }) {
  return (
    <section className="mt-14 rounded-3xl border border-[#FBD9C9] bg-[#FFF2EB] p-6 m:mt-9 m:rounded-[20px] m:p-4" aria-labelledby="almost-gone-title">
      <div className="mb-5 flex items-center gap-3 m:mb-3.5">
        <span className="grid size-10 flex-none place-items-center rounded-full bg-[#D23A1F] text-white m:size-8">
          <Timer aria-hidden className="size-5 m:size-4" strokeWidth={2} />
        </span>
        <div>
          <h2 className="h2" id="almost-gone-title">
            {row.title}
          </h2>
          <p className="sm mt-0.5 font-medium text-[#D23A1F]">Selling out fast. Grab them before they&apos;re gone</p>
        </div>
      </div>
      <ul className="m-swipe m-0 grid list-none grid-cols-4 gap-4 p-0 [--swipe-w:78%] m:!gap-2.5 max-[1100px]:grid-cols-3">
        {row.items.map((p) => {
          const left = p.left ?? 1;
          return (
            <li key={p.id} className="flex">
              <Link href={routes.product(p.id)} className="flex w-full items-center gap-3 rounded-2xl bg-white p-3 text-ink hover:text-ink hover:shadow-[0_6px_18px_rgba(210,58,31,0.12)]">
                <span className="relative size-[72px] flex-none overflow-hidden rounded-xl" style={{ background: tintFor(p.id) }}>
                  {p.imageUrl ? (
                    <Image src={p.imageUrl} alt="" fill sizes="72px" className="object-cover" />
                  ) : (
                    <Sprout aria-hidden className="absolute top-1/2 left-1/2 size-7 -translate-1/2 text-[rgba(30,59,22,0.32)]" strokeWidth={1.3} />
                  )}
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="truncate text-sm font-semibold">{p.name}</span>
                  <span className="text-[13px] text-muted">
                    <span className="font-bold text-forest">{naira(p.priceKobo)}</span> / {p.unit}
                  </span>
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-[#D23A1F]">
                    <span aria-hidden className="size-1.5 rounded-full bg-[#D23A1F]" />
                    {left === 1 ? "Last one!" : `Only ${left} left`}
                  </span>
                  <span aria-hidden className="h-1 overflow-hidden rounded-full bg-[#F6DDD3]">
                    <span className="block h-1 rounded-full bg-[#D23A1F]" style={{ width: `${Math.max(12, (Math.min(left, MAX_LEFT) / MAX_LEFT) * 100)}%` }} />
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
