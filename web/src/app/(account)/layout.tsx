import { ShopHeader } from "@/components/layout/ShopHeader";

// Your account (W-43 to W-49): shop header, no footer, as in the designs.
export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <ShopHeader />
      <main id="main" tabIndex={-1} className="pb-24 outline-none">
        {children}
      </main>
    </>
  );
}
