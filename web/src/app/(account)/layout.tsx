import { ShopHeader } from "@/components/layout/ShopHeader";
import { getCategories } from "@/convex/cached";

// Your account (W-43 to W-49): shop header, no footer, as in the designs.
export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const categories = await getCategories();
  return (
    <>
      <ShopHeader categories={categories} showCategories={false} />
      <main id="main" tabIndex={-1} className="pb-24 outline-none">
        {children}
      </main>
    </>
  );
}
