import { ShopFooter } from "@/components/layout/Footers";
import { ShopHeader } from "@/components/layout/ShopHeader";
import { getCategories } from "@/convex/cached";

// Shop, cart and order pages with the full shop header and footer:
// W-01 to W-07, W-20, W-50, W-51, W-53, W-54.
export default async function ShopLayout({ children }: { children: React.ReactNode }) {
  const categories = await getCategories();
  return (
    <>
      <ShopHeader categories={categories} />
      <main id="main" tabIndex={-1} className="outline-none">
        {children}
      </main>
      <ShopFooter />
    </>
  );
}
