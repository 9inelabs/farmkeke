// Category bar under the shop header. Only the browse screens show it
// (W-01 shop home, W-02 all categories, W-03 category); product, farm,
// search, cart and order screens don't. It renders on the server, so the
// links are in the HTML Google reads, and it visually joins the header
// (the header drops its bottom line while this bar is on the page).
import Link from "next/link";
import { getCategories } from "@/convex/cached";
import { routes } from "@/lib/routes";

export async function CategoryBar({ active }: { active?: string }) {
  const categories = await getCategories();
  if (categories.length === 0) return null;
  const items = [{ href: routes.categories as string, name: "All categories" }].concat(
    categories.map((c) => ({ href: routes.category(c.slug), name: c.name })),
  );
  return (
    <div data-category-bar className="bg-surface shadow-[inset_0_-1px_0_var(--color-line)]">
      <nav aria-label="Categories" className="wrap">
        <ul className="m-0 flex h-[50px] [scrollbar-width:none] list-none items-stretch gap-7 overflow-x-auto p-0 text-sm font-medium m:h-11 m:gap-5 m:text-[13px]">
          {items.map((c) => {
            const on = active === c.href;
            return (
              <li key={c.href} className="flex">
                <Link
                  href={c.href}
                  aria-current={on ? "page" : undefined}
                  className={`flex items-center whitespace-nowrap ${
                    on ? "font-semibold text-forest shadow-[inset_0_-2px_0_var(--color-lime)]" : "text-ink-3"
                  }`}
                >
                  {c.name}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}

/** For /shop/category/[slug]: highlights the current category once params resolve. */
export async function CategoryBarForSlug({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <CategoryBar active={routes.category(slug)} />;
}
